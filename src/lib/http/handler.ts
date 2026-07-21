import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/context";
import { ApiError, toErrorResponse } from "@/lib/http/responses";
import { getAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import type { CompanyUserContext, PlatformAdminContext } from "@/types/domain";
import type { UserRole } from "@/config/constants";

type RouteParams<P extends Record<string, string> = Record<string, string>> = {
  params: P;
};

function isSubscriptionExemptPath(pathname: string): boolean {
  return (
    pathname.startsWith("/api/billing/") ||
    pathname === "/api/auth/me" ||
    pathname === "/api/auth/logout" ||
    pathname === "/api/auth/refresh" ||
    pathname === "/api/health"
  );
}

async function assertSubscriptionActive(request: Request, companyId: string) {
  if (!env.stripeEnforceSubscription) return;
  const pathname = new URL(request.url).pathname;
  if (isSubscriptionExemptPath(pathname)) return;

  const db = getAdminClient();
  const { data: company } = await db
    .from("companies")
    .select("subscription_active")
    .eq("id", companyId)
    .maybeSingle();

  if (company && company.subscription_active === false) {
    throw new ApiError(
      "payment_required",
      "Company subscription is inactive. Please renew billing to continue."
    );
  }
}

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
      await assertSubscriptionActive(request, auth.companyId);
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
