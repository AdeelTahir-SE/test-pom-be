"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/lib/useLanguage";
import { normalizeRemindTime } from "@/lib/officeDate";
import { isValidPhone, normalizePhone } from "@/lib/phone";
import { AuraPhoneInput } from "./PhoneInput";
import { AttachmentDialog } from "./AttachmentDialog";
import { Paperclip } from "lucide-react";

interface AddReminderModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** Prefill date field (DD.MM.YYYY) from the office day navigator. */
  defaultDate?: string;
  /** Callback to open attachment dialog for existing reminder */
  onOpenAttachmentDialog?: (reminderId: string) => void;
  /** If set, this is edit mode for an existing reminder */
  editReminderId?: string | null;
  /** Prefill data for edit mode */
  editData?: {
    title: string;
    description: string;
    time: string;
    date: string;
    isUrgent: boolean;
    hasAttachment: boolean;
    hasEmail: boolean;
    phoneNumber: string;
    hasConfirm: boolean;
    hasDecline: boolean;
  } | null;
  onAddReminder: (reminderData: {
    title: string;
    description: string;
    time: string;
    date: string;
    isUrgent: boolean;
    hasAttachment: boolean;
    attachmentFile: File | null;
    hasEmail: boolean;
    phoneNumber: string;
    hasConfirm: boolean;
    hasDecline: boolean;
  }) => void;
}

