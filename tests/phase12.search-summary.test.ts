import { describe, it, expect, afterAll } from "vitest";
import { api } from "./helpers/client";
import {
  registerCompany,
  createCompanyUser,
  loginAs,
  cleanupCompany,
  setFileOcrText,
  type RegisteredCompany,
} from "./helpers/factories";
import {
  boardTodayKey,
  localDayToScheduledAt,
  startOfLocalDay,
  toIsoDate,
} from "../src/lib/officeDate";

const createdCompanies: RegisteredCompany[] = [];

afterAll(async () => {
  for (const c of createdCompanies) {
    await cleanupCompany(c.companyId, c.userId);
  }
});

interface JobDto {
  id: string;
}

interface FileDto {
  id: string;
  job_id: string;
  file_name: string;
}

interface SearchResultDto {
  id: string;
  file_name: string;
  signed_url: string;
}

function uploadForm(text: string, name: string): FormData {
  const form = new FormData();
  form.append("files", new File([text], name, { type: "text/plain" }));
  return form;
}

async function setupCompanyWithJob() {
  const owner = await registerCompany();
  createdCompanies.push(owner);
  const jobRes = await api.post<{ data?: { job: JobDto } }>("/api/jobs", {
    token: owner.accessToken,
    body: { title: "Search test job" },
  });
  return { owner, jobId: jobRes.body.data!.job.id };
}

describe("Phase 12 — Search", () => {
  it("finds a file by filename substring and includes a signed URL", async () => {
    const { owner, jobId } = await setupCompanyWithJob();
    await api.post(`/api/jobs/${jobId}/files`, {
      token: owner.accessToken,
      body: uploadForm("hello", "site-inspection-report.txt"),
    });

    const res = await api.get<{ data?: { results: SearchResultDto[] } }>(
      "/api/search?q=inspection",
      { token: owner.accessToken }
    );
    expect(res.status).toBe(200);
    const match = res.body.data?.results.find((r) => r.file_name === "site-inspection-report.txt");
    expect(match).toBeTruthy();
    expect(match?.signed_url).toBeTruthy();
  });

  it("finds a file by OCR text content", async () => {
    const { owner, jobId } = await setupCompanyWithJob();
    const uploadRes = await api.post<{ data?: { files: FileDto[] } }>(
      `/api/jobs/${jobId}/files`,
      { token: owner.accessToken, body: uploadForm("irrelevant", "unnamed.txt") }
    );
    const fileId = uploadRes.body.data!.files[0]!.id;
    await setFileOcrText(fileId, "Invoice number 48213, total due $500.");

    const res = await api.get<{ data?: { results: SearchResultDto[] } }>(
      "/api/search?q=48213",
      { token: owner.accessToken }
    );
    expect(res.body.data?.results.some((r) => r.id === fileId)).toBe(true);
  });

  it("excludes hidden files from results", async () => {
    const { owner, jobId } = await setupCompanyWithJob();
    const uploadRes = await api.post<{ data?: { files: FileDto[] } }>(
      `/api/jobs/${jobId}/files`,
      { token: owner.accessToken, body: uploadForm("x", "findme-hidden.txt") }
    );
    const fileId = uploadRes.body.data!.files[0]!.id;
    await api.patch(`/api/files/${fileId}`, { token: owner.accessToken, body: { hidden: true } });

    const res = await api.get<{ data?: { results: SearchResultDto[] } }>(
      "/api/search?q=findme-hidden",
      { token: owner.accessToken }
    );
    expect(res.body.data?.results.some((r) => r.id === fileId)).toBe(false);
  });

  it("returns an empty result set when nothing matches", async () => {
    const { owner } = await setupCompanyWithJob();
    const res = await api.get<{ data?: { results: SearchResultDto[] } }>(
      "/api/search?q=nonexistent-zzz-term",
      { token: owner.accessToken }
    );
    expect(res.status).toBe(200);
    expect(res.body.data?.results).toEqual([]);
  });

  it("rejects an empty query", async () => {
    const { owner } = await setupCompanyWithJob();
    const res = await api.get("/api/search?q=", { token: owner.accessToken });
    expect(res.status).toBe(400);
  });

  it("a worker only finds files within jobs assigned to them", async () => {
    const owner = await registerCompany();
    createdCompanies.push(owner);
    const workerA = await createCompanyUser(owner.accessToken!, { role: "worker" });
    const workerB = await createCompanyUser(owner.accessToken!, { role: "worker" });

    const jobA = await api.post<{ data?: { job: JobDto } }>("/api/jobs", {
      token: owner.accessToken,
      body: { title: "A's job", worker_id: workerA.userId },
    });
    await api.post(`/api/jobs/${jobA.body.data!.job.id}/files`, {
      token: owner.accessToken,
      body: uploadForm("x", "only-in-a.txt"),
    });

    const loginA = await loginAs(workerA.email, workerA.password);
    const resA = await api.get<{ data?: { results: SearchResultDto[] } }>(
      "/api/search?q=only-in-a",
      { token: loginA.body.data?.access_token }
    );
    expect(resA.body.data?.results.length).toBe(1);

    const loginB = await loginAs(workerB.email, workerB.password);
    const resB = await api.get<{ data?: { results: SearchResultDto[] } }>(
      "/api/search?q=only-in-a",
      { token: loginB.body.data?.access_token }
    );
    expect(resB.body.data?.results.length).toBe(0);
  });

  it("never returns another company's files", async () => {
    const companyA = await registerCompany();
    createdCompanies.push(companyA);
    const companyB = await registerCompany();
    createdCompanies.push(companyB);

    const jobA = await api.post<{ data?: { job: JobDto } }>("/api/jobs", {
      token: companyA.accessToken,
      body: { title: "Company A job" },
    });
    await api.post(`/api/jobs/${jobA.body.data!.job.id}/files`, {
      token: companyA.accessToken,
      body: uploadForm("x", "cross-tenant-secret.txt"),
    });

    const res = await api.get<{ data?: { results: SearchResultDto[] } }>(
      "/api/search?q=cross-tenant-secret",
      { token: companyB.accessToken }
    );
    expect(res.body.data?.results).toEqual([]);
  });
});

