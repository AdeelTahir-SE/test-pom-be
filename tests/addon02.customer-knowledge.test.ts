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

interface NoteDto {
  id: string;
  note: string;
  customer_id: string;
  created_at: string;
  updated_at: string;
}

interface NotesListDto {
  data?: {
    customer: { id: string; name: string } | null;
    notes: NoteDto[];
  };
  error?: { code: string; message: string; details?: unknown };
}

interface NoteCreateDto {
  data?: {
    customer: { id: string; name: string };
    note: NoteDto;
  };
  error?: { code: string; message: string; details?: unknown };
}

async function setupOwnerAndWorker() {
  const owner = await registerCompany();
  createdCompanies.push(owner);
  expect(owner.status).toBe(201);
  expect(owner.accessToken).toBeTruthy();

  const worker = await createCompanyUser(owner.accessToken!, { role: "worker" });
  expect(worker.status).toBe(201);
  expect(worker.userId).toBeTruthy();

  const workerLogin = await loginAs(worker.email, worker.password);
  expect(workerLogin.status).toBe(200);
  const workerToken = workerLogin.body.data?.access_token as string;
  expect(workerToken).toBeTruthy();

  return { owner, worker, workerToken };
}

describe("Add-on 2 — Customer Knowledge (API)", () => {
  it("GET returns empty notes for an unknown customer name", async () => {
    const owner = await registerCompany();
    createdCompanies.push(owner);

    const res = await api.get<NotesListDto>(
      `/api/customers/notes?name=${encodeURIComponent("Unknown Customer d.o.o.")}`,
      { token: owner.accessToken }
    );

    expect(res.status).toBe(200);
    expect(res.body.data?.customer).toBeNull();
    expect(res.body.data?.notes).toEqual([]);
  });

  it("GET requires name query param", async () => {
    const owner = await registerCompany();
    createdCompanies.push(owner);

    const res = await api.get<NotesListDto>("/api/customers/notes", {
      token: owner.accessToken,
    });
    expect(res.status).toBe(400);
  });

  it("creates a note, finds it by normalized name, oldest first", async () => {
    const { owner } = await setupOwnerAndWorker();
    const customerName = "Novak Servis d.o.o.";

    const first = await api.post<NoteCreateDto>("/api/customers/notes", {
      token: owner.accessToken,
      body: { customer_name: customerName, note: "Always use the side entrance." },
    });
    expect(first.status).toBe(201);
    expect(first.body.data?.note.note).toBe("Always use the side entrance.");
    expect(first.body.data?.customer.name).toBe(customerName);

    // Brief gap so created_at ordering is stable across hosts.
    await new Promise((r) => setTimeout(r, 50));

    const second = await api.post<NoteCreateDto>("/api/customers/notes", {
      token: owner.accessToken,
      body: { customer_name: "  NOVAK   SERVIS  D.O.O. ", note: "Dog is friendly." },
    });
    expect(second.status).toBe(201);
    // Same normalized customer identity.
    expect(second.body.data?.customer.id).toBe(first.body.data?.customer.id);

    const list = await api.get<NotesListDto>(
      `/api/customers/notes?name=${encodeURIComponent("novak servis d.o.o.")}`,
      { token: owner.accessToken }
    );
    expect(list.status).toBe(200);
    expect(list.body.data?.notes).toHaveLength(2);
    expect(list.body.data?.notes[0]!.note).toBe("Always use the side entrance.");
    expect(list.body.data?.notes[1]!.note).toBe("Dog is friendly.");
  });

  it("soft-blocks duplicate notes unless force=true", async () => {
    const owner = await registerCompany();
    createdCompanies.push(owner);

    const create = await api.post<NoteCreateDto>("/api/customers/notes", {
      token: owner.accessToken,
      body: {
        customer_name: "Dup Test Co",
        note: "Ring the bell twice",
      },
    });
    expect(create.status).toBe(201);

    const dup = await api.post<NoteCreateDto>("/api/customers/notes", {
      token: owner.accessToken,
      body: {
        customer_name: "Dup Test Co",
        note: "  RING  the bell twice ",
      },
    });
    expect(dup.status).toBe(409);
    expect(dup.body.error?.code).toBe("conflict");

    const forced = await api.post<NoteCreateDto>("/api/customers/notes", {
      token: owner.accessToken,
      body: {
        customer_name: "Dup Test Co",
        note: "RING the bell twice",
        force: true,
      },
    });
    expect(forced.status).toBe(201);

    const list = await api.get<NotesListDto>(
      `/api/customers/notes?name=${encodeURIComponent("Dup Test Co")}`,
      { token: owner.accessToken }
    );
    expect(list.body.data?.notes.length).toBeGreaterThanOrEqual(2);
  });

  it("owner can edit and delete a note; delete only affects future lookups", async () => {
    const owner = await registerCompany();
    createdCompanies.push(owner);

    const created = await api.post<NoteCreateDto>("/api/customers/notes", {
      token: owner.accessToken,
      body: { customer_name: "Edit Co", note: "Original guidance" },
    });
    expect(created.status).toBe(201);
    const noteId = created.body.data!.note.id;

    const patched = await api.patch<{ data?: { note: NoteDto }; error?: { code: string } }>(
      `/api/customer-notes/${noteId}`,
      {
        token: owner.accessToken,
        body: { note: "Updated guidance" },
      }
    );
    expect(patched.status).toBe(200);
    expect(patched.body.data?.note.note).toBe("Updated guidance");

    const afterEdit = await api.get<NotesListDto>(
      `/api/customers/notes?name=${encodeURIComponent("Edit Co")}`,
      { token: owner.accessToken }
    );
    expect(afterEdit.body.data?.notes[0]!.note).toBe("Updated guidance");

    const deleted = await api.delete<{ data?: { deleted: boolean } }>(
      `/api/customer-notes/${noteId}`,
      { token: owner.accessToken }
    );
    expect(deleted.status).toBe(200);
    expect(deleted.body.data?.deleted).toBe(true);

    const afterDelete = await api.get<NotesListDto>(
      `/api/customers/notes?name=${encodeURIComponent("Edit Co")}`,
      { token: owner.accessToken }
    );
    expect(afterDelete.body.data?.notes).toEqual([]);
  });

  it("worker can create and list notes but cannot delete or edit", async () => {
    const { owner, workerToken } = await setupOwnerAndWorker();

    const created = await api.post<NoteCreateDto>("/api/customers/notes", {
      token: workerToken,
      body: { customer_name: "Worker Customer", note: "Park behind the building." },
    });
    expect(created.status).toBe(201);
    const noteId = created.body.data!.note.id;

    const list = await api.get<NotesListDto>(
      `/api/customers/notes?name=${encodeURIComponent("Worker Customer")}`,
      { token: workerToken }
    );
    expect(list.status).toBe(200);
    expect(list.body.data?.notes).toHaveLength(1);

    const del = await api.delete(`/api/customer-notes/${noteId}`, { token: workerToken });
    expect(del.status).toBe(403);

    const patch = await api.patch(`/api/customer-notes/${noteId}`, {
      token: workerToken,
      body: { note: "Should fail" },
    });
    expect(patch.status).toBe(403);

    // Owner can still manage it.
    const ownerDel = await api.delete(`/api/customer-notes/${noteId}`, {
      token: owner.accessToken,
    });
    expect(ownerDel.status).toBe(200);
  });

  it("notes are isolated between companies", async () => {
    const companyA = await registerCompany();
    const companyB = await registerCompany();
    createdCompanies.push(companyA, companyB);

    const sharedName = "Shared Name Customer";
    await api.post("/api/customers/notes", {
      token: companyA.accessToken,
      body: { customer_name: sharedName, note: "Secret for A only" },
    });

    const listB = await api.get<NotesListDto>(
      `/api/customers/notes?name=${encodeURIComponent(sharedName)}`,
      { token: companyB.accessToken }
    );
    expect(listB.status).toBe(200);
    expect(listB.body.data?.customer).toBeNull();
    expect(listB.body.data?.notes).toEqual([]);
  });

  it("rejects blank / oversized notes", async () => {
    const owner = await registerCompany();
    createdCompanies.push(owner);

    const blank = await api.post("/api/customers/notes", {
      token: owner.accessToken,
      body: { customer_name: "Valid Co", note: "   " },
    });
    expect(blank.status).toBe(400);

    const huge = await api.post("/api/customers/notes", {
      token: owner.accessToken,
      body: { customer_name: "Valid Co", note: "x".repeat(281) },
    });
    expect(huge.status).toBe(400);
  });

  it("creating a note with job_id writes a customer_note timeline line", async () => {
    const { owner, worker } = await setupOwnerAndWorker();
    const jobRes = await api.post<{ data?: { job: { id: string } } }>("/api/jobs", {
      token: owner.accessToken,
      body: {
        title: "Note timeline job",
        customer: "Note Timeline Co",
        worker_id: worker.userId,
      },
    });
    expect(jobRes.status).toBe(201);
    const jobId = jobRes.body.data!.job.id;

    const noteRes = await api.post("/api/customers/notes", {
      token: owner.accessToken,
      body: {
        customer_name: "Note Timeline Co",
        note: "Full note text for timeline",
        job_id: jobId,
      },
    });
    expect(noteRes.status).toBe(201);

    const timeline = await api.get<{
      data?: { timeline: { event_type: string; metadata: Record<string, unknown> | null }[] };
    }>(`/api/jobs/${jobId}/timeline`, { token: owner.accessToken });
    expect(timeline.status).toBe(200);
    const noteEvent = timeline.body.data?.timeline.find(
      (e) => e.event_type === "job_updated" && e.metadata?.kind === "customer_note"
    );
    expect(noteEvent).toBeTruthy();
    expect(noteEvent!.metadata?.content).toBe("Full note text for timeline");
    expect(typeof noteEvent!.metadata?.sender_name).toBe("string");
  });

  it("job create with customer still works; notes lookup key matches job.customer", async () => {
    // End-to-end of the product path: save note → create job with same customer string → GET notes.
    const { owner, worker } = await setupOwnerAndWorker();
    const customer = "IKEA Ljubljana";

    const noteRes = await api.post<NoteCreateDto>("/api/customers/notes", {
      token: owner.accessToken,
      body: { customer_name: customer, note: "Call reception before entering." },
    });
    expect(noteRes.status).toBe(201);

    const jobRes = await api.post<{ data?: { job: { id: string; customer: string | null } } }>(
      "/api/jobs",
      {
        token: owner.accessToken,
        body: {
          title: "Shelf install",
          customer,
          worker_id: worker.userId,
        },
      }
    );
    expect(jobRes.status).toBe(201);
    expect(jobRes.body.data?.job.customer).toBe(customer);

    const notes = await api.get<NotesListDto>(
      `/api/customers/notes?name=${encodeURIComponent(jobRes.body.data!.job.customer!)}`,
      { token: owner.accessToken }
    );
    expect(notes.status).toBe(200);
    expect(notes.body.data?.notes[0]!.note).toBe("Call reception before entering.");
  });

  it("creates distinct customers for similar but different names", async () => {
    const owner = await registerCompany();
    createdCompanies.push(owner);

    const a = await api.post<NoteCreateDto>("/api/customers/notes", {
      token: owner.accessToken,
      body: { customer_name: "Jerry d.o.o.", note: "Note for d.o.o." },
    });
    const b = await api.post<NoteCreateDto>("/api/customers/notes", {
      token: owner.accessToken,
      body: { customer_name: "Jerry Gmbh", note: "Note for Gmbh" },
    });
    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
    expect(a.body.data?.customer.id).not.toBe(b.body.data?.customer.id);
    expect(a.body.data?.customer.name).toBe("Jerry d.o.o.");
    expect(b.body.data?.customer.name).toBe("Jerry Gmbh");
  });

  it("job create stores customer exactly and registers the customer row", async () => {
    const owner = await registerCompany();
    createdCompanies.push(owner);

    const customer = "Nowak";
    const jobRes = await api.post<{ data?: { job: { id: string; customer: string | null } } }>(
      "/api/jobs",
      {
        token: owner.accessToken,
        body: { title: "Exact customer", customer },
      }
    );
    expect(jobRes.status).toBe(201);
    expect(jobRes.body.data?.job.customer).toBe(customer);

    const notes = await api.get<NotesListDto>(
      `/api/customers/notes?name=${encodeURIComponent(customer)}`,
      { token: owner.accessToken }
    );
    expect(notes.status).toBe(200);
    expect(notes.body.data?.customer?.name).toBe(customer);
  });

  it("rejects past scheduled_at on job create", async () => {
    const owner = await registerCompany();
    createdCompanies.push(owner);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(12, 0, 0, 0);

    const res = await api.post("/api/jobs", {
      token: owner.accessToken,
      body: {
        title: "Past job",
        scheduled_at: yesterday.toISOString(),
      },
    });
    expect(res.status).toBe(400);
  });
});
