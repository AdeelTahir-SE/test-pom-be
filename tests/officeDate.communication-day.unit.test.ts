import { describe, expect, it } from "vitest";
import {
  isCommunicationDayAllowed,
  isJobCommunicationAllowed,
} from "@/lib/officeDate";

describe("a16 #4 communication day gate", () => {
  it("allows communication only on the matching calendar day", () => {
    expect(isCommunicationDayAllowed("2026-08-13", "2026-08-13")).toBe(true);
    expect(isCommunicationDayAllowed("2026-08-12", "2026-08-13")).toBe(false);
    expect(isCommunicationDayAllowed("2026-08-14", "2026-08-13")).toBe(false);
  });

  it("allows job messaging only when board day is today", () => {
    const today = "2026-08-13";
    expect(
      isJobCommunicationAllowed(
        {
          scheduled_at: "2026-08-13T10:00:00.000Z",
          created_at: "2026-08-10T10:00:00.000Z",
        },
        today
      )
    ).toBe(true);
    expect(
      isJobCommunicationAllowed(
        {
          scheduled_at: "2026-08-12T10:00:00.000Z",
          created_at: "2026-08-12T10:00:00.000Z",
        },
        today
      )
    ).toBe(false);
  });
});
