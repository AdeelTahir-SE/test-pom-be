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
import { structureVoiceTranscript } from "@/lib/integrations/openai";
import { LIMITS } from "@/config/constants";

export const dynamic = "force-dynamic";

const UNTRANSCRIBED_FALLBACK = "Voice message (untranscribed)";

// POST /api/jobs/[id]/voice-message — Voice-to-Text add-on: synchronous
// UPLOAD -> TRANSCRIBE -> STORE -> RETURN RESPONSE. Exactly one message is
// created per request; creation succeeds even if transcription fails
// (§7 Failure Rule). Idempotency key = attachment_id (§14): retrying with
// identical audio bytes returns the SAME message rather than a duplicate.
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

  // Pipeline (Mark): record → Deepgram STT → GPT structure → send.
  // GPT failure must not block the message — keep raw transcript.
  const transcript = await transcribeAudio(buffer, contentType, {
    requestId: fileRecord.id,
  });
  const structured = transcript
    ? await structureVoiceTranscript(transcript, { requestId: fileRecord.id })
    : null;
  const content = structured ?? transcript ?? UNTRANSCRIBED_FALLBACK;

  const { data: message, error: messageError } = await db
    .from("job_messages")
    .insert({
      company_id: auth.companyId,
      job_id: params.id,
      sender_id: auth.userId,
      recipient_id: recipientId,
      message_type: "voice",
      content,
      attachment_id: fileRecord.id,
    })
    .select()
    .single();
  if (messageError || !message) {
    throw new ApiError("internal", "Failed to create voice message.", messageError?.message);
  }

  const { data: sender } = await db
    .from("users")
    .select("full_name")
    .eq("id", auth.userId)
    .maybeSingle();

  // voice_message_transcribed, NOT message_sent — system-generated voice
  // transcription never triggers message_sent (Appendix B §5).
  await createTimelineEvent(db, {
    companyId: auth.companyId,
    jobId: params.id,
    eventType: "voice_message_transcribed",
    userId: auth.userId,
    metadata: {
      transcribed: transcript !== null,
      structured: structured !== null,
      content,
      job_seq: job.company_seq,
      sender_name: sender?.full_name ?? null,
    },
  });

  await notifyMessageReceived(db, {
    companyId: auth.companyId,
    recipientId,
    title: "New voice message",
    body: content.slice(0, 100),
    jobId: params.id,
  });

  return created({ message });
});
