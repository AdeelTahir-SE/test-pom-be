import { describe, it, expect, afterAll } from "vitest";
import { api } from "./helpers/client";
import {
  registerCompany,
  createCompanyUser,
  loginAs,
  cleanupCompany,
  getTimelineEvents,
  type RegisteredCompany,
} from "./helpers/factories";

const createdCompanies: RegisteredCompany[] = [];

afterAll(async () => {
  for (const c of createdCompanies) {
    await cleanupCompany(c.companyId, c.userId);
  }
});

interface JobDto {
  id: string;
  status: string;
}
interface ChecklistItemDto {
  id: string;
}
interface FileDto {
  id: string;
}
interface MessageDto {
  id: string;
}

function uploadForm(text: string, name: string): FormData {
  const form = new FormData();
  form.append("files", new File([text], name, { type: "text/plain" }));
  return form;
}

describe("Phase 13 — End-to-End Scenario", () => {
  it(
    "register -> users -> job -> checklist -> files -> messages -> timeline, as owner/manager/worker",
    async () => {
      // 1. Register a company.
      const owner = await registerCompany({ business_module: "construction" });
      createdCompanies.push(owner);

      // 2. Owner creates a manager and a worker.
      const manager = await createCompanyUser(owner.accessToken!, {
        role: "manager",
        full_name: "Alma B.",
      });
      const worker = await createCompanyUser(owner.accessToken!, {
        role: "worker",
        full_name: "Max West",
      });
      const managerLogin = await loginAs(manager.email, manager.password);
      const managerToken = managerLogin.body.data?.access_token as string;
      const workerLogin = await loginAs(worker.email, worker.password);
      const workerToken = workerLogin.body.data?.access_token as string;

      // 3. Manager creates a job and assigns the worker.
      const jobRes = await api.post<{ data?: { job: JobDto } }>("/api/jobs", {
        token: managerToken,
        body: { title: "Site inspection", location: "Hospital", worker_id: worker.userId },
      });
      expect(jobRes.status).toBe(201);
      const jobId = jobRes.body.data!.job.id;

      // 4. Manager adds checklist items.
      const item1 = await api.post<{ data?: { item: ChecklistItemDto } }>(
        `/api/jobs/${jobId}/checklist`,
        { token: managerToken, body: { label: "Inspect scaffolding" } }
      );
      const item2 = await api.post<{ data?: { item: ChecklistItemDto } }>(
        `/api/jobs/${jobId}/checklist`,
        { token: managerToken, body: { label: "Photograph damage", requires_attachment: true } }
      );
      expect(item1.status).toBe(201);
      expect(item2.status).toBe(201);

      // 5. Worker starts the job and completes the first checklist item.
      const toInProgress = await api.patch<{ data?: { job: JobDto } }>(`/api/jobs/${jobId}`, {
        token: workerToken,
        body: { status: "in_progress" },
      });
      expect(toInProgress.body.data?.job.status).toBe("in_progress");
      await api.patch(`/api/checklist-items/${item1.body.data!.item.id}`, {
        token: workerToken,
        body: { is_completed: true },
      });

      // 6. Worker uploads a file as evidence for the second item.
      const form = uploadForm("scaffolding photo notes", "damage-notes.txt");
      form.append("checklist_item_id", item2.body.data!.item.id);
      const fileRes = await api.post<{ data?: { files: FileDto[] } }>(
        `/api/jobs/${jobId}/files`,
        { token: workerToken, body: form }
      );
      expect(fileRes.status).toBe(201);
      await api.patch(`/api/checklist-items/${item2.body.data!.item.id}`, {
        token: workerToken,
        body: { is_completed: true },
      });

      // 7. Worker reports to the office; manager replies.
      const workerMsg = await api.post<{ data?: { message: MessageDto } }>(
        `/api/jobs/${jobId}/messages`,
        { token: workerToken, body: { content: "Scaffolding looks fine, minor cracking noted." } }
      );
      expect(workerMsg.status).toBe(201);
      const managerReply = await api.post<{ data?: { message: MessageDto } }>(
        `/api/jobs/${jobId}/messages`,
        { token: managerToken, body: { content: "Thanks, please finish up." } }
      );
      expect(managerReply.status).toBe(201);

      // 8. Worker finishes the job.
      await api.patch(`/api/jobs/${jobId}`, { token: workerToken, body: { status: "waiting" } });
      const completedRes = await api.patch<{ data?: { job: JobDto } }>(`/api/jobs/${jobId}`, {
        token: workerToken,
        body: { status: "completed" },
      });
      expect(completedRes.body.data?.job.status).toBe("completed");

      // 9. Timeline reflects the full story, in order, for every role involved.
      const timelineRes = await api.get<{ data?: { timeline: { event_type: string }[] } }>(
        `/api/jobs/${jobId}/timeline`,
        { token: owner.accessToken }
      );
      const eventTypes = timelineRes.body.data!.timeline.map((e) => e.event_type);
      expect(eventTypes).toEqual([
        "job_created",
        "status_changed", // -> in_progress
        "checklist_completed", // item1
        "document_uploaded", // damage-notes.txt
        "checklist_completed", // item2
        "message_sent", // worker
        "message_sent", // manager
        "status_changed", // -> waiting
        "job_completed",
      ]);

      // 10. Notifications landed for the right people.
      const workerNotifs = await api.get<{ data?: { notifications: { type: string }[] } }>(
        "/api/notifications",
        { token: workerToken }
      );
      expect(workerNotifs.body.data?.notifications.some((n) => n.type === "job_assigned")).toBe(
        true
      );
      expect(
        workerNotifs.body.data?.notifications.some((n) => n.type === "message_received")
      ).toBe(true);

      // Office channel is a shared feed — managers see messages there, not as
      // personal message_received copies of every office-bound send.
      const dayKey = new Date().toISOString().slice(0, 10);
      const officeFeed = await api.get<{ data?: { messages: { content: string }[] } }>(
        `/api/office/communications?date=${dayKey}`,
        { token: managerToken }
      );
      expect(officeFeed.status).toBe(200);
      const feedTexts = officeFeed.body.data?.messages.map((m) => m.content) ?? [];
      expect(feedTexts.some((c) => c.includes("Scaffolding"))).toBe(true);
      expect(feedTexts.some((c) => c.includes("Thanks"))).toBe(true);

      // 11. A now-completed job can no longer be modified (immutability holds
      // even at the end of a real multi-role workflow, not just in isolation).
      const lateEdit = await api.patch(`/api/jobs/${jobId}`, {
        token: managerToken,
        body: { title: "Too late" },
      });
      expect(lateEdit.status).toBe(409);
    },
    60_000
  );
});

