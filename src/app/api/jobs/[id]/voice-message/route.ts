import { after } from "next/server";
import { withAuth } from "@/lib/http/handler";
import { created, ok, ApiError } from "@/lib/http/responses";
import { getAdminClient } from "@/lib/supabase/admin";
import { loadJobWithAccess } from "@/lib/services/jobAccess";
import { createTimelineEvent } from "@/lib/timeline/events";
import { notifyMessageReceived } from "@/lib/services/notifications";
import { requireOfficeContactUserId } from "@/lib/services/officeContact";
import { assertJobCommunicationAllowed } from "@/lib/services/jobCommunication";
import { sha256Hex, buildStoragePath, uploadToStorage } from "@/lib/storage/upload";
import { transcribeAudio } from "@/lib/integrations/deepgram";
import { LIMITS } from "@/config/constants";

export const dynamic = "force-dynamic";

const UNTRANSCRIBED_FALLBACK = "Voice message (untranscribed)";

interface FinalizeVoiceTranscriptionInput {
  buffer: Buffer;
  contentType: string;
  fileId: string;
  messageId: string;
  companyId: string;
  jobId: string;
  jobSeq: number | null;
  userId: string;
}

function logVoiceFinalize(message: string, extra?: Record<string, unknown>) {
  console.error(
    JSON.stringify({
      scope: "voice.finalizeTranscription",
      message,
      ...extra,
    })
  );
}

async function finalizeVoiceTranscription({
  buffer,
  contentType,
  fileId,
  messageId,
  companyId,
  jobId,
  jobSeq,
  userId,
}: FinalizeVoiceTranscriptionInput) {
  const db = getAdminClient();
  const transcript = await transcribeAudio(buffer, contentType, {
    requestId: fileId,
  });
  const content = transcript ?? UNTRANSCRIBED_FALLBACK;

  if (transcript) {
    const { error } = await db
      .from("job_messages")
      .update({ content: transcript })
      .eq("id", messageId)
      .eq("company_id", companyId);
    if (error) {
      logVoiceFinalize("Failed to update voice message transcript", {
        messageId,
        error: error.message,
      });
    }
  }

  const { data: sender } = await db
    .from("users")
    .select("full_name")
    .eq("id", userId)
    .maybeSingle();

  try {
    await createTimelineEvent(db, {
      companyId,
      jobId,
      eventType: "voice_message_transcribed",
      userId,
      metadata: {
        transcribed: transcript !== null,
        content,
        job_seq: jobSeq,
        sender_name: sender?.full_name ?? null,
      },
    });
  } catch (error) {
    logVoiceFinalize("Failed to create voice transcription timeline event", {
      messageId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// POST /api/jobs/[id]/voice-message — creates the voice message immediately
// and finalizes Deepgram transcription after the response. Idempotency key =
// attachment_id (§14): retrying with identical audio bytes returns the SAME
// message rather than a duplicate.
export const POST = withAuth<{ id: string }>(async (request, auth, { params }) => {
  const db = getAdminClient();
  const { job, workerId } = await loadJobWithAccess(db, auth, params.id);
  assertJobCommunicationAllowed({
    scheduled_at: (job.scheduled_at as string | null) ?? null,
    created_at: job.created_at as string,
  });

  const formData = await request.formData();
  const audio = formData.get("audio");
  if (!(audio instanceof File)) {
    throw new ApiError("bad_request", "No audio file provided.");
  }
  if (audio.size > LIMITS.VOICE_MAX_BYTES) {
    throw new ApiError("payload_too_large", "Audio file exceeds the maximum allowed size.");
  }

  // Same asymmetric office channel as text messages (a6): worker → office
  // contact only; office → this job's assigned worker. No client recipient.
  let recipientId: string;
  if (auth.role === "worker") {
    recipientId = await requireOfficeContactUserId(db, auth.companyId);
  } else {
    if (!workerId) {
      throw new ApiError("bad_request", "This job has no assigned worker to message.");
    }
    recipientId = workerId;
  }

  const buffer = Buffer.from(await audio.arrayBuffer());
  const fileHash = sha256Hex(buffer);

  const { data: existingFile } = await db
    .from("job_files")
    .select("id")
    .eq("job_id", params.id)
    .eq("file_hash", fileHash)
    .maybeSingle();

  if (existingFile) {
    const { data: existingMessage, error: existingMessageError } = await db
      .from("job_messages")
      .select("*")
      .eq("attachment_id", existingFile.id)
      .maybeSingle();
    if (existingMessageError) {
      throw new ApiError(
        "internal",
        "Failed to look up existing voice message.",
        existingMessageError.message
      );
    }
    if (existingMessage) {
      return ok({ message: existingMessage });
    }
  }

  const contentType = audio.type || "audio/webm";
  const extension = audio.name?.includes(".") ? audio.name.split(".").pop()! : "webm";
  const storagePath = buildStoragePath(params.id, extension);

  await uploadToStorage(db, storagePath, buffer, contentType);

  const { data: fileRecord, error: fileError } = await db
    .from("job_files")
    .insert({
      company_id: auth.companyId,
      job_id: params.id,
      uploaded_by: auth.userId,
      file_name: audio.name || `voice.${extension}`,
      attachment_type: "audio",
      storage_path: storagePath,
      file_size: buffer.length,
      file_hash: fileHash,
    })
    .select()
    .single();
  if (fileError || !fileRecord) {
    throw new ApiError("internal", "Audio uploaded but could not be recorded.", fileError?.message);
  }

  const { data: message, error: messageError } = await db
    .from("job_messages")
    .insert({
      company_id: auth.companyId,
      job_id: params.id,
      sender_id: auth.userId,
      recipient_id: recipientId,
      message_type: "voice",
      content: UNTRANSCRIBED_FALLBACK,
      attachment_id: fileRecord.id,
    })
    .select()
    .single();
  if (messageError || !message) {
    throw new ApiError("internal", "Failed to create voice message.", messageError?.message);
  }

  after(() => {
    return finalizeVoiceTranscription({
      buffer,
      contentType,
      fileId: fileRecord.id,
      messageId: message.id,
      companyId: auth.companyId,
      jobId: params.id,
      jobSeq: typeof job.company_seq === "number" ? job.company_seq : null,
      userId: auth.userId,
    });
  });

  await notifyMessageReceived(db, {
    companyId: auth.companyId,
    recipientId,
    title: "New voice message",
    body: "Voice message received",
    jobId: params.id,
  });

  return created({ message });
});
