import { api, type ApiResult } from "@/lib/api-client";
import type {
  ApiJob,
  ApiChecklistItem,
  ApiUser,
  ApiOfficeReminder,
  ApiNotification,
} from "@/lib/dashboardMappers";

export class ApiRequestError extends Error {
  status: number;
  response?: unknown;

  constructor(status: number, message: string, response?: unknown) {
    super(message);
    this.status = status;
    this.response = response;
  }
}

export async function unwrapApi<T>(result: Promise<ApiResult<T>>): Promise<T> {
  let res: ApiResult<T>;

  try {
    res = await result;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Network error";

    console.error("API NETWORK ERROR:", message);

    throw new ApiRequestError(
      0,
      message,
      err
    );
  }

    if (res.status >= 400 || res.data == null) {
    const message =
      res.error?.message ??
      `Request failed (${res.status})`;

    console.error("API ERROR:", {
      status: res.status,
      message,
      response: res,
    });

    throw new ApiRequestError(
  res.status,
  message,
  res
);
  }

  return res.data;
}
function validateDayKey(dayKey: unknown) {
  if (typeof dayKey !== "string") {
    throw new Error(`Invalid date value: ${dayKey}`);
  }

  const regex = /^\d{4}-\d{2}-\d{2}$/;

  if (!regex.test(dayKey)) {
    throw new Error(`Invalid date format: ${dayKey}`);
  }

  const parts = dayKey.split("-");

  if (parts.length !== 3) {
    throw new Error(`Invalid date: ${dayKey}`);
  }

  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);

  if (
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day) ||
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    throw new Error(`Invalid date: ${dayKey}`);
  }

  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    throw new Error(`Invalid date: ${dayKey}`);
  }
}

export interface OfficeSummaryData {
  field_overview: {
    job_id: string;
    job_title: string;
    location: string | null;
    worker_name: string | null;
    checklist_completed: number;
    checklist_total: number;
  }[];
  urgent_reminder: {
    id: string;
    title: string;
    description: string | null;
    created_at: string;
  } | null;
}

export async function fetchJobs() {
  const data = await unwrapApi(api.get<{ jobs: ApiJob[] }>("/api/jobs"));
  return data.jobs;
}

export async function fetchReminders(dayKey: string) {
  validateDayKey(dayKey);

  const data = await unwrapApi(
    api.get<{ reminders: ApiOfficeReminder[] }>(
      `/api/office-reminders?date=${encodeURIComponent(dayKey)}`
    )
  );

  return data.reminders;
}

export async function fetchNotifications() {
  const data = await unwrapApi(
    api.get<{ notifications: ApiNotification[] }>("/api/notifications")
  );
  return data.notifications;
}

export interface OfficeCommunicationDto {
  id: string;
  job_id: string;
  sender_id: string;
  recipient_id: string | null;
  content: string;
  message_type: string;
  is_urgent: boolean;
  created_at: string;
  attachment_id?: string | null;
  job_title: string | null;
  worker_id: string | null;
  worker_name: string | null;
  sender_name?: string | null;
  recipient_name?: string | null;
}

export async function fetchOfficeCommunications(dayKey: string) {
  validateDayKey(dayKey);

  const data = await unwrapApi(
    api.get<{ messages: OfficeCommunicationDto[] }>(
      `/api/office/communications?date=${encodeURIComponent(dayKey)}`
    )
  );
  return data.messages;
}

export async function fetchWorkers() {
  const data = await unwrapApi(api.get<{ users: ApiUser[] }>("/api/users"));
  // Soft-deleted staff stay on historical cards but not in assign pickers (Mark).
  return data.users.filter((u) => u.role === "worker" && u.is_active);
}

export async function fetchSummary(dayKey: string) {
  validateDayKey(dayKey);

  return unwrapApi(
    api.get<OfficeSummaryData>(
      `/api/dashboard/summary?date=${encodeURIComponent(dayKey)}`
    )
  );
}

export interface DailySummaryDto {
  id: string;
  calendar_day: string;
  summary_text: string;
  attention: string | null;
  generated_at: string;
}

export async function fetchDailySummary(dayKey: string) {
  validateDayKey(dayKey);

  const data = await unwrapApi(
    api.get<{ summary: DailySummaryDto | null }>(
      `/api/daily-summaries?date=${encodeURIComponent(dayKey)}`
    )
  );
  return data.summary;
}

export async function fetchDailySummaryHistory() {
  const data = await unwrapApi(
    api.get<{ summaries: DailySummaryDto[] }>("/api/daily-summaries")
  );
  return data.summaries;
}

const BULK_CHECKLIST_MAX_IDS = 25;

export async function fetchChecklistsForJobs(jobIds: string[]) {
  if (jobIds.length === 0) return {};

  const map: Record<string, ApiChecklistItem[]> = {};

  const chunks: string[][] = [];

  for (let i = 0; i < jobIds.length; i += BULK_CHECKLIST_MAX_IDS) {
    chunks.push(jobIds.slice(i, i + BULK_CHECKLIST_MAX_IDS));
  }

  const results = await Promise.all(
    chunks.map((chunk) =>
      unwrapApi(
        api.get<{ checklistsByJob: Record<string, ApiChecklistItem[]> }>(
          `/api/jobs/checklists?ids=${encodeURIComponent(chunk.join(","))}`
        )
      )
    )
  );

  for (const result of results) {
    Object.assign(map, result.checklistsByJob);
  }

  for (const id of jobIds) {
    if (!map[id]) map[id] = [];
  }
  return map;
}

export async function fetchJobFiles(jobId: string) {
  const data = await unwrapApi(
    api.get<{
      files: Array<{
        id: string;
        file_name: string;
        created_at: string;
        signed_url: string | null;
        ocr_text: string | null;
        document_type: string | null;
        document_preview: string | null;
        checklist_item_id?: string | null;
        attachment_type?: string | null;
      }>;
    }>(`/api/jobs/${jobId}/files`)
  );
  return data.files;
}

export async function fetchJobTimeline(jobId: string) {
  const data = await unwrapApi(
    api.get<{
      timeline: Array<{
        id: string;
        event_type: string;
        metadata: Record<string, unknown> | null;
        created_at: string;
      }>;
    }>(`/api/jobs/${jobId}/timeline`)
  );
  return data.timeline;
}
