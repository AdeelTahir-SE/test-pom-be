import { randomBytes, randomInt } from "node:crypto";
import { withAuth } from "@/lib/http/handler";
import { created, ok, ApiError } from "@/lib/http/responses";
import { getAdminClient } from "@/lib/supabase/admin";
import { parseJsonBody } from "@/lib/validation/schemas";
import { z } from "zod";
import { USER_ROLES } from "@/config/constants";
import { sendWelcomeEmail } from "@/lib/integrations/resend";
import { normalizePhone } from "@/lib/phone";

// Base64url, no padding — safe to display/copy, no ambiguous characters lost.
// Used for managers/owners only — a real credential worth 8+ characters.
function generateTemporaryPassword(): string {
  return randomBytes(12).toString("base64url");
}

// Workers get a short login code instead of a real password (1 letter + 2
// digits, e.g. "K42") — this is an internal, low-sensitivity comms tool, so
// ease of remembering beats password strength for this role. Emailed to the
// worker on account creation.
const CODE_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // no I/O — avoid 1/0 confusion
function generateWorkerLoginCode(): string {
  const letter = CODE_LETTERS[randomInt(0, CODE_LETTERS.length)]!;
  const digits = String(randomInt(0, 100)).padStart(2, "0");
  return `${letter}${digits}`;
}

export const dynamic = "force-dynamic";

// GET /api/users — list all users in the caller's company (owner + manager per matrix §12).
export const GET = withAuth(
  async (_request, auth) => {
    const db = getAdminClient();
    const { data, error } = await db
      .from("users")
      .select("id, email, full_name, role, phone, is_active, created_at")
      .eq("company_id", auth.companyId)
      .order("created_at", { ascending: true });

    if (error) {
      throw new ApiError("internal", "Failed to load users.", error.message);
    }
    return ok({ users: data ?? [] });
  },
  { roles: ["owner", "manager"] }
);

const createUserSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  // Optional: if omitted, the backend generates one and returns it once
  // (data.temporary_password) so the office admin can share it with the
  // manager. Ignored entirely for workers — see generateWorkerLoginCode().
  password: z.string().min(8, "Password must be at least 8 characters.").optional().or(z.literal("")),
  full_name: z.string().trim().min(1, "Full name is required."),
  role: z.enum(USER_ROLES as unknown as [string, ...string[]]),
  phone: z.string().trim().min(1).optional(),
});

// POST /api/users — owner creates a manager or worker (spec §12: User Management = Owner only).
// Managers may NOT create users — only Owner has this permission in the matrix.
export const POST = withAuth(
  async (request, auth) => {
    const input = await parseJsonBody(request, createUserSchema);

    if (input.role === "owner") {
      throw new ApiError("bad_request", "Cannot create an additional owner account.");
    }

    const db = getAdminClient();

    // Workers always get an auto-generated short login code — the manual
    // password field doesn't apply to this role, even if one was somehow
    // submitted. Managers/owners keep the existing real-password flow.
    const generatedPassword =
      input.role === "worker"
        ? generateWorkerLoginCode()
        : input.password
          ? null
          : generateTemporaryPassword();

    const { data: createdAuthUser, error: createUserError } = await db.auth.admin.createUser({
      email: input.email,
      password: input.role === "worker" ? generatedPassword! : (input.password || generatedPassword!),
      email_confirm: true,
    });

    if (createUserError || !createdAuthUser?.user) {
      const message = createUserError?.message ?? "Failed to create account.";
      if (/already.*registered|already exists/i.test(message)) {
        throw new ApiError("conflict", "An account with this email already exists.");
      }
      throw new ApiError("bad_request", message);
    }

    const authUserId = createdAuthUser.user.id;

    const { data: userRow, error: userError } = await db
      .from("users")
      .insert({
        id: authUserId,
        company_id: auth.companyId,
        email: input.email,
        full_name: input.full_name,
        role: input.role,
        phone: normalizePhone(input.phone) ?? null,
        is_active: true,
      })
      .select("id, email, full_name, role, phone, is_active, created_at")
      .single();

    if (userError || !userRow) {
      await db.auth.admin.deleteUser(authUserId).catch(() => {});
      throw new ApiError("internal", "Failed to create user.", userError?.message);
    }

    // Best-effort welcome email carrying the credential — never blocks or
    // fails account creation if this doesn't send (no API key configured
    // yet, delivery failure, etc.); the credential is still returned below
    // and shown once in the UI as a fallback.
    if (generatedPassword) {
      const { data: companyRow } = await db
        .from("companies")
        .select("name")
        .eq("id", auth.companyId)
        .maybeSingle();
      await sendWelcomeEmail({
        to: input.email,
        fullName: input.full_name,
        credential: generatedPassword,
        role: input.role as "worker" | "manager",
        companyName: companyRow?.name ?? "pomocnik.net",
      });
    }

    return created({
      user: userRow,
      // Only present when the caller didn't supply a password — shown exactly
      // once so the office admin can hand it to the new worker/manager.
      ...(generatedPassword ? { temporary_password: generatedPassword } : {}),
    });
  },
  { roles: ["owner"] }
);
