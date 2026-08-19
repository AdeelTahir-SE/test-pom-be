import { describe, expect, it, vi } from "vitest";
import { isAugust2026LaunchDiscountActive } from "@/lib/billing/launchDiscount";
import { getCheckoutDiscountConfig } from "@/lib/stripe/discount";

describe("August 2026 Stripe launch discount", () => {
  it("is active for August 2026 in Slovenia time", () => {
    expect(isAugust2026LaunchDiscountActive(new Date("2026-07-31T21:59:59.999Z"))).toBe(false);
    expect(isAugust2026LaunchDiscountActive(new Date("2026-07-31T22:00:00.000Z"))).toBe(true);
    expect(isAugust2026LaunchDiscountActive(new Date("2026-08-15T12:00:00.000Z"))).toBe(true);
    expect(isAugust2026LaunchDiscountActive(new Date("2026-08-31T21:59:59.999Z"))).toBe(true);
    expect(isAugust2026LaunchDiscountActive(new Date("2026-08-31T22:00:00.000Z"))).toBe(false);
  });

  it("adds the configured once-off coupon during the launch window", () => {
    vi.stubEnv("STRIPE_AUGUST_2026_COUPON_ID", "coupon_august_2026");

    expect(getCheckoutDiscountConfig(new Date("2026-08-15T12:00:00.000Z"))).toEqual({
      discounts: [{ coupon: "coupon_august_2026" }],
    });

    vi.unstubAllEnvs();
  });

  it("allows promotion codes outside the launch window", () => {
    vi.stubEnv("STRIPE_AUGUST_2026_COUPON_ID", "coupon_august_2026");

    expect(getCheckoutDiscountConfig(new Date("2026-09-01T12:00:00.000Z"))).toEqual({
      allow_promotion_codes: true,
    });

    vi.unstubAllEnvs();
  });

  it("throws a clear env error if the August coupon is missing during the launch window", () => {
    vi.stubEnv("STRIPE_AUGUST_2026_COUPON_ID", "");

    expect(() =>
      getCheckoutDiscountConfig(new Date("2026-08-15T12:00:00.000Z"))
    ).toThrow(/STRIPE_AUGUST_2026_COUPON_ID/);

    vi.unstubAllEnvs();
  });
});
