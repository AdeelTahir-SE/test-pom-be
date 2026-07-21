"use client";

import React, { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useLanguage } from "@/lib/useLanguage";
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
    attachmentName: string;
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
    if (isOpen) setDate(defaultDate);
  }, [isOpen, defaultDate]);

  // Dynamic icon selections
  const [hasAttachment, setHasAttachment] = useState(false);
  const [attachmentName, setAttachmentName] = useState("");
  const [hasEmail, setHasEmail] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [hasConfirm, setHasConfirm] = useState(false);
  const [hasDecline, setHasDecline] = useState(false);

  // Only digits, spaces, + and leading country codes allowed
  const sanitizePhone = (raw: string) => raw.replace(/[^0-9+\s]/g, "");
  const isValidPhone = (raw: string) => /^\+?[0-9\s]{6,}$/.test(raw.trim());
  const normalizedPhone = (raw: string) => raw.trim().replace(/\s+/g, "");

  const handlePhoneChange = (raw: string) => {
    const sanitized = sanitizePhone(raw);
    setPhoneNumber(sanitized);
    if (sanitized && !isValidPhone(sanitized)) {
      setPhoneError(t("modalPhoneInvalid"));
    } else {
      setPhoneError(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    const finalPhone = phoneNumber && isValidPhone(phoneNumber) ? normalizedPhone(phoneNumber) : "";

    onAddReminder({
      title,
      description,
      time: time || new Date().toLocaleTimeString("sl-SI", { hour: "2-digit", minute: "2-digit" }),
      date: date || new Date().toLocaleDateString("sl-SI"),
      isUrgent,
      hasAttachment,
      attachmentName: hasAttachment ? (attachmentName || "priponka.pdf") : "",
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
    setHasAttachment(false);
    setAttachmentName("");
    setHasEmail(false);
    setPhoneNumber("");
    setPhoneError(null);
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

  const phoneIcon = (
    <svg width="16" height="16" viewBox="0 0 20 18" fill="currentColor">
      <path d="M7.22477 1.25722C6.8873 0.497902 6.0702 0 5.16154 0H2.10521C0.942534 0 0 0.848098 0 1.89453C0 10.7892 8.01177 18 17.8945 18C19.0572 18 19.9995 17.1516 19.9995 16.1052L20 13.354C20 12.5362 19.4469 11.8009 18.6033 11.4971L15.674 10.4429C14.9161 10.1701 14.0533 10.2929 13.4263 10.7632L12.6702 11.3307C11.7873 11.9929 10.4882 11.9402 9.67552 11.2088L7.54672 9.29106C6.73403 8.55963 6.67398 7.39134 7.40975 6.59669L8.04016 5.9163C8.56268 5.35196 8.70032 4.57516 8.39719 3.89309L7.22477 1.25722Z" />
    </svg>
  );

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
                    onChange={(e) => setDate(e.target.value)}
                    maxLength={10}
                    className="text-center placeholder:text-slate-300"
                  />
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
                      if (hasAttachment) setAttachmentName("");
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
                      onFileSelect={setAttachmentName}
                    />
                    {attachmentName && (
                      <span className="text-[11px] text-slate-500 truncate">
                        {attachmentName}
                      </span>
                    )}
                  </div>
                )}

                {/* Row 2: Telefon */}
                <div className="flex flex-col gap-1">
                  <AuraLabel>{t("modalPhoneLabel")}</AuraLabel>
                  <div className="flex items-center gap-2">
                    <a
                      href={phoneNumber && isValidPhone(phoneNumber) ? `tel:${normalizedPhone(phoneNumber)}` : "#"}
                      onClick={(e) => {
                        if (!phoneNumber || !isValidPhone(phoneNumber)) {
                          e.preventDefault();
                        }
                      }}
                      className="shrink-0"
                      title={phoneNumber ? `${t("workerCall")} ${phoneNumber}` : t("modalPhoneEmptyTitle")}
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all ${
                          phoneNumber && isValidPhone(phoneNumber)
                            ? "bg-[#1B3A6B] border-[#1B3A6B] text-white shadow-[0_4px_10px_-2px_rgba(27,58,107,0.3)]"
                            : "bg-white border-[#1B3A6B]/25 text-slate-500"
                        }`}
                      >
                        {phoneIcon}
                      </div>
                    </a>
                    <AuraInput
                      type="tel"
                      inputMode="tel"
                      placeholder={t("modalPhonePlaceholder")}
                      value={phoneNumber}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                  {phoneError && (
                    <span className="text-[11px] text-red-500">{phoneError}</span>
                  )}
                </div>

                {/* Row 3: Potrdi & Zavrni */}
                <div className="flex gap-4">
                  <AuraIconButton
                    active={hasConfirm}
                    onClick={() => setHasConfirm(!hasConfirm)}
                    icon={confirmIcon}
                    label={t("modalReminderConfirm")}
                    title={t("modalReminderConfirmTitle")}
                  />
                  <AuraIconButton
                    active={hasDecline}
                    onClick={() => setHasDecline(!hasDecline)}
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
