import { describe, it, expect, afterAll } from "vitest";
import { api } from "./helpers/client";
import {
  registerCompany,
  loginAs,
  createPlatformAdmin,
  deactivateUser,
  cleanupCompany,
  cleanupPlatformAdmin,
  uniqueEmail,
  type RegisteredCompany,
  type PlatformAdminFixture,
} from "./helpers/factories";

const createdCompanies: RegisteredCompany[] = [];
const createdPlatformAdmins: PlatformAdminFixture[] = [];

afterAll(async () => {
  for (const c of createdCompanies) {
    await cleanupCompany(c.companyId, c.userId);
  }
  for (const a of createdPlatformAdmins) {
    await cleanupPlatformAdmin(a.userId);
  }
});

describe("Phase 2 — Auth & Multi-Tenancy", () => {
  it("registers a company + owner and returns a session", async () => {
    const reg = await registerCompany();
    createdCompanies.push(reg);

    expect(reg.status).toBe(201);
    expect(reg.accessToken).toBeTruthy();
    expect(reg.userId).toBeTruthy();
    expect(reg.companyId).toBeTruthy();
  });

  it("rejects registration with an invalid business_module", async () => {
    const res = await api.post("/api/auth/register", {
      body: {
        email: uniqueEmail("bad-module"),
        password: "TestPass123!",
        company_name: "Bad Module Co",
        business_module: "not_a_real_module",
      },
    });
    expect(res.status).toBe(400);
  });

  it("rejects duplicate email registration with 409", async () => {
    const reg = await registerCompany();
    createdCompanies.push(reg);

    const dup = await api.post("/api/auth/register", {
      body: {
        email: reg.email,
        password: "AnotherPass123!",
        company_name: "Duplicate Co",
        business_module: "logistics",
      },
    });
    expect(dup.status).toBe(409);
  });

  it("logs in with correct credentials", async () => {
    const reg = await registerCompany();
    createdCompanies.push(reg);

    const res = await loginAs(reg.email, reg.password);
    expect(res.status).toBe(200);
    expect(res.body.data?.access_token).toBeTruthy();
  });

  it("rejects login with wrong password", async () => {
    const reg = await registerCompany();
    createdCompanies.push(reg);

    const res = await loginAs(reg.email, "WrongPassword!");
    expect(res.status).toBe(401);
  });

  it("GET /me returns user + company for a valid token", async () => {
    const reg = await registerCompany();
    createdCompanies.push(reg);

    const res = await api.get<{
      data?: { user: { id: string; role: string }; company: { id: string; business_module: string } };
    }>("/api/auth/me", { token: reg.accessToken });

    expect(res.status).toBe(200);
    expect(res.body.data?.user.id).toBe(reg.userId);
    expect(res.body.data?.user.role).toBe("owner");
    expect(res.body.data?.company.id).toBe(reg.companyId);
    expect(res.body.data?.company.business_module).toBe(reg.businessModule);
  });

  it("GET /me without a token returns 401", async () => {
    const res = await api.get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("GET /me with a garbage token returns 401", async () => {
    const res = await api.get("/api/auth/me", { token: "not-a-real-token" });
    expect(res.status).toBe(401);
  });

  it("deactivated users are blocked from logging in", async () => {
    const reg = await registerCompany();
    createdCompanies.push(reg);
    await deactivateUser(reg.userId!);

    const res = await loginAs(reg.email, reg.password);
    expect(res.status).toBe(403);
  });

  it("deactivated users lose access to /me even with a still-valid old token", async () => {
    const reg = await registerCompany();
    createdCompanies.push(reg);

    // Token was issued while active; deactivate after the fact.
    await deactivateUser(reg.userId!);

    const res = await api.get("/api/auth/me", { token: reg.accessToken });
    expect(res.status).toBe(401);
  });

  it("logout invalidates the session", async () => {
    const reg = await registerCompany();
    createdCompanies.push(reg);

    const logoutRes = await api.post("/api/auth/logout", { token: reg.accessToken });
    expect(logoutRes.status).toBe(200);

    const meRes = await api.get("/api/auth/me", { token: reg.accessToken });
    expect(meRes.status).toBe(401);
  });
});

describe("Phase 2 — Platform Admin (separate identity kind, §3.1)", () => {
  it("a platform admin can list all companies across tenants", async () => {
    const admin = await createPlatformAdmin();
    createdPlatformAdmins.push(admin);

    const reg = await registerCompany();
    createdCompanies.push(reg);

    const res = await api.get<{ data?: { companies: { id: string }[] } }>(
      "/api/admin/companies",
      { token: admin.accessToken }
    );
    expect(res.status).toBe(200);
    const ids = res.body.data?.companies.map((c) => c.id) ?? [];
    expect(ids).toContain(reg.companyId);
  });

  it("a platform admin can view a single company's detail", async () => {
    const admin = await createPlatformAdmin();
    createdPlatformAdmins.push(admin);

    const reg = await registerCompany();
    createdCompanies.push(reg);

    const res = await api.get<{
      data?: { company: { id: string }; users: { id: string }[] };
    }>(`/api/admin/companies/${reg.companyId}`, { token: admin.accessToken });

    expect(res.status).toBe(200);
    expect(res.body.data?.company.id).toBe(reg.companyId);
    expect(res.body.data?.users.some((u) => u.id === reg.userId)).toBe(true);
  });

  it("a normal company user gets 403 on platform admin endpoints", async () => {
    const reg = await registerCompany();
    createdCompanies.push(reg);

    const res = await api.get("/api/admin/companies", { token: reg.accessToken });
    expect(res.status).toBe(403);
  });

  it("a platform admin token gets 403 on company-scoped endpoints", async () => {
    const admin = await createPlatformAdmin();
    createdPlatformAdmins.push(admin);

    const res = await api.get("/api/auth/me", { token: admin.accessToken });
    expect(res.status).toBe(403);
  });
});
