import { withAuth } from "@/lib/http/handler";
import { ok, ApiError } from "@/lib/http/responses";
import { getAdminClient } from "@/lib/supabase/admin";
import { appBaseUrl, getStripe } from "@/lib/stripe/client";
import { loadCompanyBilling } from "@/lib/stripe/billing";
import { getCheckoutDiscountConfig } from "@/lib/stripe/discount";
import { env } from "@/lib/env";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

function stripeFailMessage(err: unknown): string {
  if (err instanceof Stripe.errors.StripeError) {
    return err.message || "Stripe request failed.";
  }
  if (err instanceof Error && /Missing required environment variable/i.test(err.message)) {
    return err.message;
  }
  return "Failed to create Stripe checkout session.";
}

function isMissingStripeResource(err: unknown): boolean {
  return (
    err instanceof Stripe.errors.StripeInvalidRequestError &&
    err.code === "resource_missing"
  );
}

/**
 * POST /api/billing/checkout — owner-only.
 * Creates a Stripe Checkout Session (subscription mode) and returns the URL.
 * Frontend only redirects — never talks to Stripe directly (spec §5, §16).
 */
export const POST = withAuth(
  async (_request, auth) => {
    const db = getAdminClient();
    const company = await loadCompanyBilling(auth.companyId);
    if (!company) throw new ApiError("not_found", "Company not found.");

    const { data: owner, error: ownerError } = await db
      .from("users")
      .select("email, full_name")
      .eq("id", auth.userId)
      .single();
    if (ownerError || !owner) {
      throw new ApiError("not_found", "User not found.");
    }

    let stripe;
    try {
      stripe = getStripe();
    } catch {
      throw new ApiError("internal", "Stripe is not configured on this server.");
    }

    let priceId: string;
    try {
      priceId = env.stripePriceIdMonthly;
    } catch {
      throw new ApiError(
        "internal",
        "Missing STRIPE_PRICE_ID_MONTHLY on this server."
      );
    }

    let customerId = company.stripe_customer_id;
    try {
      if (customerId) {
        try {
          const customer = await stripe.customers.retrieve(customerId);
          if ("deleted" in customer && customer.deleted) {
            customerId = null;
          }
        } catch (err) {
          if (isMissingStripeResource(err)) {
            customerId = null;
          } else {
            throw err;
          }
        }
      }

      if (!customerId) {
        const customer = await stripe.customers.create({
          email: owner.email,
          name: company.name,
          metadata: {
            company_id: company.id,
            owner_user_id: auth.userId,
          },
        });
        customerId = customer.id;
        const { error: updateError } = await db
          .from("companies")
          .update({
            stripe_customer_id: customerId,
            stripe_subscription_id: null,
            subscription_status: null,
            subscription_active: false,
            subscription_current_period_end: null,
            subscription_cancel_at_period_end: false,
            subscription_cancel_at: null,
            subscription_canceled_at: null,
          })
          .eq("id", company.id);
        if (updateError) {
          throw new ApiError(
            "internal",
            "Failed to save Stripe customer.",
            updateError.message
          );
        }
      }

      let discountConfig: ReturnType<typeof getCheckoutDiscountConfig>;
      try {
        discountConfig = getCheckoutDiscountConfig();
      } catch {
        throw new ApiError(
          "internal",
          "Missing STRIPE_AUGUST_2026_COUPON_ID on this server."
        );
      }

      const base = appBaseUrl();
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        client_reference_id: company.id,
        locale: "sl",
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${base}/dashboard/office?billing=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${base}/dashboard/office?billing=cancel`,
        ...discountConfig,
        metadata: {
          company_id: company.id,
        },
        subscription_data: {
          metadata: {
            company_id: company.id,
          },
        },
      });

      if (!session.url) {
        throw new ApiError("internal", "Stripe did not return a checkout URL.");
      }

      return ok({ url: session.url, session_id: session.id });
    } catch (err) {
      if (err instanceof ApiError) throw err;
      console.error("[billing.checkout]", err);
      throw new ApiError("internal", stripeFailMessage(err));
    }
  },
  { roles: ["owner"] }
);
