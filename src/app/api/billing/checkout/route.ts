import { withAuth } from "@/lib/http/handler";
import { ok, ApiError } from "@/lib/http/responses";
import { getAdminClient } from "@/lib/supabase/admin";
import { appBaseUrl, getStripe } from "@/lib/stripe/client";
import { loadCompanyBilling } from "@/lib/stripe/billing";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

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

    let customerId = company.stripe_customer_id;
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
        .update({ stripe_customer_id: customerId })
        .eq("id", company.id);
      if (updateError) {
        throw new ApiError("internal", "Failed to save Stripe customer.", updateError.message);
      }
    }

    const base = appBaseUrl();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: company.id,
      line_items: [{ price: env.stripePriceIdMonthly, quantity: 1 }],
      success_url: `${base}/dashboard/office?billing=success`,
      cancel_url: `${base}/dashboard/office?billing=cancel`,
      allow_promotion_codes: true,
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
  },
  { roles: ["owner"] }
);
