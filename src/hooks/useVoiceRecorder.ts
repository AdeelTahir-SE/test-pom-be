"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type VoiceRecorderState = "idle" | "recording" | "paused" | "saving";

interface UseVoiceRecorderOptions {
  maxSeconds: number;
  onComplete: (blob: Blob, mimeType: string) => Promise<void> | void;
  onError?: (error: unknown) => void;
}

function preferredAudioMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) {
    return undefined;
  }
  for (const type of ["audio/webm;codecs=opus", "audio/webm"]) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return undefined;
}

export function useVoiceRecorder({
  maxSeconds,
  onComplete,
  onError,
}: UseVoiceRecorderOptions) {
  const [state, setState] = useState<VoiceRecorderState>("idle");
  const [seconds, setSeconds] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const activeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedSecondsRef = useRef(0);
  const startingRef = useRef(false);
  const finishRef = useRef<() => void>(() => {});
  const completeRef = useRef(onComplete);
  const errorRef = useRef(onError);

  useEffect(() => {
    completeRef.current = onComplete;
    errorRef.current = onError;
  }, [onComplete, onError]);

  const stopActiveTimer = useCallback(() => {
    if (activeTimerRef.current) {
      clearInterval(activeTimerRef.current);
      activeTimerRef.current = null;
    }
  }, []);

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const resetRecorder = useCallback(() => {
    stopActiveTimer();
    recorderRef.current = null;
    chunksRef.current = [];
    elapsedSecondsRef.current = 0;
    setSeconds(0);
    setState("idle");
  }, [stopActiveTimer]);

  const startActiveTimer = useCallback(() => {
    if (activeTimerRef.current) return;
    activeTimerRef.current = setInterval(() => {
      elapsedSecondsRef.current += 1;
      const next = elapsedSecondsRef.current;
      setSeconds(next);
      if (next >= maxSeconds) {
        finishRef.current();
      }
    }, 1000);
  }, [maxSeconds]);

  const finish = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    stopActiveTimer();
    setState("saving");
    try {
      recorder.stop();
    } catch (error) {
      stopTracks();
      resetRecorder();
      errorRef.current?.(error);
    }
  }, [resetRecorder, stopActiveTimer, stopTracks]);

  useEffect(() => {
    finishRef.current = finish;
  }, [finish]);

  const start = useCallback(async () => {
    if (state !== "idle" || startingRef.current) return;
    startingRef.current = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = preferredAudioMimeType();
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined
      );
      recorderRef.current = recorder;
      chunksRef.current = [];
      elapsedSecondsRef.current = 0;
      setSeconds(0);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        stopActiveTimer();
        stopTracks();
        const blobType = recorder.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: blobType });
        if (blob.size === 0) {
          resetRecorder();
          errorRef.current?.(new Error("empty-audio"));
          return;
        }
        setState("saving");
        try {
          await completeRef.current(blob, blobType);
        } catch (error) {
          errorRef.current?.(error);
        } finally {
          resetRecorder();
        }
      };

      recorder.start();
      setState("recording");
      startActiveTimer();
    } catch (error) {
      stopTracks();
      resetRecorder();
      errorRef.current?.(error);
    } finally {
      startingRef.current = false;
    }
  }, [resetRecorder, startActiveTimer, state, stopActiveTimer, stopTracks]);

  const pause = useCallback(() => {
    const recorder = recorderRef.current;
    if (state !== "recording" || !recorder || recorder.state !== "recording") return;
    if (typeof recorder.pause !== "function") return;
    recorder.pause();
    stopActiveTimer();
    setState("paused");
  }, [state, stopActiveTimer]);

  const resume = useCallback(() => {
    const recorder = recorderRef.current;
    if (state !== "paused" || !recorder || recorder.state !== "paused") return;
    if (typeof recorder.resume !== "function") return;
    recorder.resume();
    setState("recording");
    startActiveTimer();
  }, [startActiveTimer, state]);

  useEffect(() => {
    return () => {
      stopActiveTimer();
      const recorder = recorderRef.current;
      if (recorder) {
        recorder.ondataavailable = null;
        recorder.onstop = null;
        if (recorder.state !== "inactive") {
          try {
            recorder.stop();
          } catch {
            // Recorder is already stopping; tracks are still cleaned below.
          }
        }
      }
      stopTracks();
    };
  }, [stopActiveTimer, stopTracks]);

  return {
    state,
    seconds,
    isRecording: state === "recording" || state === "paused" || state === "saving",
    isSaving: state === "saving",
    isPaused: state === "paused",
    canPause: typeof recorderRef.current?.pause === "function",
    start,
    pause,
    resume,
    finish,
  };
}
