import { withAuth } from "@/lib/http/handler";
import { ok, ApiError } from "@/lib/http/responses";
import { loadCompanyBilling } from "@/lib/stripe/billing";

export const dynamic = "force-dynamic";

/** GET /api/billing/status — owner/manager can see company billing flags. */
export const GET = withAuth(
  async (_request, auth) => {
    const company = await loadCompanyBilling(auth.companyId);
    if (!company) throw new ApiError("not_found", "Company not found.");

    return ok({
      subscription_active: company.subscription_active,
      subscription_status: company.subscription_status,
      subscription_current_period_end: company.subscription_current_period_end,
      subscription_cancel_at_period_end: company.subscription_cancel_at_period_end,
      subscription_cancel_at: company.subscription_cancel_at,
      subscription_canceled_at: company.subscription_canceled_at,
      has_stripe_customer: !!company.stripe_customer_id,
      has_stripe_subscription: !!company.stripe_subscription_id,
    });
  },
  { roles: ["owner", "manager"] }
);
