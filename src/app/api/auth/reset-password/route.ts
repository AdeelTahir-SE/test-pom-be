import { z } from "zod";
import { ok, ApiError, toErrorResponse } from "@/lib/http/responses";
import { parseJsonBody } from "@/lib/validation/schemas";
import { getAuthClient } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

const resetSchema = z.object({
  access_token: z.string().min(1, "Manjka žeton za ponastavitev."),
  refresh_token: z.string().min(1).optional(),
  password: z.string().min(8, "Geslo mora imeti vsaj 8 znakov."),
});

// POST /api/auth/reset-password — sets a new password using the recovery
// session tokens from the email link (hash or exchanged code).
export async function POST(request: Request) {
  try {
    const input = await parseJsonBody(request, resetSchema);
    const authClient = getAuthClient();

    const { error: sessionError } = await authClient.auth.setSession({
      access_token: input.access_token,
      refresh_token: input.refresh_token ?? input.access_token,
    });
    if (sessionError) {
      throw new ApiError(
        "unauthorized",
        "Povezava za ponastavitev je neveljavna ali je potekla. Zahtevajte novo."
      );
    }

    const { error: updateError } = await authClient.auth.updateUser({
      password: input.password,
    });
    if (updateError) {
      throw new ApiError(
        "bad_request",
        updateError.message || "Gesla ni bilo mogoče posodobiti."
      );
    }

    return ok({ updated: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
