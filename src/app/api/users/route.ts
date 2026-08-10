import { randomBytes } from "node:crypto";
import { withAuth } from "@/lib/http/handler";
import { created, ok, ApiError } from "@/lib/http/responses";
import { getAdminClient } from "@/lib/supabase/admin";
import { parseJsonBody } from "@/lib/validation/schemas";
import { z } from "zod";
import { USER_ROLES } from "@/config/constants";
import { sendWelcomeEmail } from "@/lib/integrations/resend";
import { normalizePhone } from "@/lib/phone";

// Base64url, no padding — safe to display/copy. Used for managers only when
// the company did not supply a password.
function generateTemporaryPassword(): string {
  return randomBytes(12).toString("base64url");
}

const USER_LIST_SELECT =
  "id, email, full_name, role, phone, is_active, created_at, login_pin";

export const dynamic = "force-dynamic";

// GET /api/users — list all users in the caller's company (owner + manager per matrix §12).
// login_pin is intentionally returned: worker PINs are a shared office channel
// (Mark), not private accounts — the company must always see them.
export const GET = withAuth(
  async (_request, auth) => {
    const db = getAdminClient();
    const { data, error } = await db
      .from("users")
      .select(USER_LIST_SELECT)
      .eq("company_id", auth.companyId)
      .order("created_at", { ascending: true });

    if (error) {
      throw new ApiError("internal", "Failed to load users.", error.message);
    }
    return ok({ users: data ?? [] });
  },
  { roles: ["owner", "manager"] }
);

const createUserSchema = z
  .object({
    email: z.string().trim().toLowerCase().email(),
    // Workers: company-set 4-character PIN (required).
    // Managers: optional; if set must be 8+ (company registration rules stay
    // separate). Empty → backend generates a temporary password once.
    password: z.string().optional().or(z.literal("")),
    full_name: z.string().trim().min(1, "Full name is required."),
    role: z.enum(USER_ROLES as unknown as [string, ...string[]]),
    phone: z.string().trim().min(1).optional(),
  })
  .superRefine((data, ctx) => {
    const password = data.password ?? "";
    if (data.role === "worker") {
      if (password.length !== 4) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["password"],
          message: "Worker password must be exactly 4 characters.",
        });
      }
      return;
    }
    if (data.role === "manager" && password && password.length < 8) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["password"],
        message: "Password must be at least 8 characters.",
      });
    }
  });

// POST /api/users — owner creates a manager or worker (spec §12: User Management = Owner only).
export const POST = withAuth(
  async (request, auth) => {
    const input = await parseJsonBody(request, createUserSchema);

    if (input.role === "owner") {
      throw new ApiError("bad_request", "Cannot create an additional owner account.");
    }

    const db = getAdminClient();

    const companyPassword = (input.password ?? "").trim();
    let authPassword: string;
    let loginPin: string | null;
    let generatedTemporary: string | null = null;

    if (input.role === "worker") {
      // Company chooses the worker PIN (exactly 4 chars). Stored for the left
      // list and used as the Auth password so login works with that PIN.
      authPassword = companyPassword;
      loginPin = companyPassword;
    } else if (companyPassword) {
      authPassword = companyPassword;
      loginPin = companyPassword;
    } else {
      generatedTemporary = generateTemporaryPassword();
      authPassword = generatedTemporary;
      loginPin = generatedTemporary;
    }

    const { data: createdAuthUser, error: createUserError } = await db.auth.admin.createUser({
      email: input.email,
      password: authPassword,
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
        login_pin: loginPin,
      })
      .select(USER_LIST_SELECT)
      .single();

    if (userError || !userRow) {
      await db.auth.admin.deleteUser(authUserId).catch(() => {});
      throw new ApiError("internal", "Failed to create user.", userError?.message);
    }

    // Best-effort welcome email — never blocks account creation.
    {
      const { data: companyRow } = await db
        .from("companies")
        .select("name")
        .eq("id", auth.companyId)
        .maybeSingle();
      await sendWelcomeEmail({
        to: input.email,
        fullName: input.full_name,
        credential: authPassword,
        role: input.role as "worker" | "manager",
        companyName: companyRow?.name ?? "pomocnik.net",
      });
    }

    return created({
      user: userRow,
      // Only when backend generated a manager password the company didn't type.
      ...(generatedTemporary ? { temporary_password: generatedTemporary } : {}),
    });
  },
  { roles: ["owner"] }
);
