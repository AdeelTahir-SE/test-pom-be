import { randomUUID } from "node:crypto";
import { api } from "./client";
import { getAdminClient } from "@/lib/supabase/admin";

export function uniqueEmail(prefix: string): string {
  return `${prefix}-${randomUUID()}@example.com`;
}

export interface RegisteredCompany {
  status: number;
  email: string;
  password: string;
  companyName: string;
  businessModule: string;
  accessToken?: string;
  userId?: string;
  companyId?: string;
}

export async function registerCompany(
  overrides: Partial<{
    email: string;
    password: string;
    company_name: string;
    business_module: string;
  }> = {}
): Promise<RegisteredCompany> {
  const email = overrides.email ?? uniqueEmail("owner");
  const password = overrides.password ?? "TestPass123!";
  const companyName = overrides.company_name ?? `Test Co ${randomUUID().slice(0, 8)}`;
  const businessModule = overrides.business_module ?? "construction";

  const res = await api.post<{
    data?: {
      access_token: string;
      user: { id: string };
      company: { id: string };
    };
  }>("/api/auth/register", {
    body: {
      email,
      password,
      company_name: companyName,
      business_module: businessModule,
    },
  });

  return {
    status: res.status,
    email,
    password,
    companyName,
    businessModule,
    accessToken: res.body.data?.access_token,
    userId: res.body.data?.user?.id,
    companyId: res.body.data?.company?.id,
  };
}

export async function loginAs(email: string, password: string) {
  return api.post<{ data?: { access_token: string; refresh_token: string } }>("/api/auth/login", {
    body: { email, password },
  });
}

export interface CreatedCompanyUser {
  status: number;
  email: string;
  password: string;
  userId?: string;
  role?: string;
}

// Creates a manager/worker under an existing company via the owner's token
// (POST /api/users) — exercises the real endpoint rather than inserting directly.
export async function createCompanyUser(
  ownerToken: string,
  overrides: Partial<{ email: string; password: string; full_name: string; role: string }> = {}
): Promise<CreatedCompanyUser> {
  const email = overrides.email ?? uniqueEmail("member");
  const password = overrides.password ?? "MemberPass123!";
  const role = overrides.role ?? "worker";

  const res = await api.post<{
    data?: { user: { id: string; role: string }; temporary_password?: string };
  }>("/api/users", {
    token: ownerToken,
    body: {
      email,
      password,
      full_name: overrides.full_name ?? "Test Member",
      role,
    },
  });

  // Workers always get an auto-generated login code; managers may get a
  // temporary password when none was supplied. Prefer that over the request body.
  const actualPassword = res.body.data?.temporary_password ?? password;

  return {
    status: res.status,
    email,
    password: actualPassword,
    userId: res.body.data?.user?.id,
    role: res.body.data?.user?.role,
  };
}

export interface PlatformAdminFixture {
  email: string;
  password: string;
  userId: string;
  accessToken: string;
}

export async function createPlatformAdmin(): Promise<PlatformAdminFixture> {
  const email = uniqueEmail("admin");
  const password = "AdminPass123!";
  const db = getAdminClient();

  const { data, error } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) {
    throw new Error(`Failed to create platform admin auth user: ${error?.message}`);
  }

  const { error: insertError } = await db
    .from("platform_admins")
    .insert({ id: data.user.id, email });
  if (insertError) {
    throw new Error(`Failed to insert platform_admins row: ${insertError.message}`);
  }

  const loginRes = await loginAs(email, password);
  const accessToken = loginRes.body.data?.access_token;
  if (!accessToken) {
    throw new Error("Failed to log in as newly created platform admin.");
  }

  return { email, password, userId: data.user.id, accessToken };
}

export async function deactivateUser(userId: string): Promise<void> {
  const db = getAdminClient();
  await db.from("users").update({ is_active: false }).eq("id", userId);
}

// Best-effort teardown for test-created identities. Deleting an auth user
// cascades to its public.users row; every member (owner + any manager/worker
// created under the company) has a distinct auth user that must be removed
// individually. The company row is deleted last since nothing owns it by FK.
export async function cleanupCompany(companyId?: string, authUserId?: string): Promise<void> {
  const db = getAdminClient();

  if (companyId) {
    const { data: members } = await db.from("users").select("id").eq("company_id", companyId);
    for (const member of members ?? []) {
      await db.auth.admin.deleteUser(member.id).catch(() => {});
    }
  }
  if (authUserId) {
    await db.auth.admin.deleteUser(authUserId).catch(() => {});
  }
  if (companyId) {
    await db.from("companies").delete().eq("id", companyId).then(
      () => {},
      () => {}
    );
  }
}

export async function cleanupPlatformAdmin(userId: string): Promise<void> {
  const db = getAdminClient();
  await db.auth.admin.deleteUser(userId).catch(() => {});
}

// Direct DB read for asserting Timeline side effects before the Phase 6
// GET /jobs/[id]/timeline endpoint exists.
export async function getTimelineEvents(
  jobId: string
): Promise<{ event_type: string; metadata: Record<string, unknown> | null }[]> {
  const db = getAdminClient();
  const { data, error } = await db
    .from("timeline_events")
    .select("event_type, metadata, user_id, created_at")
    .eq("job_id", jobId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Failed to read timeline_events: ${error.message}`);
  return (data as { event_type: string; metadata: Record<string, unknown> | null }[]) ?? [];
}

// Real OCR can't be exercised in this sandbox (outbound network to Mistral
// is blocked) — tests set ocr_text directly. Add-on 1 classification + preview
// are applied here the same way the upload route does after a successful OCR.
export async function setFileOcrText(fileId: string, text: string): Promise<void> {
  const db = getAdminClient();
  const { data: file, error: readError } = await db
    .from("job_files")
    .select("file_name")
    .eq("id", fileId)
    .maybeSingle();
  if (readError) throw new Error(`Failed to read file for OCR: ${readError.message}`);

  const { enrichDocumentFromOcr } = await import("@/lib/documents/preview");
  const enrichment = enrichDocumentFromOcr(text, file?.file_name ?? "");

  const { error } = await db
    .from("job_files")
    .update({
      ocr_text: text,
      document_type: enrichment.document_type,
      document_preview: enrichment.document_preview,
    })
    .eq("id", fileId);
  if (error) throw new Error(`Failed to set ocr_text: ${error.message}`);
}
