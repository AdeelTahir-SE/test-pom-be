import { randomUUID, createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/http/responses";
import { env } from "@/lib/env";

// Signed URLs are time-limited; frontend must re-fetch expired ones
// (Supabase Storage add-on §7). 5 minutes is enough for one page view.
const SIGNED_URL_EXPIRY_SECONDS = 300;

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

// Passive storage only knows a signed URL is a temporary representation of a
// DB record (spec §7) — callers must have already authorized DB-level access
// before calling this.
export async function getSignedUrl(db: SupabaseClient, path: string): Promise<string | null> {
  const { data, error } = await db.storage
    .from(env.storageBucket)
    .createSignedUrl(path, SIGNED_URL_EXPIRY_SECONDS);
  if (error || !data) return null;
  return data.signedUrl;
}
