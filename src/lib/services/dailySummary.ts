import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/http/responses";
import { chatComplete } from "@/lib/integrations/mistral";
import { jobBelongsToDay, toIsoDate, startOfLocalDay } from "@/lib/officeDate";

export type DailySummaryStatus = "ready" | "failed";

export interface DailySummaryRow {
  id: string;
  company_id: string;
  calendar_day: string;
  summary_text: string | null;
  attention: string | null;
  generated_at: string;
  generated_by: string | null;
  status: DailySummaryStatus;
}

const SYSTEM_PROMPT = `You are an operational briefing assistant for a field-service company director.
Write a short daily summary in the same language as the input data (Slovenian or English).

Rules:
- Use ONLY facts present in the provided data. Never invent reasons, delays, or problems.
- Approximately 3–5 short sentences about overall progress, completed/incomplete work, and relevant messages.
- If something clearly needs the director's attention (delays, waiting jobs, incomplete critical work, concerning messages), add a final line starting exactly with "POZORNOST:" followed by one short sentence.
- If nothing needs attention, omit the POZORNOST line entirely.
- Do not give advice that changes work, create tasks, or make decisions.
- Be concise and scannable. No bullet lists unless listing 2–3 concrete issues.
- If there is almost no activity, say so briefly.`;

export function parseSummaryOutput(raw: string): { summary_text: string; attention: string | null } {
  const cleaned = raw.replace(/\r\n/g, "\n").trim();
  const attentionMatch = cleaned.match(/(?:^|\n)\s*(?:POZORNOST|⚠️?\s*Pozornost|Attention)\s*:\s*(.+)$/imu);
  let attention: string | null = null;
  let body = cleaned;
  if (attentionMatch) {
    attention = attentionMatch[1]!.trim() || null;
    body = cleaned.slice(0, attentionMatch.index).trim();
  }
  body = body.replace(/\n{3,}/g, "\n\n").trim();
  if (!body) {
    throw new ApiError("internal", "AI returned an empty summary.");
  }
  return { summary_text: body, attention };
}

