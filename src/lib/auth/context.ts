import { getAdminClient } from "@/lib/supabase/admin";
import { verifyAccessToken } from "@/lib/supabase/auth";
import { ApiError } from "@/lib/http/responses";
import type {
  AuthContext,
  CompanyUserContext,
  PlatformAdminContext,
} from "@/types/domain";

function extractBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1]! : null;
}

function isTransientDbError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("fetch failed") ||
    m.includes("timeout") ||
    m.includes("timed out") ||
    m.includes("econnrefused") ||
    m.includes("econnreset") ||
    m.includes("enotfound") ||
    m.includes("terminated") ||
    m.includes("network") ||
    m.includes("socket")
  );
}

// Resolution order (Authorization order, spec §12, step 1-3):
//   1. Verify JWT with Supabase Auth.
//   2. Look up a company_user row (public.users) -> most common path.
//   3. Otherwise look up a platform_admin row -> internal/ops path.
//   4. Otherwise the token belongs to no recognized identity -> null.
// A single auth.users row can only ever match ONE of steps 2/3 in practice
// (registration only ever creates a public.users row; platform admins are
// bootstrapped separately and never given a public.users row).
export async function getAuthContext(request: Request): Promise<AuthContext | null> {
  const token = extractBearerToken(request);
  if (!token) return null;

  const authUser = await verifyAccessToken(token);
  if (!authUser) return null;

  const db = getAdminClient();

  let companyUser: {
    id: string;
    company_id: string;
    role: CompanyUserContext["role"];
    email: string;
    is_active: boolean;
  } | null = null;

  try {
    const { data, error: companyUserError } = await db
      .from("users")
      .select("id, company_id, role, email, is_active")
      .eq("id", authUser.id)
      .maybeSingle();

    if (companyUserError) {
      console.error("[auth_context_company_lookup_failed]", companyUserError.message);
      // Transient Supabase/network failure must not look like "logged out".
      if (isTransientDbError(companyUserError.message)) {
        throw new ApiError(
          "internal",
          "Temporary connection problem. Please retry in a moment.",
          companyUserError.message
        );
      }
    }
    companyUser = data;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    const message = err instanceof Error ? err.message : String(err);
    console.error("[auth_context_company_lookup_failed]", message);
    if (isTransientDbError(message)) {
      throw new ApiError(
        "internal",
        "Temporary connection problem. Please retry in a moment.",
        message
      );
    }
    throw err;
  }

  if (companyUser) {
    if (!companyUser.is_active) return null; // inactive users are treated as unauthenticated
    const ctx: CompanyUserContext = {
      kind: "company_user",
      userId: companyUser.id,
      companyId: companyUser.company_id,
      role: companyUser.role,
      email: companyUser.email,
    };
    return ctx;
  }

  const { data: platformAdmin, error: platformAdminError } = await db
    .from("platform_admins")
    .select("id, email")
    .eq("id", authUser.id)
    .maybeSingle();

  if (platformAdminError) {
    console.error("[auth_context_admin_lookup_failed]", platformAdminError.message);
    if (isTransientDbError(platformAdminError.message)) {
      throw new ApiError(
        "internal",
        "Temporary connection problem. Please retry in a moment.",
        platformAdminError.message
      );
    }
  }

  if (platformAdmin) {
    const ctx: PlatformAdminContext = {
      kind: "platform_admin",
      userId: platformAdmin.id,
      email: platformAdmin.email,
    };
    return ctx;
  }

  return null;
}
