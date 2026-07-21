import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/context";
import { ApiError, toErrorResponse } from "@/lib/http/responses";
import type { CompanyUserContext, PlatformAdminContext } from "@/types/domain";
import type { UserRole } from "@/config/constants";

// Generic over the dynamic segment shape (e.g. { id: string }) so accessing
// params.id gives `string`, not `string | undefined` — a bare
// Record<string, string> has an implicit index signature, which
// noUncheckedIndexedAccess (tsconfig) always widens with `| undefined`.
type RouteParams<P extends Record<string, string> = Record<string, string>> = {
  params: P;
};

// Wrap a company-scoped handler. Rejects anything that isn't an active
// company user by construction — a platform admin token never satisfies this,
// since it never resolves to a CompanyUserContext (see lib/auth/context.ts).
export function withAuth<P extends Record<string, string> = Record<string, string>>(
  handler: (
    request: Request,
    ctx: CompanyUserContext,
    routeParams: RouteParams<P>
  ) => Promise<NextResponse>,
  opts?: { roles?: UserRole[] }
) {
  return async (request: Request, routeParams: RouteParams<P>) => {
    try {
      const auth = await getAuthContext(request);
      if (!auth) {
        throw new ApiError("unauthorized", "Missing or invalid authentication.");
      }
      if (auth.kind !== "company_user") {
        throw new ApiError("forbidden", "This endpoint requires a company user account.");
      }
      if (opts?.roles && !opts.roles.includes(auth.role)) {
        throw new ApiError("forbidden", "You do not have permission to perform this action.");
      }
      return await handler(request, auth, routeParams);
    } catch (err) {
      return toErrorResponse(err);
    }
  };
}

// Wrap a platform-admin-only handler (internal/ops, §3.1). Never mixed into
// company-scoped authorization — separate wrapper, separate identity kind.
export function withPlatformAdmin<P extends Record<string, string> = Record<string, string>>(
  handler: (
    request: Request,
    ctx: PlatformAdminContext,
    routeParams: RouteParams<P>
  ) => Promise<NextResponse>
) {
  return async (request: Request, routeParams: RouteParams<P>) => {
    try {
      const auth = await getAuthContext(request);
      if (!auth) {
        throw new ApiError("unauthorized", "Missing or invalid authentication.");
      }
      if (auth.kind !== "platform_admin") {
        throw new ApiError("forbidden", "This endpoint requires a platform admin account.");
      }
      return await handler(request, auth, routeParams);
    } catch (err) {
      return toErrorResponse(err);
    }
  };
}
