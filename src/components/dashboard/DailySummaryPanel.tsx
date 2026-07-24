"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { api } from "@/lib/api-client";
import { useLanguage } from "@/lib/useLanguage";
import { formatSiDate, parseFlexibleDate } from "@/lib/officeDate";
import { auraCard, auraButton } from "./AuraForm";

export interface DailySummaryDto {
  id: string;
  calendar_day: string;
  summary_text: string;
  attention: string | null;
  generated_at: string;
}

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
  const [summary, setSummary] = useState<DailySummaryDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<DailySummaryDto[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadForDay = useCallback(async (key: string) => {
    setLoading(true);
    setError(null);
    const res = await api.get<{ summary: DailySummaryDto | null }>(
      `/api/daily-summaries?date=${encodeURIComponent(key)}`
    );
    setLoading(false);
    if (res.status === 200) {
      setSummary(res.data?.summary ?? null);
    } else {
      setSummary(null);
      setError(res.error?.message ?? t("dailySummaryLoadError"));
    }
  }, [t]);

  useEffect(() => {
    void loadForDay(dayKey);
  }, [dayKey, loadForDay]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    const res = await api.post<{ summary: DailySummaryDto; reused?: boolean }>(
      "/api/daily-summaries",
      { date: dayKey }
    );
    setGenerating(false);
    if ((res.status === 201 || res.status === 200) && res.data?.summary) {
      setSummary(res.data.summary);
      return;
    }
    setError(res.error?.message ?? t("dailySummaryGenerateError"));
  };

  const openHistory = async () => {
    setHistoryOpen(true);
    setHistoryLoading(true);
    const res = await api.get<{ summaries: DailySummaryDto[] }>("/api/daily-summaries");
    setHistoryLoading(false);
    if (res.status === 200 && res.data) {
      setHistory(res.data.summaries);
    } else {
      setHistory([]);
    }
  };

  const selectHistoryItem = (item: DailySummaryDto) => {
    setHistoryOpen(false);
    onJumpToDay?.(item.calendar_day);
    setSummary(item);
  };

  return (
    <>
      <div
        className="rounded-[24px] border border-slate-200/80 bg-white px-4 py-3.5 mb-6"
        style={{
          boxShadow: "0px 12px 40px -28px rgba(15, 23, 42, 0.35)",
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
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void openHistory()}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              {t("dailySummaryHistory")}
            </button>
            {!summary && (
              <button
                type="button"
                onClick={() => void handleGenerate()}
                disabled={generating || loading}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-[#1B3A6B] text-white hover:bg-[#142c52] transition-colors cursor-pointer disabled:opacity-50"
              >
                {generating ? t("dailySummaryGenerating") : t("dailySummaryGenerate")}
              </button>
            )}
            {summary && (
              <button
                type="button"
                onClick={() => void handleGenerate()}
                disabled={generating}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
                title={t("dailySummaryShowSaved")}
              >
                {generating ? t("dailySummaryGenerating") : t("dailySummaryShowSaved")}
              </button>
            )}
          </div>
        </div>

        {loading && !summary && (
          <p className="text-[13px] text-slate-400">{t("officeLoading")}</p>
        )}

        {error && (
          <p className="text-[13px] text-red-600 mb-2">{error}</p>
        )}

        {summary ? (
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
        ) : (
          !loading && (
            <p className="text-[13px] text-slate-500 leading-relaxed">
              {t("dailySummaryEmpty")}
            </p>
          )
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

              {historyLoading ? (
                <p className="text-sm text-slate-400 text-center">{t("officeLoading")}</p>
              ) : history.length === 0 ? (
                <p className="text-sm text-slate-500 text-center">{t("dailySummaryHistoryEmpty")}</p>
              ) : (
                <ul className="flex flex-col gap-2 max-h-[360px] overflow-y-auto">
                  {history.map((item) => (
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
