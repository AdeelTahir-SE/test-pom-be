"use client";

import React from "react";
import { Worker, TaskItem } from "@/lib/mockData";

// ── Attachment icon — COMPLETED tasks (lighter, 13×15) ───────────────────────
function AttachmentIconCompleted() {
  return (
    <svg width="13" height="15" viewBox="0 0 14 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M0.5 7.54918L6.15229 1.78552C7.83319 0.0714946 10.5585 0.0714946 12.2394 1.78552C13.9203 3.49954 13.9201 6.27867 12.2392 7.99269L5.71734 14.6431C4.59674 15.7858 2.7802 15.7856 1.6596 14.6429C0.538995 13.5002 0.53872 11.6478 1.65932 10.5051L8.1812 3.85471C8.7415 3.28337 9.65041 3.28337 10.2107 3.85471C10.771 4.42605 10.7706 5.35216 10.2103 5.9235L4.55802 11.6872"
        stroke="#151E23"
        strokeOpacity="0.15"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Attachment icon — INCOMPLETE tasks (darker, 14×16) ───────────────────────
function AttachmentIconIncomplete() {
  return (
    <svg width="14" height="16" viewBox="0 0 14 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M0.5 7.54918L6.15229 1.78552C7.83319 0.0714946 10.5585 0.0714946 12.2394 1.78552C13.9203 3.49954 13.9201 6.27867 12.2392 7.99269L5.71734 14.6431C4.59674 15.7858 2.7802 15.7856 1.6596 14.6429C0.538995 13.5002 0.53872 11.6478 1.65932 10.5051L8.1812 3.85471C8.7415 3.28337 9.65041 3.28337 10.2107 3.85471C10.771 4.42605 10.7706 5.35216 10.2103 5.9235L4.55802 11.6872"
        stroke="#151E23"
        strokeOpacity="0.3"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Single task row ───────────────────────────────────────────────────────────
interface TaskRowProps {
  task: TaskItem;
  onToggle: () => void;
  disabled?: boolean;
}

function TaskRow({ task, onToggle, disabled }: TaskRowProps) {
  if (disabled) {
    return (
      <div className="flex items-center gap-[6px] w-full text-left">
        {/* Checkbox */}
        <div
          className="shrink-0 flex items-center justify-center"
          style={{
            width: "16px",
            height: "16px",
            background: task.completed ? "transparent" : "#E1E4E8",
            borderRadius: "4px",
            border: task.completed ? "2px solid #41C46D" : "none",
          }}
        >
          {task.completed && (
            <svg width="10" height="7" viewBox="0 0 10 7" fill="none">
              <path d="M1 3.5L3.5 6L9 1" stroke="#41C46D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>

        {/* Task text */}
        <span
          className="flex-1 truncate"
          style={{
            fontFamily: "'PT Sans', sans-serif",
            fontWeight: 400,
            fontSize: task.completed ? "12px" : "14px",
            lineHeight: task.completed ? "16px" : "18px",
            letterSpacing: task.completed ? "-0.2px" : "0.1px",
            color: task.completed ? "#94A3B8" : "#64748B",
            textDecoration: "none",
          }}
        >
          {task.text}
        </span>

        {/* Attachment icon + Time — for completed tasks with hasAttachment */}
        {task.completed && task.hasAttachment && task.completedAt && (
          <div className="flex items-center gap-[6px] shrink-0 ml-auto">
            <span className="shrink-0"><AttachmentIconCompleted /></span>
            <span
              className="shrink-0"
              style={{
                fontFamily: "'PT Sans', sans-serif",
                fontWeight: 400,
                fontSize: "12px",
                lineHeight: "16px",
                letterSpacing: "0.1px",
                color: "#D3D3D3",
                textAlign: "right",
              }}
            >
              {task.completedAt}
            </span>
          </div>
        )}

        {/* Time only — for completed tasks without hasAttachment */}
        {task.completed && !task.hasAttachment && task.completedAt && (
          <span
            className="shrink-0 ml-auto"
            style={{
              fontFamily: "'PT Sans', sans-serif",
              fontWeight: 400,
              fontSize: "12px",
              lineHeight: "16px",
              letterSpacing: "0.1px",
              color: "#D3D3D3",
              textAlign: "right",
            }}
          >
            {task.completedAt}
          </span>
        )}

        {/* Attachment icon only — for incomplete tasks with hasAttachment */}
        {!task.completed && task.hasAttachment && (
          <span className="shrink-0 ml-auto"><AttachmentIconIncomplete /></span>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className="flex items-center gap-[6px] w-full text-left cursor-pointer bg-transparent border-none p-0 outline-none"
      style={{ background: "transparent", border: "none", padding: 0 }}
    >
      {/* Checkbox */}
      <div
        className="shrink-0 flex items-center justify-center"
        style={{
          width: "16px",
          height: "16px",
          background: task.completed ? "transparent" : "#E1E4E8",
          borderRadius: "4px",
          border: task.completed ? "2px solid #41C46D" : "none",
        }}
      >
        {task.completed && (
          <svg width="10" height="7" viewBox="0 0 10 7" fill="none">
            <path d="M1 3.5L3.5 6L9 1" stroke="#41C46D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>

      {/* Task text */}
      <span
        className="flex-1 truncate"
        style={{
          fontFamily: "'PT Sans', sans-serif",
          fontWeight: 400,
          fontSize: task.completed ? "12px" : "14px",
          lineHeight: task.completed ? "16px" : "18px",
          letterSpacing: task.completed ? "-0.2px" : "0.1px",
          color: task.completed ? "#94A3B8" : "#64748B",
          textDecoration: "none",
        }}
      >
        {task.text}
      </span>

      {/* Attachment icon + Time — for completed tasks with hasAttachment */}
      {task.completed && task.hasAttachment && task.completedAt && (
        <div className="flex items-center gap-[6px] shrink-0 ml-auto">
          <span className="shrink-0"><AttachmentIconCompleted /></span>
          <span
            className="shrink-0"
            style={{
              fontFamily: "'PT Sans', sans-serif",
              fontWeight: 400,
              fontSize: "12px",
              lineHeight: "16px",
              letterSpacing: "0.1px",
              color: "#D3D3D3",
              textAlign: "right",
            }}
          >
            {task.completedAt}
          </span>
        </div>
      )}

      {/* Time only — for completed tasks without hasAttachment */}
      {task.completed && !task.hasAttachment && task.completedAt && (
        <span
          className="shrink-0 ml-auto"
          style={{
            fontFamily: "'PT Sans', sans-serif",
            fontWeight: 400,
            fontSize: "12px",
            lineHeight: "16px",
            letterSpacing: "0.1px",
            color: "#D3D3D3",
            textAlign: "right",
          }}
        >
          {task.completedAt}
        </span>
      )}

      {/* Attachment icon only — for incomplete tasks with hasAttachment */}
      {!task.completed && task.hasAttachment && (
        <span className="shrink-0 ml-auto"><AttachmentIconIncomplete /></span>
      )}
    </button>
  );
}

// ── Worker Card ───────────────────────────────────────────────────────────────
interface WorkerCardProps {
  worker: Worker;
  onToggleTask: (workerId: string, taskId: string) => void;
  date?: string;   // e.g. "23/05/26"
  orderId?: string; // e.g. "#484"
  onClick?: () => void;
  disableActions?: boolean;
  onDismiss?: () => void;
}

export function WorkerCard({ worker, onToggleTask, date = "23/05/26", orderId = "#484", onClick, disableActions, onDismiss }: WorkerCardProps) {
  const done = worker.tasks.filter(t => t.completed).length;
  const total = worker.tasks.length;

  return (
    <div
      onClick={onClick}
      style={{
        border: "1px solid #1D4ED8",
        boxShadow:
          "0px 18px 42px -24px rgba(59, 130, 246, 0.55), inset 0px 1px 0px 1px rgba(255, 255, 255, 0.35)",
        borderRadius: "24px",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        cursor: onClick ? "pointer" : "default",
      }}
      className="bg-white/15 md:bg-white/30"
    >
      <style>{`
        @media (max-width: 768px) {
          .wc-inner-card {
            background: #FFFFFF !important;
            border-top: 1px solid rgba(29, 78, 216, 0.15) !important;
            border-bottom: 1px solid rgba(29, 78, 216, 0.15) !important;
            border-left: none !important;
            border-right: none !important;
            border-radius: 0px !important;
            padding: 16px 20px !important;
            box-shadow: none !important;
            margin-left: -20px !important;
            margin-right: -20px !important;
          }
        }
      `}</style>
      {/* ── Row 1: Meta + progress badge ── */}
      <div className="flex items-center justify-between gap-2">
        <span
          style={{
            fontFamily: "'PT Sans', sans-serif",
            fontWeight: 400,
            fontSize: "10px",
            lineHeight: "15px",
            color: "#94A3B8",
            whiteSpace: "nowrap",
          }}
          className="flex-1 min-w-0"
        >
          {worker.name.toUpperCase()} • {date} • {orderId}
        </span>

        {/* Dismiss button (placeholder/deletable cards) */}
        {onDismiss ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
            style={{
              boxSizing: "border-box",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0px",
              width: "36px",
              height: "36px",
              background: "rgba(255, 255, 255, 0.9)",
              border: "1px solid #FFFFFF",
              borderRadius: "12px",
              boxShadow:
                "0px 8px 18px -12px rgba(15, 23, 42, 0.35), inset 0px 1px 0px 1px #FFFFFF",
              cursor: "pointer",
            }}
            className="shrink-0"
            title="Dismiss"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M14.6066 14.6066L7.80336 7.80336M7.80336 7.80336L1 1M7.80336 7.80336L14.6067 1M7.80336 7.80336L1 14.6067"
                stroke="#6D778E"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ) : (
        <div
          style={{
            width: "36px",
            height: "36px",
            background: "#EFF6FF",
            border: "1px solid rgba(29, 78, 216, 0.5)",
            boxShadow: "0px 8px 18px -12px rgba(15, 23, 42, 0.35), inset 0px 1px 0px 1px #FFFFFF",
            borderRadius: "12px",
            display: "flex",
            alignItems: "baseline",
            justifyContent: "center",
            paddingTop: "3px",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontFamily: "'PT Sans', sans-serif",
              color: "#EB1D1D",
              lineHeight: "27.25px"
            }}
            className="text-sm font-normal md:text-xl md:font-bold"
          >
            {done}
          </span>
          <span
            style={{
              fontFamily: "'PT Sans', sans-serif",
              fontWeight: 700,
              fontSize: "14px",
              color: "#5A5A65",
              lineHeight: "27.25px"
            }}
          >
            /{total}
          </span>
        </div>
        )}
      </div>

      {/* ── Row 2: Task title card + task list ── */}
      <div className="flex flex-col gap-3">

        {/* Inner white card */}
        <div
          className="wc-inner-card"
          style={{
            background: "rgba(255, 255, 255, 0.95)",
            border: "1px solid #FFFFFF",
            boxShadow: "0px 0px 6px rgba(59, 130, 246, 0.05)",
            borderRadius: "21.6px",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "2px",
          }}
        >
          <p
            style={{
              fontFamily: "'PT Sans', sans-serif",
              fontSize: "16px",
              lineHeight: "20px",
              color: "#0F172A",
            }}
            className="font-semibold"
          >
            {worker.currentTask.slice(0, 35) + (worker.currentTask.length > 35 ? "..." : "")}
          </p>
          <p
            style={{
              fontFamily: "'PT Sans', sans-serif",
              fontWeight: 400,
              fontSize: "14px",
              lineHeight: "18px",
              color: "#465467",
              marginTop: "2px",
            }}
          >
            {(() => {
              const sub = `${worker.location ?? "Ljubljana"} • ${worker.role}`;
              return sub.slice(0, 100) + (sub.length > 100 ? "..." : "");
            })()}
          </p>
        </div>

        {/* Task list */}
        <div
          style={{
            paddingTop: "12px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          {(() => {
            const completedTasks = worker.tasks.filter(t => t.completed);
            const uncompletedTasks = worker.tasks.filter(t => !t.completed);

            return (
              <>
                {/* Completed task (max 1, most recent) */}
                {completedTasks.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    {completedTasks.slice(-1).map(task => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        onToggle={() => onToggleTask(worker.id, task.id)}
                        disabled={disableActions}
                      />
                    ))}
                  </div>
                )}

                {/* Incomplete tasks (max 2) with 8px gap */}
                {uncompletedTasks.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                      paddingBottom: "12px",
                    }}
                  >
                    {uncompletedTasks.slice(0, 2).map(task => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        onToggle={() => onToggleTask(worker.id, task.id)}
                        disabled={disableActions}
                      />
                    ))}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
