import { withAuth } from "@/lib/http/handler";
import { ok, ApiError } from "@/lib/http/responses";
import { getAdminClient } from "@/lib/supabase/admin";
import { getSignedUrl } from "@/lib/storage/upload";

export const dynamic = "force-dynamic";

// GET /api/search?q=... — searches job_files.file_name and .ocr_text
// (Job File Attachments §11, Document OCR add-on §6). Company-scoped;
// workers are further constrained to files within jobs assigned to them —
// the same Job-level permission rule as every other job-scoped endpoint.
// Computed fresh per request over primary tables only (Part 9: no derived
// storage, no search index tables).
export const GET = withAuth(async (request, auth) => {
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim();
  if (!q) {
    throw new ApiError("bad_request", "Search query (q) is required.");
  }

  const db = getAdminClient();

  let workerJobIds: string[] | null = null;
  if (auth.role === "worker") {
    const { data: assignments, error: assignError } = await db
      .from("job_assignments")
      .select("job_id")
      .eq("worker_id", auth.userId);
    if (assignError) {
      throw new ApiError("internal", "Failed to load assignments.", assignError.message);
    }
    workerJobIds = (assignments ?? []).map((a) => a.job_id);
    if (workerJobIds.length === 0) {
      return ok({ results: [] });
    }
  }

  const pattern = `%${q}%`;

  let nameQuery = db
    .from("job_files")
    .select("*")
    .eq("company_id", auth.companyId)
    .is("hidden_at", null)
    .ilike("file_name", pattern);
  let ocrQuery = db
    .from("job_files")
    .select("*")
    .eq("company_id", auth.companyId)
    .is("hidden_at", null)
    .ilike("ocr_text", pattern);
  if (workerJobIds) {
    nameQuery = nameQuery.in("job_id", workerJobIds);
    ocrQuery = ocrQuery.in("job_id", workerJobIds);
  }

  const [{ data: byName, error: byNameError }, { data: byOcr, error: byOcrError }] =
    await Promise.all([nameQuery, ocrQuery]);
  if (byNameError) throw new ApiError("internal", "Search failed.", byNameError.message);
  if (byOcrError) throw new ApiError("internal", "Search failed.", byOcrError.message);

  const merged = new Map<string, Record<string, unknown> & { id: string; storage_path: string }>();
  for (const file of [...(byName ?? []), ...(byOcr ?? [])]) {
    merged.set(file.id, file);
  }

  const results = await Promise.all(
    [...merged.values()].map(async (file) => ({
      ...file,
      signed_url: await getSignedUrl(db, file.storage_path),
    }))
  );

  return ok({ results });
});
