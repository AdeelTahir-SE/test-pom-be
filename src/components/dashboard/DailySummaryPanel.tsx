"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useLanguage } from "@/lib/useLanguage";
import { formatSiDate, parseFlexibleDate } from "@/lib/officeDate";
import { queryKeys } from "@/lib/query/keys";
import {
  fetchDailySummary,
  fetchDailySummaryHistory,
  type DailySummaryDto,
} from "@/lib/query/office";
import { auraCard, auraButton } from "./AuraForm";

export type { DailySummaryDto };

interface DailySummaryPanelProps {
  /** Selected office day as YYYY-MM-DD */
  dayKey: string;
  onJumpToDay?: (dayKey: string) => void;
}

function formatDayLabel(dayKey: string): string {
  const d = parseFlexibleDate(dayKey);
  return d ? formatSiDate(d) : dayKey;
}

export function DailySummaryPanel({ dayKey, onJumpToDay }: DailySummaryPanelProps) {
  const { t } = useLanguage();
  const [historyOpen, setHistoryOpen] = useState(false);
  /** When user picks from history for the current day, prefer that row until day changes. */
  const [historyOverride, setHistoryOverride] = useState<DailySummaryDto | null>(null);
  React.useEffect(() => {
  setHistoryOverride(null);
}, [dayKey]);

  const summaryQuery = useQuery({
    queryKey: queryKeys.office.dailySummary(dayKey),
    queryFn: () => fetchDailySummary(dayKey),
  });

  const historyQuery = useQuery({
    queryKey: ["office", "daily-summaries", "history"],
    queryFn: fetchDailySummaryHistory,
    enabled: historyOpen,
  });

  // Clear history override when the day navigator moves.
  const summary =
    historyOverride?.calendar_day === dayKey
      ? historyOverride
      : (summaryQuery.data ?? null);
  const loading = summaryQuery.isLoading && !summary;

  const openHistory = () => {
    setHistoryOpen(true);
  };

  const selectHistoryItem = (item: DailySummaryDto) => {
    setHistoryOpen(false);
    setHistoryOverride(item);
    onJumpToDay?.(item.calendar_day);
  };

  return (
    <>
      <div
        className="fixed right-6 top-24 z-30 w-80 rounded-[24px] border border-slate-200/80 bg-white px-4 py-3.5 shadow-xl"
        style={{
          boxShadow: "0px 20px 50px -20px rgba(15, 23, 42, 0.4)",
          fontFamily: "'PT Sans', sans-serif",
        }}
      >
        <div className="flex flex-wrap items-center gap-2 justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
              {t("dailySummaryTitle")}
            </span>
            <span className="text-[11px] text-slate-400">{formatDayLabel(dayKey)}</span>
          </div>
          <button
            type="button"
            onClick={openHistory}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            {t("dailySummaryHistory")}
          </button>
        </div>
{loading && !summary && (
  <p className="text-[13px] text-slate-400">
    {t("officeLoading")}
  </p>
)}
        {summaryQuery.isError && (
  <p className="text-[13px] text-red-500">
    {t("dailySummaryHistoryEmpty")}
  </p>
)}

        {!loading && summary && (
          <div className="flex flex-col gap-2">
            <p className="text-[14px] text-slate-800 leading-relaxed whitespace-pre-wrap">
              {summary.summary_text}
            </p>
            {summary.attention && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-950 leading-snug">
                <span className="font-bold uppercase tracking-wide text-[11px] text-amber-800/90">
                  {t("dailySummaryAttention")}
                </span>
                <p className="mt-0.5">{summary.attention}</p>
              </div>
            )}
            <p className="text-[10px] text-slate-400">
              {t("dailySummarySavedAt")}{" "}
              {new Date(summary.generated_at).toLocaleString("sl-SI", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        )}
      </div>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent
          style={{
            background: "transparent",
            border: "none",
            boxShadow: "none",
            padding: 0,
            maxWidth: "480px",
            width: "92%",
          }}
          className="outline-none"
        >
          <div className={auraCard}>
            <div className="flex flex-col gap-4 text-slate-800">
              <div className="text-center">
                <h3 className="text-xl font-semibold tracking-tight text-slate-900">
                  {t("dailySummaryHistoryTitle")}
                </h3>
                <p className="mt-1 text-xs text-slate-500">{t("dailySummaryHistoryHint")}</p>
              </div>

              {historyQuery.isError ? (
  <p className="text-sm text-red-500 text-center">
    {t("dailySummaryHistoryEmpty")}
  </p>
) : historyQuery.isLoading ? (
                <p className="text-sm text-slate-400 text-center">{t("officeLoading")}</p>
              ) : (historyQuery.data ?? []).length === 0 ? (
                <p className="text-sm text-slate-500 text-center">{t("dailySummaryHistoryEmpty")}</p>
              ) : (
                <ul className="flex flex-col gap-2 max-h-[360px] overflow-y-auto">
                  {(historyQuery.data ?? []).map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => selectHistoryItem(item)}
                        className="w-full text-left rounded-2xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 px-3 py-2.5 transition-colors cursor-pointer bg-transparent"
                      >
                        <p className="text-[12px] font-bold text-slate-700 mb-1">
                          {formatDayLabel(item.calendar_day)}
                        </p>
                        <p className="text-[13px] text-slate-600 line-clamp-3 leading-snug">
                          {item.summary_text}
                        </p>
                        {item.attention && (
                          <p className="mt-1 text-[12px] text-amber-800 line-clamp-2">
                            {t("dailySummaryAttention")}: {item.attention}
                          </p>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <button type="button" className={auraButton} onClick={() => setHistoryOpen(false)}>
                {t("modalClose")}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
