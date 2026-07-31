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
  title: string;
  worker_id: string | null;
  started_at: string | null;
  completed_at: string | null;
  scheduled_at: string | null;
  hidden_at?: string | null;
  hidden_by?: string | null;
}

async function setupCompanyWithWorker() {
  const owner = await registerCompany();
  createdCompanies.push(owner);
  const worker = await createCompanyUser(owner.accessToken!, { role: "worker" });
  const workerLogin = await loginAs(worker.email, worker.password);
  const workerToken = workerLogin.body.data?.access_token as string;
  return { owner, worker, workerToken };
}

describe("Phase 4 — Jobs Engine", () => {
  it("owner creates a job with an assigned worker; timeline logs a single job_created (with worker)", async () => {
    const { owner, worker } = await setupCompanyWithWorker();

    const res = await api.post<{ data?: { job: JobDto } }>("/api/jobs", {
      token: owner.accessToken,
      body: { title: "Site inspection", worker_id: worker.userId },
    });

    expect(res.status).toBe(201);
    expect(res.body.data?.job.status).toBe("pending");
    expect(res.body.data?.job.worker_id).toBe(worker.userId);

    const timeline = await api.get<{
      data?: {
        timeline: { event_type: string; metadata: Record<string, unknown> | null }[];
      };
    }>(`/api/jobs/${res.body.data!.job.id}/timeline`, { token: owner.accessToken });
    expect(timeline.status).toBe(200);
    const events = timeline.body.data?.timeline ?? [];
    expect(events.map((e) => e.event_type)).toContain("job_created");
    expect(events.map((e) => e.event_type)).not.toContain("worker_assigned");
    const created = events.find((e) => e.event_type === "job_created");
    expect(created?.metadata?.worker_id).toBe(worker.userId);
    expect(typeof created?.metadata?.created_by_name).toBe("string");
    expect(String(created?.metadata?.created_by_name).length).toBeGreaterThan(0);
    expect(typeof created?.metadata?.created_on).toBe("string");
  });

  it("manager can also create a job", async () => {
    const owner = await registerCompany();
    createdCompanies.push(owner);
    const manager = await createCompanyUser(owner.accessToken!, { role: "manager" });
    const managerLogin = await loginAs(manager.email, manager.password);

    const res = await api.post("/api/jobs", {
      token: managerLogin.body.data?.access_token,
      body: { title: "Manager-created job" },
    });
    expect(res.status).toBe(201);
  });

  it("worker cannot create a job (403)", async () => {
    const { workerToken } = await setupCompanyWithWorker();
    const res = await api.post("/api/jobs", {
      token: workerToken,
      body: { title: "Should fail" },
    });
    expect(res.status).toBe(403);
  });

  it("assigning a non-worker (e.g. a manager) as worker_id is rejected", async () => {
    const owner = await registerCompany();
    createdCompanies.push(owner);
    const manager = await createCompanyUser(owner.accessToken!, { role: "manager" });

    const res = await api.post("/api/jobs", {
      token: owner.accessToken,
      body: { title: "Bad assignment", worker_id: manager.userId },
    });
    expect(res.status).toBe(400);
  });

  it("worker sees only jobs assigned to them; unassigned worker sees none", async () => {
    const owner = await registerCompany();
    createdCompanies.push(owner);
    const workerA = await createCompanyUser(owner.accessToken!, { role: "worker" });
    const workerB = await createCompanyUser(owner.accessToken!, { role: "worker" });

    const jobRes = await api.post<{ data?: { job: JobDto } }>("/api/jobs", {
      token: owner.accessToken,
      body: { title: "Only for A", worker_id: workerA.userId },
    });
    const jobId = jobRes.body.data!.job.id;

    const loginA = await loginAs(workerA.email, workerA.password);
    const listA = await api.get<{ data?: { jobs: JobDto[] } }>("/api/jobs", {
      token: loginA.body.data?.access_token,
    });
    expect(listA.body.data?.jobs.map((j) => j.id)).toContain(jobId);

    const loginB = await loginAs(workerB.email, workerB.password);
    const listB = await api.get<{ data?: { jobs: JobDto[] } }>("/api/jobs", {
      token: loginB.body.data?.access_token,
    });
    expect(listB.body.data?.jobs.map((j) => j.id)).not.toContain(jobId);

    const getB = await api.get(`/api/jobs/${jobId}`, { token: loginB.body.data?.access_token });
    expect(getB.status).toBe(403);
  });

  it("full lifecycle: pending -> in_progress -> waiting -> completed, worker-driven", async () => {
    const { owner, worker, workerToken } = await setupCompanyWithWorker();

    const jobRes = await api.post<{ data?: { job: JobDto } }>("/api/jobs", {
      token: owner.accessToken,
      body: { title: "Lifecycle job", worker_id: worker.userId },
    });
    const jobId = jobRes.body.data!.job.id;

    const toInProgress = await api.patch<{ data?: { job: JobDto } }>(`/api/jobs/${jobId}`, {
      token: workerToken,
      body: { status: "in_progress" },
    });
    expect(toInProgress.status).toBe(200);
    expect(toInProgress.body.data?.job.status).toBe("in_progress");
    expect(toInProgress.body.data?.job.started_at).toBeTruthy();

    const toWaiting = await api.patch<{ data?: { job: JobDto } }>(`/api/jobs/${jobId}`, {
      token: workerToken,
      body: { status: "waiting" },
    });
    expect(toWaiting.status).toBe(200);
    expect(toWaiting.body.data?.job.status).toBe("waiting");

    const toCompleted = await api.patch<{ data?: { job: JobDto } }>(`/api/jobs/${jobId}`, {
      token: workerToken,
      body: { status: "completed" },
    });
    expect(toCompleted.status).toBe(200);
    expect(toCompleted.body.data?.job.status).toBe("completed");
    expect(toCompleted.body.data?.job.completed_at).toBeTruthy();

    const events = await getTimelineEvents(jobId);
    expect(events.map((e) => e.event_type)).toEqual(
      expect.arrayContaining(["job_created", "status_changed", "job_completed"])
    );
    expect(events.map((e) => e.event_type)).not.toContain("worker_assigned");
  });

  it("rejects an invalid status transition (pending -> completed)", async () => {
    const { owner, worker, workerToken } = await setupCompanyWithWorker();
    const jobRes = await api.post<{ data?: { job: JobDto } }>("/api/jobs", {
      token: owner.accessToken,
      body: { title: "Bad transition", worker_id: worker.userId },
    });
    const jobId = jobRes.body.data!.job.id;

    const res = await api.patch(`/api/jobs/${jobId}`, {
      token: workerToken,
      body: { status: "completed" },
    });
    expect(res.status).toBe(409);
  });

  it("worker cannot cancel a job (403), owner can", async () => {
    const { owner, worker, workerToken } = await setupCompanyWithWorker();
    const jobRes = await api.post<{ data?: { job: JobDto } }>("/api/jobs", {
      token: owner.accessToken,
      body: { title: "Cancel test", worker_id: worker.userId },
    });
    const jobId = jobRes.body.data!.job.id;

    const workerAttempt = await api.patch(`/api/jobs/${jobId}`, {
      token: workerToken,
      body: { status: "cancelled" },
    });
    expect(workerAttempt.status).toBe(403);

    const ownerCancel = await api.patch<{ data?: { job: JobDto } }>(`/api/jobs/${jobId}`, {
      token: owner.accessToken,
      body: { status: "cancelled" },
    });
    expect(ownerCancel.status).toBe(200);
    expect(ownerCancel.body.data?.job.status).toBe("cancelled");
  });

  it("a worker cannot send non-status fields (title) — rejected outright", async () => {
    const { owner, worker, workerToken } = await setupCompanyWithWorker();
    const jobRes = await api.post<{ data?: { job: JobDto } }>("/api/jobs", {
      token: owner.accessToken,
      body: { title: "Strict schema test", worker_id: worker.userId },
    });
    const jobId = jobRes.body.data!.job.id;

    const res = await api.patch(`/api/jobs/${jobId}`, {
      token: workerToken,
      body: { title: "Hijacked title" },
    });
    expect(res.status).toBe(400);
  });

  it("a completed job cannot be modified further (409)", async () => {
    const { owner, worker, workerToken } = await setupCompanyWithWorker();
    const jobRes = await api.post<{ data?: { job: JobDto } }>("/api/jobs", {
      token: owner.accessToken,
      body: { title: "Immutable after completion", worker_id: worker.userId },
    });
    const jobId = jobRes.body.data!.job.id;

    await api.patch(`/api/jobs/${jobId}`, { token: workerToken, body: { status: "in_progress" } });
    await api.patch(`/api/jobs/${jobId}`, { token: workerToken, body: { status: "waiting" } });
    await api.patch(`/api/jobs/${jobId}`, { token: workerToken, body: { status: "completed" } });

    const res = await api.patch(`/api/jobs/${jobId}`, {
      token: owner.accessToken,
      body: { title: "Trying to edit after completion" },
    });
    expect(res.status).toBe(409);
  });

  it("owner reassigns a job to a different worker; old worker loses access, new worker gains it", async () => {
    const owner = await registerCompany();
    createdCompanies.push(owner);
    const workerA = await createCompanyUser(owner.accessToken!, { role: "worker" });
    const workerB = await createCompanyUser(owner.accessToken!, { role: "worker" });

    const jobRes = await api.post<{ data?: { job: JobDto } }>("/api/jobs", {
      token: owner.accessToken,
      body: { title: "Reassignment test", worker_id: workerA.userId },
    });
    const jobId = jobRes.body.data!.job.id;

    const reassign = await api.patch<{ data?: { job: JobDto } }>(`/api/jobs/${jobId}`, {
      token: owner.accessToken,
      body: { worker_id: workerB.userId },
    });
    expect(reassign.status).toBe(200);
    expect(reassign.body.data?.job.worker_id).toBe(workerB.userId);

    const loginA = await loginAs(workerA.email, workerA.password);
    const getA = await api.get(`/api/jobs/${jobId}`, { token: loginA.body.data?.access_token });
    expect(getA.status).toBe(403);

    const loginB = await loginAs(workerB.email, workerB.password);
    const getB = await api.get(`/api/jobs/${jobId}`, { token: loginB.body.data?.access_token });
    expect(getB.status).toBe(200);

    const events = await getTimelineEvents(jobId);
    expect(events.filter((e) => e.event_type === "worker_assigned").length).toBe(1);
  });

  it("cross-company access to a job is rejected as 404", async () => {
    const companyA = await registerCompany();
    createdCompanies.push(companyA);
    const companyB = await registerCompany();
    createdCompanies.push(companyB);

    const jobRes = await api.post<{ data?: { job: JobDto } }>("/api/jobs", {
      token: companyA.accessToken,
      body: { title: "Company A's job" },
    });
    const jobId = jobRes.body.data!.job.id;

    const getRes = await api.get(`/api/jobs/${jobId}`, { token: companyB.accessToken });
    expect(getRes.status).toBe(404);

    const patchRes = await api.patch(`/api/jobs/${jobId}`, {
      token: companyB.accessToken,
      body: { title: "Hijack attempt" },
    });
    expect(patchRes.status).toBe(404);
  });

  it("default ordering: scheduled_at ASC (nulls last), then created_at DESC", async () => {
    const owner = await registerCompany();
    createdCompanies.push(owner);

    const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const unscheduled = await api.post<{ data?: { job: JobDto } }>("/api/jobs", {
      token: owner.accessToken,
      body: { title: "No schedule" },
    });
    const scheduled = await api.post<{ data?: { job: JobDto } }>("/api/jobs", {
      token: owner.accessToken,
      body: { title: "Scheduled tomorrow", scheduled_at: future },
    });

    const list = await api.get<{ data?: { jobs: JobDto[] } }>("/api/jobs", {
      token: owner.accessToken,
    });
    const ids = (list.body.data?.jobs ?? []).map((j) => j.id);
    const scheduledIdx = ids.indexOf(scheduled.body.data!.job.id);
    const unscheduledIdx = ids.indexOf(unscheduled.body.data!.job.id);
    expect(scheduledIdx).toBeLessThan(unscheduledIdx);
  });

  it("soft-hides a TEREN card: gone from board list, data + timeline preserved (Mark task 4)", async () => {
    const { owner, worker, workerToken } = await setupCompanyWithWorker();
    const jobRes = await api.post<{ data?: { job: JobDto } }>("/api/jobs", {
      token: owner.accessToken,
      body: { title: "Hide from board", worker_id: worker.userId, location: "Celje" },
    });
    const jobId = jobRes.body.data!.job.id;

    await api.post(`/api/jobs/${jobId}/checklist`, {
      token: owner.accessToken,
      body: { label: "Keep this step" },
    });
    await api.post(`/api/jobs/${jobId}/messages`, {
      token: owner.accessToken,
      body: { content: "Keep this message" },
    });

    const workerHide = await api.patch(`/api/jobs/${jobId}`, {
      token: workerToken,
      body: { hidden: true },
    });
    expect(workerHide.status).toBe(400);

    const hideRes = await api.patch<{ data?: { job: JobDto } }>(`/api/jobs/${jobId}`, {
      token: owner.accessToken,
      body: { hidden: true },
    });
    expect(hideRes.status).toBe(200);
    expect(hideRes.body.data?.job.hidden_at).toBeTruthy();
    expect(hideRes.body.data?.job.hidden_by).toBe(owner.userId);
    expect(hideRes.body.data?.job.title).toBe("Hide from board");
    expect(hideRes.body.data?.job.status).toBe("pending");

    const list = await api.get<{ data?: { jobs: JobDto[] } }>("/api/jobs", {
      token: owner.accessToken,
    });
    expect(list.body.data?.jobs.some((j) => j.id === jobId)).toBe(false);

    const workerList = await api.get<{ data?: { jobs: JobDto[] } }>("/api/jobs", {
      token: workerToken,
    });
    expect(workerList.body.data?.jobs.some((j) => j.id === jobId)).toBe(false);

    const detail = await api.get<{ data?: { job: JobDto } }>(`/api/jobs/${jobId}`, {
      token: owner.accessToken,
    });
    expect(detail.status).toBe(200);
    expect(detail.body.data?.job.hidden_at).toBeTruthy();
    expect(detail.body.data?.job.title).toBe("Hide from board");

    const workerDetail = await api.get(`/api/jobs/${jobId}`, { token: workerToken });
    expect(workerDetail.status).toBe(403);

    const checklist = await api.get<{ data?: { checklist: { label: string }[] } }>(
      `/api/jobs/${jobId}/checklist`,
      { token: owner.accessToken }
    );
    expect(checklist.status).toBe(200);
    expect(checklist.body.data?.checklist.map((c) => c.label)).toContain("Keep this step");

    const messages = await api.get<{ data?: { messages: { content: string | null }[] } }>(
      `/api/jobs/${jobId}/messages`,
      { token: owner.accessToken }
    );
    expect(messages.status).toBe(200);
    expect(messages.body.data?.messages.some((m) => m.content === "Keep this message")).toBe(
      true
    );

    const events = await getTimelineEvents(jobId);
    const hideEvent = events.find(
      (e) => e.event_type === "job_updated" && e.metadata?.hidden === true
    );
    expect(hideEvent).toBeTruthy();

    const timeline = await api.get<{ data?: { timeline: { event_type: string }[] } }>(
      `/api/jobs/${jobId}/timeline`,
      { token: owner.accessToken }
    );
    expect(timeline.status).toBe(200);
    expect(timeline.body.data?.timeline.length).toBeGreaterThan(0);

    const summary = await api.get<{ data?: { field_overview: { job_id: string }[] } }>(
      "/api/dashboard/summary",
      { token: owner.accessToken }
    );
    expect(summary.body.data?.field_overview.some((f) => f.job_id === jobId)).toBe(false);

    const withHidden = await api.get<{ data?: { jobs: JobDto[] } }>(
      "/api/jobs?include_hidden=true",
      { token: owner.accessToken }
    );
    expect(withHidden.body.data?.jobs.some((j) => j.id === jobId)).toBe(true);
  });
});
