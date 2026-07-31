import { describe, it, expect } from "vitest";
import { isScheduledAtInPast, localDayToScheduledAt, startOfLocalDay } from "../src/lib/officeDate";

describe("isScheduledAtInPast", () => {
  it("rejects yesterday", () => {
    const yesterday = startOfLocalDay();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(isScheduledAtInPast(localDayToScheduledAt(yesterday))).toBe(true);
  });

  it("allows today and tomorrow", () => {
    const today = startOfLocalDay();
    const tomorrow = startOfLocalDay();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(isScheduledAtInPast(localDayToScheduledAt(today))).toBe(false);
    expect(isScheduledAtInPast(localDayToScheduledAt(tomorrow))).toBe(false);
  });
});
