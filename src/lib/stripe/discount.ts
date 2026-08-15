import { env } from "@/lib/env";
import { isAugust2026LaunchDiscountActive } from "@/lib/billing/launchDiscount";

export function getAugust2026LaunchCouponId(now = new Date()): string | null {
  if (!isAugust2026LaunchDiscountActive(now)) return null;
  return env.stripeAugust2026CouponId;
}

export function getCheckoutDiscountConfig(now = new Date()):
  | { allow_promotion_codes: true }
  | { discounts: [{ coupon: string }] } {
  const couponId = getAugust2026LaunchCouponId(now);
  if (!couponId) return { allow_promotion_codes: true };
  return {
    discounts: [{ coupon: couponId }],
  };
}
