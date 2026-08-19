import { describe, it, expect } from "vitest";
import {
  billingAccessFromStoredState,
  billingAccessFromStripeSubscription,
  subscriptionActiveFromStripeStatus,
} from "@/lib/stripe/subscription";

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

  it("keeps scheduled cancellation active until the paid period ends", () => {
    expect(
      billingAccessFromStoredState({
        status: "active",
        cancelAtPeriodEnd: true,
        currentPeriodEnd: "2026-09-01T00:00:00.000Z",
        now: new Date("2026-08-15T00:00:00.000Z"),
      })
    ).toBe(true);
  });

  it("blocks scheduled cancellation after the paid period ends", () => {
    expect(
      billingAccessFromStoredState({
        status: "active",
        cancelAtPeriodEnd: true,
        currentPeriodEnd: "2026-09-01T00:00:00.000Z",
        now: new Date("2026-09-01T00:00:00.000Z"),
      })
    ).toBe(false);
  });

  it("keeps access when scheduled cancellation is undone", () => {
    expect(
      billingAccessFromStoredState({
        status: "active",
        cancelAtPeriodEnd: false,
        currentPeriodEnd: "2026-09-01T00:00:00.000Z",
        now: new Date("2026-08-15T00:00:00.000Z"),
      })
    ).toBe(true);
  });

  it("stores Stripe status unchanged and derives access from item period end", () => {
    const snapshot = billingAccessFromStripeSubscription(
      {
        status: "active",
        cancel_at_period_end: true,
        cancel_at: null,
        canceled_at: 1785000000,
        items: {
          data: [{ current_period_end: 1788134400 }],
        },
      } as never,
      new Date("2026-08-15T00:00:00.000Z")
    );

    expect(snapshot).toEqual({
      status: "active",
      subscriptionActive: true,
      currentPeriodEnd: "2026-08-31T00:00:00.000Z",
      cancelAtPeriodEnd: true,
      cancelAt: null,
      canceledAt: "2026-07-25T17:20:00.000Z",
    });
  });
});
