import { withAuth } from "@/lib/http/handler";
import { ok, ApiError } from "@/lib/http/responses";
import { getAdminClient } from "@/lib/supabase/admin";
import { loadJobWithAccess } from "@/lib/services/jobAccess";

export const dynamic = "force-dynamic";

// PATCH /api/jobs/[id]/messages/read — bulk-marks every unread message in
// this Job where the current user is the recipient as read (Internal
// Messages §9). Frontend sends only the Job ID; backend does the rest.
export const PATCH = withAuth<{ id: string }>(async (_request, auth, { params }) => {
  const db = getAdminClient();
  await loadJobWithAccess(db, auth, params.id);

  const { data, error } = await db
    .from("job_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("job_id", params.id)
    .eq("recipient_id", auth.userId)
    .is("read_at", null)
    .select("id");
  if (error) {
    throw new ApiError("internal", "Failed to mark messages as read.", error.message);
  }

  return ok({ updated_count: data?.length ?? 0 });
});
