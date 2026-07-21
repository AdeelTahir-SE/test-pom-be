import { z } from "zod";
import { withAuth } from "@/lib/http/handler";
import { ok, ApiError } from "@/lib/http/responses";
import { getAdminClient } from "@/lib/supabase/admin";
import { getSignedUrl } from "@/lib/storage/upload";
import { loadJobWithAccess } from "@/lib/services/jobAccess";
import { createTimelineEvent } from "@/lib/timeline/events";
import { parseJsonBody } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

// GET /api/files/[id] — single file + a fresh signed URL (used to refresh an
// expired one without re-listing the whole job). Hidden files are visible
// only to owner/manager/the uploader (File Visibility: hidden files "may
// still generate signed URLs if explicitly authorized").
export const GET = withAuth<{ id: string }>(async (_request, auth, { params }) => {
  const db = getAdminClient();

  const { data: file, error } = await db
    .from("job_files")
    .select("*")
    .eq("id", params.id)
    .eq("company_id", auth.companyId)
    .maybeSingle();
  if (error) throw new ApiError("internal", "Failed to load file.", error.message);
  if (!file) throw new ApiError("not_found", "File not found.");

  await loadJobWithAccess(db, auth, file.job_id);

  const isPrivileged =
    auth.role === "owner" || auth.role === "manager" || file.uploaded_by === auth.userId;
  if (file.hidden_at && !isPrivileged) {
    throw new ApiError("not_found", "File not found.");
  }

  return ok({
    file: {
      ...file,
      signed_url: await getSignedUrl(db, file.storage_path),
      thumbnail_signed_url: file.thumbnail_path
        ? await getSignedUrl(db, file.thumbnail_path)
        : null,
    },
  });
});

const hideSchema = z.object({ hidden: z.literal(true) }).strict();

// PATCH /api/files/[id] — hide only. Job File Attachments §7: authorized for
// Company owner, Job manager, or the file uploader. Files are otherwise
// immutable (no un-hide, no other fields) — hiding is the only mutation.
export const PATCH = withAuth<{ id: string }>(async (request, auth, { params }) => {
  await parseJsonBody(request, hideSchema);
  const db = getAdminClient();

  const { data: file, error } = await db
    .from("job_files")
    .select("*")
    .eq("id", params.id)
    .eq("company_id", auth.companyId)
    .maybeSingle();
  if (error) throw new ApiError("internal", "Failed to load file.", error.message);
  if (!file) throw new ApiError("not_found", "File not found.");

  const isAuthorized =
    auth.role === "owner" || auth.role === "manager" || file.uploaded_by === auth.userId;
  if (!isAuthorized) {
    throw new ApiError("forbidden", "You do not have permission to hide this file.");
  }

  if (file.hidden_at) {
    return ok({ file });
  }

  const { data: updated, error: updateError } = await db
    .from("job_files")
    .update({ hidden_at: new Date().toISOString() })
    .eq("id", file.id)
    .select()
    .single();
  if (updateError || !updated) {
    throw new ApiError("internal", "Failed to hide file.", updateError?.message);
  }

  await createTimelineEvent(db, {
    companyId: auth.companyId,
    jobId: file.job_id,
    eventType: "file_hidden",
    userId: auth.userId,
    metadata: { file_name: file.file_name },
  });

  return ok({ file: updated });
});
