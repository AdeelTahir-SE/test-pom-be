import { z } from "zod";
import { ok, ApiError, toErrorResponse } from "@/lib/http/responses";
import { parseJsonBody } from "@/lib/validation/schemas";
import { getAuthClient } from "@/lib/supabase/auth";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

const forgotSchema = z.object({
  email: z.string().trim().toLowerCase().email("Neveljaven e-poštni naslov."),
});

// POST /api/auth/forgot-password — sends Supabase recovery email.
// Always returns ok for valid email format (no account enumeration).
export async function POST(request: Request) {
  try {
    const input = await parseJsonBody(request, forgotSchema);
    const authClient = getAuthClient();
    const redirectTo = `${env.appUrl.replace(/\/$/, "")}/reset-password`;

    const { error } = await authClient.auth.resetPasswordForEmail(input.email, {
      redirectTo,
    });

    // Do not leak whether the email exists — only surface transport failures.
    if (error && /rate|limit/i.test(error.message)) {
      throw new ApiError("bad_request", "Preveč poskusov. Poskusite znova čez nekaj minut.");
    }

    return ok({
      sent: true,
      message: "Če račun obstaja, smo poslali povezavo za ponastavitev gesla.",
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
