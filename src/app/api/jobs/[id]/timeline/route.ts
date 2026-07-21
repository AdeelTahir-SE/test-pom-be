import { withAuth } from "@/lib/http/handler";
import { ok, ApiError } from "@/lib/http/responses";
import { getAdminClient } from "@/lib/supabase/admin";
import { loadJobWithAccess } from "@/lib/services/jobAccess";

export const dynamic = "force-dynamic";

// GET /api/jobs/[id]/timeline — append-only, read-only. Default order
// created_at ASC (Appendix A §7). Same job-scoped access rule as checklist/
// messages/files: owner/manager see any company job, workers only their own.
export const GET = withAuth<{ id: string }>(async (_request, auth, { params }) => {
  const db = getAdminClient();
  await loadJobWithAccess(db, auth, params.id);

  const { data, error } = await db
    .from("timeline_events")
    .select("id, job_id, event_type, user_id, metadata, created_at")
    .eq("job_id", params.id)
    .order("created_at", { ascending: true });
  if (error) {
    throw new ApiError("internal", "Failed to load timeline.", error.message);
  }

  return ok({ timeline: data ?? [] });
});
