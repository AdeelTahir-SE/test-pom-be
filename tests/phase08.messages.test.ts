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

interface MessageDto {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  is_urgent: boolean;
  read_at: string | null;
  created_at: string;
}

interface NotificationDto {
  id: string;
  type: string;
  title: string;
  is_read: boolean;
  hidden_at: string | null;
  job_id: string | null;
}

async function setupCompanyWithWorkerAndJob() {
  const owner = await registerCompany();
  createdCompanies.push(owner);
  const worker = await createCompanyUser(owner.accessToken!, { role: "worker" });
  const workerLogin = await loginAs(worker.email, worker.password);
  const workerToken = workerLogin.body.data?.access_token as string;

  const jobRes = await api.post<{ data?: { job: JobDto } }>("/api/jobs", {
    token: owner.accessToken,
    body: { title: "Messages test job", worker_id: worker.userId },
  });
  const jobId = jobRes.body.data!.job.id;

  return { owner, worker, workerToken, jobId };
}

describe("Phase 8 — Messages", () => {
  it("worker sends a message to the office (default recipient = job creator)", async () => {
    const { owner, jobId, workerToken } = await setupCompanyWithWorkerAndJob();

    const res = await api.post<{ data?: { message: MessageDto } }>(
      `/api/jobs/${jobId}/messages`,
      { token: workerToken, body: { content: "On my way." } }
    );
    expect(res.status).toBe(201);
    expect(res.body.data?.message.recipient_id).toBe(owner.userId);

    const events = await getTimelineEvents(jobId);
    expect(events.map((e) => e.event_type)).toContain("message_sent");
  });

  it("owner sends a message to the assigned worker (default recipient)", async () => {
    const { owner, worker, jobId } = await setupCompanyWithWorkerAndJob();
    const res = await api.post<{ data?: { message: MessageDto } }>(
      `/api/jobs/${jobId}/messages`,
      { token: owner.accessToken, body: { content: "New pickup time 14:00.", is_urgent: true } }
    );
    expect(res.status).toBe(201);
    expect(res.body.data?.message.recipient_id).toBe(worker.userId);
    expect(res.body.data?.message.is_urgent).toBe(true);
  });

  it("worker cannot message another worker (403)", async () => {
    const owner = await registerCompany();
    createdCompanies.push(owner);
    const workerA = await createCompanyUser(owner.accessToken!, { role: "worker" });
    const workerB = await createCompanyUser(owner.accessToken!, { role: "worker" });

    const jobRes = await api.post<{ data?: { job: JobDto } }>("/api/jobs", {
      token: owner.accessToken,
      body: { title: "A's job", worker_id: workerA.userId },
    });
    const jobId = jobRes.body.data!.job.id;
    const loginA = await loginAs(workerA.email, workerA.password);

    const res = await api.post(`/api/jobs/${jobId}/messages`, {
      token: loginA.body.data?.access_token,
      body: { content: "Hey", recipient_id: workerB.userId },
    });
    expect(res.status).toBe(403);
  });

  it("owner cannot message a worker who isn't assigned to this job (403)", async () => {
    const owner = await registerCompany();
    createdCompanies.push(owner);
    const workerA = await createCompanyUser(owner.accessToken!, { role: "worker" });
    const workerB = await createCompanyUser(owner.accessToken!, { role: "worker" });

    const jobRes = await api.post<{ data?: { job: JobDto } }>("/api/jobs", {
      token: owner.accessToken,
      body: { title: "A's job", worker_id: workerA.userId },
    });
    const jobId = jobRes.body.data!.job.id;

    const res = await api.post(`/api/jobs/${jobId}/messages`, {
      token: owner.accessToken,
      body: { content: "Hey", recipient_id: workerB.userId },
    });
    expect(res.status).toBe(403);
  });

  it("rejects a message over 400 characters", async () => {
    const { owner, jobId } = await setupCompanyWithWorkerAndJob();
    const res = await api.post(`/api/jobs/${jobId}/messages`, {
      token: owner.accessToken,
      body: { content: "x".repeat(401) },
    });
    expect(res.status).toBe(400);
  });

  it("rejects an empty message", async () => {
    const { owner, jobId } = await setupCompanyWithWorkerAndJob();
    const res = await api.post(`/api/jobs/${jobId}/messages`, {
      token: owner.accessToken,
      body: { content: "" },
    });
    expect(res.status).toBe(400);
  });

  it("lists messages oldest first", async () => {
    const { owner, jobId } = await setupCompanyWithWorkerAndJob();
    await api.post(`/api/jobs/${jobId}/messages`, { token: owner.accessToken, body: { content: "First" } });
    await api.post(`/api/jobs/${jobId}/messages`, { token: owner.accessToken, body: { content: "Second" } });

    const res = await api.get<{ data?: { messages: MessageDto[] } }>(
      `/api/jobs/${jobId}/messages`,
      { token: owner.accessToken }
    );
    expect(res.body.data?.messages.map((m) => m.content)).toEqual(["First", "Second"]);
  });

  it("marking a job's messages as read only affects the current user's unread messages as recipient", async () => {
    const { owner, worker, workerToken, jobId } = await setupCompanyWithWorkerAndJob();

    await api.post(`/api/jobs/${jobId}/messages`, { token: owner.accessToken, body: { content: "To worker" } });
    await api.post(`/api/jobs/${jobId}/messages`, { token: workerToken, body: { content: "To office" } });

    const readRes = await api.patch<{ data?: { updated_count: number } }>(
      `/api/jobs/${jobId}/messages/read`,
      { token: workerToken }
    );
    expect(readRes.status).toBe(200);
    expect(readRes.body.data?.updated_count).toBe(1);

    const messages = await api.get<{ data?: { messages: MessageDto[] } }>(
      `/api/jobs/${jobId}/messages`,
      { token: owner.accessToken }
    );
    const toWorker = messages.body.data!.messages.find((m) => m.recipient_id === worker.userId)!;
    const toOffice = messages.body.data!.messages.find((m) => m.recipient_id === owner.userId)!;
    expect(toWorker.read_at).toBeTruthy();
    expect(toOffice.read_at).toBeNull();
  });

  it("unread-count reflects reality and drops to zero after marking read", async () => {
    const { workerToken, jobId, owner } = await setupCompanyWithWorkerAndJob();

    await api.post(`/api/jobs/${jobId}/messages`, { token: owner.accessToken, body: { content: "msg 1" } });
    await api.post(`/api/jobs/${jobId}/messages`, { token: owner.accessToken, body: { content: "msg 2" } });

    const before = await api.get<{ data?: { unread_count: number } }>("/api/messages/unread-count", {
      token: workerToken,
    });
    expect(before.body.data?.unread_count).toBe(2);

    await api.patch(`/api/jobs/${jobId}/messages/read`, { token: workerToken });

    const after = await api.get<{ data?: { unread_count: number } }>("/api/messages/unread-count", {
      token: workerToken,
    });
    expect(after.body.data?.unread_count).toBe(0);
  });

  it("a worker not assigned to the job is blocked from its messages (403)", async () => {
    const owner = await registerCompany();
    createdCompanies.push(owner);
    const workerA = await createCompanyUser(owner.accessToken!, { role: "worker" });
    const workerB = await createCompanyUser(owner.accessToken!, { role: "worker" });

    const jobRes = await api.post<{ data?: { job: JobDto } }>("/api/jobs", {
      token: owner.accessToken,
      body: { title: "A's job", worker_id: workerA.userId },
    });
    const jobId = jobRes.body.data!.job.id;
    const loginB = await loginAs(workerB.email, workerB.password);

    const res = await api.get(`/api/jobs/${jobId}/messages`, { token: loginB.body.data?.access_token });
    expect(res.status).toBe(403);
  });

  it("cross-company access to messages is rejected as 404", async () => {
    const companyA = await registerCompany();
    createdCompanies.push(companyA);
    const companyB = await registerCompany();
    createdCompanies.push(companyB);

    const jobRes = await api.post<{ data?: { job: JobDto } }>("/api/jobs", {
      token: companyA.accessToken,
      body: { title: "Company A job" },
    });
    const jobId = jobRes.body.data!.job.id;

    const res = await api.get(`/api/jobs/${jobId}/messages`, { token: companyB.accessToken });
    expect(res.status).toBe(404);
  });
});

