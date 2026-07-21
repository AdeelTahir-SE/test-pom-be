import { describe, it, expect, afterAll } from "vitest";
import sharp from "sharp";
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

interface FileDto {
  id: string;
  job_id: string;
  attachment_type: string;
  file_name: string;
  file_size: number;
  thumbnail_path: string | null;
  hidden_at: string | null;
  uploaded_by: string;
  signed_url?: string;
  thumbnail_signed_url?: string | null;
}

async function setupCompanyWithWorkerAndJob() {
  const owner = await registerCompany();
  createdCompanies.push(owner);
  const worker = await createCompanyUser(owner.accessToken!, { role: "worker" });
  const workerLogin = await loginAs(worker.email, worker.password);
  const workerToken = workerLogin.body.data?.access_token as string;

  const jobRes = await api.post<{ data?: { job: JobDto } }>("/api/jobs", {
    token: owner.accessToken,
    body: { title: "Files test job", worker_id: worker.userId },
  });
  const jobId = jobRes.body.data!.job.id;

  return { owner, worker, workerToken, jobId };
}

async function makeJpeg(width: number, height: number, withExif = false): Promise<Buffer> {
  let img = sharp({
    create: { width, height, channels: 3, background: { r: 200, g: 50, b: 50 } },
  }).jpeg();
  if (withExif) {
    img = img.withMetadata({ exif: { IFD0: { Make: "TestCam" } } });
  }
  return img.toBuffer();
}

async function makePngWithAlpha(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 4, background: { r: 10, g: 200, b: 10, alpha: 0.5 } },
  })
    .png()
    .toBuffer();
}

function pdfBuffer(): Buffer {
  return Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF");
}

function uploadForm(fieldFiles: { buffer: Buffer; name: string; type: string }[]): FormData {
  const form = new FormData();
  for (const f of fieldFiles) {
    form.append("files", new File([Uint8Array.from(f.buffer)], f.name, { type: f.type }));
  }
  return form;
}

