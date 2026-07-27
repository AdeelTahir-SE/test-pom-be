import { ok, ApiError, toErrorResponse } from "@/lib/http/responses";
import { getAuthClient } from "@/lib/supabase/auth";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

// GET /api/auth/google — returns Supabase Google OAuth URL (skip browser redirect).
// Requires Google provider enabled in the Supabase project dashboard.
export async function GET() {
  try {
    const authClient = getAuthClient();
    const redirectTo = `${env.appUrl.replace(/\/$/, "")}/auth/callback`;

    const { data, error } = await authClient.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });

    if (error || !data.url) {
      throw new ApiError(
        "internal",
        "Prijava z Googlom ni na voljo. Preverite nastavitve ponudnika v Supabase."
      );
    }

    return ok({ url: data.url });
  } catch (err) {
    return toErrorResponse(err);
  }
}
