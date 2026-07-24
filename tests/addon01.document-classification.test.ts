import { describe, it, expect, afterAll } from "vitest";
import sharp from "sharp";
import { api } from "./helpers/client";
import {
  registerCompany,
  cleanupCompany,
  setFileOcrText,
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
  file_name: string;
  ocr_text: string | null;
  document_type: string | null;
  document_preview: string | null;
}

async function setupCompanyWithJob() {
  const owner = await registerCompany();
  createdCompanies.push(owner);
  const jobRes = await api.post<{ data?: { job: JobDto } }>("/api/jobs", {
    token: owner.accessToken,
    body: { title: "Doc classify job" },
  });
  return { owner, jobId: jobRes.body.data!.job.id };
}

function uploadForm(buffer: Buffer, name: string, type: string): FormData {
  const form = new FormData();
  form.append("files", new File([Uint8Array.from(buffer)], name, { type }));
  return form;
}

describe("Add-on 1 — document classification storage (API)", () => {
  it(
    "stores document_type and document_preview after OCR text is applied",
    async () => {
      const { owner, jobId } = await setupCompanyWithJob();
      const image = await sharp({
        create: { width: 120, height: 120, channels: 3, background: { r: 255, g: 255, b: 255 } },
      })
        .jpeg()
        .toBuffer();

      const upload = await api.post<{ data?: { files: FileDto[] } }>(`/api/jobs/${jobId}/files`, {
        token: owner.accessToken,
        body: uploadForm(image, "Invoice_2025_018.pdf".replace(".pdf", ".jpg"), "image/jpeg"),
      });
      expect(upload.status).toBe(201);
      const fileId = upload.body.data!.files[0]!.id;

      // Mistral is unavailable in this environment — simulate successful OCR
      // the same way production would enrich after extractText returns.
      await setFileOcrText(
        fileId,
        [
          "INVOICE",
          "Supplier: ABC d.o.o.",
          "Invoice No: 2025-018",
          "Date: 12.06.2025",
          "Amount: 684,20 €",
          "VAT 22%",
        ].join("\n")
      );

      const list = await api.get<{ data?: { files: FileDto[] } }>(`/api/jobs/${jobId}/files`, {
        token: owner.accessToken,
      });
      expect(list.status).toBe(200);
      const file = list.body.data!.files[0]!;
      expect(file.document_type).toBe("invoice");
      expect(file.document_preview).toContain("Invoice");
      expect(file.document_preview).toContain("ABC d.o.o.");
      expect(file.document_preview!.length).toBeLessThanOrEqual(500);
      expect(file.ocr_text).toContain("Invoice No: 2025-018");
    },
    45_000
  );

  it(
    "GET exposes null classification fields when OCR did not succeed",
    async () => {
      const { owner, jobId } = await setupCompanyWithJob();
      const image = await sharp({
        create: { width: 80, height: 80, channels: 3, background: { r: 0, g: 0, b: 0 } },
      })
        .jpeg()
        .toBuffer();

      const upload = await api.post<{ data?: { files: FileDto[] } }>(`/api/jobs/${jobId}/files`, {
        token: owner.accessToken,
        body: uploadForm(image, "photo.jpg", "image/jpeg"),
      });
      expect(upload.status).toBe(201);
      const file = upload.body.data!.files[0]!;
      // Without successful OCR, classification fields stay null.
      expect(file.ocr_text).toBeNull();
      expect(file.document_type).toBeNull();
      expect(file.document_preview).toBeNull();
    },
    45_000
  );
});
