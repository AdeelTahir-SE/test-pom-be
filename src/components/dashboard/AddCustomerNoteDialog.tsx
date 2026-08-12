"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { api } from "@/lib/api-client";
import { useLanguage } from "@/lib/useLanguage";
import { parseNoteText } from "./CustomerNotesBanner";

export interface CustomerNoteDto {
  id: string;
  note: string;
  created_at?: string;
}

function getInitials(name?: string): string {
  if (!name?.trim()) return "JN";
  return name
    .trim()
    .split(/\s+/)
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return "Napaka.";
}

interface AddCustomerNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-filled customer (card). Empty + editable on DB page. */
  customerName?: string;
  /** When true, NAROČNIK field can be typed (DB Zaznamki). */
  customerNameEditable?: boolean;
  /** Optional suggestions for editable customer field. */
  customerNameOptions?: string[];
  location?: string | null;
  jobId?: string | null;
  /** Called after a note is saved successfully. */
  onSuccess?: () => void;
}

/**
 * Shared "Zaznamki za naročnika" popup (Mark a13).
 * Same UI/API as the card details note dialog — reuse everywhere.
 */
export function AddCustomerNoteDialog({
  open,
  onOpenChange,
  customerName = "",
  customerNameEditable = false,
  customerNameOptions = [],
  location = null,
  jobId = null,
  onSuccess,
}: AddCustomerNoteDialogProps) {
  const { t } = useLanguage();
  const [name, setName] = useState(customerName);
  const [noteText, setNoteText] = useState("");
  const [noteType, setNoteType] = useState<"once" | "always">("once");
  const [saving, setSaving] = useState(false);
  const [existingNotes, setExistingNotes] = useState<CustomerNoteDto[]>([]);
  const mountedRef = React.useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    setName(customerName);
    setNoteText("");
    setNoteType("once");
  }, [open, customerName]);

  const loadExisting = useCallback(async (customer: string) => {
    if (customer.trim().length < 2) {
      setExistingNotes([]);
      return;
    }
    try {
      const res = await api.get<{ notes: CustomerNoteDto[] }>(
        `/api/customers/notes?name=${encodeURIComponent(customer.trim())}`
      );
      if (!mountedRef.current) return;
      if (res.status >= 200 && res.status < 300 && res.data?.notes) {
        setExistingNotes(res.data.notes);
      } else {
        setExistingNotes([]);
      }
    } catch {
      if (mountedRef.current) setExistingNotes([]);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      setExistingNotes([]);
      return;
    }
    void loadExisting(name);
  }, [open, name, loadExisting]);

  const postNote = async (
    text: string,
    type: "once" | "always",
    customer: string,
    force: boolean,
    isRetry: boolean
  ): Promise<{ success: boolean; shouldRetry?: boolean }> => {
    const finalNoteContent =
      type === "once" ? JSON.stringify({ text, jobId: jobId ?? undefined }) : text;
    try {
      const res = await api.post<{ note: CustomerNoteDto }>("/api/customers/notes", {
        customer_name: customer,
        note: finalNoteContent,
        force,
        job_id: jobId ?? undefined,
      });
      if (!mountedRef.current) return { success: false };
      if (res.status === 409) {
        if (isRetry) return { success: false };
        return { success: false, shouldRetry: true };
      }
      if (res.status >= 200 && res.status < 300) return { success: true };
      window.alert(res.error?.message ?? "Opombe ni bilo mogoče shraniti.");
      return { success: false };
    } catch (err) {
      window.alert(getErrorMessage(err));
      return { success: false };
    }
  };

  const submit = async (force = false, isRetry = false): Promise<boolean> => {
    const text = noteText.trim();
    const customer = name.trim();
    if (!text || !customer) {
      if (!customer) window.alert("Naročnik je obvezen za dodajanje opombe.");
      return false;
    }
    const result = await postNote(text, noteType, customer, force, isRetry);
    if (result.shouldRetry) {
      const okAnyway = window.confirm(t("customerNotesDuplicateConfirm"));
      if (okAnyway) return submit(true, true);
      return false;
    }
    if (result.success) {
      setNoteText("");
      onOpenChange(false);
      onSuccess?.();
      return true;
    }
    return false;
  };

  const handleAdd = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await submit();
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  };

  const renderExistingList = () => {
    const mapped = existingNotes.map((n) => {
      const { text } = parseNoteText(n.note);
      return { ...n, noteText: text };
    });
    if (mapped.length === 0) {
      return (
        <span className="text-xs text-slate-400 font-light">
          Ni obstoječih zaznamkov.
        </span>
      );
    }
    return mapped.map((n, idx) => (
      <div key={n.id} className="flex items-start gap-2.5">
        <div className="bg-slate-200 text-slate-700 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 font-mono">
          {idx + 1}
        </div>
        <span className="text-xs text-[#0F172A] flex-1 min-w-0 font-normal leading-relaxed break-words">
          {n.noteText}
        </span>
      </div>
    ));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-full max-w-[calc(100%-2rem)] min-[450px]:w-[450px] min-[820px]:w-[760px] sm:max-w-[calc(100%-2rem)] outline-none mx-auto p-3 bg-[#f1f5f9] rounded-[24px] min-[820px]:rounded-[32px] border-none shadow-2xl flex flex-col gap-0"
      >
        <div className="flex flex-col min-[820px]:flex-row items-stretch w-full" style={{ gap: "12px" }}>
          <div className="hidden min-[820px]:flex flex-col w-[260px] shrink-0 min-[820px]:min-h-[581px]" style={{ gap: "12px" }}>
            <div className="relative bg-white rounded-[20px] p-6 shadow-sm border border-slate-100 flex flex-col">
              <div className="text-[10px] font-bold text-[#9CA9BD] uppercase tracking-widest mb-4">
                PARTNER
              </div>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-[14px] bg-[#2b5493] text-white flex items-center justify-center text-[18px] font-bold shadow-md shadow-blue-900/20 shrink-0">
                  {name.trim() ? getInitials(name) : "JN"}
                </div>
                <div className="flex flex-col overflow-hidden">
                  <div className="font-bold text-[#0f172a] text-[16px] truncate">
                    {name.trim() || "Naročnik"}
                  </div>
                  {location ? (
                    <div className="text-[#64748b] text-[12px] font-medium mt-1 leading-snug">
                      {location}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="relative bg-white rounded-[20px] p-6 shadow-sm border border-slate-100 flex-1 flex flex-col">
              <div className="text-[10px] font-bold text-[#9CA9BD] uppercase tracking-widest mb-4">
                OBSTOJEČI ZAZNAMKI
              </div>
              <div className="flex flex-col gap-3 overflow-y-auto max-h-[320px] pr-1 flex-grow">
                {renderExistingList()}
              </div>
            </div>
          </div>

          <div className="relative flex-1 bg-white rounded-[24px] p-6 sm:p-8 shadow-sm border border-slate-100 flex flex-col min-[820px]:min-h-[581px]">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 transition-colors cursor-pointer border-none"
            >
              <svg width="10" height="10" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L13 13M1 13L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <div className="flex flex-col gap-4 flex-grow">
              <h2 className="text-[22px] font-bold text-[#0f172a] mb-1">
                Zaznamki za naročnika
              </h2>
              <p className="text-slate-500 text-[13px] font-medium mb-6">
                Dodajte opombo ali opomnik za tega partnerja.
              </p>

              <div className="flex min-[820px]:hidden flex-col w-full mb-4 pb-4 border-b border-slate-100">
                <div className="text-[10px] font-bold text-[#9CA9BD] uppercase tracking-widest mb-3">
                  OBSTOJEČI ZAZNAMKI
                </div>
                <div className="flex flex-col gap-3 overflow-y-auto max-h-[160px] pr-1">
                  {renderExistingList()}
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#9CA9BD] uppercase tracking-widest mb-1.5">
                    NAROČNIK:
                  </label>
                  {customerNameEditable ? (
                    <>
                      <input
                        type="text"
                        list="add-customer-note-options"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ime naročnika"
                        className="w-full h-11 px-4 rounded-[8px] border border-slate-300 bg-[#F1F5F9] text-[#0f172a] text-[14px] font-medium focus:outline-none focus:ring-1 focus:ring-[#1B3A6B]/20 focus:border-[#1B3A6B]"
                      />
                      <datalist id="add-customer-note-options">
                        {customerNameOptions.map((opt) => (
                          <option key={opt} value={opt} />
                        ))}
                      </datalist>
                    </>
                  ) : (
                    <input
                      type="text"
                      value={name}
                      disabled
                      className="w-full h-11 px-4 rounded-[8px] border border-slate-300 bg-slate-100/60 text-slate-500 text-[14px] font-medium cursor-not-allowed select-none focus:outline-none"
                    />
                  )}
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-[10px] font-bold text-[#9CA9BD] uppercase tracking-widest">
                      ZAZNAMEK *
                    </label>
                    <span className="text-[10px] font-bold text-slate-400">{noteText.length}/60</span>
                  </div>
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value.slice(0, 60))}
                    maxLength={60}
                    placeholder="Zapišite poljubno opombo za tega naročnika..."
                    rows={3}
                    className="w-full min-h-[80px] p-3 rounded-[8px] border border-slate-300 bg-[#F1F5F9] text-[#0f172a] text-[14px] font-medium focus:outline-none focus:ring-1 focus:ring-[#1B3A6B]/20 focus:border-[#1B3A6B] transition-all placeholder:text-slate-400 resize-none"
                  />
                  <p className="mt-1.5 text-[10px] text-slate-400/90 leading-normal">
                    Če gre za več opomnikov, je priporočljivo, da so zapisani ločeno, vsak za sebe.
                  </p>
                </div>

                <div className="flex flex-col gap-3 my-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setNoteType("once")}
                    className="flex items-center gap-3 text-left w-full bg-transparent border-none p-0 outline-none cursor-pointer group"
                  >
                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                        noteType === "once"
                          ? "border-green-600 bg-green-50 text-green-600"
                          : "border-slate-300 hover:border-slate-400 text-transparent"
                      }`}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    <span className="text-xs font-semibold text-slate-700 leading-snug group-hover:text-slate-900 transition-colors">
                      Zaznamek samo tokrat
                    </span>
                  </button>

                  <div className="text-[9px] font-extrabold text-slate-400/70 tracking-wider pl-8 uppercase">
                    ali
                  </div>

                  <button
                    type="button"
                    onClick={() => setNoteType("always")}
                    className="flex items-center gap-3 text-left w-full bg-transparent border-none p-0 outline-none cursor-pointer group"
                  >
                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                        noteType === "always"
                          ? "border-green-600 bg-green-50 text-green-600"
                          : "border-slate-300 hover:border-slate-400 text-transparent"
                      }`}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    <span className="text-xs font-semibold text-slate-700 leading-snug group-hover:text-slate-900 transition-colors">
                      Zaznamek vsakič pri tem naročniku; služi kot opomnik kasneje
                    </span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex mt-8 sm:mt-4">
              <button
                type="button"
                disabled={saving || !noteText.trim() || !name.trim()}
                onClick={() => void handleAdd()}
                className="w-full h-[48px] rounded-[8px] bg-[#0a1128] text-white font-bold text-[12px] uppercase tracking-widest shadow-lg shadow-[#0a1128]/20 hover:bg-[#152042] transition-all disabled:opacity-50 flex items-center justify-center cursor-pointer border-none"
              >
                {saving ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  "DODAJ"
                )}
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
