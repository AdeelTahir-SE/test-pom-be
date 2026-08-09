import { withAuth } from "@/lib/http/handler";
import { ok, ApiError } from "@/lib/http/responses";
import { getAdminClient } from "@/lib/supabase/admin";
import { getSignedUrl } from "@/lib/storage/upload";

export const dynamic = "force-dynamic";

// GET /api/office-reminders/[id]/attachment-url — get signed URL for reminder attachment
export const GET = withAuth<{ id: string }>(async (_request, auth, { params }) => {
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
  if (!reminder.link) throw new ApiError("bad_request", "Reminder has no attachment.");

  try {
    const linkData = JSON.parse(reminder.link);
    if (!linkData.storagePath) {
      throw new ApiError("bad_request", "Invalid attachment data.");
    }

    const signedUrl = await getSignedUrl(db, linkData.storagePath);
    if (!signedUrl) {
      throw new ApiError("internal", "Failed to generate signed URL.");
    }

    return ok({ url: signedUrl, fileName: linkData.fileName });
  } catch (err) {
    console.error("Failed to parse reminder link:", err);
    throw new ApiError("internal", "Invalid attachment data.");
  }
}, { roles: ["owner", "manager"] });
