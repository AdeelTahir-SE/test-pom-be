"use client";

import React, { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useLanguage } from "@/lib/useLanguage";
import { api } from "@/lib/api-client";
import { auraCard, auraInputBase } from "./AuraForm";

interface SearchResult {
  id: string;
  job_id: string;
  file_name: string;
  attachment_type: string;
  created_at: string;
  signed_url: string | null;
}

interface SearchModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenJob?: (jobId: string) => void;
}

export function SearchModal({ isOpen, onOpenChange, onOpenJob }: SearchModalProps) {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const runSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    const res = await api.get<{ results: SearchResult[] }>(`/api/search?q=${encodeURIComponent(query.trim())}`);
    setResults(res.data?.results ?? []);
    setLoading(false);
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        onOpenChange(open);
        if (!open) {
          setQuery("");
          setResults([]);
          setSearched(false);
        }
      }}
    >
      <DialogContent className="max-w-lg w-[90vw] max-h-[80vh] overflow-y-auto overflow-x-hidden">
        <div className={auraCard}>
          <div className="flex flex-col gap-4 text-slate-800">
            <div className="text-center">
              <h3 className="text-xl font-semibold tracking-tight text-slate-900">{t("searchTitle")}</h3>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") runSearch();
                }}
                placeholder={t("searchPlaceholder")}
                className={auraInputBase}
              />
              <button
                onClick={runSearch}
                disabled={!query.trim() || loading}
                className="shrink-0 h-11 px-4 rounded-xl bg-[#1B3A6B] hover:bg-[#142c52] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors"
              >
                {loading ? "…" : t("searchButton")}
              </button>
            </div>

            {searched && !loading && (
              <div className="flex flex-col divide-y divide-slate-100 rounded-xl border border-slate-100">
                {results.length === 0 && (
                  <p className="px-3 py-4 text-sm text-slate-400 text-center">{t("searchNoResults")}</p>
                )}
                {results.map((r) => (
                  <div key={r.id} className="flex items-center justify-between flex-wrap px-3 py-3 gap-2">
                    <div className="flex flex-col min-w-0 max-w-full">
                      <span className="text-sm font-medium text-slate-800 truncate">{r.file_name}</span>
                      <span className="text-xs text-slate-400">
                        {new Date(r.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {r.signed_url && (
                        <a
                          href={r.signed_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-semibold text-[#1B3A6B] hover:underline"
                        >
                          {t("searchOpenFile")}
                        </a>
                      )}
                      {onOpenJob && (
                        <button
                          onClick={() => onOpenJob(r.job_id)}
                          className="text-xs font-semibold text-[#1B3A6B] hover:underline"
                        >
                          {t("searchViewJob")}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
