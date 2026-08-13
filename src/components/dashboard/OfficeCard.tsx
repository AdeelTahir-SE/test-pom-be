"use client";

import React, { useCallback, useId, useRef, useState } from "react";
import type { Message } from "@/lib/types/messages";
import { api } from "@/lib/api-client";

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
  iconType?: "mic" | "document";
  showRedButton?: boolean;
  /** When set (and length > 0), render replies under the same box. */
  thread?: OfficeCardThreadItem[];
}

function SpeakerIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M11 5L6 9H2v6h4l5 4V5z"
        fill="#3B82F6"
      />
      <path
        d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14"
        stroke="#3B82F6"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MessageTypeIcon({ type }: { type: "glasovno" | "tekst" | "document" }) {
  const clipId = useId();

  if (type === "document") {
    return (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g clipPath={`url(#${clipId})`}>
          <path d="M16.5 7.875V9C16.5 12.5355 16.5 14.3032 15.4012 15.4012C14.304 16.5 12.5355 16.5 9 16.5C5.4645 16.5 3.69675 16.5 2.598 15.4012C1.5 14.304 1.5 12.5355 1.5 9C1.5 5.4645 1.5 3.69675 2.598 2.598C3.6975 1.5 5.4645 1.5 9 1.5H10.125" stroke="#3B82F6" strokeWidth="1.125" strokeLinecap="round"/>
          <path d="M12.4885 2.59134L12.9753 2.10459C13.7818 1.29832 15.0892 1.29849 15.8954 2.10497C16.7017 2.91144 16.7015 4.21882 15.895 5.02509L15.4075 5.51184M12.4885 2.59209C11.5765 3.50484 12.5493 3.62634 13.462 4.53834C14.374 5.45109 15.4083 5.51184 15.4083 5.51184M12.4885 2.59209L8.01479 7.06509C7.71179 7.36809 7.56029 7.51959 7.42979 7.68684C7.27579 7.88434 7.14479 8.09634 7.03679 8.32284C6.94604 8.51409 6.87854 8.71734 6.74279 9.12384L6.30854 10.4251M15.4083 5.51109L10.9345 9.98484C10.6315 10.2878 10.48 10.4393 10.3128 10.5698C10.1157 10.7235 9.9024 10.8553 9.67679 10.9628C9.48554 11.0536 9.28229 11.1211 8.87579 11.2568L7.57454 11.6911M7.57454 11.6911L6.73229 11.9716C6.53204 12.0387 6.31108 11.9866 6.16182 11.8372C6.01257 11.6878 5.96075 11.4668 6.02804 11.2666L6.30854 10.4251M7.57454 11.6911L6.30854 10.4251" stroke="#3B82F6" strokeWidth="1.125"/>
        </g>
        <defs>
          <clipPath id={clipId}>
            <rect width="18" height="18" fill="white"/>
          </clipPath>
        </defs>
      </svg>
    );
  }
  if (type === "tekst") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
          stroke="#3B82F6"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return <SpeakerIcon />;
}

function typeLabel(type: "glasovno" | "tekst", iconType: "mic" | "document"): string {
  if (iconType === "document") return "Sporočilo";
  return type === "glasovno" ? "Glasovno sporočilo" : "Tekstovno sporočilo";
}

function VoicePlayButton({
  attachmentId,
  active,
  loading,
  onToggle,
}: {
  attachmentId: string;
  active: boolean;
  loading: boolean;
  onToggle: (attachmentId: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle(attachmentId);
      }}
      disabled={loading}
      title="Predvajaj posnetek"
      aria-label="Predvajaj posnetek"
      style={{
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "32px",
        height: "32px",
        background: active ? "#DBEAFE" : "#EFF6FF",
        border: active
          ? "1px solid rgba(59, 130, 246, 0.55)"
          : "0.5px solid rgba(29, 78, 216, 0.3)",
        borderRadius: "12px",
        flexShrink: 0,
        cursor: loading ? "wait" : "pointer",
        padding: 0,
      }}
    >
      {loading ? (
        <span
          className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"
          aria-hidden
        />
      ) : (
        <SpeakerIcon />
      )}
    </button>
  );
}

