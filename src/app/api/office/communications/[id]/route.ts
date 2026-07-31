import { z } from "zod";
import { withAuth } from "@/lib/http/handler";
import { ok, ApiError } from "@/lib/http/responses";
import { getAdminClient } from "@/lib/supabase/admin";
import { parseJsonBody } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

const hideSchema = z.object({
  hidden: z.literal(true),
});

// PATCH /api/office/communications/[id] — soft-hide from the shared office
// KOMUNIKACIJA column (visible to all office roles as removed).
export const PATCH = withAuth<{ id: string }>(async (request, auth, { params }) => {
  if (auth.role === "worker") {
    throw new ApiError("forbidden", "Only office users can hide communication cards.");
  }

  await parseJsonBody(request, hideSchema);
  const db = getAdminClient();

  const { data: message, error: loadError } = await db
    .from("job_messages")
    .select("id, company_id, office_hidden_at")
    .eq("id", params.id)
    .eq("company_id", auth.companyId)
    .maybeSingle();
  if (loadError) {
    throw new ApiError("internal", "Failed to load message.", loadError.message);
  }
  if (!message) {
    throw new ApiError("not_found", "Message not found.");
  }

  if (message.office_hidden_at) {
    return ok({ message: { id: message.id, office_hidden_at: message.office_hidden_at } });
  }

  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await db
    .from("job_messages")
    .update({ office_hidden_at: now })
    .eq("id", message.id)
    .eq("company_id", auth.companyId)
    .select("id, office_hidden_at")
    .single();
  if (updateError || !updated) {
    throw new ApiError("internal", "Failed to hide message.", updateError?.message);
  }

  return ok({ message: updated });
});
