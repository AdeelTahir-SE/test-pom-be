// Business Module is configuration only — backend validates the string, never interprets meaning.
// (Foundation Part 2 §8, Part 3 §20)

export const ALLOWED_BUSINESS_MODULES = [
  "construction",
  "field_service",
  "cleaning",
  "installation",
  "facility_management",
  "logistics",
  "moving",
] as const;

export type BusinessModule = (typeof ALLOWED_BUSINESS_MODULES)[number];

export function isValidBusinessModule(value: unknown): value is BusinessModule {
  return (
    typeof value === "string" &&
    (ALLOWED_BUSINESS_MODULES as readonly string[]).includes(value)
  );
}
