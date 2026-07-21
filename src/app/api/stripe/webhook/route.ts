import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/client";
import { env } from "@/lib/env";
import {
  applyStripeSubscriptionState,
  findCompanyIdForStripe,
} from "@/lib/stripe/billing";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/stripe/webhook
 * Signature-verified Stripe events only (spec §10).
 * Handled: checkout.session.completed, customer.subscription.*
 * Idempotent updates to companies.* billing fields (spec §11).
 */
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let stripe;
  try {
    stripe = getStripe();
  } catch {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, env.stripeWebhookSecret);
  } catch (err) {
    console.error("[stripe_webhook_signature_failed]", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;

        const companyId =
          session.metadata?.company_id ||
          session.client_reference_id ||
          null;
        const customerId =
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id ?? null;
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id ?? null;

        const resolvedCompanyId = await findCompanyIdForStripe({
          companyIdMeta: companyId,
          customerId,
          subscriptionId,
        });
        if (!resolvedCompanyId || !subscriptionId) {
          console.error("[stripe_checkout_missing_ids]", {
            companyId,
            customerId,
            subscriptionId,
          });
          break;
        }

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await applyStripeSubscriptionState({
          companyId: resolvedCompanyId,
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscription.id,
          status: subscription.status,
        });
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id;
        const companyId = await findCompanyIdForStripe({
          companyIdMeta: subscription.metadata?.company_id ?? null,
          customerId,
          subscriptionId: subscription.id,
        });
        if (!companyId) {
          console.error("[stripe_subscription_company_not_found]", subscription.id);
          break;
        }

        // deleted event → treat as canceled for access mapping
        const status =
          event.type === "customer.subscription.deleted"
            ? "canceled"
            : subscription.status;

        await applyStripeSubscriptionState({
          companyId,
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscription.id,
          status,
        });
        break;
      }

      default:
        // Spec §12: ignore all other events.
        break;
    }
  } catch (err) {
    console.error("[stripe_webhook_handler_failed]", event.type, err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