describe("Phase 12 — Daily Summary", () => {
  it("shows an active assigned job with correct checklist progress and worker name", async () => {
    const owner = await registerCompany();
    createdCompanies.push(owner);
    const worker = await createCompanyUser(owner.accessToken!, {
      role: "worker",
      full_name: "Max West",
    });

    const jobRes = await api.post<{ data?: { job: JobDto } }>("/api/jobs", {
      token: owner.accessToken,
      body: { title: "Grass cutting", location: "Hospital", worker_id: worker.userId },
    });
    const jobId = jobRes.body.data!.job.id;

    for (const label of ["Mow front lawn", "Mow back lawn", "Trim hedges"]) {
      await api.post(`/api/jobs/${jobId}/checklist`, { token: owner.accessToken, body: { label } });
    }
    const listRes = await api.get<{ data?: { checklist: { id: string }[] } }>(
      `/api/jobs/${jobId}/checklist`,
      { token: owner.accessToken }
    );
    const workerLogin = await loginAs(worker.email, worker.password);
    await api.patch(`/api/checklist-items/${listRes.body.data!.checklist[0]!.id}`, {
      token: workerLogin.body.data?.access_token,
      body: { is_completed: true },
    });

    const res = await api.get<{
      data?: {
        field_overview: {
          job_id: string;
          job_title: string;
          location: string;
          worker_name: string;
          checklist_completed: number;
          checklist_total: number;
        }[];
      };
    }>("/api/dashboard/summary", { token: owner.accessToken });

    expect(res.status).toBe(200);
    const entry = res.body.data!.field_overview.find((f) => f.job_id === jobId)!;
    expect(entry.job_title).toBe("Grass cutting");
    expect(entry.location).toBe("Hospital");
    expect(entry.worker_name).toBe("Max West");
    expect(entry.checklist_completed).toBe(1);
    expect(entry.checklist_total).toBe(3);
  });

  it("excludes jobs with no assigned worker and completed/cancelled jobs", async () => {
    const owner = await registerCompany();
    createdCompanies.push(owner);
    const worker = await createCompanyUser(owner.accessToken!, { role: "worker" });

    const unassigned = await api.post<{ data?: { job: JobDto } }>("/api/jobs", {
      token: owner.accessToken,
      body: { title: "Unassigned job" },
    });
    const cancelled = await api.post<{ data?: { job: JobDto } }>("/api/jobs", {
      token: owner.accessToken,
      body: { title: "Cancelled job", worker_id: worker.userId },
    });
    await api.patch(`/api/jobs/${cancelled.body.data!.job.id}`, {
      token: owner.accessToken,
      body: { status: "cancelled" },
    });

    const res = await api.get<{ data?: { field_overview: { job_id: string }[] } }>(
      "/api/dashboard/summary",
      { token: owner.accessToken }
    );
    const ids = res.body.data!.field_overview.map((f) => f.job_id);
    expect(ids).not.toContain(unassigned.body.data!.job.id);
    expect(ids).not.toContain(cancelled.body.data!.job.id);
  });

  it("workers are blocked from the dashboard summary (403)", async () => {
    const owner = await registerCompany();
    createdCompanies.push(owner);
    const worker = await createCompanyUser(owner.accessToken!, { role: "worker" });
    const workerLogin = await loginAs(worker.email, worker.password);

    const res = await api.get("/api/dashboard/summary", { token: workerLogin.body.data?.access_token });
    expect(res.status).toBe(403);
  });

  it("shows the single most recent urgent reminder, and null when none exist", async () => {
    const owner = await registerCompany();
    createdCompanies.push(owner);

    const none = await api.get<{ data?: { urgent_reminder: unknown } }>("/api/dashboard/summary", {
      token: owner.accessToken,
    });
    expect(none.body.data?.urgent_reminder).toBeNull();

    await api.post("/api/office-reminders", {
      token: owner.accessToken,
      body: { title: "Traffic accident near Celje", is_urgent: true },
    });

    const res = await api.get<{ data?: { urgent_reminder: { title: string } | null } }>(
      "/api/dashboard/summary",
      { token: owner.accessToken }
    );
    expect(res.body.data?.urgent_reminder?.title).toBe("Traffic accident near Celje");
  });

  it("a future-dated urgent reminder is not shown yet", async () => {
    const owner = await registerCompany();
    createdCompanies.push(owner);
    const future = new Date();
    future.setUTCDate(future.getUTCDate() + 10);

    await api.post("/api/office-reminders", {
      token: owner.accessToken,
      body: {
        title: "Future urgent thing",
        is_urgent: true,
        remind_on: future.toISOString().slice(0, 10),
      },
    });

    const res = await api.get<{ data?: { urgent_reminder: { title: string } | null } }>(
      "/api/dashboard/summary",
      { token: owner.accessToken }
    );
    expect(res.body.data?.urgent_reminder).toBeNull();
  });

  it("each company only sees its own jobs and reminders", async () => {
    const companyA = await registerCompany();
    createdCompanies.push(companyA);
    const companyB = await registerCompany();
    createdCompanies.push(companyB);

    const workerA = await createCompanyUser(companyA.accessToken!, { role: "worker" });
    const jobA = await api.post<{ data?: { job: JobDto } }>("/api/jobs", {
      token: companyA.accessToken,
      body: { title: "Company A job", worker_id: workerA.userId },
    });

    const res = await api.get<{ data?: { field_overview: { job_id: string }[] } }>(
      "/api/dashboard/summary",
      { token: companyB.accessToken }
    );
    expect(res.body.data?.field_overview.some((f) => f.job_id === jobA.body.data!.job.id)).toBe(
      false
    );
  });

  it("field_overview respects ?date= for scheduled jobs (HITRI PREGLED day board)", async () => {
    const owner = await registerCompany();
    createdCompanies.push(owner);
    const worker = await createCompanyUser(owner.accessToken!, { role: "worker" });

    const tomorrow = startOfLocalDay();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowKey = toIsoDate(tomorrow);

    const jobRes = await api.post<{ data?: { job: JobDto } }>("/api/jobs", {
      token: owner.accessToken,
      body: {
        title: "Scheduled tomorrow",
        worker_id: worker.userId,
        scheduled_at: localDayToScheduledAt(tomorrow),
      },
    });
    const jobId = jobRes.body.data!.job.id;
    const todayKey = boardTodayKey();

    const todaySummary = await api.get<{ data?: { field_overview: { job_id: string }[] } }>(
      `/api/dashboard/summary?date=${todayKey}`,
      { token: owner.accessToken }
    );
    expect(todaySummary.body.data!.field_overview.map((f) => f.job_id)).not.toContain(jobId);

    const tomorrowSummary = await api.get<{ data?: { field_overview: { job_id: string }[] } }>(
      `/api/dashboard/summary?date=${tomorrowKey}`,
      { token: owner.accessToken }
    );
    expect(tomorrowSummary.body.data!.field_overview.map((f) => f.job_id)).toContain(jobId);
  });

  it("undated assigned jobs appear only on today's summary, not on other days", async () => {
    const owner = await registerCompany();
    createdCompanies.push(owner);
    const worker = await createCompanyUser(owner.accessToken!, { role: "worker" });

    const jobRes = await api.post<{ data?: { job: JobDto } }>("/api/jobs", {
      token: owner.accessToken,
      body: { title: "No schedule", worker_id: worker.userId },
    });
    const jobId = jobRes.body.data!.job.id;

    const yesterday = startOfLocalDay();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = toIsoDate(yesterday);

    const todaySummary = await api.get<{ data?: { field_overview: { job_id: string }[] } }>(
      `/api/dashboard/summary?date=${boardTodayKey()}`,
      { token: owner.accessToken }
    );
    expect(todaySummary.body.data!.field_overview.map((f) => f.job_id)).toContain(jobId);

    const yesterdaySummary = await api.get<{ data?: { field_overview: { job_id: string }[] } }>(
      `/api/dashboard/summary?date=${yesterdayKey}`,
      { token: owner.accessToken }
    );
    expect(yesterdaySummary.body.data!.field_overview.map((f) => f.job_id)).not.toContain(jobId);
  });

  it("rejects an invalid ?date= on dashboard summary", async () => {
    const owner = await registerCompany();
    createdCompanies.push(owner);
    const res = await api.get("/api/dashboard/summary?date=not-a-day", {
      token: owner.accessToken,
    });
    expect(res.status).toBe(400);
  });
});
