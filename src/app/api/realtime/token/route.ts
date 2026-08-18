import { withAuth } from "@/lib/http/handler";
import { ok, ApiError } from "@/lib/http/responses";
import { readAccessToken } from "@/lib/auth/cookies";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (request) => {
  const token = readAccessToken(request);
  if (!token) throw new ApiError("unauthorized", "Missing realtime token.");
  return ok({ access_token: token });
});
