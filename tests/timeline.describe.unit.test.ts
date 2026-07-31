import { describe, it, expect } from "vitest";
import { describeTimelineEvent, formatCardId } from "@/lib/timeline/describe";
import { translations, type TranslationKey } from "@/lib/translations";

const tSl = (key: TranslationKey) => translations.sl[key];
const tEn = (key: TranslationKey) => translations.en[key];

describe("formatCardId", () => {
  it("pads job_seq from metadata", () => {
    expect(formatCardId({ job_seq: 7 })).toBe("#007");
  });

  it("uses fallback card id", () => {
    expect(formatCardId({}, "#012")).toBe("#012");
    expect(formatCardId({}, "12")).toBe("#12");
  });
});

describe("describeTimelineEvent", () => {
  it("shows worker name for worker_assigned (reassignment)", () => {
    const line = describeTimelineEvent(
      {
        event_type: "worker_assigned",
        metadata: { worker_name: "Janez", job_seq: 1 },
      },
      tSl
    );
    expect(line).toContain("Janez");
    expect(line).toContain("#001");
  });

  it("falls back to cardNumber prop when metadata has no job_seq", () => {
    const line = describeTimelineEvent(
      { event_type: "worker_assigned", metadata: { worker_name: "Janez" } },
      tEn,
      "#003"
    );
    expect(line).toContain("Janez");
    expect(line).toContain("#003");
  });

  it("includes card id on attachment uploads", () => {
    const line = describeTimelineEvent(
      {
        event_type: "image_uploaded",
        metadata: { file_name: "foto.jpg", job_seq: 4 },
      },
      tSl
    );
    expect(line).toBe("Slika naložena: #004 · foto.jpg");
  });

  it("includes card id on checklist completion", () => {
    const line = describeTimelineEvent(
      {
        event_type: "checklist_completed",
        metadata: { label: "Fotografiraj", job_seq: 2 },
      },
      tSl
    );
    expect(line).toBe("Zaključen korak: #002 · Fotografiraj");
  });

  it("includes sender_name and full message text for message_sent", () => {
    const long =
      "Prosim preveri material na lokaciji pred začetkom dela in sporoči če česa manjka.";
    const line = describeTimelineEvent(
      {
        event_type: "message_sent",
        metadata: {
          content: long,
          sender_name: "Ana Manager",
          job_seq: 5,
        },
      },
      tEn
    );
    expect(line).toContain("#005");
    expect(line).toContain("Ana Manager");
    expect(line).toContain(long);
  });

  it("formats job_created with date, worker, and created_by", () => {
    const line = describeTimelineEvent(
      {
        event_type: "job_created",
        metadata: {
          title: "Fix pipe",
          job_seq: 12,
          created_on: "2026-07-30",
          worker_name: "Janez",
          created_by_name: "Ana Manager",
        },
      },
      tSl
    );
    expect(line).toContain("Delovni nalog ustvarjen");
    expect(line).toContain("#012");
    expect(line).toContain("Fix pipe");
    expect(line).toContain("30.07.2026");
    expect(line).toContain("Janez");
    expect(line).toContain("ustvaril Ana Manager");
  });

  it("formats customer_note job_updated with sender and content", () => {
    const line = describeTimelineEvent(
      {
        event_type: "job_updated",
        metadata: {
          kind: "customer_note",
          content: "Prefer morning visits",
          sender_name: "Ana Manager",
          job_seq: 3,
        },
      },
      tEn
    );
    expect(line).toContain("Note");
    expect(line).toContain("Ana Manager");
    expect(line).toContain("Prefer morning visits");
  });
});
