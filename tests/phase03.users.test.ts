import { describe, it, expect, afterAll } from "vitest";
import { api } from "./helpers/client";
import {
  registerCompany,
  createCompanyUser,
  loginAs,
  cleanupCompany,
  type RegisteredCompany,
} from "./helpers/factories";

const createdCompanies: RegisteredCompany[] = [];

afterAll(async () => {
  for (const c of createdCompanies) {
    await cleanupCompany(c.companyId, c.userId);
  }
});

describe("Phase 3 — User Management", () => {
  it("owner creates a worker and a manager", async () => {
    const owner = await registerCompany();
    createdCompanies.push(owner);

    const worker = await createCompanyUser(owner.accessToken!, { role: "worker" });
    expect(worker.status).toBe(201);
    expect(worker.role).toBe("worker");

    const manager = await createCompanyUser(owner.accessToken!, { role: "manager" });
    expect(manager.status).toBe(201);
    expect(manager.role).toBe("manager");
  });

  it("worker created by owner can log in", async () => {
    const owner = await registerCompany();
    createdCompanies.push(owner);

    const worker = await createCompanyUser(owner.accessToken!);
    const loginRes = await loginAs(worker.email, worker.password);
    expect(loginRes.status).toBe(200);
  });

  it("company-set 4-char worker PIN is stored, listed, and works for login", async () => {
    const owner = await registerCompany();
    createdCompanies.push(owner);

    const pin = "2468";
    const worker = await createCompanyUser(owner.accessToken!, {
      role: "worker",
      password: pin,
      full_name: "Pin Worker",
    });
    expect(worker.status).toBe(201);
    expect(worker.password).toBe(pin);

    const list = await api.get<{
      data?: { users: { id: string; full_name: string; login_pin?: string | null }[] };
    }>("/api/users", { token: owner.accessToken! });
    expect(list.status).toBe(200);
    const row = list.body.data?.users.find((u) => u.id === worker.userId);
    expect(row?.login_pin).toBe(pin);

    const loginRes = await loginAs(worker.email, pin);
    expect(loginRes.status).toBe(200);
  });

  it("company-set 4-char Pisarna PIN is stored, listed, and works for login", async () => {
    const owner = await registerCompany();
    createdCompanies.push(owner);

    const pin = "9999";
    const manager = await createCompanyUser(owner.accessToken!, {
      role: "manager",
      password: pin,
      full_name: "Pin Office",
    });
    expect(manager.status).toBe(201);
    expect(manager.password).toBe(pin);

    const list = await api.get<{
      data?: { users: { id: string; login_pin?: string | null; role: string }[] };
    }>("/api/users", { token: owner.accessToken! });
    const row = list.body.data?.users.find((u) => u.id === manager.userId);
    expect(row?.role).toBe("manager");
    expect(row?.login_pin).toBe(pin);

    const loginRes = await loginAs(manager.email, pin);
    expect(loginRes.status).toBe(200);
  });

  it("worker create without 4-char password is rejected", async () => {
    const owner = await registerCompany();
    createdCompanies.push(owner);

    const res = await api.post("/api/users", {
      token: owner.accessToken!,
      body: {
        email: `nopin-${Date.now()}@example.com`,
        full_name: "No Pin",
        role: "worker",
        phone: "051-222-333",
      },
    });
    expect(res.status).toBe(400);
  });

  it("staff create without phone is rejected", async () => {
    const owner = await registerCompany();
    createdCompanies.push(owner);

    const res = await api.post("/api/users", {
      token: owner.accessToken!,
      body: {
        email: `nophone-${Date.now()}@example.com`,
        full_name: "No Phone",
        role: "worker",
        password: "1234",
      },
    });
    expect(res.status).toBe(400);
  });

  it("owner login_pin is never returned in users list", async () => {
    const owner = await registerCompany();
    createdCompanies.push(owner);

    await createCompanyUser(owner.accessToken!, {
      role: "worker",
      password: "3333",
    });

    const list = await api.get<{
      data?: { users: { id: string; role: string; login_pin?: string | null }[] };
    }>("/api/users", { token: owner.accessToken! });
    expect(list.status).toBe(200);
    const ownerRow = list.body.data?.users.find((u) => u.id === owner.userId);
    expect(ownerRow?.role).toBe("owner");
    expect(ownerRow?.login_pin).toBeNull();
    const staff = list.body.data?.users.filter((u) => u.role !== "owner") ?? [];
    expect(staff.some((u) => u.login_pin === "3333")).toBe(true);
  });

  it("manager create without 4-char password is rejected", async () => {
    const owner = await registerCompany();
    createdCompanies.push(owner);

    const res = await api.post("/api/users", {
      token: owner.accessToken!,
      body: {
        email: `nopin-mgr-${Date.now()}@example.com`,
        full_name: "No Pin Office",
        role: "manager",
        password: "MemberPass123!",
        phone: "051-222-334",
      },
    });
    expect(res.status).toBe(400);
  });

  it("cannot create a second owner", async () => {
    const owner = await registerCompany();
    createdCompanies.push(owner);

    const res = await createCompanyUser(owner.accessToken!, { role: "owner" });
    expect(res.status).toBe(400);
  });

  it("worker is blocked from creating users (403)", async () => {
    const owner = await registerCompany();
    createdCompanies.push(owner);

    const worker = await createCompanyUser(owner.accessToken!, { role: "worker" });
    const workerLogin = await loginAs(worker.email, worker.password);
    const workerToken = workerLogin.body.data?.access_token;

    const res = await createCompanyUser(workerToken!, { email: "should-fail@example.com" });
    expect(res.status).toBe(403);
  });

  it("manager is blocked from creating users (403) — owner-only per matrix", async () => {
    const owner = await registerCompany();
    createdCompanies.push(owner);

    const manager = await createCompanyUser(owner.accessToken!, { role: "manager" });
    const managerLogin = await loginAs(manager.email, manager.password);
    const managerToken = managerLogin.body.data?.access_token;

    const res = await createCompanyUser(managerToken!, { email: "should-also-fail@example.com" });
    expect(res.status).toBe(403);
  });

  it("manager CAN list users, worker CANNOT", async () => {
    const owner = await registerCompany();
    createdCompanies.push(owner);

    const manager = await createCompanyUser(owner.accessToken!, { role: "manager" });
    const managerLogin = await loginAs(manager.email, manager.password);
    const managerRes = await api.get("/api/users", { token: managerLogin.body.data?.access_token });
    expect(managerRes.status).toBe(200);

    const worker = await createCompanyUser(owner.accessToken!, { role: "worker" });
    const workerLogin = await loginAs(worker.email, worker.password);
    const workerRes = await api.get("/api/users", { token: workerLogin.body.data?.access_token });
    expect(workerRes.status).toBe(403);
  });

  it("users list is scoped to the caller's company", async () => {
    const companyA = await registerCompany();
    createdCompanies.push(companyA);
    const companyB = await registerCompany();
    createdCompanies.push(companyB);

    await createCompanyUser(companyA.accessToken!);
    await createCompanyUser(companyB.accessToken!);

    const resA = await api.get<{ data?: { users: { id: string }[] } }>("/api/users", {
      token: companyA.accessToken,
    });
    const idsA = resA.body.data?.users.map((u) => u.id) ?? [];
    expect(idsA).toContain(companyA.userId);
    expect(idsA).not.toContain(companyB.userId);
  });

  it("owner deactivates a worker, blocking their login", async () => {
    const owner = await registerCompany();
    createdCompanies.push(owner);

    const worker = await createCompanyUser(owner.accessToken!);
    const patchRes = await api.patch(`/api/users/${worker.userId}`, {
      token: owner.accessToken,
      body: { is_active: false },
    });
    expect(patchRes.status).toBe(200);

    const loginRes = await loginAs(worker.email, worker.password);
    expect(loginRes.status).toBe(403);
  });

  it("owner cannot deactivate their own account", async () => {
    const owner = await registerCompany();
    createdCompanies.push(owner);

    const res = await api.patch(`/api/users/${owner.userId}`, {
      token: owner.accessToken,
      body: { is_active: false },
    });
    expect(res.status).toBe(400);
  });

  it("a company cannot modify another company's user (cross-tenant 404)", async () => {
    const companyA = await registerCompany();
    createdCompanies.push(companyA);
    const companyB = await registerCompany();
    createdCompanies.push(companyB);

    const workerB = await createCompanyUser(companyB.accessToken!);

    const res = await api.patch(`/api/users/${workerB.userId}`, {
      token: companyA.accessToken,
      body: { full_name: "Hijacked Name" },
    });
    expect(res.status).toBe(404);
  });
});
