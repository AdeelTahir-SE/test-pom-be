import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/client";
import { env } from "@/lib/env";
import {
  applyStripeSubscriptionState,
  findCompanyIdForStripe,
} from "@/lib/stripe/billing";
import { getAdminClient } from "@/lib/supabase/admin";
import { billingAccessFromStripeSubscription } from "@/lib/stripe/subscription";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function invoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const direct = (invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null })
    .subscription;
  if (typeof direct === "string") return direct;
  if (direct && typeof direct === "object") return direct.id;

  const parent = (invoice as Stripe.Invoice & {
    parent?: { subscription_details?: { subscription?: string | Stripe.Subscription | null } | null } | null;
  }).parent;
  const nested = parent?.subscription_details?.subscription;
  if (typeof nested === "string") return nested;
  if (nested && typeof nested === "object") return nested.id;
  return null;
}

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

  const db = getAdminClient();
  let auditEnabled = true;
  const { error: eventInsertError } = await db
    .from("stripe_webhook_events")
    .insert({ event_id: event.id, event_type: event.type });
  if (eventInsertError) {
    if (eventInsertError.code === "42P01") {
      auditEnabled = false;
      console.error(
        "[stripe_webhook_audit_table_missing]",
        "Run supabase/migrations/0016_stripe_launch_paywall.sql"
      );
    } else if (eventInsertError.code === "23505") {
      const { data: existing, error: existingError } = await db
        .from("stripe_webhook_events")
        .select("processed_at, error")
        .eq("event_id", event.id)
        .maybeSingle();
      if (existingError) {
        console.error("[stripe_webhook_event_read_failed]", event.id, existingError.message);
        return NextResponse.json({ error: "Webhook event audit failed" }, { status: 500 });
      }
      if (existing?.processed_at && !existing.error) {
        return NextResponse.json({ received: true, duplicate: true });
      }
    }
    if (auditEnabled && eventInsertError.code !== "23505") {
      console.error("[stripe_webhook_event_insert_failed]", event.id, eventInsertError.message);
      return NextResponse.json({ error: "Webhook event audit failed" }, { status: 500 });
    }
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
          snapshot: billingAccessFromStripeSubscription(subscription),
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
          snapshot: billingAccessFromStripeSubscription(subscription, new Date(), status),
        });
        break;
      }

      case "invoice.payment_failed":
      case "invoice.paid":
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoiceSubscriptionId(invoice);
        if (!subscriptionId) break;

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
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
          console.error("[stripe_invoice_subscription_company_not_found]", subscription.id);
          break;
        }

        await applyStripeSubscriptionState({
          companyId,
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscription.id,
          snapshot: billingAccessFromStripeSubscription(subscription),
        });
        break;
      }

      default:
        // Spec §12: ignore all other events.
        break;
    }
  } catch (err) {
    console.error("[stripe_webhook_handler_failed]", event.type, err);
    if (auditEnabled) {
      await db
        .from("stripe_webhook_events")
        .update({ error: err instanceof Error ? err.message : "Webhook handler failed" })
        .eq("event_id", event.id);
    }
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  if (auditEnabled) {
    await db
      .from("stripe_webhook_events")
      .update({ processed_at: new Date().toISOString(), error: null })
      .eq("event_id", event.id);
  }

  return NextResponse.json({ received: true });
}
