import { withAuth } from "@/lib/http/handler";
import { created, ApiError } from "@/lib/http/responses";
import { getAdminClient } from "@/lib/supabase/admin";
import { sha256Hex, buildStoragePath, uploadToStorage } from "@/lib/storage/upload";
import { processImage } from "@/lib/storage/image";
import { classifyUpload } from "@/lib/services/files";
import { LIMITS } from "@/config/constants";

export const dynamic = "force-dynamic";

// POST /api/office-reminders/[id]/files — upload file for a reminder
export const POST = withAuth<{ id: string }>(async (request, auth, { params }) => {
  const db = getAdminClient();

  // Verify reminder exists and belongs to company
  const { data: reminder, error: reminderError } = await db
    .from("office_reminders")
    .select("*")
    .eq("id", params.id)
    .eq("company_id", auth.companyId)
    .maybeSingle();
  if (reminderError) throw new ApiError("internal", "Failed to load reminder.", reminderError.message);
  if (!reminder) throw new ApiError("not_found", "Reminder not found.");

  const formData = await request.formData();
  const files = formData.getAll("files").filter((f): f is File => f instanceof File);

  if (files.length === 0) {
    throw new ApiError("bad_request", "No files provided.");
  }

  if (files.length > 1) {
    throw new ApiError("bad_request", "Only one file can be uploaded per reminder.");
  }

  const file = files[0]!;
  if (file.size > LIMITS.MAX_DOCUMENT_BYTES) {
    throw new ApiError("payload_too_large", `File "${file.name}" exceeds the maximum allowed size.`);
  }

  const originalBuffer = Buffer.from(await file.arrayBuffer());
  const fileHash = sha256Hex(originalBuffer);
  const classification = await classifyUpload(file.name, originalBuffer);

  let storagePath: string;
  let thumbnailPath: string | null = null;
  let fileSize: number;
  let attachmentType: string;

  if (classification.attachmentType === "image") {
    const { main, thumbnail } = await processImage(originalBuffer, classification.imageFormat!);
    storagePath = buildStoragePath(`reminder_${params.id}`, main.extension);
    thumbnailPath = buildStoragePath(`reminder_${params.id}`, thumbnail.extension, "_thumb");
    fileSize = main.buffer.length;
    attachmentType = "image";

    await Promise.all([
      uploadToStorage(db, storagePath, main.buffer, main.contentType),
      uploadToStorage(db, thumbnailPath, thumbnail.buffer, thumbnail.contentType),
    ]);
  } else {
    const extension = file.name.includes(".") ? file.name.split(".").pop()! : "bin";
    storagePath = buildStoragePath(`reminder_${params.id}`, extension);
    const contentType = file.type || "application/octet-stream";
    fileSize = originalBuffer.length;
    attachmentType = classification.attachmentType;

    await uploadToStorage(db, storagePath, originalBuffer, contentType);
  }

  // Store file reference in reminder's link field (temporary solution)
  // In a proper implementation, you'd have a separate office_reminder_files table
  const { data: updated, error: updateError } = await db
    .from("office_reminders")
    .update({
      link: JSON.stringify({
        fileName: file.name,
        storagePath,
        thumbnailPath,
        fileSize,
        attachmentType,
        fileHash,
      }),
    })
    .eq("id", params.id)
    .select()
    .single();

  if (updateError || !updated) {
    throw new ApiError("internal", "Failed to update reminder with file.", updateError?.message);
  }

  return created({ reminder: updated });
}, { roles: ["owner", "manager"] });
