import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { getAdminClient } from "@/lib/supabase/admin";
import { APP_TIMEZONE, getZonedDayAndHour } from "@/lib/officeDate";
import { runNightlyDailySummaries } from "@/lib/services/dailySummary";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Vercel Cron (hourly). Generates each company's daily summary once at 23:00
 * Europe/Ljubljana. Failed attempts are recorded so AI is never retried.
 *
 * Protect with Authorization: Bearer $CRON_SECRET
 * Optional: ?force=1 to run outside the 23:00 window (still no AI retries).
 */
export async function GET(request: Request) {
  const secret = env.cronSecret;
  const authHeader = request.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const force = url.searchParams.get("force") === "1";
  const { calendarDay, hour } = getZonedDayAndHour(new Date(), APP_TIMEZONE);

  if (!force && hour !== 23) {
    return NextResponse.json({
      data: {
        skipped: true,
        reason: "outside_23:00_window",
        timezone: APP_TIMEZONE,
        calendarDay,
        hour,
      },
    });
  }

  const db = getAdminClient();
  const results = await runNightlyDailySummaries(db, calendarDay);

  return NextResponse.json({
    data: {
      skipped: false,
      timezone: APP_TIMEZONE,
      calendarDay,
      hour,
      ready: results.filter((r) => r.outcome === "ready").length,
      failed: results.filter((r) => r.outcome === "failed").length,
      skippedExisting: results.filter((r) => r.outcome === "skipped").length,
      results,
    },
  });
}
