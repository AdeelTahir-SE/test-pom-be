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
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function unwrapApi<T>(result: Promise<ApiResult<T>>): Promise<T> {
  const res = await result;
  if (res.status >= 400 || res.data === undefined) {
    throw new ApiRequestError(res.status, res.error?.message ?? `Request failed (${res.status})`);
  }
  return res.data;
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
  const data = await unwrapApi(
    api.get<{ reminders: ApiOfficeReminder[] }>(`/api/office-reminders?date=${dayKey}`)
  );
  return data.reminders;
}

export async function fetchNotifications() {
  const data = await unwrapApi(
    api.get<{ notifications: ApiNotification[] }>("/api/notifications")
  );
  return data.notifications;
}

export async function fetchWorkers() {
  const data = await unwrapApi(api.get<{ users: ApiUser[] }>("/api/users"));
  return data.users.filter((u) => u.role === "worker");
}

export async function fetchSummary(dayKey: string) {
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

const BULK_CHECKLIST_MAX_IDS = 100;

export async function fetchChecklistsForJobs(jobIds: string[]) {
  if (jobIds.length === 0) return {};

  const map: Record<string, ApiChecklistItem[]> = {};
  for (let i = 0; i < jobIds.length; i += BULK_CHECKLIST_MAX_IDS) {
    const chunk = jobIds.slice(i, i + BULK_CHECKLIST_MAX_IDS);
    const data = await unwrapApi(
      api.get<{ checklistsByJob: Record<string, ApiChecklistItem[]> }>(
        `/api/jobs/checklists?ids=${encodeURIComponent(chunk.join(","))}`
      )
    );
    Object.assign(map, data.checklistsByJob);
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
