"use client";

import React, { useCallback, useRef, useState } from "react";
import { api } from "@/lib/api-client";
import { Mic } from "lucide-react";
import { useLanguage } from "@/lib/useLanguage";

const signedUrlCache = new Map<string, string>();

export function SpeakerIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path d="M11 5L6 9H2v6h4l5 4V5z" fill="#3B82F6" />
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

export function VoicePlayButton({
  active,
  loading,
  onToggle,
  className,
  title = "Predvajaj posnetek",
}: {
  active: boolean;
  loading: boolean;
  onToggle: (event?: React.MouseEvent) => void;
  className?: string;
  title?: string;
}) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-row items-center justify-between pb-1 border-b border-emerald-100 border-dashed">
      <div className="flex items-center justify-center gap-1.5">
        <Mic className="w-2.5 h-2.5 text-emerald-400 animate-pulse" />
        <span className="text-[8px] font-bold tracking-wider text-emerald-300 uppercase">{t("workerAiTranscriptTag")}</span>
      </div>

      <button
        type="button"
        onClick={onToggle}
        disabled={loading}
        title={title}
        aria-label={title}
        className={className}
        style={{
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "32px",
          height: "32px",
          background: active ? "#DBEAFE" : "#EFF6FF",
          border: active ? "1px solid rgba(59, 130, 246, 0.55)" : "0.5px solid rgba(29, 78, 216, 0.3)",
          borderRadius: "12px",
          flexShrink: 0,
          cursor: loading ? "wait" : "pointer",
          padding: 0,
        }}
      >
        {loading ? <span className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" aria-hidden /> : <SpeakerIcon />}
      </button>
    </div>
  );
}

export function useVoicePlaybackController() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorAttachmentId, setErrorAttachmentId] = useState<string | null>(null);

  const stopPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingId(null);
    setAudioUrl(null);
  }, []);

  const togglePlayback = useCallback(
    async (attachmentId: string, event?: React.MouseEvent) => {
      event?.preventDefault();
      event?.stopPropagation();
      setError(null);
      setErrorAttachmentId(null);

      if (playingId === attachmentId) {
        stopPlayback();
        return;
      }

      stopPlayback();
      setLoadingId(attachmentId);
      try {
        let url = signedUrlCache.get(attachmentId) ?? null;
        if (!url) {
          const res = await api.get<{
            file: { signed_url: string | null };
          }>(`/api/files/${attachmentId}`);
          url = res.data?.file?.signed_url ?? null;
          if (res.status !== 200 || !url) {
            setErrorAttachmentId(attachmentId);
            setError(res.error?.message ?? "Posnetka ni bilo mogoče predvajati.");
            return;
          }
          signedUrlCache.set(attachmentId, url);
        }
        setAudioUrl(url);
        setPlayingId(attachmentId);
      } catch {
        setErrorAttachmentId(attachmentId);
        setError("Napaka pri predvajanju posnetka.");
      } finally {
        setLoadingId(null);
      }
    },
    [playingId, stopPlayback]
  );

  return {
    audioRef,
    playingId,
    audioUrl,
    loadingId,
    error,
    errorAttachmentId,
    stopPlayback,
    togglePlayback,
  };
}

interface VoiceMessagePlayerProps {
  attachmentId: string;
  className?: string;
  buttonClassName?: string;
  audioClassName?: string;
  errorClassName?: string;
  title?: string;
}

export function VoiceMessagePlayer({
  attachmentId,
  className,
  buttonClassName,
  audioClassName,
  errorClassName,
  title = "Predvajaj posnetek",
}: VoiceMessagePlayerProps) {
  const playback = useVoicePlaybackController();
  const isOpen = playback.playingId === attachmentId;

  return (
    <div className={className}>
      <VoicePlayButton
        active={isOpen}
        loading={playback.loadingId === attachmentId}
        onToggle={(event) => playback.togglePlayback(attachmentId, event)}
        className={buttonClassName}
        title={title}
      />
      {isOpen && playback.audioUrl && (
        <div
          className="mt-2 w-full"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
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
            className={audioClassName ?? "w-full h-9"}
            onEnded={playback.stopPlayback}
          />
        </div>
      )}
      {playback.error && playback.errorAttachmentId === attachmentId && (
        <p className={errorClassName ?? "mt-1 text-[11px] font-medium text-red-600"}>
          {playback.error}
        </p>
      )}
    </div>
  );
}
