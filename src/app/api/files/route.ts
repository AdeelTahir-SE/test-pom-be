import { withAuth } from "@/lib/http/handler";
import { ok, ApiError } from "@/lib/http/responses";
import { getAdminClient } from "@/lib/supabase/admin";
import { getSignedUrl } from "@/lib/storage/upload";

export const dynamic = "force-dynamic";

/**
 * GET /api/files — company-wide job attachments for the DB / Priponke view.
 * Owner/manager only. Hidden files excluded. Includes job title + uploader
 * (Dodal) for Mark a13.
 */
export const GET = withAuth(
  async (_request, auth) => {
    const db = getAdminClient();

    const { data, error } = await db
      .from("job_files")
      .select(
        "id, job_id, file_name, attachment_type, document_type, document_preview, ocr_text, created_at, storage_path, thumbnail_path, hidden_at, uploaded_by"
      )
      .eq("company_id", auth.companyId)
      .is("hidden_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      throw new ApiError("internal", "Failed to load files.", error.message);
    }

    const rows = data ?? [];
    const jobIds = [...new Set(rows.map((f) => f.job_id).filter(Boolean))];
    const uploaderIds = [
      ...new Set(rows.map((f) => f.uploaded_by).filter(Boolean) as string[]),
    ];

    const jobTitleById = new Map<string, string>();
    if (jobIds.length > 0) {
      const { data: jobs, error: jobsError } = await db
        .from("jobs")
        .select("id, title")
        .eq("company_id", auth.companyId)
        .in("id", jobIds);
      if (jobsError) {
        throw new ApiError("internal", "Failed to load jobs for files.", jobsError.message);
      }
      for (const j of jobs ?? []) {
        jobTitleById.set(j.id, j.title);
      }
    }

    const uploaderNameById = new Map<string, string>();
    if (uploaderIds.length > 0) {
      const { data: users, error: usersError } = await db
        .from("users")
        .select("id, full_name")
        .eq("company_id", auth.companyId)
        .in("id", uploaderIds);
      if (usersError) {
        throw new ApiError("internal", "Failed to load uploaders for files.", usersError.message);
      }
      for (const u of users ?? []) {
        uploaderNameById.set(u.id, u.full_name);
      }
    }

    const files = await Promise.all(
      rows.map(async (file) => ({
        id: file.id,
        job_id: file.job_id,
        job_title: jobTitleById.get(file.job_id) ?? null,
        file_name: file.file_name,
        attachment_type: file.attachment_type as string,
        document_type: (file.document_type as string | null) ?? null,
        document_preview: (file.document_preview as string | null) ?? null,
        created_at: file.created_at,
        uploaded_by: file.uploaded_by as string | null,
        uploaded_by_name: file.uploaded_by
          ? (uploaderNameById.get(file.uploaded_by) ?? null)
          : null,
        // Inline preview URL (not forced download) — Mark a13.
        signed_url: await getSignedUrl(db, file.storage_path),
        thumbnail_signed_url: file.thumbnail_path
          ? await getSignedUrl(db, file.thumbnail_path)
          : null,
      }))
    );

    return ok({ files });
  },
  { roles: ["owner", "manager"] }
);
