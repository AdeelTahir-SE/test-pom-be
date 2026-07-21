import { withAuth } from "@/lib/http/handler";
import { ok, ApiError } from "@/lib/http/responses";
import { appBaseUrl, getStripe } from "@/lib/stripe/client";
import { loadCompanyBilling } from "@/lib/stripe/billing";

export const dynamic = "force-dynamic";

/**
 * POST /api/billing/portal — owner-only.
 * Returns Stripe Customer Portal URL (spec §6). Frontend only redirects.
 */
export const POST = withAuth(
  async (_request, auth) => {
    const company = await loadCompanyBilling(auth.companyId);
    if (!company) throw new ApiError("not_found", "Company not found.");
    if (!company.stripe_customer_id) {
      throw new ApiError(
        "bad_request",
        "No Stripe customer yet. Start a subscription first."
      );
    }

    let stripe;
    try {
      stripe = getStripe();
    } catch {
      throw new ApiError("internal", "Stripe is not configured on this server.");
    }

    const portal = await stripe.billingPortal.sessions.create({
      customer: company.stripe_customer_id,
      return_url: `${appBaseUrl()}/dashboard/office`,
    });

    return ok({ url: portal.url });
  },
  { roles: ["owner"] }
);
