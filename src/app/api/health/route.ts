import { ok, error } from "@/lib/http/responses";
import { getAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// GET /api/health — liveness + DB connectivity check.
export async function GET() {
  // Liveness is always true if this handler runs.
  let dbReachable = false;
  let dbMessage = "not_checked";

  try {
    const db = getAdminClient();
    // Cheap round-trip. Before migrations exist this may error on a missing
    // table; we still treat "connected but table missing" as reachable.
    const { error: dbError } = await db
      .from("companies")
      .select("id", { count: "exact", head: true });

    if (!dbError) {
      dbReachable = true;
      dbMessage = "ok";
    } else if (/relation .* does not exist|schema cache/i.test(dbError.message)) {
      dbReachable = true;
      dbMessage = "connected (schema not migrated yet)";
    } else {
      dbMessage = dbError.message;
    }
  } catch (err) {
    // Missing env or unreachable host.
    return error(
      "internal",
      "Health check failed to reach Supabase.",
      err instanceof Error ? err.message : String(err)
    );
  }

  return ok({
    status: "ok",
    service: "saas-platform-api",
    db: { reachable: dbReachable, detail: dbMessage },
    time: new Date().toISOString(),
  });
}
