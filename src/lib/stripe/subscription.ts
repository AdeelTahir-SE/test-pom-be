import type Stripe from "stripe";

const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"]);
const INACTIVE_STATUSES = new Set([
  "canceled",
  "unpaid",
  "incomplete_expired",
  "paused",
  "incomplete",
]);

export interface BillingEntitlementSnapshot {
  status: string;
  subscriptionActive: boolean;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  cancelAt: string | null;
  canceledAt: string | null;
}

/**
 * Map Stripe subscription.status → subscription_active (spec §13–§15).
 *
 * Temporary payment issues (past_due, unpaid during retry) MUST NOT revoke
 * access. Only confirmed inactive states flip the flag to false.
 */
export function subscriptionActiveFromStripeStatus(status: string): boolean {
  return ACTIVE_STATUSES.has(status);
}

function unixToIso(value: number | null | undefined): string | null {
  if (!value) return null;
  return new Date(value * 1000).toISOString();
}

function maxSubscriptionItemPeriodEnd(subscription: Stripe.Subscription): number | null {
  const ends = subscription.items.data
    .map((item) => item.current_period_end)
    .filter((value): value is number => typeof value === "number");
  if (ends.length === 0) return null;
  return Math.max(...ends);
}

export function billingAccessFromStoredState(input: {
  status: string | null;
  cancelAtPeriodEnd?: boolean | null;
  currentPeriodEnd?: string | null;
  cancelAt?: string | null;
  now?: Date;
}): boolean {
  const status = input.status ?? "";
  if (INACTIVE_STATUSES.has(status)) return false;
  if (!ACTIVE_STATUSES.has(status)) return false;

  const nowMs = (input.now ?? new Date()).getTime();
  if (input.cancelAt && new Date(input.cancelAt).getTime() <= nowMs) {
    return false;
  }
  if (
    input.cancelAtPeriodEnd &&
    input.currentPeriodEnd &&
    new Date(input.currentPeriodEnd).getTime() <= nowMs
  ) {
    return false;
  }
  return true;
}

export function billingAccessFromStripeSubscription(
  subscription: Stripe.Subscription,
  now = new Date(),
  statusOverride?: string
): BillingEntitlementSnapshot {
  const status = statusOverride ?? subscription.status;
  const currentPeriodEnd = unixToIso(maxSubscriptionItemPeriodEnd(subscription));
  const cancelAt = unixToIso(subscription.cancel_at);
  const canceledAt = unixToIso(subscription.canceled_at);
  const cancelAtPeriodEnd = subscription.cancel_at_period_end;

  return {
    status,
    subscriptionActive: billingAccessFromStoredState({
      status,
      cancelAtPeriodEnd,
      currentPeriodEnd,
      cancelAt,
      now,
    }),
    currentPeriodEnd,
    cancelAtPeriodEnd,
    cancelAt,
    canceledAt,
  };
}