export async function collectDayOperationalPack(
  db: SupabaseClient,
  companyId: string,
  calendarDay: string
): Promise<string> {
  const todayKey = toIsoDate(startOfLocalDay());

  const { data: jobs, error: jobsError } = await db
    .from("jobs")
    .select("id, company_seq, title, customer, location, status, scheduled_at, created_at, completed_at")
    .eq("company_id", companyId)
    .order("company_seq", { ascending: true });
  if (jobsError) {
    throw new ApiError("internal", "Failed to load jobs for summary.", jobsError.message);
  }

  const dayJobs = (jobs ?? []).filter((j) =>
    jobBelongsToDay(
      { scheduled_at: j.scheduled_at, created_at: j.created_at },
      calendarDay,
      todayKey
    )
  );

  const jobIds = dayJobs.map((j) => j.id);

  const [assignmentsResult, checklistResult, messagesResult, remindersResult] = await Promise.all([
    jobIds.length
      ? db.from("job_assignments").select("job_id, worker_id").in("job_id", jobIds)
      : Promise.resolve({ data: [] as { job_id: string; worker_id: string }[], error: null }),
    jobIds.length
      ? db
          .from("job_checklist_items")
          .select("job_id, label, is_completed, completed_at")
          .in("job_id", jobIds)
          .order("order_index", { ascending: true })
      : Promise.resolve({
          data: [] as {
            job_id: string;
            label: string;
            is_completed: boolean;
            completed_at: string | null;
          }[],
          error: null,
        }),
    jobIds.length
      ? db
          .from("job_messages")
          .select("job_id, content, message_type, created_at")
          .in("job_id", jobIds)
          .order("created_at", { ascending: false })
          .limit(40)
      : Promise.resolve({
          data: [] as {
            job_id: string;
            content: string | null;
            message_type: string;
            created_at: string;
          }[],
          error: null,
        }),
    db
      .from("office_reminders")
      .select("title, description, remind_on, is_urgent, hidden_at, created_at")
      .eq("company_id", companyId)
      .is("hidden_at", null)
      .or(`remind_on.eq.${calendarDay},remind_on.is.null`)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (assignmentsResult.error) {
    throw new ApiError("internal", "Failed to load assignments.", assignmentsResult.error.message);
  }
  if (checklistResult.error) {
    throw new ApiError("internal", "Failed to load checklists.", checklistResult.error.message);
  }
  if (messagesResult.error) {
    throw new ApiError("internal", "Failed to load messages.", messagesResult.error.message);
  }
  if (remindersResult.error) {
    throw new ApiError("internal", "Failed to load reminders.", remindersResult.error.message);
  }

  const workerIds = [...new Set((assignmentsResult.data ?? []).map((a) => a.worker_id))];
  const { data: workers, error: workersError } =
    workerIds.length > 0
      ? await db.from("users").select("id, full_name").in("id", workerIds)
      : { data: [] as { id: string; full_name: string }[], error: null };
  if (workersError) {
    throw new ApiError("internal", "Failed to load workers.", workersError.message);
  }
  const workerNameById = new Map((workers ?? []).map((w) => [w.id, w.full_name]));
  const workerByJob = new Map((assignmentsResult.data ?? []).map((a) => [a.job_id, a.worker_id]));

  const checklistByJob = new Map<
    string,
    { label: string; is_completed: boolean; completed_at: string | null }[]
  >();
  for (const item of checklistResult.data ?? []) {
    const list = checklistByJob.get(item.job_id) ?? [];
    list.push(item);
    checklistByJob.set(item.job_id, list);
  }

  const messagesByJob = new Map<
    string,
    { content: string; message_type: string; created_at: string }[]
  >();
  for (const msg of messagesResult.data ?? []) {
    const text = (msg.content ?? "").trim();
    if (!text) continue;
    const list = messagesByJob.get(msg.job_id) ?? [];
    if (list.length < 5) {
      list.push({
        content: text,
        message_type: msg.message_type,
        created_at: msg.created_at,
      });
    }
    messagesByJob.set(msg.job_id, list);
  }

  const pack = {
    calendar_day: calendarDay,
    jobs: dayJobs.map((j) => {
      const items = checklistByJob.get(j.id) ?? [];
      const completed = items.filter((i) => i.is_completed).length;
      const workerId = workerByJob.get(j.id);
      return {
        card: j.company_seq != null ? `#${String(j.company_seq).padStart(3, "0")}` : j.id.slice(0, 8),
        title: j.title,
        customer: j.customer,
        location: j.location,
        status: j.status,
        worker: workerId ? workerNameById.get(workerId) ?? null : null,
        checklist: `${completed}/${items.length}`,
        incomplete_steps: items.filter((i) => !i.is_completed).map((i) => i.label).slice(0, 8),
        messages: (messagesByJob.get(j.id) ?? []).map((m) => ({
          type: m.message_type,
          text: m.content.slice(0, 200),
          at: m.created_at,
        })),
      };
    }),
    reminders: (remindersResult.data ?? []).map((r) => ({
      title: r.title,
      description: r.description,
      urgent: r.is_urgent,
    })),
  };

  return JSON.stringify(pack, null, 2);
}

export async function generateDailySummaryText(
  operationalPackJson: string,
  deps?: { chat?: typeof chatComplete }
): Promise<{ summary_text: string; attention: string | null }> {
  const chat = deps?.chat ?? chatComplete;
  const userPrompt = `Operational data for this day (JSON). Summarize for the director.\n\n${operationalPackJson}`;
  const raw = await chat(SYSTEM_PROMPT, userPrompt);
  if (!raw) {
    throw new ApiError(
      "internal",
      "Failed to generate daily summary. Check AI configuration and try again."
    );
  }
  return parseSummaryOutput(raw);
}

/** Ready summary only — what managers see in the UI. */
export async function getSummaryForDay(
  db: SupabaseClient,
  companyId: string,
  calendarDay: string
): Promise<DailySummaryRow | null> {
  const { data, error } = await db
    .from("daily_summaries")
    .select("*")
    .eq("company_id", companyId)
    .eq("calendar_day", calendarDay)
    .eq("status", "ready")
    .maybeSingle();
  if (error) {
    throw new ApiError("internal", "Failed to load daily summary.", error.message);
  }
  return (data as DailySummaryRow | null) ?? null;
}

/** Any attempt (ready or failed) — used to skip AI retries. */
export async function getSummaryAttemptForDay(
  db: SupabaseClient,
  companyId: string,
  calendarDay: string
): Promise<DailySummaryRow | null> {
  const { data, error } = await db
    .from("daily_summaries")
    .select("*")
    .eq("company_id", companyId)
    .eq("calendar_day", calendarDay)
    .maybeSingle();
  if (error) {
    throw new ApiError("internal", "Failed to load daily summary attempt.", error.message);
  }
  return (data as DailySummaryRow | null) ?? null;
}

export async function listDailySummaries(
  db: SupabaseClient,
  companyId: string,
  limit = 30
): Promise<DailySummaryRow[]> {
  const { data, error } = await db
    .from("daily_summaries")
    .select("*")
    .eq("company_id", companyId)
    .eq("status", "ready")
    .order("calendar_day", { ascending: false })
    .limit(limit);
  if (error) {
    throw new ApiError("internal", "Failed to list daily summaries.", error.message);
  }
  return (data ?? []) as DailySummaryRow[];
}

export async function saveDailySummary(
  db: SupabaseClient,
  input: {
    companyId: string;
    calendarDay: string;
    summaryText: string;
    attention: string | null;
    generatedBy?: string | null;
  }
): Promise<DailySummaryRow> {
  const { data, error } = await db
    .from("daily_summaries")
    .insert({
      company_id: input.companyId,
      calendar_day: input.calendarDay,
      summary_text: input.summaryText.trim(),
      attention: input.attention?.trim() || null,
      generated_by: input.generatedBy ?? null,
      status: "ready",
    })
    .select("*")
    .single();
  if (error || !data) {
    throw new ApiError("internal", "Failed to save daily summary.", error?.message);
  }
  return data as DailySummaryRow;
}

/** Permanent failed marker — blocks future AI retries for this company/day. */
export async function saveFailedDailySummary(
  db: SupabaseClient,
  input: { companyId: string; calendarDay: string }
): Promise<DailySummaryRow> {
  const { data, error } = await db
    .from("daily_summaries")
    .insert({
      company_id: input.companyId,
      calendar_day: input.calendarDay,
      summary_text: null,
      attention: null,
      generated_by: null,
      status: "failed",
    })
    .select("*")
    .single();
  if (error || !data) {
    throw new ApiError("internal", "Failed to record daily summary failure.", error?.message);
  }
  return data as DailySummaryRow;
}

export type NightlySummaryResult =
  | { companyId: string; calendarDay: string; outcome: "ready" }
  | { companyId: string; calendarDay: string; outcome: "failed" }
  | { companyId: string; calendarDay: string; outcome: "skipped"; reason: string };

/**
 * One-shot overnight generation for a company/day.
 * If an attempt already exists (ready or failed), AI is never called again.
 */
export async function generateNightlySummaryForCompany(
  db: SupabaseClient,
  companyId: string,
  calendarDay: string,
  deps?: { chat?: typeof chatComplete }
): Promise<NightlySummaryResult> {
  const existing = await getSummaryAttemptForDay(db, companyId, calendarDay);
  if (existing) {
    return {
      companyId,
      calendarDay,
      outcome: "skipped",
      reason: existing.status === "ready" ? "already_ready" : "already_failed",
    };
  }

  try {
    const pack = await collectDayOperationalPack(db, companyId, calendarDay);
    const { summary_text, attention } = await generateDailySummaryText(pack, deps);
    await saveDailySummary(db, {
      companyId,
      calendarDay,
      summaryText: summary_text,
      attention,
      generatedBy: null,
    });
    return { companyId, calendarDay, outcome: "ready" };
  } catch {
    try {
      await saveFailedDailySummary(db, { companyId, calendarDay });
    } catch {
      // If the failure marker cannot be written, still report failed (no AI retry this run).
    }
    return { companyId, calendarDay, outcome: "failed" };
  }
}

export async function runNightlyDailySummaries(
  db: SupabaseClient,
  calendarDay: string,
  deps?: { chat?: typeof chatComplete }
): Promise<NightlySummaryResult[]> {
  const { data: companies, error } = await db.from("companies").select("id");
  if (error) {
    throw new ApiError("internal", "Failed to list companies for nightly summaries.", error.message);
  }

  const results: NightlySummaryResult[] = [];
  for (const company of companies ?? []) {
    results.push(await generateNightlySummaryForCompany(db, company.id, calendarDay, deps));
  }
  return results;
}
