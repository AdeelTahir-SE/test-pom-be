import { z } from "zod";
import { withAuth } from "@/lib/http/handler";
import { created, ok, ApiError } from "@/lib/http/responses";
import { getAdminClient } from "@/lib/supabase/admin";
import { parseJsonBody } from "@/lib/validation/schemas";
import { notifyUser } from "@/lib/services/notifications";
import { LIMITS, REMINDER_ACTIONS } from "@/config/constants";
import { normalizeRemindTime } from "@/lib/officeDate";
import { normalizePhone } from "@/lib/phone";

export const dynamic = "force-dynamic";

// GET /api/office-reminders — owner/manager only; Workers never see this
// column (Dashboard spec: "Workers never see this column"). Hidden reminders
// are excluded. Default (no query): a future remind_on stays invisible until
// that day (Card Creation: "becomes visible only on that day"). Optional
// `?date=YYYY-MM-DD` returns the day-board view for the office navigator
// (exact remind_on match for other days; today's board keeps due/overdue).
// Ordered by order_index — cards are vertically reorderable within column.
export const GET = withAuth(
  async (request, auth) => {
    const db = getAdminClient();
    const today = new Date().toISOString().slice(0, 10);
    const dateParam = new URL(request.url).searchParams.get("date");
    const forDate =
      dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : today;

    let query = db
      .from("office_reminders")
      .select("*")
      .eq("company_id", auth.companyId)
      .is("hidden_at", null)
      .order("order_index", { ascending: true });

    if (forDate === today) {
      query = query.or(`remind_on.is.null,remind_on.lte.${today}`);
    } else {
      // Planning / historical day: only reminders scheduled for that date.
      query = query.eq("remind_on", forDate);
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

    const { data: reminder, error } = await db
      .from("office_reminders")
      .insert({
        company_id: auth.companyId,
        created_by: auth.userId,
        title: input.title,
        description: input.description ?? null,
        is_urgent: input.is_urgent ?? false,
        remind_on: input.remind_on ?? null,
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
