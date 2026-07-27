export const queryKeys = {
  office: {
    all: ["office"] as const,
    jobs: () => ["office", "jobs"] as const,
    reminders: (dayKey: string) => ["office", "reminders", dayKey] as const,
    notifications: () => ["office", "notifications"] as const,
    users: () => ["office", "users"] as const,
    summary: (dayKey: string) => ["office", "summary", dayKey] as const,
    dailySummary: (dayKey: string) => ["office", "daily-summary", dayKey] as const,
    checklists: (jobIdsKey: string) => ["office", "checklists", jobIdsKey] as const,
  },
  job: {
    files: (jobId: string) => ["job", jobId, "files"] as const,
    timeline: (jobId: string) => ["job", jobId, "timeline"] as const,
  },
} as const;
