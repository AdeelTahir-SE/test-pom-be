import { withAuth } from "@/lib/http/handler";
import { created, ok, ApiError } from "@/lib/http/responses";
import { getAdminClient } from "@/lib/supabase/admin";
import { parseJsonBody } from "@/lib/validation/schemas";
import { z } from "zod";
import { USER_ROLES } from "@/config/constants";
import { sendWelcomeEmail } from "@/lib/integrations/resend";
import { normalizePhone } from "@/lib/phone";

const USER_LIST_SELECT =
  "id, email, full_name, role, phone, is_active, created_at, login_pin";

export const dynamic = "force-dynamic";

// GET /api/users — list all users in the caller's company (owner + manager per matrix §12).
// login_pin is intentionally returned: staff PINs are a shared office channel
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
    // Never expose the company/owner credential. login_pin is only for
    // staff (Pisarna/Teren) that the company set — Mark.
    const users = (data ?? []).map((u) =>
      u.role === "owner" ? { ...u, login_pin: null } : u
    );
    return ok({ users });
  },
  { roles: ["owner", "manager"] }
);

const createUserSchema = z
  .object({
    email: z.string().trim().toLowerCase().email(),
    // Company-set 4-digit PIN = Auth password (login: email + PIN). Mark.
    // Owner self-registration stays 8+ elsewhere — this form is staff only.
    password: z
      .string()
      .regex(/^\d{4}$/, "Staff password must be exactly 4 digits."),
    full_name: z.string().trim().min(1, "Full name is required."),
    role: z.enum(USER_ROLES as unknown as [string, ...string[]]),
    // Phone required for Pisarna/Teren (Mark).
    phone: z.string().trim().min(1, "Phone is required."),
  })
  .superRefine((data, ctx) => {
    if (data.role === "owner") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["role"],
        message: "Cannot create an additional owner account.",
      });
    }
  });

// POST /api/users — owner creates a manager (Pisarna) or worker (Teren).
// Cannot create another owner (only one company account).
export const POST = withAuth(
  async (request, auth) => {
    const input = await parseJsonBody(request, createUserSchema);

    if (input.role === "owner") {
      throw new ApiError("bad_request", "Cannot create an additional owner account.");
    }

    const db = getAdminClient();

    // PIN is the real Auth password — staff login = email + this PIN (Mark).
    const authPassword = input.password.trim();
    const loginPin = authPassword;
    const phone = normalizePhone(input.phone);
    if (!phone) {
      throw new ApiError("bad_request", "Phone is required.");
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
        phone,
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

    return created({ user: userRow });
  },
  { roles: ["owner"] }
);
