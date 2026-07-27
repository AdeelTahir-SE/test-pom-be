"use client";

import React from "react";
import { useLanguage } from "@/lib/useLanguage";

export interface CustomerNoteView {
  id: string;
  note: string;
  created_at?: string;
}

interface CustomerNotesBannerProps {
  notes: CustomerNoteView[];
  /** Optional: allow managers to remove a note from the banner. */
  onDelete?: (id: string) => void;
  compact?: boolean;
}

/** Notes may be plain text or JSON `{ text, jobId }` for one-time (this-job) notes. */
export function parseNoteText(note: string): { text: string; jobId: string | null } {
  try {
    if (note.startsWith("{") && note.endsWith("}")) {
      const parsed: unknown = JSON.parse(note);
      if (
        parsed &&
        typeof parsed === "object" &&
        "text" in parsed &&
        typeof (parsed as { text: unknown }).text === "string"
      ) {
        const jobId = (parsed as { jobId?: unknown }).jobId;
        return {
          text: (parsed as { text: string }).text,
          jobId: typeof jobId === "string" ? jobId : null,
        };
      }
    }
  } catch {
    // plain-text note
  }
  return { text: note, jobId: null };
}

export function CustomerNotesBanner({ notes, onDelete, compact = false }: CustomerNotesBannerProps) {
  const { t } = useLanguage();
  if (notes.length === 0) return null;

  return (
    <div
      className="rounded-2xl border border-amber-200/80 bg-amber-50/90 px-3 py-2.5"
      style={{ fontFamily: "'PT Sans', sans-serif" }}
    >
      <p
        className="text-[11px] font-bold uppercase tracking-wide text-amber-800/90 mb-1.5"
      >
        {t("customerNotesTitle")}
      </p>
      <ul className={`flex flex-col ${compact ? "gap-1" : "gap-1.5"}`}>
        {notes.map((n) => {
          const { text } = parseNoteText(n.note);
          return (
            <li key={n.id} className="flex items-start gap-2 text-[13px] text-slate-800 leading-snug">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-700/70" />
              <span className="flex-1 min-w-0">{text}</span>
              {onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(n.id)}
                  className="shrink-0 text-[11px] text-slate-400 hover:text-red-500 bg-transparent border-none cursor-pointer"
                  title={t("customerNotesDelete")}
                >
                  {t("customerNotesDelete")}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
