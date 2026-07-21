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
}

interface FileDto {
  id: string;
  attachment_type: string;
  ocr_text: string | null;
}

async function setupCompanyWithJob() {
  const owner = await registerCompany();
  createdCompanies.push(owner);
  const jobRes = await api.post<{ data?: { job: JobDto } }>("/api/jobs", {
    token: owner.accessToken,
    body: { title: "OCR test job" },
  });
  return { owner, jobId: jobRes.body.data!.job.id };
}

function uploadForm(buffer: Buffer, name: string, type: string): FormData {
  const form = new FormData();
  form.append("files", new File([Uint8Array.from(buffer)], name, { type }));
  return form;
}

function pdfBuffer(): Buffer {
  return Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF");
}

describe("Phase 10 — OCR (Mistral)", () => {
  it(
    "OCR-eligible image upload still succeeds even though extraction is unavailable; no ocr_completed event on failure",
    async () => {
      const { owner, jobId } = await setupCompanyWithJob();
      const image = await sharp({
        create: { width: 200, height: 200, channels: 3, background: { r: 0, g: 0, b: 0 } },
      })
        .jpeg()
        .toBuffer();

      const res = await api.post<{ data?: { files: FileDto[] } }>(`/api/jobs/${jobId}/files`, {
        token: owner.accessToken,
        body: uploadForm(image, "receipt.jpg", "image/jpeg"),
      });

      expect(res.status).toBe(201);
      const file = res.body.data!.files[0]!;
      expect(file.attachment_type).toBe("image");
      // Network to Mistral is blocked in this sandbox — extraction fails,
      // and per the Failure Rule the upload must still succeed with ocr_text null.
      expect(file.ocr_text).toBeNull();

      const events = await getTimelineEvents(jobId);
      expect(events.some((e) => e.event_type === "ocr_completed")).toBe(false);
      expect(events.some((e) => e.event_type === "image_uploaded")).toBe(true);
    },
    45_000
  );

  it(
    "OCR-eligible PDF upload still succeeds even though extraction is unavailable",
    async () => {
      const { owner, jobId } = await setupCompanyWithJob();

      const res = await api.post<{ data?: { files: FileDto[] } }>(`/api/jobs/${jobId}/files`, {
        token: owner.accessToken,
        body: uploadForm(pdfBuffer(), "contract.pdf", "application/pdf"),
      });

      expect(res.status).toBe(201);
      const file = res.body.data!.files[0]!;
      expect(file.attachment_type).toBe("pdf");
      expect(file.ocr_text).toBeNull();

      const events = await getTimelineEvents(jobId);
      expect(events.some((e) => e.event_type === "ocr_completed")).toBe(false);
      expect(events.some((e) => e.event_type === "document_uploaded")).toBe(true);
    },
    45_000
  );

  it("does not attempt OCR for non-eligible file types (fast response, no network wait)", async () => {
    const { owner, jobId } = await setupCompanyWithJob();
    const start = Date.now();

    const res = await api.post<{ data?: { files: FileDto[] } }>(`/api/jobs/${jobId}/files`, {
      token: owner.accessToken,
      body: uploadForm(Buffer.from("plain text content"), "notes.txt", "text/plain"),
    });
    const elapsedMs = Date.now() - start;

    expect(res.status).toBe(201);
    expect(res.body.data!.files[0]!.attachment_type).toBe("other");
    expect(res.body.data!.files[0]!.ocr_text).toBeNull();
    // A real OCR attempt would incur a ~10s network timeout in this sandbox;
    // finishing well under that confirms OCR was skipped, not attempted-and-failed.
    expect(elapsedMs).toBeLessThan(5000);
  });

  it(
    "GET /jobs/[id]/files exposes ocr_text alongside other file metadata",
    async () => {
      const { owner, jobId } = await setupCompanyWithJob();
      await api.post(`/api/jobs/${jobId}/files`, {
        token: owner.accessToken,
        body: uploadForm(pdfBuffer(), "doc.pdf", "application/pdf"),
      });

      const listRes = await api.get<{ data?: { files: FileDto[] } }>(
        `/api/jobs/${jobId}/files`,
        { token: owner.accessToken }
      );
      expect(listRes.status).toBe(200);
      expect(listRes.body.data!.files[0]).toHaveProperty("ocr_text");
    },
    45_000
  );
});
