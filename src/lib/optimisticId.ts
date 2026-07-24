/** Client-only ids used for optimistic UI before the API returns a real UUID. */
export function isOptimisticId(id: string): boolean {
  return id.startsWith("opt-");
}

export function newOptimisticId(prefix = "opt"): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
