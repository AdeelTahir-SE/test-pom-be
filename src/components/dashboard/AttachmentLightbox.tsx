"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Paperclip, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

export type AttachmentLightboxItem = {
  url: string;
  fileName: string;
  attachmentType?: string | null;
};

type AttachmentLightboxProps = {
  item: AttachmentLightboxItem | null;
  onClose: () => void;
};

function isImageName(name: string, type?: string | null) {
  return (
    type === "image" ||
    /\.(jpe?g|png|gif|webp|heic|bmp)$/i.test(name)
  );
}

function isPdfName(name: string, type?: string | null) {
  return type === "pdf" || /\.pdf$/i.test(name);
}

function isOfficeName(name: string) {
  return /\.(docx?|xlsx?|pptx?)$/i.test(name);
}

function isAudioName(name: string, type?: string | null) {
  return (
    type === "audio" ||
    /\.(mp3|wav|ogg|m4a|aac|flac|webm)$/i.test(name)
  );
}

function isVideoName(name: string, type?: string | null) {
  return (
    type === "video" ||
    /\.(mp4|webm|ogv|mov|avi|mkv|3gp)$/i.test(name)
  );
}

function isLocalUrl(urlStr: string) {
  try {
    const parsed = new URL(urlStr);
    return (
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname.startsWith("192.168.") ||
      parsed.hostname.startsWith("10.") ||
      parsed.hostname.startsWith("172.16.")
    );
  } catch {
    return true;
  }
}

/**
 * Full-size in-app attachment preview (Mark a16 #2).
 * Enlargeable popup — no download. Images zoom; PDF/Office inline when possible.
 */
export function AttachmentLightbox({ item, onClose }: AttachmentLightboxProps) {
  const [zoom, setZoom] = useState(1);
  const open = !!item;

  useEffect(() => {
    if (open) setZoom(1);
  }, [open, item?.url]);

  const zoomIn = useCallback(() => {
    setZoom((z) => Math.min(3, Math.round((z + 0.25) * 100) / 100));
  }, []);
  const zoomOut = useCallback(() => {
    setZoom((z) => Math.max(0.5, Math.round((z - 0.25) * 100) / 100));
  }, []);
  const zoomReset = useCallback(() => setZoom(1), []);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="!w-[90vw] !max-w-[90vw] sm:!max-w-[90vw] !h-[90vh] outline-none mx-auto p-0 bg-[#0b1220]/92 border-none shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {item && (
          <>
            <div className="shrink-0 flex items-center gap-2 px-3 py-2.5 bg-[#0b1220] text-white">
              <span className="text-[13px] font-medium truncate flex-1 pl-1">
                {item.fileName || "Predogled"}
              </span>
              {isImageName(item.fileName, item.attachmentType) && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={zoomOut}
                    className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center border-none cursor-pointer text-white"
                    title="Pomanjšaj"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={zoomReset}
                    className="min-w-10 h-8 px-2 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-semibold border-none cursor-pointer text-white"
                    title="Ponastavi"
                  >
                    {Math.round(zoom * 100)}%
                  </button>
                  <button
                    type="button"
                    onClick={zoomIn}
                    className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center border-none cursor-pointer text-white"
                    title="Povečaj"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoom(2)}
                    className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center border-none cursor-pointer text-white"
                    title="Večje"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center border-none cursor-pointer text-white shrink-0"
                title="Zapri"
              >
                <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M1 1L13 13M1 13L13 1"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-auto bg-[#111827] flex items-center justify-center p-2 sm:p-4">
              {(() => {
                const { url, fileName, attachmentType } = item;

                if (isImageName(fileName, attachmentType)) {
                  return (
                    <img
                      src={url}
                      alt={fileName}
                      draggable={false}
                      style={{
                        transform: `scale(${zoom})`,
                        transformOrigin: "center center",
                        transition: "transform 120ms ease-out",
                      }}
                      className="w-full h-full object-contain rounded-md shadow-2xl select-none"
                      onDoubleClick={() =>
                        setZoom((z) => (z >= 1.5 ? 1 : 2))
                      }
                    />
                  );
                }

                if (isPdfName(fileName, attachmentType)) {
                  return (
                    <iframe
                      src={url}
                      title={fileName}
                      className="w-full h-full min-h-[70vh] rounded-md border-none bg-white shadow-2xl"
                    />
                  );
                }

                if (isOfficeName(fileName) && !isLocalUrl(url)) {
                  return (
                    <iframe
                      src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`}
                      title={fileName}
                      className="w-full h-full min-h-[70vh] rounded-md border-none bg-white shadow-2xl"
                    />
                  );
                }

                if (isAudioName(fileName, attachmentType)) {
                  return (
                    <div className="w-full max-w-md p-6 rounded-2xl bg-white border border-slate-100 flex flex-col items-center justify-center gap-4 shadow-2xl">
                      <div className="w-16 h-16 rounded-full bg-[#EFF6FF] flex items-center justify-center text-[#1B3A6B]">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                        </svg>
                      </div>
                      <audio controls className="w-full mt-2" src={url} autoPlay>
                        Your browser does not support the audio element.
                      </audio>
                    </div>
                  );
                }

                if (isVideoName(fileName, attachmentType)) {
                  return (
                    <video
                      controls
                      className="max-w-full max-h-full rounded-lg bg-black shadow-2xl"
                      src={url}
                      autoPlay
                    >
                      Your browser does not support the video tag.
                    </video>
                  );
                }

                return (
                  <div className="w-full max-w-md p-8 rounded-2xl bg-white border border-slate-200 flex flex-col items-center justify-center gap-3 text-center shadow-2xl">
                    <Paperclip className="w-14 h-14 text-slate-400" />
                    <span className="text-sm text-slate-800 font-semibold truncate max-w-[90%]">
                      {fileName}
                    </span>
                    <span className="text-xs text-slate-500 font-light leading-relaxed">
                      Predogled za to vrsto datoteke ni na voljo. Prenos ni
                      omogočen — uporabite e-pošto, če potrebujete kopijo.
                    </span>
                  </div>
                );
              })()}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
