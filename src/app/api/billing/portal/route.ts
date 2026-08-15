import { withAuth } from "@/lib/http/handler";
import { ok, ApiError } from "@/lib/http/responses";
import { getAdminClient } from "@/lib/supabase/admin";
import { appBaseUrl, getStripe } from "@/lib/stripe/client";
import { loadCompanyBilling } from "@/lib/stripe/billing";
import Stripe from "stripe";

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

    try {
      const portal = await stripe.billingPortal.sessions.create({
        customer: company.stripe_customer_id,
        return_url: `${appBaseUrl()}/dashboard/office`,
        locale: "sl",
      });
      return ok({ url: portal.url });
    } catch (err) {
      if (
        err instanceof Stripe.errors.StripeInvalidRequestError &&
        err.code === "resource_missing"
      ) {
        const db = getAdminClient();
        await db
          .from("companies")
          .update({
            stripe_customer_id: null,
            stripe_subscription_id: null,
            subscription_status: null,
            subscription_active: false,
            subscription_current_period_end: null,
            subscription_cancel_at_period_end: false,
            subscription_cancel_at: null,
            subscription_canceled_at: null,
          })
          .eq("id", company.id);
        throw new ApiError(
          "bad_request",
          "Stored Stripe customer was not found. Start a new subscription first."
        );
      }
      console.error("[billing.portal]", err);
      const message =
        err instanceof Error && err.message
          ? err.message
          : "Failed to open Stripe billing portal.";
      throw new ApiError("internal", message);
    }
  },
  { roles: ["owner"] }
);
