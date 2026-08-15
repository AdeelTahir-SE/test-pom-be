import { withAuth } from "@/lib/http/handler";
import { created, ok, ApiError } from "@/lib/http/responses";
import { getAdminClient } from "@/lib/supabase/admin";
import { loadJobWithAccess } from "@/lib/services/jobAccess";
import { assertJobCardMutable } from "@/lib/services/jobCardFreeze";
import { createTimelineEvent } from "@/lib/timeline/events";
import {
  sha256Hex,
  buildStoragePath,
  uploadToStorage,
  deleteFromStorage,
  getSignedUrl,
} from "@/lib/storage/upload";
import { processImage } from "@/lib/storage/image";
import { classifyUpload } from "@/lib/services/files";
import { extractText } from "@/lib/integrations/mistral";
import { enrichDocumentFromOcr } from "@/lib/documents/preview";
import { extractOfficeText, isOfficeDocument } from "@/lib/documents/officeParse";
import { LIMITS } from "@/config/constants";

export const dynamic = "force-dynamic";

// GET /api/jobs/[id]/files — default order created_at DESC (Appendix A §7).
// Hidden files excluded by default; owner/manager may request them explicitly
// (File Infrastructure: "hidden files ... require explicit request flag").
// Note: files remain accessible after job completion (Immutability Rule §60
// explicitly allows "new attachments" post-completion) — no status lock here.
export const GET = withAuth<{ id: string }>(async (request, auth, { params }) => {
  const db = getAdminClient();
  await loadJobWithAccess(db, auth, params.id);

  const url = new URL(request.url);
  const includeHidden =
    url.searchParams.get("include_hidden") === "true" &&
    (auth.role === "owner" || auth.role === "manager");

  let query = db
    .from("job_files")
    .select("*")
    .eq("job_id", params.id)
    .order("created_at", { ascending: false });
  if (!includeHidden) {
    query = query.is("hidden_at", null);
  }

  const { data, error } = await query;
  if (error) throw new ApiError("internal", "Failed to load files.", error.message);

  const files = await Promise.all(
    (data ?? []).map(async (file) => ({
      ...file,
      signed_url: await getSignedUrl(db, file.storage_path),
      thumbnail_signed_url: file.thumbnail_path
        ? await getSignedUrl(db, file.thumbnail_path)
        : null,
    }))
  );

  return ok({ files });
});

interface PreparedUpload {
  fileName: string;
  attachmentType: "image" | "pdf" | "other";
  storagePath: string;
  thumbnailPath: string | null;
  fileSize: number;
  fileHash: string;
  upload: { path: string; buffer: Buffer; contentType: string }[];
  // Text for classification/preview — Mistral OCR for PDF/images only.
  // Word/Excel use direct parsers (mammoth / xlsx); never rasterize for OCR (Mark).
  textExtract:
    | { kind: "ocr"; buffer: Buffer; contentType: string }
    | { kind: "office"; buffer: Buffer; fileName: string }
    | null;
}

