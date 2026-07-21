import { withAuth } from "@/lib/http/handler";
import { ok, ApiError } from "@/lib/http/responses";
import { getAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

interface JobRow {
  id: string;
  title: string;
  location: string | null;
  status: string;
  scheduled_at: string | null;
}

// GET /api/dashboard/summary — the Desktop Dashboard top bar: left side is
// today's field overview (worker, job, location, checklist progress), right
// side is the single highest-priority urgent office reminder. Owner/manager
// only (Dashboard spec: workers don't see this composite view). Every value
// is computed fresh from primary tables at request time — no derived/
// aggregate tables, no caching of business state (Part 9).
export const GET = withAuth(
  async (_request, auth) => {
    const db = getAdminClient();

    // "Today's field overview" = active (non-terminal) jobs that have an
    // assigned worker. Daily Work Cards are created fresh each day by the
    // office (Foundation Part 8 §2), so any non-completed/cancelled assigned
    // job is, by construction, current field work.
    const { data: jobs, error: jobsError } = await db
      .from("jobs")
      .select("id, title, location, status, scheduled_at")
      .eq("company_id", auth.companyId)
      .in("status", ["pending", "in_progress", "waiting"])
      .order("scheduled_at", { ascending: true, nullsFirst: false });
    if (jobsError) {
      throw new ApiError("internal", "Failed to load jobs overview.", jobsError.message);
    }

    const jobIds = (jobs ?? []).map((j: JobRow) => j.id);

    const [assignmentsResult, checklistResult] = await Promise.all([
      jobIds.length > 0
        ? db.from("job_assignments").select("job_id, worker_id").in("job_id", jobIds)
        : Promise.resolve({ data: [] as { job_id: string; worker_id: string }[], error: null }),
      jobIds.length > 0
        ? db.from("job_checklist_items").select("job_id, is_completed").in("job_id", jobIds)
        : Promise.resolve({ data: [] as { job_id: string; is_completed: boolean }[], error: null }),
    ]);
    if (assignmentsResult.error) {
      throw new ApiError("internal", "Failed to load assignments.", assignmentsResult.error.message);
    }
    if (checklistResult.error) {
      throw new ApiError("internal", "Failed to load checklist counts.", checklistResult.error.message);
    }

    const workerIdByJob = new Map(
      (assignmentsResult.data ?? []).map((a) => [a.job_id, a.worker_id])
    );
    const assignedWorkerIds = [...new Set((assignmentsResult.data ?? []).map((a) => a.worker_id))];

    const { data: workers, error: workersError } =
      assignedWorkerIds.length > 0
        ? await db.from("users").select("id, full_name").in("id", assignedWorkerIds)
        : { data: [] as { id: string; full_name: string }[], error: null };
    if (workersError) {
      throw new ApiError("internal", "Failed to load workers.", workersError.message);
    }
    const workerNameById = new Map((workers ?? []).map((w) => [w.id, w.full_name]));

    const checklistCountsByJob = new Map<string, { completed: number; total: number }>();
    for (const item of checklistResult.data ?? []) {
      const entry = checklistCountsByJob.get(item.job_id) ?? { completed: 0, total: 0 };
      entry.total += 1;
      if (item.is_completed) entry.completed += 1;
      checklistCountsByJob.set(item.job_id, entry);
    }

    // Only jobs with an assigned worker belong on the field overview — an
    // unassigned job has no one to report on.
    const fieldOverview = (jobs ?? [])
      .filter((j: JobRow) => workerIdByJob.has(j.id))
      .map((j: JobRow) => {
        const workerId = workerIdByJob.get(j.id)!;
        const counts = checklistCountsByJob.get(j.id) ?? { completed: 0, total: 0 };
        return {
          job_id: j.id,
          job_title: j.title,
          location: j.location,
          worker_id: workerId,
          worker_name: workerNameById.get(workerId) ?? null,
          checklist_completed: counts.completed,
          checklist_total: counts.total,
        };
      });

    const today = new Date().toISOString().slice(0, 10);
    const { data: urgentReminder, error: reminderError } = await db
      .from("office_reminders")
      .select("id, title, description, created_at")
      .eq("company_id", auth.companyId)
      .eq("is_urgent", true)
      .is("hidden_at", null)
      .or(`remind_on.is.null,remind_on.lte.${today}`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (reminderError) {
      throw new ApiError("internal", "Failed to load urgent reminder.", reminderError.message);
    }

    return ok({ field_overview: fieldOverview, urgent_reminder: urgentReminder ?? null });
  },
  { roles: ["owner", "manager"] }
);