describe("Phase 13 — Cross-Company Isolation Red-Team", () => {
  it(
    "company B is rejected on every endpoint touching company A's resources",
    async () => {
      const companyA = await registerCompany();
      createdCompanies.push(companyA);
      const workerA = await createCompanyUser(companyA.accessToken!, { role: "worker" });

      const jobRes = await api.post<{ data?: { job: JobDto } }>("/api/jobs", {
        token: companyA.accessToken,
        body: { title: "Company A job", worker_id: workerA.userId },
      });
      const jobId = jobRes.body.data!.job.id;

      const itemRes = await api.post<{ data?: { item: ChecklistItemDto } }>(
        `/api/jobs/${jobId}/checklist`,
        { token: companyA.accessToken, body: { label: "A's item" } }
      );
      const itemId = itemRes.body.data!.item.id;

      const fileRes = await api.post<{ data?: { files: FileDto[] } }>(
        `/api/jobs/${jobId}/files`,
        { token: companyA.accessToken, body: uploadForm("secret", "a-secret.txt") }
      );
      const fileId = fileRes.body.data!.files[0]!.id;

      await api.post(`/api/jobs/${jobId}/messages`, {
        token: companyA.accessToken,
        body: { content: "Internal note" },
      });

      const reminderRes = await api.post<{ data?: { reminder: { id: string } } }>(
        "/api/office-reminders",
        { token: companyA.accessToken, body: { title: "A's reminder" } }
      );
      const reminderId = reminderRes.body.data!.reminder.id;

      const companyB = await registerCompany();
      createdCompanies.push(companyB);
      const b = companyB.accessToken;

      const attempts: Promise<{ status: number }>[] = [
        api.get(`/api/jobs/${jobId}`, { token: b }),
        api.patch(`/api/jobs/${jobId}`, { token: b, body: { title: "Hijack" } }),
        api.get(`/api/jobs/${jobId}/checklist`, { token: b }),
        api.post(`/api/jobs/${jobId}/checklist`, { token: b, body: { label: "Hijack" } }),
        api.patch(`/api/checklist-items/${itemId}`, { token: b, body: { is_completed: true } }),
        api.get(`/api/jobs/${jobId}/files`, { token: b }),
        api.post(`/api/jobs/${jobId}/files`, { token: b, body: uploadForm("x", "hijack.txt") }),
        api.get(`/api/files/${fileId}`, { token: b }),
        api.patch(`/api/files/${fileId}`, { token: b, body: { hidden: true } }),
        api.get(`/api/jobs/${jobId}/messages`, { token: b }),
        api.post(`/api/jobs/${jobId}/messages`, { token: b, body: { content: "Hijack" } }),
        api.patch(`/api/jobs/${jobId}/messages/read`, { token: b }),
        api.get(`/api/jobs/${jobId}/timeline`, { token: b }),
        api.patch(`/api/office-reminders/${reminderId}`, { token: b, body: { hidden: true } }),
      ];

      const results = await Promise.all(attempts);
      for (const res of results) {
        expect([403, 404]).toContain(res.status);
      }

      // Search must never leak company A's content into company B's results.
      const searchRes = await api.get<{ data?: { results: unknown[] } }>(
        "/api/search?q=secret",
        { token: b }
      );
      expect(searchRes.body.data?.results).toEqual([]);
    },
    60_000
  );
});
