import { randomUUID, createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/http/responses";
import { env } from "@/lib/env";

// Signed URLs are time-limited; frontend must re-fetch expired ones
// (Supabase Storage add-on §7). 1 hour covers a DB/Priponke session;
// open-preview still refreshes via GET /api/files/[id].
const SIGNED_URL_EXPIRY_SECONDS = 3600;

export function sha256Hex(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

// storage_path is generated BEFORE any processing begins, backend-only,
// always a fresh UUID (Supabase Storage add-on §4). Format: jobs/{job_id}/{uuid}.{ext}
export function buildStoragePath(jobId: string, extension: string, suffix = ""): string {
  return `jobs/${jobId}/${randomUUID()}${suffix}.${extension}`;
}

// Backend-only upload (spec §5: "no frontend upload"). No overwrites — every
// path is a fresh UUID, so upsert stays false.
export async function uploadToStorage(
  db: SupabaseClient,
  path: string,
  buffer: Buffer,
  contentType: string
): Promise<void> {
  const { error } = await db.storage
    .from(env.storageBucket)
    .upload(path, buffer, { contentType, upsert: false });
  if (error) {
    throw new ApiError("internal", "Failed to upload file to storage.", error.message);
  }
}

export async function deleteFromStorage(
  db: SupabaseClient,
  path: string
): Promise<void> {
  const { error } = await db.storage
    .from(env.storageBucket)
    .remove([path]);

  if (error) {
    console.error("[storage_delete_failed]", path, error.message);
  }
}

// Passive storage only knows a signed URL is a temporary representation of a
// DB record (spec §7) — callers must have already authorized DB-level access
// before calling this.
/**
 * Temporary signed URL for an authorized storage object.
 * Default is inline preview (Mark a13: open docs, don't force download).
 * Pass `download: true` or a filename only when a download is intentional.
 */
export async function getSignedUrl(
  db: SupabaseClient,
  path: string,
  options?: { download?: boolean | string }
): Promise<string | null> {
  const { data, error } = await db.storage
    .from(env.storageBucket)
    .createSignedUrl(path, SIGNED_URL_EXPIRY_SECONDS, {
      download: options?.download ?? false,
    });
  if (error || !data) return null;
  return data.signedUrl;
}
