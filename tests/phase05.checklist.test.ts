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
  job_id: string;
  label: string;
  order_index: number;
  is_completed: boolean;
  completed_at: string | null;
  requires_attachment: boolean;
}

async function setupCompanyWithWorkerAndJob() {
  const owner = await registerCompany();
  createdCompanies.push(owner);
  const worker = await createCompanyUser(owner.accessToken!, { role: "worker" });
  const workerLogin = await loginAs(worker.email, worker.password);
  const workerToken = workerLogin.body.data?.access_token as string;

  const jobRes = await api.post<{ data?: { job: JobDto } }>("/api/jobs", {
    token: owner.accessToken,
    body: { title: "Checklist test job", worker_id: worker.userId },
  });
  const jobId = jobRes.body.data!.job.id;

  return { owner, worker, workerToken, jobId };
}

describe("Phase 5 — Checklist System", () => {
  it("owner adds checklist items; order_index auto-increments", async () => {
    const { owner, jobId } = await setupCompanyWithWorkerAndJob();

    const first = await api.post<{ data?: { item: ChecklistItemDto } }>(
      `/api/jobs/${jobId}/checklist`,
      { token: owner.accessToken, body: { label: "Load materials" } }
    );
    expect(first.status).toBe(201);
    expect(first.body.data?.item.order_index).toBe(0);

    const second = await api.post<{ data?: { item: ChecklistItemDto } }>(
      `/api/jobs/${jobId}/checklist`,
      { token: owner.accessToken, body: { label: "Drive to site" } }
    );
    expect(second.body.data?.item.order_index).toBe(1);

    const list = await api.get<{ data?: { checklist: ChecklistItemDto[] } }>(
      `/api/jobs/${jobId}/checklist`,
      { token: owner.accessToken }
    );
    expect(list.status).toBe(200);
    expect(list.body.data?.checklist.map((i) => i.label)).toEqual([
      "Load materials",
      "Drive to site",
    ]);
  });

  it("requires_attachment defaults to false and can be enabled", async () => {
    const { owner, jobId } = await setupCompanyWithWorkerAndJob();

    const plain = await api.post<{ data?: { item: ChecklistItemDto } }>(
      `/api/jobs/${jobId}/checklist`,
      { token: owner.accessToken, body: { label: "No evidence needed" } }
    );
    expect(plain.body.data?.item.requires_attachment).toBe(false);

    const withAttachment = await api.post<{ data?: { item: ChecklistItemDto } }>(
      `/api/jobs/${jobId}/checklist`,
      { token: owner.accessToken, body: { label: "Photo required", requires_attachment: true } }
    );
    expect(withAttachment.body.data?.item.requires_attachment).toBe(true);
  });

  it("worker cannot add checklist items (403)", async () => {
    const { jobId, workerToken } = await setupCompanyWithWorkerAndJob();
    const res = await api.post(`/api/jobs/${jobId}/checklist`, {
      token: workerToken,
      body: { label: "Should fail" },
    });
    expect(res.status).toBe(403);
  });

  it("worker marks an item complete; sets completed_at and logs checklist_completed", async () => {
    const { owner, jobId, workerToken } = await setupCompanyWithWorkerAndJob();
    const created = await api.post<{ data?: { item: ChecklistItemDto } }>(
      `/api/jobs/${jobId}/checklist`,
      { token: owner.accessToken, body: { label: "Sweep the floor" } }
    );
    const itemId = created.body.data!.item.id;

    const res = await api.patch<{ data?: { item: ChecklistItemDto } }>(
      `/api/checklist-items/${itemId}`,
      { token: workerToken, body: { is_completed: true } }
    );
    expect(res.status).toBe(200);
    expect(res.body.data?.item.is_completed).toBe(true);
    expect(res.body.data?.item.completed_at).toBeTruthy();

    const events = await getTimelineEvents(jobId);
    expect(events.map((e) => e.event_type)).toContain("checklist_completed");
  });

  it("worker cannot un-complete an item (false is rejected outright)", async () => {
    const { owner, jobId, workerToken } = await setupCompanyWithWorkerAndJob();
    const created = await api.post<{ data?: { item: ChecklistItemDto } }>(
      `/api/jobs/${jobId}/checklist`,
      { token: owner.accessToken, body: { label: "Item" } }
    );
    const itemId = created.body.data!.item.id;

    const res = await api.patch(`/api/checklist-items/${itemId}`, {
      token: workerToken,
      body: { is_completed: false },
    });
    expect(res.status).toBe(400);
  });

  it("worker cannot edit label or other fields (400)", async () => {
    const { owner, jobId, workerToken } = await setupCompanyWithWorkerAndJob();
    const created = await api.post<{ data?: { item: ChecklistItemDto } }>(
      `/api/jobs/${jobId}/checklist`,
      { token: owner.accessToken, body: { label: "Item" } }
    );
    const itemId = created.body.data!.item.id;

    const res = await api.patch(`/api/checklist-items/${itemId}`, {
      token: workerToken,
      body: { label: "Hijacked label" },
    });
    expect(res.status).toBe(400);
  });

  it("owner/manager can edit label, order_index, requires_attachment, and un-complete", async () => {
    const { owner, jobId, workerToken } = await setupCompanyWithWorkerAndJob();
    const created = await api.post<{ data?: { item: ChecklistItemDto } }>(
      `/api/jobs/${jobId}/checklist`,
      { token: owner.accessToken, body: { label: "Original label" } }
    );
    const itemId = created.body.data!.item.id;

    const edited = await api.patch<{ data?: { item: ChecklistItemDto } }>(
      `/api/checklist-items/${itemId}`,
      {
        token: owner.accessToken,
        body: { label: "Edited label", order_index: 5, requires_attachment: true },
      }
    );
    expect(edited.status).toBe(200);
    expect(edited.body.data?.item.label).toBe("Edited label");
    expect(edited.body.data?.item.order_index).toBe(5);
    expect(edited.body.data?.item.requires_attachment).toBe(true);

    await api.patch(`/api/checklist-items/${itemId}`, {
      token: workerToken,
      body: { is_completed: true },
    });

    const uncompleted = await api.patch<{ data?: { item: ChecklistItemDto } }>(
      `/api/checklist-items/${itemId}`,
      { token: owner.accessToken, body: { is_completed: false } }
    );
    expect(uncompleted.status).toBe(200);
    expect(uncompleted.body.data?.item.is_completed).toBe(false);
    expect(uncompleted.body.data?.item.completed_at).toBeNull();
  });

  it("a worker not assigned to the job is blocked from its checklist (403)", async () => {
    const owner = await registerCompany();
    createdCompanies.push(owner);
    const workerA = await createCompanyUser(owner.accessToken!, { role: "worker" });
    const workerB = await createCompanyUser(owner.accessToken!, { role: "worker" });

    const jobRes = await api.post<{ data?: { job: JobDto } }>("/api/jobs", {
      token: owner.accessToken,
      body: { title: "A's job", worker_id: workerA.userId },
    });
    const jobId = jobRes.body.data!.job.id;

    const item = await api.post<{ data?: { item: ChecklistItemDto } }>(
      `/api/jobs/${jobId}/checklist`,
      { token: owner.accessToken, body: { label: "Item" } }
    );

    const loginB = await loginAs(workerB.email, workerB.password);
    const tokenB = loginB.body.data?.access_token;

    const getRes = await api.get(`/api/jobs/${jobId}/checklist`, { token: tokenB });
    expect(getRes.status).toBe(403);

    const patchRes = await api.patch(`/api/checklist-items/${item.body.data!.item.id}`, {
      token: tokenB,
      body: { is_completed: true },
    });
    expect(patchRes.status).toBe(403);
  });

  it("cross-company access to a job's checklist is rejected as 404", async () => {
    const companyA = await registerCompany();
    createdCompanies.push(companyA);
    const companyB = await registerCompany();
    createdCompanies.push(companyB);

    const jobRes = await api.post<{ data?: { job: JobDto } }>("/api/jobs", {
      token: companyA.accessToken,
      body: { title: "Company A job" },
    });
    const jobId = jobRes.body.data!.job.id;

    const item = await api.post<{ data?: { item: ChecklistItemDto } }>(
      `/api/jobs/${jobId}/checklist`,
      { token: companyA.accessToken, body: { label: "Item" } }
    );

    const getRes = await api.get(`/api/jobs/${jobId}/checklist`, {
      token: companyB.accessToken,
    });
    expect(getRes.status).toBe(404);

    const postRes = await api.post(`/api/jobs/${jobId}/checklist`, {
      token: companyB.accessToken,
      body: { label: "Hijack attempt" },
    });
    expect(postRes.status).toBe(404);

    const patchRes = await api.patch(`/api/checklist-items/${item.body.data!.item.id}`, {
      token: companyB.accessToken,
      body: { is_completed: true },
    });
    expect(patchRes.status).toBe(404);
  });

  it("checklist is locked once the job is completed", async () => {
    const { owner, jobId, workerToken } = await setupCompanyWithWorkerAndJob();
    const created = await api.post<{ data?: { item: ChecklistItemDto } }>(
      `/api/jobs/${jobId}/checklist`,
      { token: owner.accessToken, body: { label: "Item" } }
    );
    const itemId = created.body.data!.item.id;

    await api.patch(`/api/jobs/${jobId}`, { token: workerToken, body: { status: "in_progress" } });
    await api.patch(`/api/jobs/${jobId}`, { token: workerToken, body: { status: "waiting" } });
    await api.patch(`/api/jobs/${jobId}`, { token: workerToken, body: { status: "completed" } });

    const postRes = await api.post(`/api/jobs/${jobId}/checklist`, {
      token: owner.accessToken,
      body: { label: "Too late" },
    });
    expect(postRes.status).toBe(409);

    const patchRes = await api.patch(`/api/checklist-items/${itemId}`, {
      token: owner.accessToken,
      body: { label: "Too late to edit" },
    });
    expect(patchRes.status).toBe(409);

    const deleteRes = await api.delete(`/api/checklist-items/${itemId}`, {
      token: owner.accessToken,
    });
    expect(deleteRes.status).toBe(409);
  });

  it("owner/manager can delete an incomplete checklist item", async () => {
    const { owner, jobId } = await setupCompanyWithWorkerAndJob();
    const created = await api.post<{ data?: { item: ChecklistItemDto } }>(
      `/api/jobs/${jobId}/checklist`,
      { token: owner.accessToken, body: { label: "Added by mistake" } }
    );
    const itemId = created.body.data!.item.id;

    const deleteRes = await api.delete(`/api/checklist-items/${itemId}`, {
      token: owner.accessToken,
    });
    expect(deleteRes.status).toBe(200);

    const listRes = await api.get<{ data?: { checklist: ChecklistItemDto[] } }>(
      `/api/jobs/${jobId}/checklist`,
      { token: owner.accessToken }
    );
    expect(listRes.body.data?.checklist.some((i) => i.id === itemId)).toBe(false);
  });

  it("a completed checklist item cannot be deleted (409)", async () => {
    const { owner, jobId, workerToken } = await setupCompanyWithWorkerAndJob();
    const created = await api.post<{ data?: { item: ChecklistItemDto } }>(
      `/api/jobs/${jobId}/checklist`,
      { token: owner.accessToken, body: { label: "Will be completed" } }
    );
    const itemId = created.body.data!.item.id;

    await api.patch(`/api/checklist-items/${itemId}`, {
      token: workerToken,
      body: { is_completed: true },
    });

    const deleteRes = await api.delete(`/api/checklist-items/${itemId}`, {
      token: owner.accessToken,
    });
    expect(deleteRes.status).toBe(409);
  });

  it("workers cannot delete checklist items (403)", async () => {
    const { owner, jobId, workerToken } = await setupCompanyWithWorkerAndJob();
    const created = await api.post<{ data?: { item: ChecklistItemDto } }>(
      `/api/jobs/${jobId}/checklist`,
      { token: owner.accessToken, body: { label: "Item" } }
    );

    const res = await api.delete(`/api/checklist-items/${created.body.data!.item.id}`, {
      token: workerToken,
    });
    expect(res.status).toBe(403);
  });

  it("cross-company delete is rejected as 404", async () => {
    const companyA = await registerCompany();
    createdCompanies.push(companyA);
    const companyB = await registerCompany();
    createdCompanies.push(companyB);

    const jobRes = await api.post<{ data?: { job: JobDto } }>("/api/jobs", {
      token: companyA.accessToken,
      body: { title: "Company A job" },
    });
    const created = await api.post<{ data?: { item: ChecklistItemDto } }>(
      `/api/jobs/${jobRes.body.data!.job.id}/checklist`,
      { token: companyA.accessToken, body: { label: "Item" } }
    );

    const res = await api.delete(`/api/checklist-items/${created.body.data!.item.id}`, {
      token: companyB.accessToken,
    });
    expect(res.status).toBe(404);
  });
});
