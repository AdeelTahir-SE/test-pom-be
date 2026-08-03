import { z } from "zod";
import { withAuth } from "@/lib/http/handler";
import { created, ok, ApiError } from "@/lib/http/responses";
import { getAdminClient } from "@/lib/supabase/admin";
import { parseJsonBody } from "@/lib/validation/schemas";
import { notifyUser } from "@/lib/services/notifications";
import { LIMITS, REMINDER_ACTIONS } from "@/config/constants";
import { getZonedDayAndHour, normalizeRemindTime } from "@/lib/officeDate";
import { normalizePhone } from "@/lib/phone";

export const dynamic = "force-dynamic";

// GET /api/office-reminders — owner/manager only; Workers never see this
// column (Dashboard spec: "Workers never see this column"). Hidden reminders
// are excluded. Exact `remind_on = forDate` match (like jobs by date). Legacy
// null remind_on rows appear only on app-today. Optional `?date=YYYY-MM-DD`
// for the office day navigator. Optional `?all=1` returns every visible
// reminder (DB / Pisarna list). Ordered by order_index.
export const GET = withAuth(
  async (request, auth) => {
    const db = getAdminClient();
    const today = getZonedDayAndHour().calendarDay;
    const url = new URL(request.url);
    const includeAll = url.searchParams.get("all") === "1";
    const dateParam = url.searchParams.get("date");
    const forDate =
      dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : today;

    let query = db
      .from("office_reminders")
      .select("*")
      .eq("company_id", auth.companyId)
      .is("hidden_at", null);

    if (!includeAll) {
      query = query.order("order_index", { ascending: true });
      if (forDate === today) {
        // Exact day + legacy undated (null remind_on).
        query = query.or(`remind_on.eq.${forDate},remind_on.is.null`);
      } else {
        query = query.eq("remind_on", forDate);
      }
    } else {
      query = query
        .order("created_at", { ascending: false })
        .order("order_index", { ascending: true });
    }

    const { data, error } = await query;
    if (error) {
      throw new ApiError("internal", "Failed to load office reminders.", error.message);
    }

    return ok({ reminders: data ?? [] });
  },
  { roles: ["owner", "manager"] }
);

const createReminderSchema = z.object({
  title: z.string().trim().min(1, "Title is required."),
  description: z
    .string()
    .trim()
    .max(LIMITS.OFFICE_REMINDER_DESC_MAX, "Description must be at most 80 characters.")
    .optional(),
  is_urgent: z.boolean().optional(),
  remind_on: z.string().date().optional(),
  /** Wall-clock time from the form (HH:mm). Independent of created_at / system clock. */
  remind_time: z.string().trim().min(1).optional(),
  actions: z.array(z.enum(REMINDER_ACTIONS as unknown as [string, ...string[]])).optional(),
  phone: z.string().trim().min(1).optional(),
  link: z.string().trim().min(1).optional(),
});

// POST /api/office-reminders — owner/manager create a reminder (Card Creation
// spec: office-only, NOT a work assignment — no employee/job fields exist on
// this resource). Notifies other owners/managers immediately.
export const POST = withAuth(
  async (request, auth) => {
    const input = await parseJsonBody(request, createReminderSchema);
    const db = getAdminClient();

    const { data: last } = await db
      .from("office_reminders")
      .select("order_index")
      .eq("company_id", auth.companyId)
      .order("order_index", { ascending: false })
      .limit(1)
      .maybeSingle();
    const orderIndex = (last?.order_index ?? -1) + 1;

    const remindTime = normalizeRemindTime(input.remind_time);
    // Always persist a calendar day so boards can exact-match by date.
    const remindOn = input.remind_on ?? getZonedDayAndHour().calendarDay;

    const { data: reminder, error } = await db
      .from("office_reminders")
      .insert({
        company_id: auth.companyId,
        created_by: auth.userId,
        title: input.title,
        description: input.description ?? null,
        is_urgent: input.is_urgent ?? false,
        remind_on: remindOn,
        remind_time: remindTime,
        actions: input.actions ?? [],
        phone: normalizePhone(input.phone) ?? null,
        link: input.link ?? null,
        order_index: orderIndex,
      })
      .select()
      .single();
    if (error || !reminder) {
      throw new ApiError("internal", "Failed to create office reminder.", error?.message);
    }

    // Dashboard Card Creation spec: "the manager also receives an immediate
    // notification" — notify every other owner/manager, not the creator.
    const { data: recipients, error: recipientsError } = await db
      .from("users")
      .select("id")
      .eq("company_id", auth.companyId)
      .in("role", ["owner", "manager"])
      .neq("id", auth.userId);
    if (recipientsError) {
      console.error("[reminder_notify_lookup_failed]", recipientsError.message);
    } else {
      await Promise.all(
        (recipients ?? []).map((recipient) =>
          notifyUser(db, {
            companyId: auth.companyId,
            userId: recipient.id,
            type: "system_alert",
            title: "New office reminder",
            body: reminder.title,
            jobId: null,
          })
        )
      );
    }

    return created({ reminder });
  },
  { roles: ["owner", "manager"] }
);
