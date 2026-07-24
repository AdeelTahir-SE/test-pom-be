import { describe, it, expect, afterAll } from "vitest";
import { api } from "./helpers/client";
import {
  registerCompany,
  createCompanyUser,
  loginAs,
  cleanupCompany,
  type RegisteredCompany,
} from "./helpers/factories";
import { getAdminClient } from "@/lib/supabase/admin";

const createdCompanies: RegisteredCompany[] = [];

afterAll(async () => {
  for (const c of createdCompanies) {
    await cleanupCompany(c.companyId, c.userId);
  }
});

interface SummaryDto {
  id: string;
  calendar_day: string;
  summary_text: string;
  attention: string | null;
}

async function insertSummary(companyId: string, userId: string, day: string, text: string) {
  const db = getAdminClient();
  const { data, error } = await db
    .from("daily_summaries")
    .insert({
      company_id: companyId,
      calendar_day: day,
      summary_text: text,
      attention: "Preveriti čakajoče naloge.",
      generated_by: userId,
    })
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message ?? "insert failed");
  return data as SummaryDto;
}

describe("Add-on 3 — AI Daily Summary (API)", () => {
  it("returns null summary for a day with no snapshot yet", async () => {
    const owner = await registerCompany();
    createdCompanies.push(owner);

    const res = await api.get<{ data?: { summary: SummaryDto | null } }>(
      "/api/daily-summaries?date=2026-07-23",
      { token: owner.accessToken }
    );
    expect(res.status).toBe(200);
    expect(res.body.data?.summary).toBeNull();
  });

  it("loads a saved snapshot, lists history newest-first, and reuses on POST", async () => {
    const owner = await registerCompany();
    createdCompanies.push(owner);
    expect(owner.companyId && owner.userId).toBeTruthy();

    await insertSummary(
      owner.companyId!,
      owner.userId!,
      "2026-07-20",
      "Starejši dan. Vsa dela zaključena."
    );
    const newer = await insertSummary(
      owner.companyId!,
      owner.userId!,
      "2026-07-23",
      "4 od 5 terenskih del poteka po načrtu. Pri Maxu je delo še odprto."
    );

    const one = await api.get<{ data?: { summary: SummaryDto | null } }>(
      "/api/daily-summaries?date=2026-07-23",
      { token: owner.accessToken }
    );
    expect(one.status).toBe(200);
    expect(one.body.data?.summary?.id).toBe(newer.id);
    expect(one.body.data?.summary?.attention).toContain("čakajoče");

    const history = await api.get<{ data?: { summaries: SummaryDto[] } }>(
      "/api/daily-summaries",
      { token: owner.accessToken }
    );
    expect(history.status).toBe(200);
    const days = history.body.data?.summaries.map((s) => s.calendar_day) ?? [];
    expect(days[0]).toBe("2026-07-23");
    expect(days).toContain("2026-07-20");

    // MVP: existing snapshot is returned without regenerating.
    const reused = await api.post<{ data?: { summary: SummaryDto; reused: boolean } }>(
      "/api/daily-summaries",
      { token: owner.accessToken, body: { date: "2026-07-23" } }
    );
    expect(reused.status).toBe(200);
    expect(reused.body.data?.reused).toBe(true);
    expect(reused.body.data?.summary.id).toBe(newer.id);
  });

  it("rejects invalid date and blocks workers", async () => {
    const owner = await registerCompany();
    createdCompanies.push(owner);

    const bad = await api.get("/api/daily-summaries?date=23-07-2026", {
      token: owner.accessToken,
    });
    expect(bad.status).toBe(400);

    const worker = await createCompanyUser(owner.accessToken!, { role: "worker" });
    const login = await loginAs(worker.email, worker.password);
    const blocked = await api.post("/api/daily-summaries", {
      token: login.body.data?.access_token,
      body: { date: "2026-07-23" },
    });
    expect(blocked.status).toBe(403);
  });

  it(
    "generates a new summary via AI when none exists (requires MISTRAL_API_KEY)",
    async () => {
      if (!process.env.MISTRAL_API_KEY) {
        return;
      }

      const owner = await registerCompany();
      createdCompanies.push(owner);
      const worker = await createCompanyUser(owner.accessToken!, { role: "worker" });

      await api.post("/api/jobs", {
        token: owner.accessToken,
        body: {
          title: "AI summary job",
          customer: "Test Co",
          worker_id: worker.userId,
          scheduled_at: "2026-07-18T10:00:00.000Z",
        },
      });

      const generated = await api.post<{
        data?: { summary: SummaryDto; reused: boolean };
      }>("/api/daily-summaries", {
        token: owner.accessToken,
        body: { date: "2026-07-18" },
      });

      // Real provider may be unavailable in some environments.
      if (generated.status >= 500) return;

      expect(generated.status).toBe(201);
      expect(generated.body.data?.reused).toBe(false);
      expect(generated.body.data?.summary.summary_text.length).toBeGreaterThan(10);

      const check = await api.get<{ data?: { summary: SummaryDto | null } }>(
        "/api/daily-summaries?date=2026-07-18",
        { token: owner.accessToken }
      );
      expect(check.body.data?.summary?.id).toBe(generated.body.data?.summary.id);
    },
    90_000
  );
});
