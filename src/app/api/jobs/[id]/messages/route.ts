import { z } from "zod";
import { withAuth } from "@/lib/http/handler";
import { created, ok, ApiError } from "@/lib/http/responses";
import { getAdminClient } from "@/lib/supabase/admin";
import { parseJsonBody } from "@/lib/validation/schemas";
import { loadJobWithAccess } from "@/lib/services/jobAccess";
import { createTimelineEvent } from "@/lib/timeline/events";
import { notifyUser } from "@/lib/services/notifications";
import { LIMITS } from "@/config/constants";

export const dynamic = "force-dynamic";

// GET /api/jobs/[id]/messages — default order created_at ASC, oldest first
// (Internal Messages §10; Appendix A §7).
export const GET = withAuth<{ id: string }>(async (_request, auth, { params }) => {
  const db = getAdminClient();
  await loadJobWithAccess(db, auth, params.id);

  const { data, error } = await db
    .from("job_messages")
    .select("*")
    .eq("job_id", params.id)
    .order("created_at", { ascending: true });
  if (error) throw new ApiError("internal", "Failed to load messages.", error.message);

  return ok({ messages: data ?? [] });
});

const sendMessageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Message cannot be empty.")
    .max(LIMITS.MESSAGE_MAX_LENGTH, "Maximum message length is 400 characters."),
  is_urgent: z.boolean().optional(),
  recipient_id: z.string().uuid().optional(),
});

// POST /api/jobs/[id]/messages — strictly vertical Employee<->Office
// communication (Internal Messages §2, §13): a worker may only message the
// office (any owner/manager); an owner/manager may only message this job's
// assigned worker. Worker<->worker is always forbidden.
export const POST = withAuth<{ id: string }>(async (request, auth, { params }) => {
  const input = await parseJsonBody(request, sendMessageSchema);
  const db = getAdminClient();
  const { job, workerId } = await loadJobWithAccess(db, auth, params.id);

  let recipientId: string;

  if (auth.role === "worker") {
    if (input.recipient_id) {
      const { data: recipient, error: recipientError } = await db
        .from("users")
        .select("id, role")
        .eq("id", input.recipient_id)
        .eq("company_id", auth.companyId)
        .maybeSingle();
      if (recipientError) {
        throw new ApiError("internal", "Failed to validate recipient.", recipientError.message);
      }
      if (!recipient || recipient.role === "worker") {
        throw new ApiError("forbidden", "Workers can only message the office (owner or manager).");
      }
      recipientId = recipient.id;
    } else {
      recipientId = job.created_by as string;
    }
  } else {
    if (!workerId) {
      throw new ApiError("bad_request", "This job has no assigned worker to message.");
    }
    if (input.recipient_id && input.recipient_id !== workerId) {
      throw new ApiError("forbidden", "You may only message this job's assigned worker.");
    }
    recipientId = workerId;
  }

  const { data: message, error: messageError } = await db
    .from("job_messages")
    .insert({
      company_id: auth.companyId,
      job_id: params.id,
      sender_id: auth.userId,
      recipient_id: recipientId,
      message_type: "text",
      content: input.content,
      is_urgent: input.is_urgent ?? false,
    })
    .select()
    .single();
  if (messageError || !message) {
    throw new ApiError("internal", "Failed to send message.", messageError?.message);
  }

  // User-created text messages generate message_sent; system/voice messages
  // never do (Appendix B §5 Critical Consistency Rule).
  await createTimelineEvent(db, {
    companyId: auth.companyId,
    jobId: params.id,
    eventType: "message_sent",
    userId: auth.userId,
    metadata: {
      is_urgent: message.is_urgent,
      content: message.content,
      job_seq: job.company_seq,
    },
  });

  await notifyUser(db, {
    companyId: auth.companyId,
    userId: recipientId,
    type: "message_received",
    title: "New message",
    body: input.content.slice(0, 100),
    jobId: params.id,
  });

  return created({ message });
});