describe("Phase 8 — Notifications", () => {
  it("sending a message creates a message_received notification for the recipient only", async () => {
    const { owner, worker, workerToken, jobId } = await setupCompanyWithWorkerAndJob();
    await api.post(`/api/jobs/${jobId}/messages`, { token: owner.accessToken, body: { content: "Hi" } });

    const workerNotifs = await api.get<{ data?: { notifications: NotificationDto[] } }>(
      "/api/notifications",
      { token: workerToken }
    );
    expect(
      workerNotifs.body.data?.notifications.some(
        (n) => n.type === "message_received" && n.job_id === jobId
      )
    ).toBe(true);

    const ownerNotifs = await api.get<{ data?: { notifications: NotificationDto[] } }>(
      "/api/notifications",
      { token: owner.accessToken }
    );
    expect(ownerNotifs.body.data?.notifications.some((n) => n.type === "message_received")).toBe(
      false
    );
  });

  it("assigning a worker to a job creates a job_assigned notification", async () => {
    const { workerToken, jobId } = await setupCompanyWithWorkerAndJob();
    const res = await api.get<{ data?: { notifications: NotificationDto[] } }>(
      "/api/notifications",
      { token: workerToken }
    );
    expect(
      res.body.data?.notifications.some((n) => n.type === "job_assigned" && n.job_id === jobId)
    ).toBe(true);
  });

  it("completing a job creates a job_completed notification for the job's creator", async () => {
    const { owner, jobId, workerToken } = await setupCompanyWithWorkerAndJob();
    await api.patch(`/api/jobs/${jobId}`, { token: workerToken, body: { status: "in_progress" } });
    await api.patch(`/api/jobs/${jobId}`, { token: workerToken, body: { status: "waiting" } });
    await api.patch(`/api/jobs/${jobId}`, { token: workerToken, body: { status: "completed" } });

    const res = await api.get<{ data?: { notifications: NotificationDto[] } }>(
      "/api/notifications",
      { token: owner.accessToken }
    );
    expect(
      res.body.data?.notifications.some((n) => n.type === "job_completed" && n.job_id === jobId)
    ).toBe(true);
  });

  it("marking a notification read does not hide it, and hiding it does not mark it read (independent state)", async () => {
    const { owner, workerToken, jobId } = await setupCompanyWithWorkerAndJob();
    await api.post(`/api/jobs/${jobId}/messages`, { token: owner.accessToken, body: { content: "Hi" } });

    const list = await api.get<{ data?: { notifications: NotificationDto[] } }>(
      "/api/notifications",
      { token: workerToken }
    );
    const notif = list.body.data!.notifications.find((n) => n.type === "message_received")!;

    const readRes = await api.patch<{ data?: { notification: NotificationDto } }>(
      `/api/notifications/${notif.id}`,
      { token: workerToken, body: { is_read: true } }
    );
    expect(readRes.status).toBe(200);
    expect(readRes.body.data?.notification.is_read).toBe(true);
    expect(readRes.body.data?.notification.hidden_at).toBeNull();

    const hideRes = await api.patch<{ data?: { notification: NotificationDto } }>(
      `/api/notifications/${notif.id}`,
      { token: workerToken, body: { hidden: true } }
    );
    expect(hideRes.status).toBe(200);
    expect(hideRes.body.data?.notification.hidden_at).toBeTruthy();
    expect(hideRes.body.data?.notification.is_read).toBe(true);

    const events = await getTimelineEvents(jobId);
    expect(events.map((e) => e.event_type)).toContain("notification_deleted");
  });

  it("hiding a notification removes it from the default list but the record remains", async () => {
    const { owner, workerToken, jobId } = await setupCompanyWithWorkerAndJob();
    await api.post(`/api/jobs/${jobId}/messages`, { token: owner.accessToken, body: { content: "Hi" } });

    const before = await api.get<{ data?: { notifications: NotificationDto[] } }>(
      "/api/notifications",
      { token: workerToken }
    );
    const notif = before.body.data!.notifications.find((n) => n.type === "message_received")!;

    await api.patch(`/api/notifications/${notif.id}`, { token: workerToken, body: { hidden: true } });

    const after = await api.get<{ data?: { notifications: NotificationDto[] } }>(
      "/api/notifications",
      { token: workerToken }
    );
    expect(after.body.data?.notifications.some((n) => n.id === notif.id)).toBe(false);
  });

  it("a user cannot modify another user's notification (404)", async () => {
    const { owner, workerToken, jobId } = await setupCompanyWithWorkerAndJob();
    await api.post(`/api/jobs/${jobId}/messages`, { token: owner.accessToken, body: { content: "Hi" } });

    const list = await api.get<{ data?: { notifications: NotificationDto[] } }>(
      "/api/notifications",
      { token: workerToken }
    );
    const notif = list.body.data!.notifications.find((n) => n.type === "message_received")!;

    const res = await api.patch(`/api/notifications/${notif.id}`, {
      token: owner.accessToken,
      body: { is_read: true },
    });
    expect(res.status).toBe(404);
  });
});
