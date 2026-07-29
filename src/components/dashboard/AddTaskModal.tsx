"use client";

import React, { useState, useRef } from "react";
import { X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useLanguage } from "@/lib/useLanguage";
import { parseFlexibleDate, startOfLocalDay } from "@/lib/officeDate";
import { CustomerNotesBanner } from "./CustomerNotesBanner";
import {
  AuraLabel,
  AuraInput,
  AuraSelect,
  AuraIconButton,
  auraCard,
  auraButton,
} from "./AuraForm";

interface TaskStepInput {
  id: string;
  text: string;
  requiresAttachment: boolean;
}

function newStep(): TaskStepInput {
  return { id: Math.random().toString(36).slice(2), text: "", requiresAttachment: false };
}

interface AddTaskModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  workers: { id: string; name: string }[];
  /** Prefill date field (DD.MM.YYYY) from the office day navigator. */
  defaultDate?: string;
  onAddTask: (taskData: {
    workerId: string;
    opravilo: string;
    kraj: string;
    narocnik: string;
    datum: string;
    steps: { text: string; requiresAttachment: boolean }[];
  }) => void;
}

export function AddTaskModal({ isOpen, onOpenChange, workers, defaultDate = "", onAddTask }: AddTaskModalProps) {
  const { t, lang } = useLanguage();
  const [step, setStep] = useState<1 | 2>(1);
  const [opravilo, setOpravilo] = useState("");
  const [kraj, setKraj] = useState("");
  const [narocnik, setNarocnik] = useState("");
  const [datum, setDatum] = useState(defaultDate);
  const [dateError, setDateError] = useState<string | null>(null);
  const [workerId, setWorkerId] = useState("");
  const [steps, setSteps] = useState<TaskStepInput[]>(() => [
    newStep(),
    newStep(),
    newStep(),
    newStep(),
  ]);
  const [customerNotes, setCustomerNotes] = useState<any[]>([]);
  const notesRequestRef = useRef(0);
  const hasNoSteps = steps.filter((s) => s.text.trim().length > 0).length === 0;

  React.useEffect(() => {
    if (isOpen) {
      setDatum(defaultDate);
      setDateError(null);
    }
  }, [isOpen, defaultDate]);

  const resetAll = () => {
    setStep(1);
    setOpravilo("");
    setKraj("");
    setNarocnik("");
    setDatum(defaultDate);
    setDateError(null);
    setWorkerId("");
    setSteps([newStep(), newStep(), newStep(), newStep()]);
    setCustomerNotes([]);
  };

  const assertDateNotPast = (raw: string): boolean => {
    const parsed = parseFlexibleDate(raw);
    if (!parsed) {
      // Empty / unparsed — board will default to selected day; allow through.
      setDateError(null);
      return true;
    }
    if (parsed.getTime() < startOfLocalDay().getTime()) {
      setDateError("Datum ne sme biti v preteklosti.");
      return false;
    }
    setDateError(null);
    return true;
  };

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerId || !opravilo) return;
    if (!assertDateNotPast(datum)) return;
    setStep(2);
  };

  // Clicking "add steps" appends two empty rows at once, not one — matches
  // the reference behavior explicitly requested by the client.
  const handleAddTwoSteps = () => {
    setSteps((prev) => [...prev, newStep(), newStep()]);
  };

  const updateStepText = (id: string, text: string) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, text } : s)));
  };

  const toggleStepAttachment = (id: string) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, requiresAttachment: !s.requiresAttachment } : s)));
  };

  const removeStep = (id: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const valid = steps.filter((s) => s.text.trim().length > 0);
    if (valid.length === 0) return;
    if (!assertDateNotPast(datum)) {
      setStep(1);
      return;
    }
    onAddTask({
      workerId,
      opravilo,
      kraj,
      narocnik,
      datum,
      steps: valid.map((s) => ({ text: s.text.trim(), requiresAttachment: s.requiresAttachment })),
    });
    resetAll();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        onOpenChange(open);
        if (!open) resetAll();
      }}
    >
      <DialogContent
        style={{
          background: "transparent",
          border: "none",
          boxShadow: "none",
          padding: 0,
          maxWidth: "380px",
          width: "90%",
        }}
        className="outline-none"
      >
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
        <div className={auraCard}>
          {step === 1 ? (
            <form onSubmit={handleNext} className="flex flex-col gap-4 text-slate-800">
              <div className="text-center">
                <h3 className="text-xl font-semibold tracking-tight text-slate-900">
                  {t("modalTaskTitle")}
                </h3>
              </div>

              <div className="flex flex-col gap-3">
                <div>
                  <AuraLabel strong>{t("modalTaskFieldLabel")}</AuraLabel>
                  <AuraInput
                    type="text"
                    value={opravilo}
                    onChange={(e) => setOpravilo(e.target.value)}
                    maxLength={22}
                    required
                    strong
                    placeholder={t("modalTaskFieldPlaceholder")}
                  />
                </div>

                <div>
                  <AuraLabel>{t("modalTaskLocation")}</AuraLabel>
                  <AuraInput
                    type="text"
                    value={kraj}
                    onChange={(e) => setKraj(e.target.value)}
                    maxLength={15}
                    placeholder={t("modalTaskLocationPlaceholder")}
                  />
                </div>

                <div>
                  <AuraLabel>{t("modalTaskCustomer")}</AuraLabel>
                  <AuraInput
                    type="text"
                    value={narocnik}
                    onChange={(e) => setNarocnik(e.target.value)}
                    maxLength={22}
                    placeholder={t("modalTaskCustomerPlaceholder")}
                  />
                </div>

                <div>
                  <AuraLabel>{t("modalTaskDate")}</AuraLabel>
                  <AuraInput
                    type="text"
                    value={datum}
                    onChange={(e) => {
                      setDatum(e.target.value);
                      if (dateError) setDateError(null);
                    }}
                    maxLength={10}
                    placeholder="02.02.2026"
                    className="placeholder:text-slate-300"
                  />
                  {dateError && (
                    <p className="mt-1 text-[11px] text-red-500">{dateError}</p>
                  )}
                </div>

                <div>
                  <AuraLabel strong>{t("modalTaskWorker")}</AuraLabel>
                  <AuraSelect
                    value={workerId}
                    onChange={(e) => setWorkerId(e.target.value)}
                    required
                    strong
                  >
                    <option value="" disabled>{t("modalTaskWorkerSelect")}</option>
                    {workers.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </AuraSelect>
                </div>
              </div>

              <button type="submit" className={auraButton}>
                {t("modalTaskNext")}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-slate-800">
              {/* Header Part 2 - Center aligned with Back navigation */}
              <div className="relative text-center flex flex-col gap-1 pb-2 border-b border-slate-100/80">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer border-none bg-transparent outline-none p-1"
                  title={t("modalTaskBack")}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12"></line>
                    <polyline points="12 19 5 12 12 5"></polyline>
                  </svg>
                </button>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  {(() => {
                    const name = workers.find((w) => w.id === workerId)?.name || "";
                    return name ? name.toUpperCase() : "DELAVEC";
                  })()}
                </span>
                <h3 className="text-2xl font-bold tracking-tight text-slate-900">
                  Dodaj nalogo
                </h3>
              </div>

              {customerNotes.length > 0 && (
                <CustomerNotesBanner notes={customerNotes} compact />
              )}
              {/* Tasks List container */}
              <div className="flex flex-col gap-3.5 max-h-[320px] overflow-y-auto p-1.5 custom-ios-scrollbar">
                {steps.map((s, index) => (
                  <div key={s.id} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <AuraLabel strong className="text-[10px]">
                        NALOGA {index + 1}:
                      </AuraLabel>
                      {index === 0 && (
                        <div className="w-[38px] flex justify-center mb-1" title={t("modalStepAttachmentTitle")}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2">
                            <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <AuraInput
                        type="text"
                        value={s.text}
                        onChange={(e) => updateStepText(s.id, e.target.value.slice(0, 30))}
                        placeholder={`Vnesite nalogo ${index + 1}...`}
                        className="bg-slate-50 border-none ring-1 ring-[#1B3A6B]/15 focus:ring-2 focus:ring-[#1B3A6B]"
                        strong
                      />
                      <button
                        type="button"
                        onClick={() => toggleStepAttachment(s.id)}
                        className="shrink-0 flex items-center justify-center rounded-xl border transition-all duration-200"
                        style={{
                          width: "38px",
                          height: "38px",
                          background: s.requiresAttachment ? "#1B3A6B" : "white",
                          borderColor: s.requiresAttachment ? "#1B3A6B" : "#E2E8F0",
                          cursor: "pointer",
                        }}
                      >
                        {s.requiresAttachment && (
                          <svg width="12" height="10" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </button>

                      {/* Small delete icon only for additional steps beyond the first 4 */}
                      {steps.length > 4 && (
                        <button
                          type="button"
                          onClick={() => removeStep(s.id)}
                          className="shrink-0 p-1 text-slate-300 hover:text-red-500 bg-transparent border-none outline-none transition-colors"
                          aria-label={t("modalDeleteStep")}
                          title={t("modalDeleteStep")}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Row Button */}
              <div>
                <button
                  type="button"
                  onClick={handleAddTwoSteps}
                  className="w-12 h-9 rounded-xl border border-[#3B82F6]/20 bg-slate-50 text-slate-700 font-semibold text-sm hover:bg-slate-100 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
                >
                  +1
                </button>
              </div>

              {hasNoSteps && (
                <div className="text-center text-xs font-semibold text-red-500 py-1">
                  Dodaj vsaj eno nalogo.
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={hasNoSteps}
                className={`w-full ${auraButton} ${hasNoSteps ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {t("modalScheduleSubmit")}
              </button>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
