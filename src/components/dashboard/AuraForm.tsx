"use client";

import React, { useRef } from "react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/useLanguage";
import {
  JOB_ATTACHMENT_ACCEPT,
  jobAttachmentErrorMessage,
  validateJobAttachmentFile,
} from "@/lib/uploadValidation";

// Aura-styled form primitives inspired by the responsive-contact-section-with-support-form template.
// Colors are mapped to the existing Dnevnik.app palette (navy primary #1B3A6B).

export const auraInputBase =
  "w-full px-3 py-2.5 text-[13px] rounded-xl ring-1 ring-[#1B3A6B]/15 focus:ring-2 focus:ring-[#1B3A6B] outline-none bg-white placeholder:text-slate-400 text-slate-800 transition-all";

export const auraInputStrong =
  "w-full px-3 py-2.5 text-[13px] rounded-xl ring-2 ring-[#1B3A6B]/30 focus:ring-2 focus:ring-[#1B3A6B] outline-none bg-white placeholder:text-slate-400 text-slate-800 transition-all";

export const auraLabelBase =
  "block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1";

export const auraLabelStrong =
  "block text-[11px] font-semibold text-[#1B3A6B] uppercase tracking-wider mb-1";

export const auraCard =
  "rounded-2xl bg-white/95 backdrop-blur ring-1 ring-white/60 shadow-lg p-5";

export const auraButton =
  "w-full inline-flex items-center justify-center rounded-xl bg-gradient-to-b from-[#1B3A6B] to-[#12274b] text-white px-4 py-3 text-sm font-semibold hover:from-[#234882] hover:to-[#1a3867] active:scale-[0.98] transition-all";

type AuraLabelProps = Readonly<{
  children: React.ReactNode;
  strong?: boolean;
  className?: string;
}>;

export function AuraLabel({ children, strong, className }: AuraLabelProps) {
  return (
    <label className={cn(strong ? auraLabelStrong : auraLabelBase, className)}>
      {children}
    </label>
  );
}

type AuraInputProps = Readonly<
  React.InputHTMLAttributes<HTMLInputElement> & { strong?: boolean }
>;

export function AuraInput(props: AuraInputProps) {
  const { strong, className, ...rest } = props;
  return (
    <input
      className={cn(strong ? auraInputStrong : auraInputBase, className)}
      {...rest}
    />
  );
}

type AuraTextareaProps = Readonly<
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { strong?: boolean }
>;

export function AuraTextarea(props: AuraTextareaProps) {
  const { strong, className, ...rest } = props;
  return (
    <textarea
      className={cn(
        strong ? auraInputStrong : auraInputBase,
        "resize-none",
        className
      )}
      {...rest}
    />
  );
}

type AuraSelectProps = Readonly<
  React.SelectHTMLAttributes<HTMLSelectElement> & { strong?: boolean }
>;

export function AuraSelect({
  children,
  className,
  strong,
  ...props
}: AuraSelectProps) {
  return (
    <div className="relative w-full">
      <select
        className={cn(
          strong ? auraInputStrong : auraInputBase,
          "appearance-none pr-9",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
          <path
            d="M1 1L5 5L9 1"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}

type AuraFileInputProps = Readonly<{
  onFileSelect?: (fileName: string) => void;
  onFile?: (file: File) => void;
  onReject?: (message: string) => void;
  className?: string;
  id?: string;
}>;

export function AuraFileInput({
  onFileSelect,
  onFile,
  onReject,
  className,
  id,
}: AuraFileInputProps) {
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => inputRef.current?.click();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const result = validateJobAttachmentFile(file);
    if (!result.ok) {
      onReject?.(jobAttachmentErrorMessage(result.error, t));
      return;
    }

    onFileSelect?.(file.name);
    onFile?.(file);
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        id={id}
        accept={JOB_ATTACHMENT_ACCEPT}
        className="hidden"
        onChange={handleChange}
      />
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "text-left text-[12px] text-slate-600 px-3 py-2 rounded-xl ring-1 ring-dashed ring-[#1B3A6B]/25 bg-slate-50 hover:bg-slate-100 transition-colors w-full truncate",
          className
        )}
      >
        {t("fileInputSelect")}
      </button>
    </>
  );
}

type AuraIconButtonProps = Readonly<{
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label?: string;
  activeIconColor?: string;
  inactiveIconColor?: string;
  title?: string;
  type?: "button" | "submit" | "reset";
}>;

export function AuraIconButton({
  active,
  onClick,
  icon,
  label,
  activeIconColor = "#1B3A6B",
  inactiveIconColor = "#64748B",
  title,
  type = "button",
}: AuraIconButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      title={title}
      className={cn(
        "flex items-center gap-2 text-left transition-all shrink-0",
        label ? "flex-1" : "",
        active && "font-medium"
      )}
    >
      <div
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center border transition-all",
          active
            ? "bg-[#1B3A6B] border-[#1B3A6B] shadow-[0_4px_10px_-2px_rgba(27,58,107,0.3)]"
            : "bg-white border-[#1B3A6B]/25 hover:border-[#1B3A6B]/50"
        )}
      >
        <span style={{ color: active ? "#ffffff" : inactiveIconColor }}>
          {icon}
        </span>
      </div>
      {label && (
        <span
          className={cn(
            "text-[12px] transition-colors",
            active ? "text-[#1B3A6B]" : "text-slate-500"
          )}
        >
          {label}
        </span>
      )}
    </button>
  );
}

type AuraCheckboxProps = Readonly<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}>;

export function AuraCheckbox({
  checked,
  onChange,
  label,
}: AuraCheckboxProps) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <div
        className={cn(
          "w-4 h-4 rounded border flex items-center justify-center transition-all",
          checked
            ? "bg-[#1B3A6B] border-[#1B3A6B]"
            : "bg-white border-slate-300 hover:border-[#1B3A6B]/50"
        )}
      >
        {checked && (
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
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
      {label && (
        <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
          {label}
        </span>
      )}
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
    </label>
  );
}
