import { describe, it, expect } from "vitest";
import { normalizeRemindTime } from "@/lib/officeDate";

describe("normalizeRemindTime", () => {
  it("accepts HH:mm and pads H:mm", () => {
    expect(normalizeRemindTime("16:48")).toBe("16:48");
    expect(normalizeRemindTime("9:05")).toBe("09:05");
    expect(normalizeRemindTime("14:30")).toBe("14:30");
  });

  it("accepts dot separator", () => {
    expect(normalizeRemindTime("16.48")).toBe("16:48");
    expect(normalizeRemindTime("8.00")).toBe("08:00");
  });

  it("rejects empty and invalid", () => {
    expect(normalizeRemindTime("")).toBeNull();
    expect(normalizeRemindTime("25:00")).toBeNull();
    expect(normalizeRemindTime("12:60")).toBeNull();
    expect(normalizeRemindTime("noon")).toBeNull();
    expect(normalizeRemindTime("abc")).toBeNull();
  });
});
