import { withPlatformAdmin } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";

export const dynamic = "force-dynamic";

// GET /api/admin/me — verifies the caller is a platform admin and returns
// their identity, mirroring /api/auth/me for the company-user side.
export const GET = withPlatformAdmin(async (_request, auth) => {
  return ok({ admin: { id: auth.userId, email: auth.email } });
});
