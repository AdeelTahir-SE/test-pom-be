import { describe, it, expect } from "vitest";
import {
  isJobCardMutable,
  jobBoardDayKey,
  shiftDayKey,
} from "@/lib/officeDate";

describe("job card freeze (Mark a16)", () => {
  const today = "2026-08-12";
  const yesterday = "2026-08-11";
  const twoDaysAgo = "2026-08-10";
  const weeksAgo = "2026-07-29";

  it("shiftDayKey moves calendar days", () => {
    expect(shiftDayKey(today, -1)).toBe(yesterday);
    expect(shiftDayKey(today, -2)).toBe(twoDaysAgo);
  });

  it("allows today and yesterday; freezes 2+ days ago", () => {
    expect(
      isJobCardMutable(
        { scheduled_at: `${today}T12:00:00.000Z`, created_at: `${weeksAgo}T12:00:00.000Z` },
        today
      )
    ).toBe(true);
    expect(
      isJobCardMutable(
        { scheduled_at: `${yesterday}T12:00:00.000Z`, created_at: `${weeksAgo}T12:00:00.000Z` },
        today
      )
    ).toBe(true);
    expect(
      isJobCardMutable(
        { scheduled_at: `${twoDaysAgo}T12:00:00.000Z`, created_at: `${weeksAgo}T12:00:00.000Z` },
        today
      )
    ).toBe(false);
    expect(
      isJobCardMutable(
        { scheduled_at: `${weeksAgo}T12:00:00.000Z`, created_at: `${weeksAgo}T12:00:00.000Z` },
        today
      )
    ).toBe(false);
  });

  it("undated jobs use created_at as board day", () => {
    expect(
      jobBoardDayKey({
        scheduled_at: null,
        created_at: `${twoDaysAgo}T08:00:00.000Z`,
      })
    ).toBe(twoDaysAgo);
    expect(
      isJobCardMutable(
        { scheduled_at: null, created_at: `${twoDaysAgo}T08:00:00.000Z` },
        today
      )
    ).toBe(false);
  });
});
