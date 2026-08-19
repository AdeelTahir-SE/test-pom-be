import { describe, expect, it } from "vitest";
import { jobToWorkerCard, reminderToCard, type ApiChecklistItem, type ApiJob, type ApiOfficeReminder } from "@/lib/dashboardMappers";

const t = ((key: string) => {
  if (key === "cardSenderOffice") return "Pisarna";
  if (key === "cardUnassigned") return "Nedodeljeno";
  return key;
}) as Parameters<typeof jobToWorkerCard>[3];

describe("dashboard mappers", () => {
  it("shows only completion time for checklist items", () => {
    const job: ApiJob = {
      id: "job-1",
      company_seq: 1,
      status: "pending",
      title: "Servis",
      description: null,
      priority: null,
      customer: null,
      location: null,
      scheduled_at: null,
      started_at: null,
      completed_at: null,
      worker_id: null,
      created_at: "2026-08-16T08:00:00.000Z",
    };
    const checklist: ApiChecklistItem[] = [
      {
        id: "step-1",
        job_id: "job-1",
        label: "Preveri",
        order_index: 0,
        is_completed: true,
        completed_at: "2025-01-02T13:45:00.000Z",
        requires_attachment: false,
        has_attachment: false,
      },
    ];

    const card = jobToWorkerCard(job, checklist, undefined, t);
    expect(card.tasks[0]?.completedAt).toMatch(/^\d{2}:\d{2}$/);
  });

  it("uses office reminder creator name instead of generic office label", () => {
    const reminder: ApiOfficeReminder = {
      id: "rem-1",
      title: "Pokliči stranko",
      description: null,
      is_urgent: false,
      remind_on: "2026-08-16",
      remind_time: "10:00",
      actions: [],
      action_state: {},
      phone: null,
      link: null,
      order_index: 0,
      hidden_at: null,
      created_by: "user-1",
      created_by_name: "Ana Novak",
      created_at: "2026-08-16T08:00:00.000Z",
    };

    expect(reminderToCard(reminder, t).workerName).toBe("Ana Novak");
  });
});
