export const AUGUST_2026_DISCOUNT_START = new Date("2026-07-31T22:00:00.000Z");
export const AUGUST_2026_DISCOUNT_END = new Date("2026-08-31T22:00:00.000Z");

export function isAugust2026LaunchDiscountActive(now = new Date()): boolean {
  return now >= AUGUST_2026_DISCOUNT_START && now < AUGUST_2026_DISCOUNT_END;
}
