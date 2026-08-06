import { describe, expect, it } from "vitest";
import {
  clearRateLimit,
  isRateLimited,
  recordFailedAttempt,
  type RateLimitBucket,
} from "@/lib/http/rateLimit";

describe("login rate limit helpers", () => {
  it("allows traffic until max attempts in the window", () => {
    const store = new Map<string, RateLimitBucket>();
    const now = 1_000_000;
    const windowMs = 15 * 60 * 1000;

    expect(isRateLimited(store, "1.1.1.1", 5, now)).toBe(false);

    for (let i = 0; i < 5; i++) {
      recordFailedAttempt(store, "1.1.1.1", windowMs, now);
    }

    expect(isRateLimited(store, "1.1.1.1", 5, now)).toBe(true);
    expect(isRateLimited(store, "2.2.2.2", 5, now)).toBe(false);
  });

  it("resets after the window expires", () => {
    const store = new Map<string, RateLimitBucket>();
    const now = 1_000_000;
    const windowMs = 15 * 60 * 1000;

    for (let i = 0; i < 5; i++) {
      recordFailedAttempt(store, "1.1.1.1", windowMs, now);
    }
    expect(isRateLimited(store, "1.1.1.1", 5, now)).toBe(true);
    expect(isRateLimited(store, "1.1.1.1", 5, now + windowMs + 1)).toBe(false);
  });

  it("clears on successful login", () => {
    const store = new Map<string, RateLimitBucket>();
    const now = 1_000_000;
    recordFailedAttempt(store, "1.1.1.1", 60_000, now);
    clearRateLimit(store, "1.1.1.1");
    expect(isRateLimited(store, "1.1.1.1", 5, now)).toBe(false);
  });
});
