import { created, ApiError, toErrorResponse } from "@/lib/http/responses";
import { parseJsonBody, registerSchema } from "@/lib/validation/schemas";
import { getAdminClient } from "@/lib/supabase/admin";
import { getAuthClient } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

// POST /api/auth/register — Foundation Part 2 §12 Registration Flow:
// 1) validate business_module (via Zod enum, before any writes)
// 2) create user + company in one request
// 3) store business_module
// 4) create session
export async function POST(request: Request) {
  try {
    const input = await parseJsonBody(request, registerSchema);
    const db = getAdminClient();
    const fullName = input.full_name ?? input.email.split("@")[0]!;

    const { data: createdAuthUser, error: createUserError } = await db.auth.admin.createUser({
      email: input.email,
      password: input.password,
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
    const rollbackAuthUser = () => db.auth.admin.deleteUser(authUserId).catch(() => {});

    const { data: company, error: companyError } = await db
      .from("companies")
      .insert({ name: input.company_name, business_module: input.business_module })
      .select()
      .single();

    if (companyError || !company) {
      await rollbackAuthUser();
      throw new ApiError("internal", "Failed to create company.", companyError?.message);
    }

    const { data: userRow, error: userError } = await db
      .from("users")
      .insert({
        id: authUserId,
        company_id: company.id,
        email: input.email,
        full_name: fullName,
        role: "owner",
        is_active: true,
      })
      .select()
      .single();

    if (userError || !userRow) {
      await db.from("companies").delete().eq("id", company.id);
      await rollbackAuthUser();
      throw new ApiError("internal", "Failed to create user.", userError?.message);
    }

    const authClient = getAuthClient();
    const { data: session, error: signInError } = await authClient.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });

    if (signInError || !session.session) {
      throw new ApiError(
        "internal",
        "Account created but failed to start session.",
        signInError?.message
      );
    }

    return created({
      user: {
        id: userRow.id,
        email: userRow.email,
        full_name: userRow.full_name,
        role: userRow.role,
      },
      company: {
        id: company.id,
        name: company.name,
        business_module: company.business_module,
      },
      access_token: session.session.access_token,
      refresh_token: session.session.refresh_token,
      expires_in: session.session.expires_in,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
