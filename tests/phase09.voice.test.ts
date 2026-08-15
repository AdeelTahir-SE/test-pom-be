import { describe, it, expect, afterAll } from "vitest";
import { api } from "./helpers/client";
import {
  registerCompany,
  createCompanyUser,
  loginAs,
  cleanupCompany,
  getTimelineEvents,
  type RegisteredCompany,
} from "./helpers/factories";

const createdCompanies: RegisteredCompany[] = [];

afterAll(async () => {
  for (const c of createdCompanies) {
    await cleanupCompany(c.companyId, c.userId);
  }
});

interface JobDto {
  id: string;
  status: string;
}

interface MessageDto {
  id: string;
  message_type: string;
  content: string;
  sender_id: string;
  recipient_id: string;
  attachment_id: string;
}

interface NotificationDto {
  type: string;
  job_id: string | null;
}

async function setupCompanyWithWorkerAndJob() {
  const owner = await registerCompany();
  createdCompanies.push(owner);
  const worker = await createCompanyUser(owner.accessToken!, { role: "worker" });
  const workerLogin = await loginAs(worker.email, worker.password);
  const workerToken = workerLogin.body.data?.access_token as string;

  const jobRes = await api.post<{ data?: { job: JobDto } }>("/api/jobs", {
    token: owner.accessToken,
    body: { title: "Voice message test job", worker_id: worker.userId },
  });
  const jobId = jobRes.body.data!.job.id;

  return { owner, worker, workerToken, jobId };
}

function voiceForm(bytes: Buffer, name = "clip.webm", type = "audio/webm"): FormData {
  const form = new FormData();
  form.append("audio", new File([Uint8Array.from(bytes)], name, { type }));
  return form;
}

async function waitForVoiceTimelineEvent(jobId: string) {
  const started = Date.now();
  while (Date.now() - started < 5000) {
    const events = await getTimelineEvents(jobId);
    const voiceEvents = events.filter((e) => e.event_type === "voice_message_transcribed");
    if (voiceEvents.length > 0) return { events, voiceEvents };
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const events = await getTimelineEvents(jobId);
  return {
    events,
    voiceEvents: events.filter((e) => e.event_type === "voice_message_transcribed"),
  };
}

describe("Phase 9 — Voice-to-Text", () => {
  it(
    "creates exactly one voice message with fallback content when transcription is unavailable",
    async () => {
      const { owner, jobId, workerToken } = await setupCompanyWithWorkerAndJob();

      const res = await api.post<{ data?: { message: MessageDto } }>(
        `/api/jobs/${jobId}/voice-message`,
        { token: workerToken, body: voiceForm(Buffer.from("not-real-audio-bytes")) }
      );

      expect(res.status).toBe(201);
      const message = res.body.data!.message;
      expect(message.message_type).toBe("voice");
      expect(message.content).toBe("Voice message (untranscribed)");
      expect(message.recipient_id).toBe(owner.userId);
      expect(message.attachment_id).toBeTruthy();

      const { events, voiceEvents } = await waitForVoiceTimelineEvent(jobId);
      expect(voiceEvents.length).toBe(1);
      // Voice messages never trigger message_sent (Appendix B §5).
      expect(events.some((e) => e.event_type === "message_sent")).toBe(false);
    },
    30_000
  );

  it(
    "retrying with identical audio bytes returns the same message, not a duplicate",
    async () => {
      const { jobId, workerToken } = await setupCompanyWithWorkerAndJob();
      const audio = Buffer.from("identical-clip-bytes-for-idempotency-test");

      const first = await api.post<{ data?: { message: MessageDto } }>(
        `/api/jobs/${jobId}/voice-message`,
        { token: workerToken, body: voiceForm(audio) }
      );
      expect(first.status).toBe(201);

      const second = await api.post<{ data?: { message: MessageDto } }>(
        `/api/jobs/${jobId}/voice-message`,
        { token: workerToken, body: voiceForm(audio) }
      );
      expect(second.status).toBe(200);
      expect(second.body.data?.message.id).toBe(first.body.data?.message.id);

      const { voiceEvents } = await waitForVoiceTimelineEvent(jobId);
      expect(voiceEvents.length).toBe(1);
    },
    30_000
  );

  it(
    "owner sending a voice message defaults recipient to the assigned worker",
    async () => {
      const { owner, worker, jobId } = await setupCompanyWithWorkerAndJob();
      const res = await api.post<{ data?: { message: MessageDto } }>(
        `/api/jobs/${jobId}/voice-message`,
        { token: owner.accessToken, body: voiceForm(Buffer.from("owner-clip")) }
      );
      expect(res.status).toBe(201);
      expect(res.body.data?.message.recipient_id).toBe(worker.userId);
    },
    30_000
  );

  it("rejects a request with no audio file", async () => {
    const { owner, jobId } = await setupCompanyWithWorkerAndJob();
    const form = new FormData();
    const res = await api.post(`/api/jobs/${jobId}/voice-message`, {
      token: owner.accessToken,
      body: form,
    });
    expect(res.status).toBe(400);
  });

  it("rejects an oversized audio file", async () => {
    const { owner, jobId } = await setupCompanyWithWorkerAndJob();
    const oversized = Buffer.alloc(6 * 1024 * 1024);
    const res = await api.post(`/api/jobs/${jobId}/voice-message`, {
      token: owner.accessToken,
      body: voiceForm(oversized),
    });
    expect(res.status).toBe(413);
  });

  it("a worker not assigned to the job is blocked (403)", async () => {
    const owner = await registerCompany();
    createdCompanies.push(owner);
    const workerA = await createCompanyUser(owner.accessToken!, { role: "worker" });
    const workerB = await createCompanyUser(owner.accessToken!, { role: "worker" });

    const jobRes = await api.post<{ data?: { job: JobDto } }>("/api/jobs", {
      token: owner.accessToken,
      body: { title: "A's job", worker_id: workerA.userId },
    });
    const jobId = jobRes.body.data!.job.id;
    const loginB = await loginAs(workerB.email, workerB.password);

    const res = await api.post(`/api/jobs/${jobId}/voice-message`, {
      token: loginB.body.data?.access_token,
      body: voiceForm(Buffer.from("clip")),
    });
    expect(res.status).toBe(403);
  });

  it("cross-company access is rejected as 404", async () => {
    const companyA = await registerCompany();
    createdCompanies.push(companyA);
    const companyB = await registerCompany();
    createdCompanies.push(companyB);

    const jobRes = await api.post<{ data?: { job: JobDto } }>("/api/jobs", {
      token: companyA.accessToken,
      body: { title: "Company A job" },
    });
    const jobId = jobRes.body.data!.job.id;

    const res = await api.post(`/api/jobs/${jobId}/voice-message`, {
      token: companyB.accessToken,
      body: voiceForm(Buffer.from("clip")),
    });
    expect(res.status).toBe(404);
  });

  it(
    "creates a message_received notification for the recipient",
    async () => {
      const { owner, workerToken, jobId } = await setupCompanyWithWorkerAndJob();
      await api.post(`/api/jobs/${jobId}/voice-message`, {
        token: workerToken,
        body: voiceForm(Buffer.from("notify-clip")),
      });

      const res = await api.get<{ data?: { notifications: NotificationDto[] } }>(
        "/api/notifications",
        { token: owner.accessToken }
      );
      expect(
        res.body.data?.notifications.some(
          (n) => n.type === "message_received" && n.job_id === jobId
        )
      ).toBe(true);
    },
    30_000
  );
});