describe("Phase 7 — Files & Storage", () => {
  it("uploads an image: resizes to <=1920, strips EXIF, creates a thumbnail, logs image_uploaded", async () => {
    const { owner, jobId } = await setupCompanyWithWorkerAndJob();
    const original = await makeJpeg(2500, 1200, true);

    const res = await api.post<{ data?: { files: FileDto[] } }>(`/api/jobs/${jobId}/files`, {
      token: owner.accessToken,
      body: uploadForm([{ buffer: original, name: "site-photo.jpg", type: "image/jpeg" }]),
    });

    expect(res.status).toBe(201);
    const file = res.body.data!.files[0]!;
    expect(file.attachment_type).toBe("image");
    expect(file.thumbnail_path).toBeTruthy();

    const listRes = await api.get<{ data?: { files: FileDto[] } }>(
      `/api/jobs/${jobId}/files`,
      { token: owner.accessToken }
    );
    const listed = listRes.body.data!.files.find((f) => f.id === file.id)!;
    expect(listed.signed_url).toBeTruthy();

    const downloaded = await fetch(listed.signed_url!);
    expect(downloaded.status).toBe(200);
    const downloadedBuffer = Buffer.from(await downloaded.arrayBuffer());
    const meta = await sharp(downloadedBuffer).metadata();
    expect(meta.width).toBeLessThanOrEqual(1920);
    expect(meta.height).toBeLessThanOrEqual(1920);
    expect(meta.exif).toBeUndefined();

    const events = await getTimelineEvents(jobId);
    expect(events.filter((e) => e.event_type === "image_uploaded").length).toBe(1);
  });

  it("keeps PNG format when the source has an alpha channel", async () => {
    const { owner, jobId } = await setupCompanyWithWorkerAndJob();
    const original = await makePngWithAlpha(400, 400);

    const res = await api.post<{ data?: { files: FileDto[] } }>(`/api/jobs/${jobId}/files`, {
      token: owner.accessToken,
      body: uploadForm([{ buffer: original, name: "logo.png", type: "image/png" }]),
    });
    expect(res.status).toBe(201);
    expect(res.body.data!.files[0]!.file_name).toBe("logo.png");

    const fileRes = await api.get<{ data?: { file: FileDto } }>(
      `/api/files/${res.body.data!.files[0]!.id}`,
      { token: owner.accessToken }
    );
    const downloaded = await fetch(fileRes.body.data!.file.signed_url!);
    const buf = Buffer.from(await downloaded.arrayBuffer());
    const meta = await sharp(buf).metadata();
    expect(meta.format).toBe("png");
  });

  it("uploads a PDF as-is; logs document_uploaded", async () => {
    const { owner, jobId } = await setupCompanyWithWorkerAndJob();

    const res = await api.post<{ data?: { files: FileDto[] } }>(`/api/jobs/${jobId}/files`, {
      token: owner.accessToken,
      body: uploadForm([{ buffer: pdfBuffer(), name: "contract.pdf", type: "application/pdf" }]),
    });
    expect(res.status).toBe(201);
    expect(res.body.data!.files[0]!.attachment_type).toBe("pdf");

    const events = await getTimelineEvents(jobId);
    expect(events.filter((e) => e.event_type === "document_uploaded").length).toBe(1);
  });

  it("rejects an unsupported file type", async () => {
    const { owner, jobId } = await setupCompanyWithWorkerAndJob();
    const res = await api.post(`/api/jobs/${jobId}/files`, {
      token: owner.accessToken,
      body: uploadForm([
        { buffer: Buffer.from("not a real format"), name: "malware.exe", type: "application/x-msdownload" },
      ]),
    });
    expect(res.status).toBe(400);
  });

  it("rejects a duplicate file (same bytes) on the same job", async () => {
    const { owner, jobId } = await setupCompanyWithWorkerAndJob();
    const bytes = await makeJpeg(300, 300);

    const first = await api.post(`/api/jobs/${jobId}/files`, {
      token: owner.accessToken,
      body: uploadForm([{ buffer: bytes, name: "a.jpg", type: "image/jpeg" }]),
    });
    expect(first.status).toBe(201);

    const second = await api.post(`/api/jobs/${jobId}/files`, {
      token: owner.accessToken,
      body: uploadForm([{ buffer: bytes, name: "b.jpg", type: "image/jpeg" }]),
    });
    expect(second.status).toBe(409);
  });

  it("rejects more than 3 files in a single request", async () => {
    const { owner, jobId } = await setupCompanyWithWorkerAndJob();
    const files = await Promise.all([1, 2, 3, 4].map((i) => makeJpeg(100 + i, 100 + i)));

    const res = await api.post(`/api/jobs/${jobId}/files`, {
      token: owner.accessToken,
      body: uploadForm(files.map((buffer, i) => ({ buffer, name: `f${i}.jpg`, type: "image/jpeg" }))),
    });
    expect(res.status).toBe(400);
  });

  it(
    "rejects uploads that would exceed 6 files total on a job",
    async () => {
      const { owner, jobId } = await setupCompanyWithWorkerAndJob();

      for (let batch = 0; batch < 2; batch++) {
        const files = await Promise.all([0, 1, 2].map((i) => makeJpeg(100 + batch * 10 + i, 120)));
        const res = await api.post(`/api/jobs/${jobId}/files`, {
          token: owner.accessToken,
          body: uploadForm(
            files.map((buffer, i) => ({ buffer, name: `batch${batch}-${i}.jpg`, type: "image/jpeg" }))
          ),
        });
        expect(res.status).toBe(201);
      }

      const seventh = await makeJpeg(150, 150);
      const res = await api.post(`/api/jobs/${jobId}/files`, {
        token: owner.accessToken,
        body: uploadForm([{ buffer: seventh, name: "seventh.jpg", type: "image/jpeg" }]),
      });
      expect(res.status).toBe(400);
    },
    60_000
  );

  it("hiding a file removes it from the default list but the record and signed URL still work", async () => {
    const { owner, jobId } = await setupCompanyWithWorkerAndJob();
    const uploadRes = await api.post<{ data?: { files: FileDto[] } }>(
      `/api/jobs/${jobId}/files`,
      {
        token: owner.accessToken,
        body: uploadForm([{ buffer: await makeJpeg(200, 200), name: "hide-me.jpg", type: "image/jpeg" }]),
      }
    );
    const fileId = uploadRes.body.data!.files[0]!.id;

    const hideRes = await api.patch<{ data?: { file: FileDto } }>(`/api/files/${fileId}`, {
      token: owner.accessToken,
      body: { hidden: true },
    });
    expect(hideRes.status).toBe(200);
    expect(hideRes.body.data?.file.hidden_at).toBeTruthy();

    const listRes = await api.get<{ data?: { files: FileDto[] } }>(
      `/api/jobs/${jobId}/files`,
      { token: owner.accessToken }
    );
    expect(listRes.body.data?.files.some((f) => f.id === fileId)).toBe(false);

    const includeHiddenRes = await api.get<{ data?: { files: FileDto[] } }>(
      `/api/jobs/${jobId}/files?include_hidden=true`,
      { token: owner.accessToken }
    );
    expect(includeHiddenRes.body.data?.files.some((f) => f.id === fileId)).toBe(true);

    const directRes = await api.get<{ data?: { file: FileDto } }>(`/api/files/${fileId}`, {
      token: owner.accessToken,
    });
    expect(directRes.status).toBe(200);
    expect(directRes.body.data?.file.signed_url).toBeTruthy();
  });

  it("a worker who did not upload a hidden file cannot see it", async () => {
    const owner = await registerCompany();
    createdCompanies.push(owner);
    const worker = await createCompanyUser(owner.accessToken!, { role: "worker" });
    const workerLogin = await loginAs(worker.email, worker.password);
    const workerToken = workerLogin.body.data?.access_token;

    const jobRes = await api.post<{ data?: { job: JobDto } }>("/api/jobs", {
      token: owner.accessToken,
      body: { title: "Hidden file job", worker_id: worker.userId },
    });
    const jobId = jobRes.body.data!.job.id;

    const uploadRes = await api.post<{ data?: { files: FileDto[] } }>(
      `/api/jobs/${jobId}/files`,
      {
        token: owner.accessToken,
        body: uploadForm([{ buffer: await makeJpeg(150, 150), name: "owner-upload.jpg", type: "image/jpeg" }]),
      }
    );
    const fileId = uploadRes.body.data!.files[0]!.id;

    await api.patch(`/api/files/${fileId}`, { token: owner.accessToken, body: { hidden: true } });

    const res = await api.get(`/api/files/${fileId}`, { token: workerToken });
    expect(res.status).toBe(404);
  });

  it("a worker not assigned to the job is blocked from its files (403)", async () => {
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
    const getRes = await api.get(`/api/jobs/${jobId}/files`, { token: loginB.body.data?.access_token });
    expect(getRes.status).toBe(403);

    const postRes = await api.post(`/api/jobs/${jobId}/files`, {
      token: loginB.body.data?.access_token,
      body: uploadForm([{ buffer: await makeJpeg(120, 120), name: "x.jpg", type: "image/jpeg" }]),
    });
    expect(postRes.status).toBe(403);
  });

  it("cross-company access to files is rejected as 404", async () => {
    const companyA = await registerCompany();
    createdCompanies.push(companyA);
    const companyB = await registerCompany();
    createdCompanies.push(companyB);

    const jobRes = await api.post<{ data?: { job: JobDto } }>("/api/jobs", {
      token: companyA.accessToken,
      body: { title: "Company A job" },
    });
    const jobId = jobRes.body.data!.job.id;

    const uploadRes = await api.post<{ data?: { files: FileDto[] } }>(
      `/api/jobs/${jobId}/files`,
      {
        token: companyA.accessToken,
        body: uploadForm([{ buffer: await makeJpeg(100, 100), name: "a.jpg", type: "image/jpeg" }]),
      }
    );
    const fileId = uploadRes.body.data!.files[0]!.id;

    const listRes = await api.get(`/api/jobs/${jobId}/files`, { token: companyB.accessToken });
    expect(listRes.status).toBe(404);

    const fileRes = await api.get(`/api/files/${fileId}`, { token: companyB.accessToken });
    expect(fileRes.status).toBe(404);

    const patchRes = await api.patch(`/api/files/${fileId}`, {
      token: companyB.accessToken,
      body: { hidden: true },
    });
    expect(patchRes.status).toBe(404);
  });

  it("files can still be uploaded after the job is completed (explicit spec exception)", async () => {
    const { owner, jobId, workerToken } = await setupCompanyWithWorkerAndJob();
    await api.patch(`/api/jobs/${jobId}`, { token: workerToken, body: { status: "in_progress" } });
    await api.patch(`/api/jobs/${jobId}`, { token: workerToken, body: { status: "waiting" } });
    await api.patch(`/api/jobs/${jobId}`, { token: workerToken, body: { status: "completed" } });

    const res = await api.post(`/api/jobs/${jobId}/files`, {
      token: owner.accessToken,
      body: uploadForm([{ buffer: await makeJpeg(100, 100), name: "post-completion.jpg", type: "image/jpeg" }]),
    });
    expect(res.status).toBe(201);
  });
});
