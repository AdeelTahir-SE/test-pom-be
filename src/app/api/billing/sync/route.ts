import type Stripe from "stripe";
import { withAuth } from "@/lib/http/handler";
import { ok, ApiError } from "@/lib/http/responses";
import { parseJsonBody } from "@/lib/validation/schemas";
import { getStripe } from "@/lib/stripe/client";
import { applyStripeSubscriptionState, loadCompanyBilling } from "@/lib/stripe/billing";
import { billingAccessFromStripeSubscription } from "@/lib/stripe/subscription";
import { z } from "zod";

export const dynamic = "force-dynamic";

const syncSchema = z.object({
  session_id: z.string().min(1),
});

function subscriptionIdFromSession(session: Stripe.Checkout.Session): string | null {
  if (!session.subscription) return null;
  return typeof session.subscription === "string"
    ? session.subscription
    : session.subscription.id;
}

/**
 * POST /api/billing/sync
 *
 * Reconciles a successful Checkout redirect server-side. Webhooks remain the
 * source of truth, but this removes the launch footgun where a valid payment
 * leaves the owner stuck behind the paywall while webhook delivery is delayed
 * or local webhook forwarding is not running.
 */
export const POST = withAuth(
  async (request, auth) => {
    const input = await parseJsonBody(request, syncSchema);
    const company = await loadCompanyBilling(auth.companyId);
    if (!company) throw new ApiError("not_found", "Company not found.");

    let stripe;
    try {
      stripe = getStripe();
    } catch {
      throw new ApiError("internal", "Stripe is not configured on this server.");
    }

    const session = await stripe.checkout.sessions.retrieve(input.session_id, {
      expand: ["subscription"],
    });
    if (session.mode !== "subscription") {
      throw new ApiError("bad_request", "Checkout session is not a subscription.");
    }

    const sessionCompanyId =
      session.metadata?.company_id || session.client_reference_id || null;
    if (sessionCompanyId !== auth.companyId) {
      throw new ApiError("forbidden", "Checkout session does not belong to this company.");
    }

    if (session.status !== "complete") {
      throw new ApiError("bad_request", "Checkout session is not complete yet.");
    }

    const subscriptionId = subscriptionIdFromSession(session);
    if (!subscriptionId) {
      throw new ApiError("bad_request", "Checkout session has no subscription.");
    }

    const subscription =
      typeof session.subscription === "string"
        ? await stripe.subscriptions.retrieve(subscriptionId)
        : session.subscription;
    if (!subscription) {
      throw new ApiError("bad_request", "Checkout subscription could not be loaded.");
    }

    const customerId =
      typeof session.customer === "string"
        ? session.customer
        : session.customer?.id ?? company.stripe_customer_id;

    const snapshot = billingAccessFromStripeSubscription(subscription);

    await applyStripeSubscriptionState({
      companyId: auth.companyId,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      snapshot,
    });

    const updated = await loadCompanyBilling(auth.companyId);
    return ok({
      subscription_active: updated?.subscription_active ?? false,
      subscription_status: updated?.subscription_status ?? snapshot.status,
      subscription_current_period_end: updated?.subscription_current_period_end ?? snapshot.currentPeriodEnd,
      subscription_cancel_at_period_end:
        updated?.subscription_cancel_at_period_end ?? snapshot.cancelAtPeriodEnd,
      subscription_cancel_at: updated?.subscription_cancel_at ?? snapshot.cancelAt,
      subscription_canceled_at: updated?.subscription_canceled_at ?? snapshot.canceledAt,
      has_stripe_customer: !!updated?.stripe_customer_id,
      has_stripe_subscription: !!updated?.stripe_subscription_id,
    });
  },
  { roles: ["owner"] }
);
