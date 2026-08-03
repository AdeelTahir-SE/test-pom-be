import { withAuth } from "@/lib/http/handler";
import { ok, ApiError } from "@/lib/http/responses";
import { getAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * GET /api/customers — company customers for the DB / Stranke view.
 * Includes latest note text and related job titles (matched by customer name).
 */
export const GET = withAuth(
  async (_request, auth) => {
    const db = getAdminClient();

    const { data: customers, error } = await db
      .from("customers")
      .select("id, name, created_at")
      .eq("company_id", auth.companyId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new ApiError("internal", "Failed to load customers.", error.message);
    }

    const { data: jobs, error: jobsError } = await db
      .from("jobs")
      .select("id, title, customer, scheduled_at, created_at, hidden_at")
      .eq("company_id", auth.companyId)
      .is("hidden_at", null)
      .order("created_at", { ascending: false });

    if (jobsError) {
      throw new ApiError("internal", "Failed to load jobs for customers.", jobsError.message);
    }

    const customerIds = (customers ?? []).map((c) => c.id);
    const latestNoteByCustomer = new Map<string, string>();
    if (customerIds.length > 0) {
      const { data: notes, error: notesError } = await db
        .from("customer_notes")
        .select("customer_id, note, created_at")
        .eq("company_id", auth.companyId)
        .in("customer_id", customerIds)
        .order("created_at", { ascending: false });
      if (notesError) {
        throw new ApiError("internal", "Failed to load customer notes.", notesError.message);
      }
      for (const n of notes ?? []) {
        if (!latestNoteByCustomer.has(n.customer_id)) {
          latestNoteByCustomer.set(n.customer_id, n.note);
        }
      }
    }

    const jobsByCustomer = new Map<string, { id: string; title: string }[]>();
    for (const job of jobs ?? []) {
      const key = (job.customer ?? "").trim().toLowerCase();
      if (!key) continue;
      const list = jobsByCustomer.get(key) ?? [];
      list.push({ id: job.id, title: job.title });
      jobsByCustomer.set(key, list);
    }

    const result = (customers ?? []).map((c) => {
      const related = jobsByCustomer.get(c.name.trim().toLowerCase()) ?? [];
      return {
        id: c.id,
        name: c.name,
        created_at: c.created_at,
        latest_note: latestNoteByCustomer.get(c.id) ?? null,
        jobs: related.slice(0, 5),
        job_count: related.length,
      };
    });

    return ok({ customers: result });
  },
  { roles: ["owner", "manager"] }
);
