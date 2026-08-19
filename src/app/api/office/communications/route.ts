import { withAuth } from "@/lib/http/handler";
import { ok, ApiError } from "@/lib/http/responses";
import { getAdminClient } from "@/lib/supabase/admin";
import { isoToAppDayKey } from "@/lib/officeDate";

export const dynamic = "force-dynamic";

export type OfficeCommunicationDto = {
  id: string;
  job_id: string;
  sender_id: string;
  recipient_id: string | null;
  content: string;
  message_type: string;
  is_urgent: boolean;
  created_at: string;
  /** Present on voice messages — job_files id for playback (Mark a16 #3). */
  attachment_id: string | null;
  job_title: string | null;
  worker_id: string | null;
  worker_name: string | null;
  sender_name: string | null;
  recipient_name: string | null;
};

// GET /api/office/communications?date=YYYY-MM-DD
// Shared office channel (a6): one message exists once; all owners/managers see it.
// Workers are rejected — they only see traffic on their own card.
export const GET = withAuth(async (request, auth) => {
  if (auth.role === "worker") {
    throw new ApiError("forbidden", "Only office users can view the shared communication channel.");
  }

  const url = new URL(request.url);
  const dayKey = url.searchParams.get("date");
  if (!dayKey || !/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) {
    throw new ApiError("bad_request", "Query param date (YYYY-MM-DD) is required.");
  }

  const db = getAdminClient();

  // Pull a padded UTC window, then filter to the app calendar day (Ljubljana).
  const windowStart = new Date(`${dayKey}T00:00:00.000Z`);
  windowStart.setUTCDate(windowStart.getUTCDate() - 1);
  const windowEnd = new Date(`${dayKey}T00:00:00.000Z`);
  windowEnd.setUTCDate(windowEnd.getUTCDate() + 2);

  const { data: messages, error } = await db
    .from("job_messages")
    .select(
      "id, job_id, sender_id, recipient_id, content, message_type, created_at, is_urgent, attachment_id"
    )
    .eq("company_id", auth.companyId)
    .is("office_hidden_at", null)
    .gte("created_at", windowStart.toISOString())
    .lt("created_at", windowEnd.toISOString())
    .order("created_at", { ascending: false });

  if (error) {
    throw new ApiError("internal", "Failed to load communications.", error.message);
  }

  const rows = (messages ?? []).filter((m) => isoToAppDayKey(m.created_at) === dayKey);
  const jobIds = [...new Set(rows.map((m) => m.job_id))];

  const { data: jobs, error: jobsError } =
    jobIds.length > 0
      ? await db
          .from("jobs")
          .select("id, title")
          .eq("company_id", auth.companyId)
          .in("id", jobIds)
      : { data: [] as { id: string; title: string }[], error: null };
  if (jobsError) {
    throw new ApiError("internal", "Failed to load jobs for communications.", jobsError.message);
  }

  const { data: assignments, error: assignError } =
    jobIds.length > 0
      ? await db
          .from("job_assignments")
          .select("job_id, worker_id")
          .eq("company_id", auth.companyId)
          .in("job_id", jobIds)
      : { data: [] as { job_id: string; worker_id: string }[], error: null };
  if (assignError) {
    throw new ApiError(
      "internal",
      "Failed to load assignments for communications.",
      assignError.message
    );
  }

  const workerIds = [...new Set((assignments ?? []).map((a) => a.worker_id))];
  const { data: workers, error: workersError } =
    workerIds.length > 0
      ? await db
          .from("users")
          .select("id, full_name")
          .eq("company_id", auth.companyId)
          .in("id", workerIds)
      : { data: [] as { id: string; full_name: string }[], error: null };
  if (workersError) {
    throw new ApiError("internal", "Failed to load workers for communications.", workersError.message);
  }

  const senderIds = [...new Set(rows.map((m) => m.sender_id))];
  const recipientIds = [
    ...new Set(rows.map((m) => m.recipient_id).filter((id): id is string => !!id)),
  ];
  const personIds = [...new Set([...senderIds, ...recipientIds])];
  const { data: people, error: peopleError } =
    personIds.length > 0
      ? await db
          .from("users")
          .select("id, full_name")
          .eq("company_id", auth.companyId)
          .in("id", personIds)
      : { data: [] as { id: string; full_name: string }[], error: null };
  if (peopleError) {
    throw new ApiError("internal", "Failed to load message people.", peopleError.message);
  }

  const jobTitleById = new Map((jobs ?? []).map((j) => [j.id, j.title]));
  const workerByJobId = new Map((assignments ?? []).map((a) => [a.job_id, a.worker_id]));
  const workerNameById = new Map((workers ?? []).map((w) => [w.id, w.full_name]));
  const personNameById = new Map((people ?? []).map((p) => [p.id, p.full_name]));

  const result: OfficeCommunicationDto[] = rows.map((m) => {
    const workerId = workerByJobId.get(m.job_id) ?? null;
    return {
      id: m.id,
      job_id: m.job_id,
      sender_id: m.sender_id,
      recipient_id: m.recipient_id,
      content: m.content,
      message_type: m.message_type,
      is_urgent: m.is_urgent ?? false,
      created_at: m.created_at,
      attachment_id: m.attachment_id ?? null,
      job_title: jobTitleById.get(m.job_id) ?? null,
      worker_id: workerId,
      worker_name: workerId ? workerNameById.get(workerId) ?? null : null,
      sender_name: personNameById.get(m.sender_id) ?? null,
      recipient_name: m.recipient_id ? personNameById.get(m.recipient_id) ?? null : null,
    };
  });

  return ok({ messages: result });
});