export function AddReminderModal({ isOpen, onOpenChange, defaultDate = "", onOpenAttachmentDialog, editReminderId, editData, onAddReminder }: AddReminderModalProps) {
  const { t } = useLanguage();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [time, setTime] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [isUrgent, setIsUrgent] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      if (editReminderId && editData) {
        // Edit mode: prefill existing data
        setTitle(editData.title);
        setDescription(editData.description);
        setTime(editData.time);
        setDate(editData.date);
        setIsUrgent(editData.isUrgent);
        setHasAttachment(editData.hasAttachment);
        setHasEmail(editData.hasEmail);
        setPhoneNumber(editData.phoneNumber);
        setHasConfirm(editData.hasConfirm);
        setHasDecline(editData.hasDecline);
      } else {
        // Create mode: reset to defaults
        setDate(defaultDate);
        setDateError(null);
      }
    }
  }, [isOpen, defaultDate, editReminderId, editData]);

  // Dynamic icon selections
  const [hasAttachment, setHasAttachment] = useState(false);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [stageAttachDialogOpen, setStageAttachDialogOpen] = useState(false);
  const [hasEmail, setHasEmail] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [hasConfirm, setHasConfirm] = useState(false);
  const [hasDecline, setHasDecline] = useState(false);

  const handlePhoneChange = (raw: string) => {
    if (!raw || raw === "386" || raw === "+386") {
      setPhoneNumber("");
      setPhoneError(null);
      return;
    }
    const fullPhone = raw.startsWith("+") ? raw : `+${raw}`;
    setPhoneNumber(fullPhone);

    if (!isValidPhone(fullPhone)) {
      setPhoneError(t("modalPhoneInvalid"));
    } else {
      setPhoneError(null);
    }
  };

  const resetFields = () => {
    setTitle("");
    setDescription("");
    setTime("");
    setDate(defaultDate);
    setIsUrgent(false);
    setPhoneNumber("");
    setHasAttachment(false);
    setAttachmentFile(null);
    setHasEmail(false);
    setPhoneError(null);
    setDateError(null);
    setHasConfirm(false);
    setHasDecline(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    if (date) {
      const match = date.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);

      if (!match) {
        setDateError("Datum mora biti v obliki DD.MM.YYYY.");
        return;
      }

      const day = Number(match[1]);
      const month = Number(match[2]);
      const year = Number(match[3]);

      const parsedDate = new Date(year, month - 1, day);

      if (
        parsedDate.getFullYear() !== year ||
        parsedDate.getMonth() !== month - 1 ||
        parsedDate.getDate() !== day
      ) {
        setDateError("Vnesite veljaven datum.");
        return;
      }
    }

    if (phoneNumber && !isValidPhone(phoneNumber)) {
      setPhoneError(t("modalPhoneInvalid"));
      return;
    }

    const finalPhone = normalizePhone(phoneNumber) ?? "";
    const normalizedTime = normalizeRemindTime(time) ?? "";

    onAddReminder({
      title,
      description,
      time: normalizedTime,
      date: date || new Date().toLocaleDateString("sl-SI"),
      isUrgent,
      hasAttachment,
      attachmentFile: hasAttachment ? attachmentFile : null,
      hasEmail,
      phoneNumber: finalPhone,
      hasConfirm,
      hasDecline,
    });

    resetFields();
    onOpenChange(false);
  };

  const attachmentIcon = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );

  const emailIcon = <span className="text-xs font-semibold">@</span>;

  const confirmIcon = (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M13.3333 4L6 11.3333L2.66667 8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  const declineIcon = (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M14.6066 14.6066L7.80336 7.80336M7.80336 7.80336L1 1M7.80336 7.80336L14.6067 1M7.80336 7.80336L1 14.6067" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  const phoneIcon = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.78.62 2.63a2 2 0 0 1-.45 2.11L8 9.73a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.85.29 1.73.5 2.63.62A2 2 0 0 1 22 16.92z" />
    </svg>
  );

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        onOpenChange(open);
        if (!open) {
          resetFields();
        }
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="w-full max-w-[calc(100%-2rem)] min-[480px]:w-[480px] outline-none mx-auto p-3 bg-[#f1f5f9] rounded-[24px] min-[480px]:rounded-[32px] border-none shadow-2xl flex flex-col gap-0 animate-in fade-in zoom-in-95 duration-200"
      >
        <DialogTitle className="sr-only">{t("modalReminderTitle")}</DialogTitle>

        <style dangerouslySetInnerHTML={{ __html: `
          .custom-ios-scrollbar::-webkit-scrollbar {
            width: 5px;
          }
          .custom-ios-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-ios-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(109, 119, 142, 0.45);
            border-radius: 9999px;
          }
          .custom-ios-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(109, 119, 142, 0.65);
          }
        `}} />

        <div className="relative bg-white rounded-[20px] min-[480px]:rounded-[24px] p-4 sm:p-5 shadow-sm border border-slate-100 flex flex-col">
          {/* Close Button */}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 transition-colors border-none"
          >
            <svg width="10" height="10" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 1L13 13M1 13L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between h-full">
            <div className="flex flex-col gap-3.5 flex-grow">
              <div>
                <h2 className="text-[20px] font-bold text-[#0f172a] mb-0.5">
                  {t("modalReminderTitle")}
                </h2>
                <p className="hidden min-[480px]:block text-slate-500 text-[12px] font-medium">
                  {t("modalReminderSubtitle") || "Nastavite opomnik ali opozorilo."}
                </p>
              </div>

              <div className="flex flex-col gap-2.5">
                {/* Opomnik field */}
                <div>
                  <label className="block text-[10px] font-bold text-[#9CA9BD] uppercase tracking-widest mb-1">
                    {t("modalReminderFieldLabel")}
                  </label>
                  <input
                    type="text"
                    placeholder={t("modalReminderFieldPlaceholder")}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={28}
                    required
                    className="w-full h-[38px] px-4 rounded-[8px] border border-slate-300 bg-[#F1F5F9] text-[#0f172a] text-[14px] font-medium focus:outline-none focus:ring-1 focus:ring-[#1B3A6B]/20 focus:border-[#1B3A6B] transition-all placeholder:text-slate-400"
                  />
                </div>

                {/* Opis field */}
                <div>
                  <label className="block text-[10px] font-bold text-[#9CA9BD] uppercase tracking-widest mb-1">
                    {t("modalReminderDesc")}
                  </label>
                  <textarea
                    placeholder={t("modalReminderDescPlaceholder")}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={60}
                    rows={2}
                    className="w-full min-h-[50px] p-2.5 rounded-[8px] border border-slate-300 bg-[#F1F5F9] text-[#0f172a] text-[14px] font-medium focus:outline-none focus:ring-1 focus:ring-[#1B3A6B]/20 focus:border-[#1B3A6B] transition-all placeholder:text-slate-400 resize-none"
                  />
                </div>

                {/* Čas and Datum (distance is now same as between top fields) */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-[#9CA9BD] uppercase tracking-widest mb-1">
                      {t("modalReminderTime")}
                    </label>
                    <input
                      type="text"
                      placeholder="16:48"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      maxLength={5}
                      className="w-full h-[38px] px-4 rounded-[8px] border border-slate-300 bg-[#F1F5F9] text-[#0f172a] text-[14px] font-medium focus:outline-none focus:ring-1 focus:ring-[#1B3A6B]/20 focus:border-[#1B3A6B] transition-all placeholder:text-slate-300 text-center"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#9CA9BD] uppercase tracking-widest mb-1">
                      {t("modalTaskDate")}
                    </label>
                    <input
                      type="text"
                      placeholder="02.02.2026"
                      value={date}
                      onChange={(e) => {
                        setDate(e.target.value);
                        setDateError(null);
                      }}
                      maxLength={10}
                      className={`w-full h-[38px] px-4 rounded-[8px] border ${
                        dateError ? "border-red-300 ring-1 ring-red-300 bg-red-50" : "border-slate-300 bg-[#F1F5F9]"
                      } text-[#0f172a] text-[14px] font-medium focus:outline-none focus:ring-1 focus:ring-[#1B3A6B]/20 focus:border-[#1B3A6B] transition-all placeholder:text-slate-300 text-center`}
                    />
                    {dateError && (
                      <p className="mt-0.5 text-[11px] text-red-500 font-medium">{dateError}</p>
                    )}

                    {/* Nujno Checkbox positioned below Datum input aligned to the right */}
                    <div className="flex justify-end mt-3.5">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <div
                          className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                            isUrgent
                              ? "bg-[#0a1128] border-[#0a1128]"
                              : "bg-white border-slate-300 hover:border-[#0a1128]/50"
                          }`}
                        >
                          {isUrgent && (
                            <svg
                              width="10"
                              height="8"
                              viewBox="0 0 10 8"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M1 4L3.5 6.5L9 1"
                                stroke="white"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </div>
                        <span className="text-[11px] font-bold text-[#9CA9BD] uppercase tracking-widest">
                          {t("modalReminderUrgent") || "NUJNO"}
                        </span>
                        <input
                          type="checkbox"
                          checked={isUrgent}
                          onChange={(e) => setIsUrgent(e.target.checked)}
                          className="sr-only"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Divider before icons */}
                <hr className="border-slate-100 my-0.5" />

                {/* Icons selection section */}
                <div className="flex flex-col gap-2">
                  <div className="text-[10px] font-bold text-[#9CA9BD] uppercase tracking-widest">
                    {t("modalReminderAddIcons") || "DODAJ IKONE"}
                  </div>

                  {/* 2x2 Grid of Top/Bottom Icons with labels placed horizontally (14px text) */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    {/* Priponka */}
                    <button
                      type="button"
                      onClick={() => {
                        if (editReminderId && onOpenAttachmentDialog) {
                          // Edit mode: reminder already exists — upload directly.
                          onOpenAttachmentDialog(editReminderId);
                        } else {
                          // Create mode: reminder doesn't exist yet — open the
                          // same "Dodaj priponko" popup, but stage the file
                          // locally until the reminder is actually created.
                          setStageAttachDialogOpen(true);
                        }
                      }}
                      className="flex items-center gap-3 text-left bg-transparent border-none p-0 outline-none cursor-pointer group"
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all shrink-0 ${
                        hasAttachment
                          ? "bg-[#0A1128] border-[#0A1128] text-white shadow-md shadow-[#0A1128]/10"
                          : "bg-white border-[#cbd5e1] text-slate-500 hover:border-[#0A1128]/50"
                      }`}>
                        {attachmentIcon}
                      </div>
                      <span className={`text-[12px] transition-colors ${
                        hasAttachment ? "text-[#0A1128] font-semibold" : "text-slate-600 font-medium"
                      }`}>
                        {t("modalReminderAttachment") || "Priponka"}
                      </span>
                    </button>

                    {/* E-pošta */}
                    <button
                      type="button"
                      onClick={() => setHasEmail(!hasEmail)}
                      className="flex items-center gap-3 text-left bg-transparent border-none p-0 outline-none cursor-pointer group"
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all shrink-0 ${
                        hasEmail
                          ? "bg-[#0A1128] border-[#0A1128] text-white shadow-md shadow-[#0A1128]/10"
                          : "bg-white border-[#cbd5e1] text-slate-500 hover:border-[#0A1128]/50"
                      }`}>
                        {emailIcon}
                      </div>
                      <span className={`text-[12px] transition-colors ${
                        hasEmail ? "text-[#0A1128] font-semibold" : "text-slate-600 font-medium"
                      }`}>
                        {t("modalReminderEmail") || "E-pošta"}
                      </span>
                    </button>

                    {/* Potrdi */}
                    <button
                      type="button"
                      onClick={() => {
                        setHasConfirm(!hasConfirm);
                      }}
                      className="flex items-center gap-3 text-left bg-transparent border-none p-0 outline-none cursor-pointer group"
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all shrink-0 ${
                        hasConfirm
                          ? "bg-[#0A1128] border-[#0A1128] text-white shadow-md shadow-[#0A1128]/10"
                          : "bg-white border-[#cbd5e1] text-slate-500 hover:border-[#0A1128]/50"
                      }`}>
                        {confirmIcon}
                      </div>
                      <span className={`text-[12px] transition-colors ${
                        hasConfirm ? "text-[#0A1128] font-semibold" : "text-slate-600 font-medium"
                      }`}>
                        {t("modalReminderConfirm") || "Potrdi"}
                      </span>
                    </button>

                    {/* Zavrni */}
                    <button
                      type="button"
                      onClick={() => {
                        setHasDecline(!hasDecline);
                      }}
                      className="flex items-center gap-3 text-left bg-transparent border-none p-0 outline-none cursor-pointer group"
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all shrink-0 ${
                        hasDecline
                          ? "bg-[#0A1128] border-[#0A1128] text-white shadow-md shadow-[#0A1128]/10"
                          : "bg-white border-[#cbd5e1] text-slate-500 hover:border-[#0A1128]/50"
                      }`}>
                        {declineIcon}
                      </div>
                      <span className={`text-[12px] transition-colors ${
                        hasDecline ? "text-[#0A1128] font-semibold" : "text-slate-600 font-medium"
                      }`}>
                        {t("modalReminderDecline") || "Zavrni"}
                      </span>
                    </button>
                  </div>

                  {/* Selected attachment preview (file picked via the "Dodaj priponko" popup) */}
                  {attachmentFile && (
                    <div className="w-full flex items-center gap-2 p-2.5 rounded-[8px] bg-slate-50 border border-slate-100 animate-fade-in">
                      <Paperclip className="w-3.5 h-3.5 text-[#1B3A6B] shrink-0" />
                      <span className="text-[11px] text-slate-600 font-medium truncate flex-1">
                        {attachmentFile.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setAttachmentFile(null);
                          setHasAttachment(false);
                        }}
                        className="text-slate-400 hover:text-slate-600 bg-transparent border-none p-0 outline-none cursor-pointer shrink-0"
                      >
                        <svg width="10" height="10" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M1 1L13 13M1 13L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </div>
                  )}

                  {/* Phone input line: text is 10px weight 300, and phone line is last */}
                  <div className="flex flex-col gap-1.5 w-full mt-0.5">
                    <span className="text-[10px] font-[300] text-[#9CA9BD] uppercase tracking-widest leading-none">
                      {t("modalPhoneLabel") || "VNESI ŠTEVILKO ZA AVTOMATSKI KLIC"}
                    </span>

                    <div className="flex items-center gap-2.5 w-full">
                      {/* Decorative only — secretary does not call from the form (Mark). */}
                      <div
                        className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center border transition-all ${
                          phoneNumber && isValidPhone(phoneNumber)
                            ? "bg-[#0A1128] border-[#0A1128] text-white shadow-md shadow-[#0A1128]/10"
                            : "bg-white border-[#cbd5e1] text-slate-500"
                        }`}
                        title={
                          t("modalPhoneEmptyTitle") ||
                          "Vnesite telefonsko številko"
                        }
                        aria-hidden
                      >
                        {phoneIcon}
                      </div>

                      <div className="flex-1">
                        <AuraPhoneInput
                          value={phoneNumber}
                          onChange={handlePhoneChange}
                          error={phoneError}
                          placeholder="30 123 456"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons (Dodaj na urnik only, with tighter spacing on mobile) */}
            <div className="mt-2.5 pt-2.5 sm:mt-4 sm:pt-3 border-t border-slate-100/50">
              <button
                type="submit"
                className="w-full h-[40px] rounded-[12px] bg-[#0A1128] text-white font-medium text-[13px] uppercase tracking-wider hover:bg-[#152042] transition-colors shadow-lg shadow-[#0A1128]/10"
              >
                {t("modalScheduleSubmit") || "Dodaj na urnik"}
              </button>
            </div>
          </form>
        </div>
      </DialogContent>

      <AttachmentDialog
        isOpen={stageAttachDialogOpen}
        onOpenChange={setStageAttachDialogOpen}
        stageOnly
        onFileSelected={(f) => {
          setAttachmentFile(f);
          setHasAttachment(true);
        }}
      />
    </Dialog>
  );
}