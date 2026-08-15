"use client";

import React from "react";
import type { Message } from "@/lib/types/messages";
import {
  SpeakerIcon,
  useVoicePlaybackController,
} from "@/components/dashboard/VoiceMessagePlayer";
import {
  AlertCircle,
  FilePenLine,
  LoaderCircle,
  MessageCircle,
  X,
} from "lucide-react";

export interface OfficeCardThreadItem {
  id: string;
  senderLabel: string;
  text: string;
  time: string;
  type: "glasovno" | "tekst";
  /** job_files id for voice playback (Mark a16 #3). */
  attachmentId?: string | null;
}

interface OfficeCardProps {
  message: Message;
  onDismiss: () => void;
  onReply?: () => void;
  /**
   * When true, reply stays visible but is not actionable (Mark a16 #4).
   * Click still calls onReplyBlocked (toast) — never hide controls.
   */
  replyLocked?: boolean;
  onReplyBlocked?: () => void;
  iconType?: "mic" | "document";
  showRedButton?: boolean;
  /** When set (and length > 0), render replies under the same box. */
  thread?: OfficeCardThreadItem[];
}

function MessageTypeIcon({ type }: { type: "glasovno" | "tekst" | "document" }) {
  if (type === "document") {
    return <FilePenLine className="h-4 w-4 text-blue-600" aria-hidden />;
  }
  if (type === "tekst") {
    return <MessageCircle className="h-4 w-4 text-blue-600" aria-hidden />;
  }
  return <SpeakerIcon />;
}

function typeLabel(type: "glasovno" | "tekst", iconType: "mic" | "document"): string {
  if (iconType === "document") return "Sporočilo";
  return type === "glasovno" ? "Glasovno sporočilo" : "Tekstovno sporočilo";
}

function iconButtonClass(isActive = false) {
  return [
    "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
    isActive
      ? "border-blue-300 bg-blue-100 text-blue-700"
      : "border-slate-200 bg-white text-slate-500 shadow-sm hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700",
  ].join(" ");
}

export function OfficeCard({
  message,
  onDismiss,
  onReply,
  replyLocked = false,
  onReplyBlocked,
  iconType = "mic",
  showRedButton = false,
  thread,
}: OfficeCardProps) {
  const playback = useVoicePlaybackController();

  const threadItems =
    thread && thread.length > 0
      ? thread
      : [
          {
            id: message.id,
            senderLabel: message.workerName,
            text: message.text,
            time: message.time,
            type: message.type,
            attachmentId: message.attachmentId ?? null,
          } satisfies OfficeCardThreadItem,
        ];

  return (
    <article className="relative w-full overflow-hidden rounded-lg border border-blue-200 bg-[#F9F4EC] p-4 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.55)]">
      <div className="flex w-full items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold uppercase tracking-normal text-slate-500">
            {message.workerName} • {message.time}
          </p>
          <h3 className="mt-1 line-clamp-2 text-base font-semibold leading-5 text-slate-950">
            {message.targetTask || "Brez opravila"}
          </h3>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {showRedButton && (
            <span
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 bg-white text-red-600 shadow-sm"
              title="Nujno"
              aria-label="Nujno"
            >
              <AlertCircle className="h-4 w-4" aria-hidden />
            </span>
          )}

          {onReply && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (replyLocked) {
                  onReplyBlocked?.();
                  return;
                }
                onReply();
              }}
              type="button"
              className={`${iconButtonClass()} ${replyLocked ? "opacity-55" : ""}`}
              title={
                replyLocked
                  ? "Komunikacija je mogoča samo za današnji dan."
                  : "Odgovori"
              }
            >
              <MessageCircle className="h-4 w-4" aria-hidden />
            </button>
          )}

          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDismiss();
            }}
            type="button"
            className={iconButtonClass()}
            title="Zapri"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>

      <div
        role={onReply ? "button" : undefined}
        tabIndex={onReply ? 0 : undefined}
        onClick={(e) => {
          if (!onReply) return;
          e.preventDefault();
          if (replyLocked) {
            onReplyBlocked?.();
            return;
          }
          onReply();
        }}
        onKeyDown={(e) => {
          if (!onReply) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (replyLocked) {
              onReplyBlocked?.();
              return;
            }
            onReply();
          }
        }}
        className={`mt-4 flex w-full flex-col gap-3 rounded-lg border border-blue-100 bg-white/95 p-3 shadow-sm ${
          onReply
            ? replyLocked
              ? "cursor-not-allowed"
              : "cursor-pointer hover:border-blue-200 hover:bg-white"
            : ""
        }`}
      >
        {threadItems.map((item, index) => {
          const isVoice = item.type === "glasovno" && iconType !== "document";
          const canPlay = isVoice && !!item.attachmentId;
          const isThisPlaying = !!(
            item.attachmentId && playback.playingId === item.attachmentId
          );

          return (
            <div
              key={`${item.id}-${index}`}
              className={`w-full ${
                index > 0 ? "border-t border-slate-100 pt-3" : ""
              }`}
            >
              <div className="flex w-full items-start gap-3">
                <div className="pt-0.5">
                  {canPlay ? (
                    <button
                      type="button"
                      className={iconButtonClass(isThisPlaying)}
                      disabled={playback.loadingId === item.attachmentId}
                      title="Predvajaj posnetek"
                      aria-label="Predvajaj posnetek"
                      onClick={(event) =>
                        playback.togglePlayback(item.attachmentId!, event)
                      }
                    >
                      {playback.loadingId === item.attachmentId ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
                      ) : (
                        <SpeakerIcon />
                      )}
                    </button>
                  ) : (
                    <span
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-blue-100 bg-blue-50"
                      aria-hidden
                    >
                      <MessageTypeIcon
                        type={iconType === "document" ? "document" : item.type}
                      />
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="text-sm font-medium leading-5 text-slate-700">
                      {typeLabel(item.type, iconType)}
                    </span>
                    <span className="text-[11px] font-semibold uppercase tracking-normal text-slate-400">
                      {item.senderLabel} • {item.time}
                    </span>
                  </div>

                  <p className="mt-1 text-sm font-normal leading-5 text-slate-600">
                    {item.text}
                  </p>

                  {isThisPlaying && playback.audioUrl && (
                    <div
                      className="mt-3 w-full"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                    >
                      <audio
                        ref={(el) => {
                          playback.audioRef.current = el;
                        }}
                        key={playback.audioUrl}
                        src={playback.audioUrl}
                        controls
                        autoPlay
                        className="h-9 w-full"
                        onEnded={playback.stopPlayback}
                      />
                    </div>
                  )}

                  {canPlay &&
                    playback.error &&
                    playback.errorAttachmentId === item.attachmentId && (
                      <p className="mt-2 text-[11px] font-medium text-red-600">
                        {playback.error}
                      </p>
                    )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}
