import { z } from "zod";
import { withAuth } from "@/lib/http/handler";
import { created, ok, ApiError } from "@/lib/http/responses";
import { getAdminClient } from "@/lib/supabase/admin";
import { parseJsonBody } from "@/lib/validation/schemas";
import {
  collectDayOperationalPack,
  generateDailySummaryText,
  getSummaryForDay,
  listDailySummaries,
  saveDailySummary,
} from "@/lib/services/dailySummary";

export const dynamic = "force-dynamic";

const daySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD");

// GET /api/daily-summaries?date=YYYY-MM-DD — one day
// GET /api/daily-summaries — history newest first
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

const generateSchema = z.object({
  date: daySchema,
});

// POST /api/daily-summaries — generate + save for a day.
// MVP: if a snapshot already exists, return it (no auto-regenerate).
export const POST = withAuth(
  async (request, auth) => {
    const input = await parseJsonBody(request, generateSchema);
    const db = getAdminClient();

    const existing = await getSummaryForDay(db, auth.companyId, input.date);
    if (existing) {
      return ok({ summary: existing, reused: true });
    }

    const pack = await collectDayOperationalPack(db, auth.companyId, input.date);
    const { summary_text, attention } = await generateDailySummaryText(pack);

    const summary = await saveDailySummary(db, {
      companyId: auth.companyId,
      calendarDay: input.date,
      summaryText: summary_text,
      attention,
      generatedBy: auth.userId,
    });

    return created({ summary, reused: false });
  },
  { roles: ["owner", "manager"] }
);
