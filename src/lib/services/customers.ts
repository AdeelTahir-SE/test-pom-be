import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/http/responses";

export function normalizeCustomerName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

export function normalizeNoteText(note: string): string {
  return note.trim().replace(/\s+/g, " ").toLowerCase();
}

export interface CustomerRow {
  id: string;
  company_id: string;
  name: string;
  name_normalized: string;
  created_at: string;
}

export interface CustomerNoteRow {
  id: string;
  company_id: string;
  customer_id: string;
  note: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type CustomerNoteWithCreator = CustomerNoteRow & {
  created_by_name: string | null;
};

/** Once-note may be plain text or JSON `{ text, jobId }`. */
export function parseOnceNoteContent(raw: string): {
  displayText: string;
  jobId: string | null;
} {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("{")) {
    return { displayText: trimmed, jobId: null };
  }
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed) &&
      typeof (parsed as { text?: unknown }).text === "string"
    ) {
      const text = ((parsed as { text: string }).text ?? "").trim();
      const jobIdRaw = (parsed as { jobId?: unknown }).jobId;
      const jobId =
        typeof jobIdRaw === "string" && jobIdRaw.trim() ? jobIdRaw.trim() : null;
      return { displayText: text || trimmed, jobId };
    }
  } catch {
    // Not JSON — treat as plain text.
  }
  return { displayText: trimmed, jobId: null };
}

/** Find or create a customer within the company by display name. */
export async function findOrCreateCustomer(
  db: SupabaseClient,
  companyId: string,
  rawName: string
): Promise<CustomerRow> {
  const name = rawName.trim().replace(/\s+/g, " ");
  if (!name) {
    throw new ApiError("bad_request", "Customer name is required.");
  }
  const nameNormalized = normalizeCustomerName(name);

  const { data: existing, error: findError } = await db
    .from("customers")
    .select("*")
    .eq("company_id", companyId)
    .eq("name_normalized", nameNormalized)
    .maybeSingle();
  if (findError) {
    throw new ApiError("internal", "Failed to look up customer.", findError.message);
  }
  if (existing) return existing as CustomerRow;

  const { data: created, error: createError } = await db
    .from("customers")
    .insert({
      company_id: companyId,
      name,
      name_normalized: nameNormalized,
    })
    .select("*")
    .single();

  // Concurrent create — re-read the winner.
  if (createError) {
    const { data: raced, error: raceError } = await db
      .from("customers")
      .select("*")
      .eq("company_id", companyId)
      .eq("name_normalized", nameNormalized)
      .maybeSingle();
    if (raceError || !raced) {
      throw new ApiError("internal", "Failed to create customer.", createError.message);
    }
    return raced as CustomerRow;
  }

  return created as CustomerRow;
}

export async function listNotesForCustomerName(
  db: SupabaseClient,
  companyId: string,
  rawName: string
): Promise<{ customer: CustomerRow | null; notes: CustomerNoteWithCreator[] }> {
  const nameNormalized = normalizeCustomerName(rawName);
  if (!nameNormalized) return { customer: null, notes: [] };

  const { data: customer, error } = await db
    .from("customers")
    .select("*")
    .eq("company_id", companyId)
    .eq("name_normalized", nameNormalized)
    .maybeSingle();
  if (error) {
    throw new ApiError("internal", "Failed to look up customer.", error.message);
  }
  if (!customer) return { customer: null, notes: [] };

  const { data: notes, error: notesError } = await db
    .from("customer_notes")
    .select("*")
    .eq("customer_id", customer.id)
    .order("created_at", { ascending: false });
  if (notesError) {
    throw new ApiError("internal", "Failed to load customer notes.", notesError.message);
  }

  const rows = (notes ?? []) as CustomerNoteRow[];
  const creatorIds = [...new Set(rows.map((n) => n.created_by).filter(Boolean))];
  const nameById = new Map<string, string>();
  if (creatorIds.length > 0) {
    const { data: creators } = await db
      .from("users")
      .select("id, full_name")
      .in("id", creatorIds);
    for (const u of creators ?? []) {
      if (u.full_name) nameById.set(u.id, u.full_name);
    }
  }

  return {
    customer: customer as CustomerRow,
    notes: rows.map((n) => ({
      ...n,
      created_by_name: nameById.get(n.created_by) ?? null,
    })),
  };
}

export function findDuplicateNote(
  notes: CustomerNoteRow[],
  candidate: string
): CustomerNoteRow | null {
  const needle = normalizeNoteText(candidate);
  if (!needle) return null;
  return notes.find((n) => normalizeNoteText(n.note) === needle) ?? null;
}
