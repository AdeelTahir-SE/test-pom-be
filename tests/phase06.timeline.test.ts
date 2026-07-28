import { describe, it, expect, afterAll } from "vitest";
import { api } from "./helpers/client";
import { getAdminClient } from "@/lib/supabase/admin";
import {
  registerCompany,
  createCompanyUser,
  loginAs,
  cleanupCompany,
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

interface TimelineEventDto {
  id: string;
  event_type: string;
  user_id: string | null;
  created_at: string;
}

async function setupCompanyWithWorkerAndJob() {
  const owner = await registerCompany();
  createdCompanies.push(owner);
  const worker = await createCompanyUser(owner.accessToken!, { role: "worker" });
  const workerLogin = await loginAs(worker.email, worker.password);
  const workerToken = workerLogin.body.data?.access_token as string;

  const jobRes = await api.post<{ data?: { job: JobDto } }>("/api/jobs", {
    token: owner.accessToken,
    body: { title: "Timeline test job", worker_id: worker.userId },
  });
  const jobId = jobRes.body.data!.job.id;

  return { owner, worker, workerToken, jobId };
}

describe("Phase 6 — Timeline (read API)", () => {
  it("returns events from job creation through checklist completion, ordered oldest first", async () => {
    const { owner, jobId, workerToken } = await setupCompanyWithWorkerAndJob();

    const itemRes = await api.post<{ data?: { item: { id: string } } }>(
      `/api/jobs/${jobId}/checklist`,
      { token: owner.accessToken, body: { label: "Do the thing" } }
    );
    await api.patch(`/api/checklist-items/${itemRes.body.data!.item.id}`, {
      token: workerToken,
      body: { is_completed: true },
    });
    await api.patch(`/api/jobs/${jobId}`, { token: workerToken, body: { status: "in_progress" } });

    const res = await api.get<{ data?: { timeline: TimelineEventDto[] } }>(
      `/api/jobs/${jobId}/timeline`,
      { token: owner.accessToken }
    );
    expect(res.status).toBe(200);

    const events = res.body.data!.timeline;
    expect(events.map((e) => e.event_type)).toEqual([
      "job_created",
      "checklist_completed",
      "status_changed",
    ]);

    const timestamps = events.map((e) => new Date(e.created_at).getTime());
    const sorted = [...timestamps].sort((a, b) => a - b);
    expect(timestamps).toEqual(sorted);
  });

  it("system-generated events (e.g. worker_assigned at creation) have a user_id, not null, since an owner performed the action", async () => {
    const { owner, jobId } = await setupCompanyWithWorkerAndJob();
    const res = await api.get<{ data?: { timeline: TimelineEventDto[] } }>(
      `/api/jobs/${jobId}/timeline`,
      { token: owner.accessToken }
    );
    const created = res.body.data!.timeline.find((e) => e.event_type === "job_created");
    expect(created?.user_id).toBe(owner.userId);
  });

  it("an assigned worker can read their own job's timeline", async () => {
    const { jobId, workerToken } = await setupCompanyWithWorkerAndJob();
    const res = await api.get(`/api/jobs/${jobId}/timeline`, { token: workerToken });
    expect(res.status).toBe(200);
  });

  it("a worker not assigned to the job is blocked (403)", async () => {
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
    const res = await api.get(`/api/jobs/${jobId}/timeline`, {
      token: loginB.body.data?.access_token,
    });
    expect(res.status).toBe(403);
  });

  it("cross-company access to a job's timeline is rejected as 404", async () => {
    const companyA = await registerCompany();
    createdCompanies.push(companyA);
    const companyB = await registerCompany();
    createdCompanies.push(companyB);

    const jobRes = await api.post<{ data?: { job: JobDto } }>("/api/jobs", {
      token: companyA.accessToken,
      body: { title: "Company A job" },
    });
    const jobId = jobRes.body.data!.job.id;

    const res = await api.get(`/api/jobs/${jobId}/timeline`, { token: companyB.accessToken });
    expect(res.status).toBe(404);
  });

  it("reading the timeline never mutates it (idempotent, repeatable reads)", async () => {
    const { owner, jobId } = await setupCompanyWithWorkerAndJob();
    const first = await api.get<{ data?: { timeline: TimelineEventDto[] } }>(
      `/api/jobs/${jobId}/timeline`,
      { token: owner.accessToken }
    );
    const second = await api.get<{ data?: { timeline: TimelineEventDto[] } }>(
      `/api/jobs/${jobId}/timeline`,
      { token: owner.accessToken }
    );
    expect(second.body.data?.timeline).toEqual(first.body.data?.timeline);
  });

  it("the closed event-type set is enforced at the database level", async () => {
    const { jobId, owner } = await setupCompanyWithWorkerAndJob();
    const db = getAdminClient();
    const { error } = await db.from("timeline_events").insert({
      company_id: owner.companyId,
      job_id: jobId,
      event_type: "not_a_real_event_type",
      user_id: owner.userId,
      metadata: {},
    });
    expect(error).toBeTruthy();
  });
});
