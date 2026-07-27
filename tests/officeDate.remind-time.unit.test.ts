import { describe, it, expect } from "vitest";
import { normalizeRemindTime } from "@/lib/officeDate";

describe("normalizeRemindTime", () => {
  it("accepts HH:mm", () => {
    expect(normalizeRemindTime("16:48")).toBe("16:48");
    expect(normalizeRemindTime("9:05")).toBe("09:05");
  });

  it("accepts dot separator", () => {
    expect(normalizeRemindTime("16.48")).toBe("16:48");
  });

  it("rejects invalid values", () => {
    expect(normalizeRemindTime("")).toBeNull();
    expect(normalizeRemindTime("25:00")).toBeNull();
    expect(normalizeRemindTime("abc")).toBeNull();
  });
});
