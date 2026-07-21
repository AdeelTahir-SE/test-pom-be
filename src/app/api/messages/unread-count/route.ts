import { withAuth } from "@/lib/http/handler";
import { ok, ApiError } from "@/lib/http/responses";
import { getAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// GET /api/messages/unread-count — global (not job-scoped) count for the
// current user, used by the 30-second frontend polling loop (Internal
// Messages §11, Global Polling Rule).
export const GET = withAuth(async (_request, auth) => {
  const db = getAdminClient();
  const { count, error } = await db
    .from("job_messages")
    .select("id", { count: "exact", head: true })
    .eq("company_id", auth.companyId)
    .eq("recipient_id", auth.userId)
    .is("read_at", null);
  if (error) {
    throw new ApiError("internal", "Failed to count unread messages.", error.message);
  }

  return ok({ unread_count: count ?? 0 });
});
