import { z } from "zod";
import { withAuth } from "@/lib/http/handler";
import { ok, ApiError } from "@/lib/http/responses";
import { parseJsonBody } from "@/lib/validation/schemas";
import { getAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
  userAgent: z.string().max(500).optional(),
  deviceName: z.string().max(100).optional(),
});

const unsubscribeSchema = z.object({
  endpoint: z.string().url(),
});

export const POST = withAuth(async (request, auth) => {
  const input = await parseJsonBody(request, subscribeSchema);
  const db = getAdminClient();
  const now = new Date().toISOString();

  const { data, error } = await db
    .from("push_subscriptions")
    .upsert(
      {
        company_id: auth.companyId,
        user_id: auth.userId,
        endpoint: input.endpoint,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        user_agent: input.userAgent ?? request.headers.get("user-agent"),
        device_name: input.deviceName ?? null,
        updated_at: now,
      },
      { onConflict: "user_id,endpoint" }
    )
    .select("id, endpoint, updated_at")
    .single();

  if (error || !data) {
    throw new ApiError("internal", "Failed to save push subscription.", error?.message);
  }

  return ok({ subscription: data });
});

export const DELETE = withAuth(async (request, auth) => {
  const input = await parseJsonBody(request, unsubscribeSchema);
  const db = getAdminClient();

  const { error } = await db
    .from("push_subscriptions")
    .delete()
    .eq("company_id", auth.companyId)
    .eq("user_id", auth.userId)
    .eq("endpoint", input.endpoint);

  if (error) {
    throw new ApiError("internal", "Failed to remove push subscription.", error.message);
  }

  return ok({ removed: true });
});
