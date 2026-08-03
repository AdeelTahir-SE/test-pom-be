import { withAuth } from "@/lib/http/handler";
import { ok, ApiError } from "@/lib/http/responses";
import { getAdminClient } from "@/lib/supabase/admin";
import { getSignedUrl } from "@/lib/storage/upload";

export const dynamic = "force-dynamic";

/**
 * GET /api/files — company-wide job attachments for the DB / Priponke view.
 * Owner/manager only. Hidden files excluded. Includes job title for display.
 */
export const GET = withAuth(
  async (_request, auth) => {
    const db = getAdminClient();

    const { data, error } = await db
      .from("job_files")
      .select(
        "id, job_id, file_name, attachment_type, document_type, document_preview, ocr_text, created_at, storage_path, thumbnail_path, hidden_at"
      )
      .eq("company_id", auth.companyId)
      .is("hidden_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      throw new ApiError("internal", "Failed to load files.", error.message);
    }

    const rows = data ?? [];
    const jobIds = [...new Set(rows.map((f) => f.job_id).filter(Boolean))];
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