export function OfficeCard({
  message,
  onDismiss,
  onReply,
  iconType = "mic",
  showRedButton = false,
  thread,
}: OfficeCardProps) {
  const urgentClipId = useId();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [playError, setPlayError] = useState<string | null>(null);
  const [errorAttachmentId, setErrorAttachmentId] = useState<string | null>(
    null
  );
  const urlCacheRef = useRef<Map<string, string>>(new Map());

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
          } satisfies OfficeCardThreadItem,
        ];

  const stopPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingId(null);
    setAudioUrl(null);
  }, []);

  const toggleVoicePlay = useCallback(
    async (attachmentId: string) => {
      setPlayError(null);
      setErrorAttachmentId(null);
      if (playingId === attachmentId) {
        stopPlayback();
        return;
      }

      stopPlayback();
      setLoadingId(attachmentId);
      try {
        let url = urlCacheRef.current.get(attachmentId) ?? null;
        if (!url) {
          const res = await api.get<{
            file: { signed_url: string | null };
          }>(`/api/files/${attachmentId}`);
          url = res.data?.file?.signed_url ?? null;
          if (res.status !== 200 || !url) {
            setErrorAttachmentId(attachmentId);
            setPlayError(
              res.error?.message ?? "Posnetka ni bilo mogoče predvajati."
            );
            return;
          }
          urlCacheRef.current.set(attachmentId, url);
        }
        setAudioUrl(url);
        setPlayingId(attachmentId);
      } catch {
        setErrorAttachmentId(attachmentId);
        setPlayError("Napaka pri predvajanju posnetka.");
      } finally {
        setLoadingId(null);
      }
    },
    [playingId, stopPlayback]
  );

  return (
    <div
      style={{
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        padding: "20px",
        gap: "20px",
        width: "100%",
        height: "auto",
        minHeight: "224px",
        background: "linear-gradient(180deg, #F8F2E9 0%, #F8F2E9 100%)",
        border: "1px solid #1D4ED8",
        boxShadow:
          "0px 18px 42px -24px rgba(59, 130, 246, 0.55), inset 0px 1px 0px 1px rgba(255, 255, 255, 0.35)",
        borderRadius: "24px",
        position: "relative",
        isolation: "isolate",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: "56.56%",
          right: "-19.6%",
          top: "-34.37%",
          bottom: "51.41%",
          borderRadius: "9999px",
          background: "radial-gradient(circle, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 70%)",
          filter: "blur(20px)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div className="relative z-10 flex w-full items-center justify-between gap-2">
        <span
          style={{
            fontFamily: "'PT Sans', sans-serif",
            fontWeight: 400,
            lineHeight: "15px",
            color: "rgba(70, 84, 103, 0.5)",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
            width: "180px",
          }}
          className="text-xs md:text-sm shrink-0"
        >
          {message.workerName} • {message.time}
        </span>

        <div className="flex items-center gap-2 shrink-0">
          {showRedButton && (
            <div
              style={{
                boxSizing: "border-box",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                padding: "0px",
                width: "34px",
                height: "34px",
                background: "transparent",
                border: "none",
              }}
            >
              <svg width="34" height="34" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="1" y="1" width="32" height="32" rx="16" fill="white"/>
                <g clipPath={`url(#${urgentClipId})`}>
                  <path d="M17 0C7.61175 0 0 7.61175 0 17C0 26.3883 7.61175 34 17 34C26.3883 34 34 26.3883 34 17C34 7.61175 26.3883 0 17 0ZM15.0861 9.19842C14.9727 8.06367 15.8653 7.08333 17 7.08333C18.1348 7.08333 19.0273 8.06367 18.9139 9.19842C18.4708 13.6299 18.2223 16.1144 17.7792 20.5459C17.7381 20.9454 17.4023 21.25 17 21.25C16.5977 21.25 16.2619 20.9454 16.2208 20.5445L15.0861 9.19842ZM17 27.2708C16.0225 27.2708 15.2292 26.4775 15.2292 25.5C15.2292 24.5225 16.0225 23.7292 17 23.7292C17.9775 23.7292 18.7708 24.5225 18.7708 25.5C18.7708 26.4775 17.9775 27.2708 17 27.2708Z" fill="#FF0000"/>
                </g>
                <defs>
                  <clipPath id={urgentClipId}>
                    <rect width="34" height="34" fill="white"/>
                  </clipPath>
                </defs>
              </svg>
            </div>
          )}

          {onReply && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onReply();
              }}
              type="button"
              style={{
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                padding: "0px",
                width: "36px",
                height: "36px",
                background: "rgba(255, 255, 255, 0.9)",
                border: "0.5px solid rgba(29, 78, 216, 0.3)",
                borderRadius: "12px",
                boxShadow:
                  "0px 8px 18px -12px rgba(15, 23, 42, 0.35), inset 0px 1px 0px 1px #FFFFFF",
                cursor: "pointer",
              }}
              title="Odgovori"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
            </button>
          )}

          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDismiss();
            }}
            type="button"
            style={{
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              padding: "0px",
              width: "36px",
              height: "36px",
              background: "rgba(255, 255, 255, 0.9)",
              border: "0.5px solid rgba(29, 78, 216, 0.3)",
              borderRadius: "12px",
              boxShadow:
                "0px 8px 18px -12px rgba(15, 23, 42, 0.35), inset 0px 1px 0px 1px #FFFFFF",
              cursor: "pointer",
            }}
            title="Zapri"
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
        </div>
      </div>

      <div
        role={onReply ? "button" : undefined}
        tabIndex={onReply ? 0 : undefined}
        onClick={(e) => {
          if (!onReply) return;
          e.preventDefault();
          onReply();
        }}
        onKeyDown={(e) => {
          if (!onReply) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onReply();
          }
        }}
        style={{
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          padding: "16px 16px 24px 16px",
          gap: "16px",
          width: "100%",
          height: "auto",
          minHeight: "126px",
          background: "rgba(255, 255, 255, 0.95)",
          border: "0.7px solid rgba(29, 78, 216, 0.3)",
          borderRadius: "21.6px",
          boxShadow:
            "0px 12px 28px -18px rgba(15, 23, 42, 0.26), inset 0px 1px 0px 1px #FFFFFF",
          zIndex: 1,
          position: "relative",
          cursor: onReply ? "pointer" : undefined,
        }}
      >
        <p
          style={{
            fontFamily: "'PT Sans', sans-serif",
            fontSize: "16px",
            lineHeight: "22px",
            color: "#1C1A1A",
            marginBottom: "0",
          }}
          className="font-semibold"
        >
          {message.targetTask || "Brez opravila"}
        </p>

        {threadItems.map((item, index) => {
          const isVoice = item.type === "glasovno" && iconType !== "document";
          const canPlay = isVoice && !!item.attachmentId;
          const isThisPlaying = !!(
            item.attachmentId && playingId === item.attachmentId
          );

          return (
            <div
              key={`${item.id}-${index}`}
              className="w-full"
              style={{ marginTop: index === 0 ? 0 : 4 }}
            >
              <div className="flex items-start gap-[12px] w-full">
                {canPlay ? (
                  <VoicePlayButton
                    attachmentId={item.attachmentId!}
                    active={isThisPlaying}
                    loading={loadingId === item.attachmentId}
                    onToggle={toggleVoicePlay}
                  />
                ) : (
                  <div
                    style={{
                      boxSizing: "border-box",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "32px",
                      height: "32px",
                      background: "#EFF6FF",
                      border: "0.5px solid rgba(29, 78, 216, 0.3)",
                      borderRadius: "12px",
                      flexShrink: 0,
                    }}
                  >
                    <MessageTypeIcon
                      type={iconType === "document" ? "document" : item.type}
                    />
                  </div>
                )}
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontWeight: 300,
                      lineHeight: "18px",
                      color: "#465467",
                    }}
                    className="text-xs md:text-sm"
                  >
                    {typeLabel(item.type, iconType)}
                  </span>
                  <span
                    style={{
                      fontFamily: "'PT Sans', sans-serif",
                      fontWeight: 400,
                      lineHeight: "15px",
                      color: "rgba(70, 84, 103, 0.5)",
                      textTransform: "uppercase",
                    }}
                    className="text-[10px] md:text-xs"
                  >
                    {item.senderLabel} • {item.time}
                  </span>
                </div>
              </div>
              {/* Transcript / text stays intact; play is on top (Mark a16 #3). */}
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 300,
                  lineHeight: "18px",
                  color: "#465467",
                  marginTop: "8px",
                  width: "100%",
                }}
                className="text-xs md:text-sm"
              >
                {item.text}
              </p>
              {isThisPlaying && audioUrl && (
                <div
                  className="mt-2 w-full"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  <audio
                    ref={(el) => {
                      audioRef.current = el;
                    }}
                    key={audioUrl}
                    src={audioUrl}
                    controls
                    autoPlay
                    className="w-full h-9"
                    onEnded={stopPlayback}
                  />
                </div>
              )}
              {canPlay &&
                playError &&
                errorAttachmentId === item.attachmentId && (
                  <p className="mt-1 text-[11px] text-red-600 font-medium">
                    {playError}
                  </p>
                )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
