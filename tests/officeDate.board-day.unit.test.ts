import { describe, it, expect } from "vitest";
import {
  boardTodayKey,
  jobBelongsToDay,
  parseOfficeBoardDayParam,
  reminderBelongsToDay,
  toIsoDate,
  startOfLocalDay,
} from "../src/lib/officeDate";

describe("office board day helpers", () => {
  it("parseOfficeBoardDayParam accepts YYYY-MM-DD or defaults to today", () => {
    const today = boardTodayKey();
    expect(parseOfficeBoardDayParam(null, today)).toBe(today);
    expect(parseOfficeBoardDayParam("2026-03-15", today)).toBe("2026-03-15");
    expect(parseOfficeBoardDayParam("bad", today)).toBe(today);
  });

  it("jobBelongsToDay matches scheduled_at local day; undated only on today", () => {
    const today = toIsoDate(startOfLocalDay());
    const tomorrow = new Date(startOfLocalDay());
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowKey = toIsoDate(tomorrow);

    const scheduledTomorrow = {
      scheduled_at: new Date(
        tomorrow.getFullYear(),
        tomorrow.getMonth(),
        tomorrow.getDate(),
        12,
        0,
        0
      ).toISOString(),
      created_at: new Date().toISOString(),
    };

    expect(jobBelongsToDay(scheduledTomorrow, tomorrowKey, today)).toBe(true);
    expect(jobBelongsToDay(scheduledTomorrow, today, today)).toBe(false);

    const undated = { scheduled_at: null, created_at: new Date().toISOString() };
    expect(jobBelongsToDay(undated, today, today)).toBe(true);
    expect(jobBelongsToDay(undated, tomorrowKey, today)).toBe(false);
  });

  it("reminderBelongsToDay exact-matches remind_on; null only on today", () => {
    const today = "2026-07-30";
    const yesterday = "2026-07-29";
    const tomorrow = "2026-07-31";
    const created_at = "2026-07-30T10:00:00.000Z";

    expect(
      reminderBelongsToDay({ remind_on: today, created_at }, today, today)
    ).toBe(true);
    expect(
      reminderBelongsToDay({ remind_on: yesterday, created_at }, today, today)
    ).toBe(false);
    expect(
      reminderBelongsToDay({ remind_on: tomorrow, created_at }, tomorrow, today)
    ).toBe(true);
    expect(
      reminderBelongsToDay({ remind_on: null, created_at }, today, today)
    ).toBe(true);
    expect(
      reminderBelongsToDay({ remind_on: null, created_at }, tomorrow, today)
    ).toBe(false);
  });
});
