"use client";

import React, { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useLanguage } from "@/lib/useLanguage";
import { normalizeRemindTime } from "@/lib/officeDate";
import {
  AuraLabel,
  AuraInput,
  AuraTextarea,
  AuraFileInput,
  AuraIconButton,
  AuraCheckbox,
  auraCard,
  auraButton,
} from "./AuraForm";
import { isValidPhone, normalizePhone, toTelHref } from "@/lib/phone";
import { AuraPhoneInput } from "./PhoneInput";

interface AddReminderModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** Prefill date field (DD.MM.YYYY) from the office day navigator. */
  defaultDate?: string;
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

export function AddReminderModal({ isOpen, onOpenChange, defaultDate = "", onAddReminder }: AddReminderModalProps) {
  const { t } = useLanguage();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [time, setTime] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [isUrgent, setIsUrgent] = useState(false);

  React.useEffect(() => {
  if (isOpen) {
    setDate(defaultDate);
    setDateError(null);
  }
}, [isOpen, defaultDate]);

  // Dynamic icon selections
  const [hasAttachment, setHasAttachment] = useState(false);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [hasEmail, setHasEmail] = useState(false);
  const [countryCode, setCountryCode] = useState("+386");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [hasConfirm, setHasConfirm] = useState(false);
  const [hasDecline, setHasDecline] = useState(false);

  const sanitizePhone = (raw: string) => raw.replace(/[^0-9\s]/g, "");

const handlePhoneChange = (raw: string) => {
  const sanitized = sanitizePhone(raw);
  setPhoneNumber(sanitized);

  const fullPhone = `${countryCode}${sanitized}`;

  if (sanitized && !isValidPhone(fullPhone)) {
    setPhoneError(t("modalPhoneInvalid"));
  } else {
    setPhoneError(null);
  }
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

  const fullPhone = phoneNumber
  ? `${countryCode}${phoneNumber}`
  : "";

if (phoneNumber && !isValidPhone(fullPhone)) {
  setPhoneError(t("modalPhoneInvalid"));
  return;
}

const finalPhone = normalizePhone(fullPhone) ?? "";
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

    // Reset fields
    setTitle("");
    setDescription("");
    setTime("");
    setDate(defaultDate);
    setIsUrgent(false);
    setPhoneNumber("");
    setCountryCode("+386");
    setHasAttachment(false);
    setAttachmentFile(null);
    setHasEmail(false);
    setPhoneError(null);
    setDateError(null);
    setHasConfirm(false);
    setHasDecline(false);
    onOpenChange(false);
  };

  const attachmentIcon = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );

  const emailIcon = <span className="text-sm font-semibold">@</span>;

  const confirmIcon = (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M13.3333 4L6 11.3333L2.66667 8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  const declineIcon = (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M14.6066 14.6066L7.80336 7.80336M7.80336 7.80336L1 1M7.80336 7.80336L14.6067 1M7.80336 7.80336L1 14.6067" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  const phoneIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.78.62 2.63a2 2 0 0 1-.45 2.11L8 9.73a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.85.29 1.73.5 2.63.62A2 2 0 0 1 22 16.92z" />
  </svg>
);
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        style={{
          background: "transparent",
          border: "none",
          boxShadow: "none",
          padding: 0,
          maxWidth: "420px",
          width: "90%",
        }}
        className="outline-none"
      >
        <div className={auraCard}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-slate-800">
            {/* Header */}
            <div className="text-center">
              <h3 className="text-xl font-semibold tracking-tight text-slate-900">
                {t("modalReminderTitle")}
              </h3>
            </div>

            <div className="flex flex-col gap-3">
              {/* Opomnik — required, stronger styling */}
              <div>
                <AuraLabel strong>{t("modalReminderFieldLabel")}</AuraLabel>
                <AuraInput
                  type="text"
                  placeholder={t("modalReminderFieldPlaceholder")}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={28}
                  required
                  strong
                />
              </div>

              {/* Description */}
              <div>
                <AuraLabel>{t("modalReminderDesc")}</AuraLabel>
                <AuraTextarea
                  placeholder={t("modalReminderDescPlaceholder")}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={60}
                  rows={2}
                />
              </div>

              <hr className="border-[#1B3A6B]/10 my-1" />

              {/* Čas, datum — same line, lighter placeholder */}
<div className="grid grid-cols-2 gap-3">
  <div>
    <AuraLabel>{t("modalReminderTime")}</AuraLabel>
    <AuraInput
      type="text"
      placeholder="16:48"
      value={time}
      onChange={(e) => setTime(e.target.value)}
      maxLength={5}
      className="text-center placeholder:text-slate-300"
    />
  </div>

  <div>
    <AuraLabel>{t("modalTaskDate")}</AuraLabel>
    <AuraInput
      type="text"
      placeholder="02.02.2026"
      value={date}
      onChange={(e) => {
        setDate(e.target.value);
        setDateError(null);
      }}
      maxLength={10}
      className="text-center placeholder:text-slate-300"
    />
    {dateError && (
      <span className="text-[11px] text-red-500 mt-1 block">
        {dateError}
      </span>
    )}
  </div>
</div>

{/* Nujno */}
              <div className="pt-1">
                <AuraCheckbox
                  checked={isUrgent}
                  onChange={setIsUrgent}
                  label={t("modalReminderUrgent")}
                />
              </div>

              <hr className="border-[#1B3A6B]/10 my-1" />

              {/* Dodaj ikone section */}
              <AuraLabel>{t("modalReminderAddIcons")}</AuraLabel>

              <div className="flex flex-col gap-3">
                {/* Row 1: Priponka & E-posta */}
                <div className="flex gap-4">
                  <AuraIconButton
  active={hasAttachment}
  onClick={() => {
    setHasAttachment(!hasAttachment);
    if (hasAttachment) setAttachmentFile(null);
  }}
  icon={attachmentIcon}
  label={t("modalReminderAttachment")}
  title={t("modalReminderAttachmentTitle")}
/>
                  <AuraIconButton
                    active={hasEmail}
                    onClick={() => setHasEmail(!hasEmail)}
                    icon={emailIcon}
                    label={t("modalReminderEmail")}
                    title={t("modalReminderEmailTitle")}
                  />
                </div>

                {/* Attachment file input */}
                {hasAttachment && (
  <div className="flex flex-col gap-1">
    <AuraFileInput
      id="reminder-attachment"
      onFile={(file) => setAttachmentFile(file)}
      onReject={(msg) => window.alert(msg)}
    />
    {attachmentFile && (
      <span className="text-[11px] text-slate-500 truncate">
        {attachmentFile.name}
      </span>
    )}
  </div>
)}

                {/* Row 2: Telefon */}
                {/* Row 2: Telefon */}
<div className="flex flex-col gap-1">
  <AuraLabel>{t("modalPhoneLabel")}</AuraLabel>

  <div className="flex items-center gap-2">
    <a
      href={toTelHref(`${countryCode}${phoneNumber}`) ?? undefined}
      onClick={(e) => {
        if (!toTelHref(`${countryCode}${phoneNumber}`)) {
          e.preventDefault();
        }
      }}
      className="shrink-0"
      title={
        phoneNumber
          ? `${t("workerCall")} ${countryCode}${phoneNumber}`
          : t("modalPhoneEmptyTitle")
      }
    >
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all ${
          phoneNumber && toTelHref(`${countryCode}${phoneNumber}`)
            ? "bg-[#1B3A6B] border-[#1B3A6B] text-white shadow-[0_4px_10px_-2px_rgba(27,58,107,0.3)]"
            : "bg-white border-[#1B3A6B]/25 text-slate-500"
        }`}
      >
        {phoneIcon}
      </div>
    </a>

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

                {/* Row 3: Potrdi & Zavrni */}
                <div className="flex gap-4">
                  <AuraIconButton
                    active={hasConfirm}
                    onClick={() => {
  setHasConfirm(!hasConfirm);
  setHasDecline(false);
}}
                    icon={confirmIcon}
                    label={t("modalReminderConfirm")}
                    title={t("modalReminderConfirmTitle")}
                  />
                  <AuraIconButton
                    active={hasDecline}
                    onClick={() => {
  setHasDecline(!hasDecline);
  setHasConfirm(false);
}}
                    icon={declineIcon}
                    label={t("modalReminderDecline")}
                    title={t("modalReminderDeclineTitle")}
                  />
                </div>
              </div>
            </div>

            {/* Submit */}
            <button type="submit" className={auraButton}>
              {t("modalScheduleSubmit")}
            </button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
