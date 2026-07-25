import { z } from "zod";
import { withAuth } from "@/lib/http/handler";
import { ok, ApiError } from "@/lib/http/responses";
import { getAdminClient } from "@/lib/supabase/admin";
import { getSummaryForDay, listDailySummaries } from "@/lib/services/dailySummary";

export const dynamic = "force-dynamic";

const daySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD");

// GET /api/daily-summaries?date=YYYY-MM-DD — one ready day (null if missing/failed)
// GET /api/daily-summaries — history newest first (ready only)
export const GET = withAuth(
  async (request, auth) => {
    const db = getAdminClient();
    const date = new URL(request.url).searchParams.get("date");

    if (date) {
      const parsed = daySchema.safeParse(date);
      if (!parsed.success) {
        throw new ApiError("bad_request", "Query parameter date must be YYYY-MM-DD.");
      }
      const summary = await getSummaryForDay(db, auth.companyId, parsed.data);
      return ok({ summary });
    }

    const summaries = await listDailySummaries(db, auth.companyId);
    return ok({ summaries });
  },
  { roles: ["owner", "manager"] }
);

// Manual AI generation removed — summaries are produced once nightly at 23:00
// (Europe/Ljubljana) by /api/cron/daily-summaries. No user-triggered AI retries.
export const POST = withAuth(
  async () => {
    throw new ApiError(
      "forbidden",
      "Daily summaries are generated automatically at 23:00. Manual generation is disabled."
    );
  },
  { roles: ["owner", "manager"] }
);
