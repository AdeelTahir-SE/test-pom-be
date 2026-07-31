import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/http/responses";

export interface OfficeContactUser {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
}

/**
 * Company office channel contact: active owner first, else earliest active manager.
 * Workers always message this destination — they never pick a recipient.
 */
export async function resolveOfficeContact(
  db: SupabaseClient,
  companyId: string
): Promise<OfficeContactUser | null> {
  const { data: owner, error: ownerError } = await db
    .from("users")
    .select("id, full_name, email, phone")
    .eq("company_id", companyId)
    .eq("role", "owner")
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (ownerError) {
    throw new ApiError("internal", "Failed to resolve office contact.", ownerError.message);
  }
  if (owner) return owner;

  const { data: manager, error: managerError } = await db
    .from("users")
    .select("id, full_name, email, phone")
    .eq("company_id", companyId)
    .eq("role", "manager")
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (managerError) {
    throw new ApiError("internal", "Failed to resolve office contact.", managerError.message);
  }
  return manager ?? null;
}

export async function requireOfficeContactUserId(
  db: SupabaseClient,
  companyId: string
): Promise<string> {
  const contact = await resolveOfficeContact(db, companyId);
  if (!contact) {
    throw new ApiError("bad_request", "No office contact is configured for this company.");
  }
  return contact.id;
}
