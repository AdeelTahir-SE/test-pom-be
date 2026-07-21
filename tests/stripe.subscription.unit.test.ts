import { describe, it, expect } from "vitest";
import { subscriptionActiveFromStripeStatus } from "@/lib/stripe/subscription";

describe("subscriptionActiveFromStripeStatus", () => {
  it("grants access for active / trialing / past_due", () => {
    expect(subscriptionActiveFromStripeStatus("active")).toBe(true);
    expect(subscriptionActiveFromStripeStatus("trialing")).toBe(true);
    expect(subscriptionActiveFromStripeStatus("past_due")).toBe(true);
  });

  it("revokes only for confirmed inactive states", () => {
    expect(subscriptionActiveFromStripeStatus("canceled")).toBe(false);
    expect(subscriptionActiveFromStripeStatus("unpaid")).toBe(false);
    expect(subscriptionActiveFromStripeStatus("incomplete_expired")).toBe(false);
    expect(subscriptionActiveFromStripeStatus("paused")).toBe(false);
    expect(subscriptionActiveFromStripeStatus("incomplete")).toBe(false);
  });
});