// POST /api/jobs/[id]/files — multipart upload (field name "files", repeatable).
// Images run the full pipeline (EXIF fix, resize, compress, thumbnail); PDFs
// and generic docs are stored as-is. Atomic: every file uploads to storage
// first, then ONE multi-row DB insert — all files land or none do
// (Supabase Storage add-on §6 Atomic Upload Rule).
export const POST = withAuth<{ id: string }>(async (request, auth, { params }) => {
  const db = getAdminClient();
  const { job } = await loadJobWithAccess(db, auth, params.id);
  assertJobCardMutable({
    scheduled_at: (job.scheduled_at as string | null) ?? null,
    created_at: String(job.created_at),
  });

  const formData = await request.formData();
  const files = formData.getAll("files").filter((f): f is File => f instanceof File);
  const checklistItemIdRaw = formData.get("checklist_item_id");
  const checklistItemId = typeof checklistItemIdRaw === "string" && checklistItemIdRaw.length > 0 ? checklistItemIdRaw : null;

  if (files.length === 0) {
    throw new ApiError("bad_request", "No files provided.");
  }

  if (checklistItemId) {
    const { data: checklistItem, error: checklistError } = await db
      .from("job_checklist_items")
      .select("id")
      .eq("id", checklistItemId)
      .eq("job_id", params.id)
      .maybeSingle();
    if (checklistError) {
      throw new ApiError("internal", "Failed to validate checklist item.", checklistError.message);
    }
    if (!checklistItem) {
      throw new ApiError("bad_request", "Checklist item does not belong to this job.");
    }
  }
  if (files.length > LIMITS.MAX_FILES_PER_REQUEST) {
    throw new ApiError(
      "bad_request",
      `A maximum of ${LIMITS.MAX_FILES_PER_REQUEST} files may be uploaded per request.`
    );
  }
  for (const file of files) {
    if (file.size > LIMITS.MAX_DOCUMENT_BYTES) {
      throw new ApiError(
        "payload_too_large",
        `File "${file.name}" exceeds the maximum allowed size.`
      );
    }
  }

  // Soft-hidden files do not count toward the job cap (Mark a13).
  const { count: existingCount, error: countError } = await db
    .from("job_files")
    .select("id", { count: "exact", head: true })
    .eq("job_id", params.id)
    .is("hidden_at", null);
  if (countError) {
    throw new ApiError("internal", "Failed to check job file count.", countError.message);
  }
  if ((existingCount ?? 0) + files.length > LIMITS.MAX_FILES_PER_JOB) {
    throw new ApiError(
      "bad_request",
      `This job may have at most ${LIMITS.MAX_FILES_PER_JOB} files total.`
    );
  }

  // Per-file work (hashing, classification, image processing) is independent
  // across files — run it concurrently. Bounded by MAX_FILES_PER_REQUEST (3),
  // so this can't fan out into an unbounded amount of work.
  const prepared: PreparedUpload[] = await Promise.all(
    files.map(async (file): Promise<PreparedUpload> => {
      const originalBuffer = Buffer.from(await file.arrayBuffer());
      const fileHash = sha256Hex(originalBuffer);

      const { data: duplicate } = await db
        .from("job_files")
        .select("id")
        .eq("job_id", params.id)
        .eq("file_hash", fileHash)
        .maybeSingle();
      if (duplicate) {
        throw new ApiError(
          "conflict",
          `File "${file.name}" is a duplicate of an existing file on this job.`
        );
      }

      const classification = await classifyUpload(file.name, originalBuffer);

      if (classification.attachmentType === "image") {
        const { main, thumbnail } = await processImage(originalBuffer, classification.imageFormat!);
        const storagePath = buildStoragePath(params.id, main.extension);
        const thumbnailPath = buildStoragePath(params.id, thumbnail.extension, "_thumb");
        return {
          fileName: file.name,
          attachmentType: "image",
          storagePath,
          thumbnailPath,
          fileSize: main.buffer.length,
          fileHash,
          upload: [
            { path: storagePath, buffer: main.buffer, contentType: main.contentType },
            { path: thumbnailPath, buffer: thumbnail.buffer, contentType: thumbnail.contentType },
          ],
          textExtract: { kind: "ocr", buffer: main.buffer, contentType: main.contentType },
        };
      }

      const extension = file.name.includes(".") ? file.name.split(".").pop()! : "bin";
      const storagePath = buildStoragePath(params.id, extension);
      const contentType = file.type || "application/octet-stream";
      return {
        fileName: file.name,
        attachmentType: classification.attachmentType,
        storagePath,
        thumbnailPath: null,
        fileSize: originalBuffer.length,
        fileHash,
        upload: [{ path: storagePath, buffer: originalBuffer, contentType }],
        textExtract: isOfficeDocument(file.name)
          ? { kind: "office", buffer: originalBuffer, fileName: file.name }
          : classification.attachmentType === "pdf"
            ? { kind: "ocr", buffer: originalBuffer, contentType }
            : null,
      };
    })
  );

  // Upload everything to storage first. If any storage upload fails, remove
// all objects uploaded by this batch. If the DB insert fails, the same
// cleanup runs below.
  const uploadedStoragePaths: string[] = [];

try {
  await Promise.all(
    prepared.flatMap((item) =>
      item.upload.map(async (target) => {
        await uploadToStorage(
          db,
          target.path,
          target.buffer,
          target.contentType
        );

        uploadedStoragePaths.push(target.path);
      })
    )
  );
} catch (error) {
  await Promise.all(
    uploadedStoragePaths.map((storagePath) =>
      deleteFromStorage(db, storagePath)
    )
  );

  throw new ApiError(
    "internal",
    "Failed to upload files.",
    error instanceof Error ? error.message : undefined
  );
}

  const { data: inserted, error: insertError } = await db
    .from("job_files")
    .insert(
      prepared.map((item) => ({
        company_id: auth.companyId,
        job_id: params.id,
        checklist_item_id: checklistItemId,
        uploaded_by: auth.userId,
        file_name: item.fileName,
        attachment_type: item.attachmentType,
        storage_path: item.storagePath,
        thumbnail_path: item.thumbnailPath,
        file_size: item.fileSize,
        file_hash: item.fileHash,
      }))
    )
    .select();

  if (insertError || !inserted) {
  await Promise.all(
    uploadedStoragePaths.map((storagePath) =>
      deleteFromStorage(db, storagePath)
    )
  );

  throw new ApiError(
    "internal",
    "Files were uploaded but could not be recorded.",
    insertError?.message
  );
}

  for (const record of inserted) {
    await createTimelineEvent(db, {
      companyId: auth.companyId,
      jobId: params.id,
      eventType: record.attachment_type === "image" ? "image_uploaded" : "document_uploaded",
      userId: auth.userId,
      metadata: {
        file_id: record.id,
        file_name: record.file_name,
        attachment_type: record.attachment_type,
        job_seq: job.company_seq,
      },
    });
  }

  // Text extract + Add-on 1 classification must never block the upload response
  // (Failure Rule §9 + Mark: card updates were waiting 15–30s on Mistral).
  // Files are returned immediately; enrichment runs in the background.
  const textExtractByHash = new Map(prepared.map((item) => [item.fileHash, item.textExtract]));
  const companyId = auth.companyId;
  const jobId = params.id;
  const jobSeq = job.company_seq;

  void Promise.all(
    inserted.map(async (record) => {
      const textExtract = textExtractByHash.get(record.file_hash);
      if (!textExtract) return;

      try {
        const text =
          textExtract.kind === "office"
            ? await extractOfficeText(textExtract.buffer, textExtract.fileName)
            : await extractText(textExtract.buffer, textExtract.contentType);
        if (!text) return;

        const isImage = record.attachment_type === "image";
        const enrichment = enrichDocumentFromOcr(text, record.file_name, {
          attachmentType: record.attachment_type,
        });
        // Photos often OCR into noise. For untyped images, keep only document
        // metadata/thumbnail and discard OCR text so search and previews stay clean.
        const publishTyped = !isImage || enrichment.document_type !== "other";

        const { data: updated, error: updateError } = await db
          .from("job_files")
          .update({
            ocr_text: enrichment.should_store_ocr_text ? text : null,
            document_preview: enrichment.document_preview,
            ...(publishTyped
              ? { document_type: enrichment.document_type }
              : { document_type: "other" }),
          })
          .eq("id", record.id)
          .select()
          .single();
        if (updateError || !updated) {
          console.error("[text_extract_update_failed]", record.id, updateError?.message);
          return;
        }

        if (!publishTyped) return;

        await createTimelineEvent(db, {
          companyId,
          jobId,
          eventType: "ocr_completed",
          userId: null,
          metadata: {
            status: "success",
            ocr_text_length: text.length,
            job_seq: jobSeq,
            file_name: record.file_name,
            document_type: enrichment.document_type,
            document_preview: enrichment.document_preview,
            extract_kind: textExtract.kind,
          },
        });
      } catch (err) {
        console.error("[text_extract_background_failed]", record.id, err);
      }
    })
  );

  return created({ files: inserted });
});
