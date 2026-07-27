import { describe, it, expect } from "vitest";
import {
  boardTodayKey,
  jobBelongsToDay,
  parseOfficeBoardDayParam,
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
});
