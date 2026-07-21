import { withAuth } from "@/lib/http/handler";
import { ok, ApiError } from "@/lib/http/responses";
import { getAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// GET /api/notifications — the current user's own notifications only,
// default order created_at DESC (Appendix A §7). Hidden ones excluded by
// default (Appendix A §7: "If a user removes a notification... hidden for
// that user"; the record itself is never deleted).
export const GET = withAuth(async (_request, auth) => {
  const db = getAdminClient();
  const { data, error } = await db
    .from("notifications")
    .select("*")
    .eq("company_id", auth.companyId)
    .eq("user_id", auth.userId)
    .is("hidden_at", null)
    .order("created_at", { ascending: false });
  if (error) {
    throw new ApiError("internal", "Failed to load notifications.", error.message);
  }

  return ok({ notifications: data ?? [] });
});
