import { getAdminClient } from "@/lib/supabase/admin";
import type { BillingEntitlementSnapshot } from "@/lib/stripe/subscription";

export interface CompanyBillingRow {
  id: string;
  name: string;
  subscription_active: boolean;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  subscription_current_period_end: string | null;
  subscription_cancel_at_period_end: boolean;
  subscription_cancel_at: string | null;
  subscription_canceled_at: string | null;
}

export async function loadCompanyBilling(companyId: string): Promise<CompanyBillingRow | null> {
  const db = getAdminClient();
  const { data, error } = await db
    .from("companies")
    .select(
      "id, name, subscription_active, stripe_customer_id, stripe_subscription_id, subscription_status, subscription_current_period_end, subscription_cancel_at_period_end, subscription_cancel_at, subscription_canceled_at"
    )
    .eq("id", companyId)
    .maybeSingle();
  if (error) {
    console.error("[billing_load_company_failed]", error.message);
    return null;
  }
  return data as CompanyBillingRow | null;
}

export async function applyStripeSubscriptionState(input: {
  companyId: string;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  snapshot: BillingEntitlementSnapshot;
}): Promise<void> {
  const db = getAdminClient();
  const updates: Record<string, unknown> = {
    subscription_status: input.snapshot.status,
    subscription_active: input.snapshot.subscriptionActive,
    subscription_current_period_end: input.snapshot.currentPeriodEnd,
    subscription_cancel_at_period_end: input.snapshot.cancelAtPeriodEnd,
    subscription_cancel_at: input.snapshot.cancelAt,
    subscription_canceled_at: input.snapshot.canceledAt,
  };
  if (input.stripeCustomerId) updates.stripe_customer_id = input.stripeCustomerId;
  if (input.stripeSubscriptionId) updates.stripe_subscription_id = input.stripeSubscriptionId;

  const { error } = await db.from("companies").update(updates).eq("id", input.companyId);
  if (error) {
    console.error("[billing_apply_subscription_failed]", input.companyId, error.message);
    throw error;
  }
}

/** Resolve company id from Stripe customer / subscription ids or metadata. */
export async function findCompanyIdForStripe(opts: {
  companyIdMeta?: string | null;
  customerId?: string | null;
  subscriptionId?: string | null;
}): Promise<string | null> {
  if (opts.companyIdMeta) return opts.companyIdMeta;
  const db = getAdminClient();
  if (opts.subscriptionId) {
    const { data } = await db
      .from("companies")
      .select("id")
      .eq("stripe_subscription_id", opts.subscriptionId)
      .maybeSingle();
    if (data?.id) return data.id;
  }
  if (opts.customerId) {
    const { data } = await db
      .from("companies")
      .select("id")
      .eq("stripe_customer_id", opts.customerId)
      .maybeSingle();
    if (data?.id) return data.id;
  }
  return null;
}
