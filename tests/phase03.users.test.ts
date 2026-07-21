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
