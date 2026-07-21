/**
 * Map Stripe subscription.status → subscription_active (spec §13–§15).
 *
 * Temporary payment issues (past_due, unpaid during retry) MUST NOT revoke
 * access. Only confirmed inactive states flip the flag to false.
 */
export function subscriptionActiveFromStripeStatus(status: string): boolean {
  switch (status) {
    case "active":
    case "trialing":
    case "past_due":
      return true;
    case "canceled":
    case "unpaid":
    case "incomplete_expired":
    case "paused":
      return false;
    case "incomplete":
      // Checkout not finished — do not grant access yet.
      return false;
    default:
      return false;
  }
}
