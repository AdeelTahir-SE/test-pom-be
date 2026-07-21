"use client";

import React, { useEffect, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import { sl } from "react-day-picker/locale";
import "react-day-picker/style.css";
import { Calendar } from "lucide-react";
import { addDays, formatSiDate, isSameLocalDay, startOfLocalDay } from "@/lib/officeDate";

interface OfficeDayHeaderProps {
  title: string;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  calendarLabel: string;
  prevDayLabel: string;
  nextDayLabel: string;
  todayLabel: string;
}

/** iconmonstr angel-left-thin — thin chevron, license-free for product use. */
function AngelLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path d="M16.67 0l2.83 2.829-9.339 9.175 9.339 9.167-2.83 2.829-12.17-11.996z" />
    </svg>
  );
}

function AngelRightIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path d="M7.33 24l-2.83-2.829 9.339-9.175-9.339-9.167 2.83-2.829 12.17 11.996z" />
    </svg>
  );
}

export function OfficeDayHeader({
  title,
  selectedDate,
  onDateChange,
  calendarLabel,
  prevDayLabel,
  nextDayLabel,
  todayLabel,
}: OfficeDayHeaderProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const day = startOfLocalDay(selectedDate);

  useEffect(() => {
    if (!calendarOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!popoverRef.current?.contains(event.target as Node)) {
        setCalendarOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCalendarOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [calendarOpen]);

  return (
    <div
      className="relative mb-6 flex flex-wrap items-center gap-x-4 gap-y-3"
      style={{ fontFamily: "'PT Sans', sans-serif" }}
    >
      <h1 className="text-2xl font-semibold tracking-tight text-slate-800 shrink-0">
        {title}
      </h1>

      <div className="flex items-center gap-1 sm:gap-2">
        <button
          type="button"
          onClick={() => onDateChange(addDays(day, -1))}
          aria-label={prevDayLabel}
          title={prevDayLabel}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-white/80 hover:text-slate-800"
        >
          <AngelLeftIcon />
        </button>

        <time
          dateTime={day.toISOString()}
          className="min-w-[7.5rem] text-center text-lg font-medium tabular-nums text-slate-700 sm:text-xl"
        >
          {formatSiDate(day)}
        </time>

        <button
          type="button"
          onClick={() => onDateChange(addDays(day, 1))}
          aria-label={nextDayLabel}
          title={nextDayLabel}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-white/80 hover:text-slate-800"
        >
          <AngelRightIcon />
        </button>
      </div>

      <div className="ml-auto relative" ref={popoverRef}>
        <button
          type="button"
          onClick={() => setCalendarOpen((open) => !open)}
          aria-label={calendarLabel}
          title={calendarLabel}
          aria-expanded={calendarOpen}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-400/40 bg-white/60 text-slate-600 shadow-[inset_0_1px_0_1px_#fff] transition-colors hover:bg-white hover:text-slate-900"
        >
          <Calendar className="h-[18px] w-[18px]" strokeWidth={1.6} />
        </button>

        {calendarOpen && (
          <div
            className="absolute right-0 top-[calc(100%+8px)] z-40 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-xl"
            style={{ boxShadow: "0 24px 60px -30px rgba(59, 130, 246, 0.45)" }}
          >
            <DayPicker
              mode="single"
              locale={sl}
              selected={day}
              defaultMonth={day}
              onSelect={(next) => {
                if (!next) return;
                onDateChange(startOfLocalDay(next));
                setCalendarOpen(false);
              }}
              modifiersClassNames={{
                selected: "office-day-selected",
                today: "office-day-today",
              }}
              className="office-day-picker"
            />
            {!isSameLocalDay(day, startOfLocalDay()) && (
              <button
                type="button"
                className="mt-2 w-full rounded-xl py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
                onClick={() => {
                  onDateChange(startOfLocalDay());
                  setCalendarOpen(false);
                }}
              >
                {todayLabel}
              </button>
            )}
          </div>
        )}
      </div>

      <style>{`
        .office-day-picker {
          --rdp-accent-color: #1d4ed8;
          --rdp-accent-background-color: rgba(37, 99, 235, 0.12);
          font-family: "PT Sans", sans-serif;
        }
        .office-day-picker .office-day-selected {
          background: #1d4ed8 !important;
          color: #fff !important;
          border-radius: 10px;
        }
        .office-day-picker .office-day-today:not(.office-day-selected) {
          color: #1d4ed8;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}
