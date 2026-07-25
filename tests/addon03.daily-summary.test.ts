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
  status?: string;
}

async function insertSummary(
  companyId: string,
  userId: string,
  day: string,
  text: string,
  status: "ready" | "failed" = "ready"
) {
  const db = getAdminClient();
  const { data, error } = await db
    .from("daily_summaries")
    .insert({
      company_id: companyId,
      calendar_day: day,
      summary_text: status === "ready" ? text : null,
      attention: status === "ready" ? "Preveriti čakajoče naloge." : null,
      generated_by: userId,
      status,
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

  it("hides failed attempts from GET (nothing shown, no retry path)", async () => {
    const owner = await registerCompany();
    createdCompanies.push(owner);
    await insertSummary(owner.companyId!, owner.userId!, "2026-07-22", "", "failed");

    const res = await api.get<{ data?: { summary: SummaryDto | null } }>(
      "/api/daily-summaries?date=2026-07-22",
      { token: owner.accessToken }
    );
    expect(res.status).toBe(200);
    expect(res.body.data?.summary).toBeNull();
  });

  it("loads a saved snapshot and lists history newest-first", async () => {
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
  });

  it("rejects invalid date, blocks workers, and disables manual POST generation", async () => {
    const owner = await registerCompany();
    createdCompanies.push(owner);

    const bad = await api.get("/api/daily-summaries?date=23-07-2026", {
      token: owner.accessToken,
    });
    expect(bad.status).toBe(400);

    const manual = await api.post("/api/daily-summaries", {
      token: owner.accessToken,
      body: { date: "2026-07-23" },
    });
    expect(manual.status).toBe(403);

    const worker = await createCompanyUser(owner.accessToken!, { role: "worker" });
    const login = await loginAs(worker.email, worker.password);
    const blocked = await api.get("/api/daily-summaries?date=2026-07-23", {
      token: login.body.data?.access_token,
    });
    expect(blocked.status).toBe(403);
  });
});
