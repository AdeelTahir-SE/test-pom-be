"use client";

import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchChecklistsForJobs,
  fetchJobs,
  fetchNotifications,
  fetchReminders,
  fetchSummary,
  fetchWorkers,
} from "@/lib/query/office";
import { queryKeys } from "@/lib/query/keys";
import type { ApiJob, ApiChecklistItem, ApiOfficeReminder, ApiNotification, ApiUser } from "@/lib/dashboardMappers";
import type { OfficeSummaryData } from "@/lib/query/office";
import { isOptimisticId } from "@/lib/optimisticId";

export function useOfficeBoard(dayKey: string, enabled: boolean) {
  const queryClient = useQueryClient();

  const jobsQuery = useQuery({
    queryKey: queryKeys.office.jobs(),
    queryFn: fetchJobs,
    enabled,
  });

  const remindersQuery = useQuery({
    queryKey: queryKeys.office.reminders(dayKey),
    queryFn: () => fetchReminders(dayKey),
    enabled,
    refetchInterval: 30_000,
  });

  const notificationsQuery = useQuery({
    queryKey: queryKeys.office.notifications(),
    queryFn: fetchNotifications,
    enabled,
    refetchInterval: 30_000,
  });

  const workersQuery = useQuery({
    queryKey: queryKeys.office.users(),
    queryFn: fetchWorkers,
    enabled,
    staleTime: 60_000,
  });

  const summaryQuery = useQuery({
    queryKey: queryKeys.office.summary(),
    queryFn: fetchSummary,
    enabled,
    refetchInterval: 30_000,
  });

  const jobs = jobsQuery.data ?? [];
  const checklistJobIds = useMemo(
    () =>
      jobs
        .filter(
          (j) =>
            j.worker_id &&
            j.status !== "completed" &&
            j.status !== "cancelled" &&
            !isOptimisticId(j.id)
        )
        .map((j) => j.id)
        .sort(),
    [jobs]
  );
  const checklistKey = checklistJobIds.join(",");

  const checklistsQuery = useQuery({
    queryKey: queryKeys.office.checklists(checklistKey || "none"),
    queryFn: () => fetchChecklistsForJobs(checklistJobIds),
    enabled: enabled && checklistJobIds.length > 0,
  });

  const dataLoading =
    enabled &&
    (jobsQuery.isLoading ||
      remindersQuery.isLoading ||
      notificationsQuery.isLoading ||
      workersQuery.isLoading ||
      summaryQuery.isLoading);

  const setJobs = (
    updater: ApiJob[] | ((prev: ApiJob[]) => ApiJob[])
  ) => {
    queryClient.setQueryData<ApiJob[]>(queryKeys.office.jobs(), (prev) => {
      const current = prev ?? [];
      return typeof updater === "function" ? updater(current) : updater;
    });
  };

  const setReminders = (
    updater: ApiOfficeReminder[] | ((prev: ApiOfficeReminder[]) => ApiOfficeReminder[])
  ) => {
    queryClient.setQueryData<ApiOfficeReminder[]>(
      queryKeys.office.reminders(dayKey),
      (prev) => {
        const current = prev ?? [];
        return typeof updater === "function" ? updater(current) : updater;
      }
    );
  };

  const setNotifications = (
    updater: ApiNotification[] | ((prev: ApiNotification[]) => ApiNotification[])
  ) => {
    queryClient.setQueryData<ApiNotification[]>(
      queryKeys.office.notifications(),
      (prev) => {
        const current = prev ?? [];
        return typeof updater === "function" ? updater(current) : updater;
      }
    );
  };

  const setChecklistsByJob = (
    updater:
      | Record<string, ApiChecklistItem[]>
      | ((prev: Record<string, ApiChecklistItem[]>) => Record<string, ApiChecklistItem[]>)
  ) => {
    queryClient.setQueryData<Record<string, ApiChecklistItem[]>>(
      queryKeys.office.checklists(checklistKey || "none"),
      (prev) => {
        const current = prev ?? {};
        return typeof updater === "function" ? updater(current) : updater;
      }
    );
  };

  const setWorkers = (updater: ApiUser[] | ((prev: ApiUser[]) => ApiUser[])) => {
    queryClient.setQueryData<ApiUser[]>(queryKeys.office.users(), (prev) => {
      const current = prev ?? [];
      return typeof updater === "function" ? updater(current) : updater;
    });
  };

  const setSummary = (
    updater: OfficeSummaryData | null | ((prev: OfficeSummaryData | null) => OfficeSummaryData | null)
  ) => {
    queryClient.setQueryData<OfficeSummaryData>(queryKeys.office.summary(), (prev) => {
      const current = prev ?? null;
      const next = typeof updater === "function" ? updater(current) : updater;
      return next ?? undefined;
    });
  };

  /** Soft refresh — does not block the UI (Mark: updates must feel instant). */
  const refreshBoard = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.office.jobs() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.office.reminders(dayKey) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.office.notifications() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.office.users() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.office.summary() }),
      queryClient.invalidateQueries({ queryKey: ["office", "checklists"] }),
    ]);
  };

  return {
    jobs,
    reminders: remindersQuery.data ?? [],
    notifications: notificationsQuery.data ?? [],
    workers: workersQuery.data ?? [],
    summary: summaryQuery.data ?? null,
    checklistsByJob: checklistsQuery.data ?? {},
    dataLoading,
    setJobs,
    setReminders,
    setNotifications,
    setChecklistsByJob,
    setWorkers,
    setSummary,
    refreshBoard,
    queryClient,
  };
}
