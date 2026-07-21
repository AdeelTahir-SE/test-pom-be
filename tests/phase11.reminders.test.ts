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

interface ReminderDto {
  id: string;
  title: string;
  description: string | null;
  is_urgent: boolean;
  remind_on: string | null;
  actions: string[];
  action_state: { confirmed?: boolean; rejected?: boolean };
  order_index: number;
  hidden_at: string | null;
}

interface NotificationDto {
  type: string;
  title: string;
}

function isoDateOffset(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

describe("Phase 11 — Office Reminders (PISARNA)", () => {
  it("owner creates a reminder with title only", async () => {
    const owner = await registerCompany();
    createdCompanies.push(owner);

    const res = await api.post<{ data?: { reminder: ReminderDto } }>("/api/office-reminders", {
      token: owner.accessToken,
      body: { title: "Call the supplier" },
    });
    expect(res.status).toBe(201);
    expect(res.body.data?.reminder.title).toBe("Call the supplier");
    expect(res.body.data?.reminder.actions).toEqual([]);
    expect(res.body.data?.reminder.order_index).toBe(0);
  });

  it("manager can also create and view reminders", async () => {
    const owner = await registerCompany();
    createdCompanies.push(owner);
    const manager = await createCompanyUser(owner.accessToken!, { role: "manager" });
    const managerLogin = await loginAs(manager.email, manager.password);

    const createRes = await api.post("/api/office-reminders", {
      token: managerLogin.body.data?.access_token,
      body: { title: "Sign the delivery note" },
    });
    expect(createRes.status).toBe(201);

    const listRes = await api.get("/api/office-reminders", {
      token: managerLogin.body.data?.access_token,
    });
    expect(listRes.status).toBe(200);
  });

  it("creates a reminder with description, urgent flag, and a valid action subset", async () => {
    const owner = await registerCompany();
    createdCompanies.push(owner);

    const res = await api.post<{ data?: { reminder: ReminderDto } }>("/api/office-reminders", {
      token: owner.accessToken,
      body: {
        title: "Invoice #482",
        description: "Follow up before Friday",
        is_urgent: true,
        actions: ["phone", "confirm", "reject"],
        phone: "+38640123456",
      },
    });
    expect(res.status).toBe(201);
    expect(res.body.data?.reminder.is_urgent).toBe(true);
    expect(res.body.data?.reminder.actions).toEqual(["phone", "confirm", "reject"]);
  });

  it("rejects a description longer than 80 characters", async () => {
    const owner = await registerCompany();
    createdCompanies.push(owner);
    const res = await api.post("/api/office-reminders", {
      token: owner.accessToken,
      body: { title: "Too long", description: "x".repeat(81) },
    });
    expect(res.status).toBe(400);
  });

  it("rejects an invalid action id", async () => {
    const owner = await registerCompany();
    createdCompanies.push(owner);
    const res = await api.post("/api/office-reminders", {
      token: owner.accessToken,
      body: { title: "Bad action", actions: ["teleport"] },
    });
    expect(res.status).toBe(400);
  });

  it("workers are blocked from both listing and creating reminders (403)", async () => {
    const owner = await registerCompany();
    createdCompanies.push(owner);
    const worker = await createCompanyUser(owner.accessToken!, { role: "worker" });
    const workerLogin = await loginAs(worker.email, worker.password);
    const workerToken = workerLogin.body.data?.access_token;

    const listRes = await api.get("/api/office-reminders", { token: workerToken });
    expect(listRes.status).toBe(403);

    const createRes = await api.post("/api/office-reminders", {
      token: workerToken,
      body: { title: "Should fail" },
    });
    expect(createRes.status).toBe(403);
  });

  it("lists reminders ordered by order_index ascending", async () => {
    const owner = await registerCompany();
    createdCompanies.push(owner);
    await api.post("/api/office-reminders", { token: owner.accessToken, body: { title: "First" } });
    await api.post("/api/office-reminders", { token: owner.accessToken, body: { title: "Second" } });

    const res = await api.get<{ data?: { reminders: ReminderDto[] } }>("/api/office-reminders", {
      token: owner.accessToken,
    });
    expect(res.body.data?.reminders.map((r) => r.title)).toEqual(["First", "Second"]);
  });

  it("a reminder with a future remind_on is hidden until that date", async () => {
    const owner = await registerCompany();
    createdCompanies.push(owner);

    const future = await api.post<{ data?: { reminder: ReminderDto } }>("/api/office-reminders", {
      token: owner.accessToken,
      body: { title: "Future reminder", remind_on: isoDateOffset(5) },
    });
    const today = await api.post<{ data?: { reminder: ReminderDto } }>("/api/office-reminders", {
      token: owner.accessToken,
      body: { title: "Today reminder", remind_on: isoDateOffset(0) },
    });
    const noDate = await api.post<{ data?: { reminder: ReminderDto } }>("/api/office-reminders", {
      token: owner.accessToken,
      body: { title: "No-date reminder" },
    });

    const res = await api.get<{ data?: { reminders: ReminderDto[] } }>("/api/office-reminders", {
      token: owner.accessToken,
    });
    const ids = res.body.data!.reminders.map((r) => r.id);
    expect(ids).not.toContain(future.body.data!.reminder.id);
    expect(ids).toContain(today.body.data!.reminder.id);
    expect(ids).toContain(noDate.body.data!.reminder.id);
  });

  it("hiding a reminder removes it from the list but keeps the record", async () => {
    const owner = await registerCompany();
    createdCompanies.push(owner);
    const createRes = await api.post<{ data?: { reminder: ReminderDto } }>(
      "/api/office-reminders",
      { token: owner.accessToken, body: { title: "Dismiss me" } }
    );
    const id = createRes.body.data!.reminder.id;

    const hideRes = await api.patch<{ data?: { reminder: ReminderDto } }>(
      `/api/office-reminders/${id}`,
      { token: owner.accessToken, body: { hidden: true } }
    );
    expect(hideRes.status).toBe(200);
    expect(hideRes.body.data?.reminder.hidden_at).toBeTruthy();

    const listRes = await api.get<{ data?: { reminders: ReminderDto[] } }>(
      "/api/office-reminders",
      { token: owner.accessToken }
    );
    expect(listRes.body.data?.reminders.some((r) => r.id === id)).toBe(false);
  });

  it("confirm and reject are mutually exclusive toggles", async () => {
    const owner = await registerCompany();
    createdCompanies.push(owner);
    const createRes = await api.post<{ data?: { reminder: ReminderDto } }>(
      "/api/office-reminders",
      { token: owner.accessToken, body: { title: "Needs a decision", actions: ["confirm", "reject"] } }
    );
    const id = createRes.body.data!.reminder.id;

    const confirmRes = await api.patch<{ data?: { reminder: ReminderDto } }>(
      `/api/office-reminders/${id}`,
      { token: owner.accessToken, body: { confirm: true } }
    );
    expect(confirmRes.body.data?.reminder.action_state.confirmed).toBe(true);
    expect(confirmRes.body.data?.reminder.action_state.rejected).toBe(false);

    const rejectRes = await api.patch<{ data?: { reminder: ReminderDto } }>(
      `/api/office-reminders/${id}`,
      { token: owner.accessToken, body: { reject: true } }
    );
    expect(rejectRes.body.data?.reminder.action_state.rejected).toBe(true);
    expect(rejectRes.body.data?.reminder.action_state.confirmed).toBe(false);
  });

  it("reorders via order_index", async () => {
    const owner = await registerCompany();
    createdCompanies.push(owner);
    const a = await api.post<{ data?: { reminder: ReminderDto } }>("/api/office-reminders", {
      token: owner.accessToken,
      body: { title: "A" },
    });
    const b = await api.post<{ data?: { reminder: ReminderDto } }>("/api/office-reminders", {
      token: owner.accessToken,
      body: { title: "B" },
    });

    await api.patch(`/api/office-reminders/${b.body.data!.reminder.id}`, {
      token: owner.accessToken,
      body: { order_index: 0 },
    });
    await api.patch(`/api/office-reminders/${a.body.data!.reminder.id}`, {
      token: owner.accessToken,
      body: { order_index: 1 },
    });

    const res = await api.get<{ data?: { reminders: ReminderDto[] } }>("/api/office-reminders", {
      token: owner.accessToken,
    });
    expect(res.body.data?.reminders.map((r) => r.title)).toEqual(["B", "A"]);
  });

  it("creating a reminder notifies other owners/managers but not the creator", async () => {
    const owner = await registerCompany();
    createdCompanies.push(owner);
    const manager = await createCompanyUser(owner.accessToken!, { role: "manager" });
    const managerLogin = await loginAs(manager.email, manager.password);

    await api.post("/api/office-reminders", {
      token: owner.accessToken,
      body: { title: "Notify the manager" },
    });

    const managerNotifs = await api.get<{ data?: { notifications: NotificationDto[] } }>(
      "/api/notifications",
      { token: managerLogin.body.data?.access_token }
    );
    expect(
      managerNotifs.body.data?.notifications.some(
        (n) => n.type === "system_alert" && n.title === "New office reminder"
      )
    ).toBe(true);

    const ownerNotifs = await api.get<{ data?: { notifications: NotificationDto[] } }>(
      "/api/notifications",
      { token: owner.accessToken }
    );
    expect(ownerNotifs.body.data?.notifications.some((n) => n.type === "system_alert")).toBe(false);
  });

  it("cross-company PATCH is rejected as 404", async () => {
    const companyA = await registerCompany();
    createdCompanies.push(companyA);
    const companyB = await registerCompany();
    createdCompanies.push(companyB);

    const createRes = await api.post<{ data?: { reminder: ReminderDto } }>(
      "/api/office-reminders",
      { token: companyA.accessToken, body: { title: "Company A reminder" } }
    );
    const id = createRes.body.data!.reminder.id;

    const res = await api.patch(`/api/office-reminders/${id}`, {
      token: companyB.accessToken,
      body: { hidden: true },
    });
    expect(res.status).toBe(404);
  });
});
