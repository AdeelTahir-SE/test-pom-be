"use client";

import React, { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Paperclip } from "lucide-react";
import { AuraFileInput } from "./AuraForm";
import { useLanguage } from "@/lib/useLanguage";
import { api } from "@/lib/api-client";

interface AttachmentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** The target type: 'job' or 'reminder'. Not required in stage-only mode. */
  targetType?: 'job' | 'reminder';
  /** The ID of the job or reminder to upload the file to. Not required in stage-only mode. */
  targetId?: string;
  /** Optional checklist item ID to associate the file with (only for jobs) */
  checklistItemId?: string | null;
  /** Callback called after successful upload */
  onUploadSuccess?: () => void;
  /**
   * Stage-only mode: instead of uploading immediately (used when the parent
   * record — e.g. a reminder being created — doesn't exist yet), just hand
   * the picked File back to the caller via onFileSelected and close.
   */
  stageOnly?: boolean;
  onFileSelected?: (file: File) => void;
}

export function AttachmentDialog({
  isOpen,
  onOpenChange,
  targetType,
  targetId,
  checklistItemId = null,
  onUploadSuccess,
  stageOnly = false,
  onFileSelected,
}: AttachmentDialogProps) {
  const { t } = useLanguage();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    if (stageOnly) {
      onFileSelected?.(file);
      setFile(null);
      onOpenChange(false);
      return;
    }

    if (!targetType || !targetId) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("files", file);
      if (checklistItemId) {
        formData.append("checklist_item_id", checklistItemId);
      }

      const endpoint = targetType === 'job'
        ? `/api/jobs/${targetId}/files`
        : `/api/office-reminders/${targetId}/files`;

      const res = await api.post(endpoint, formData);
      if (res.status >= 200 && res.status < 300) {
        setFile(null);
        onOpenChange(false);
        onUploadSuccess?.();
      } else {
        alert(res.error?.message || "Upload failed");
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        onOpenChange(open);
        if (!open) {
          setFile(null);
        }
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="w-full max-w-[calc(100%-2rem)] min-[450px]:w-[450px] outline-none mx-auto p-3 bg-[#f1f5f9] rounded-[24px] border-none shadow-2xl flex flex-col gap-0"
      >
        <form
          onSubmit={handleSubmit}
          className="relative bg-white rounded-[24px] p-6 sm:p-8 shadow-sm border border-slate-100 flex flex-col min-h-[320px]"
        >
          {/* Close Button */}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 transition-colors cursor-pointer border-none"
          >
            <svg width="10" height="10" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 1L13 13M1 13L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div className="flex flex-col gap-4 flex-grow text-slate-800">
            <h2 className="text-[22px] font-bold text-[#0f172a] mb-1">
              {t("modalAttachTitle") || "Dodaj priponko"}
            </h2>
            <p className="text-slate-500 text-[13px] font-medium mb-6">
              Izberite datoteko za ta nalog.
            </p>

            <div className="flex flex-col gap-3">
              <label className="block text-[10px] font-bold text-[#9CA9BD] uppercase tracking-widest mb-1.5">
                DATOTEKA:
              </label>
              <AuraFileInput
                id="attach-file"
                onFile={setFile}
                onReject={(msg) => alert(msg)}
                className="h-11 flex items-center px-4 rounded-[8px] border border-slate-300 bg-[#F1F5F9] text-slate-600 hover:bg-slate-100/80 transition-colors font-medium text-[14px]"
              />
              {file && (
                <div className="mt-1 p-3 rounded-[8px] bg-slate-50 border border-slate-100 flex items-center gap-2 text-xs text-slate-700 font-medium animate-in fade-in-50 duration-200">
                  <Paperclip className="w-3.5 h-3.5 text-[#1B3A6B] shrink-0" />
                  <span className="truncate flex-1">{file.name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex mt-8">
            <button
              type="submit"
              disabled={!file || uploading}
              className="w-full h-[48px] rounded-[8px] bg-[#0a1128] text-white font-bold text-[12px] uppercase tracking-widest shadow-lg shadow-[#0a1128]/20 hover:bg-[#152042] transition-all disabled:opacity-50 flex items-center justify-center cursor-pointer border-none"
            >
              {uploading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                "Naloži priponko"
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
