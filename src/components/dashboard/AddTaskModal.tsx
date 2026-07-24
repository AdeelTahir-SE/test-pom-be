"use client";

import React, { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useLanguage } from "@/lib/useLanguage";
import { api } from "@/lib/api-client";
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

interface CustomerNoteDto {
  id: string;
  note: string;
  created_at: string;
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
  const { t } = useLanguage();
  const [step, setStep] = useState<1 | 2>(1);
  const [opravilo, setOpravilo] = useState("");
  const [kraj, setKraj] = useState("");
  const [narocnik, setNarocnik] = useState("");
  const [datum, setDatum] = useState(defaultDate);
  const [workerId, setWorkerId] = useState("");
  const [steps, setSteps] = useState<TaskStepInput[]>([newStep()]);
  const [customerNotes, setCustomerNotes] = useState<CustomerNoteDto[]>([]);
  const notesRequestRef = useRef(0);

  React.useEffect(() => {
    if (isOpen) setDatum(defaultDate);
  }, [isOpen, defaultDate]);

  useEffect(() => {
    if (!isOpen) return;
    const name = narocnik.trim();
    if (name.length < 2) {
      setCustomerNotes([]);
      return;
    }
    const requestId = ++notesRequestRef.current;
    const timer = window.setTimeout(async () => {
      const res = await api.get<{ notes: CustomerNoteDto[] }>(
        `/api/customers/notes?name=${encodeURIComponent(name)}`
      );
      if (notesRequestRef.current !== requestId) return;
      if (res.status === 200 && res.data) setCustomerNotes(res.data.notes);
      else setCustomerNotes([]);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [narocnik, isOpen]);

  const resetAll = () => {
    setStep(1);
    setOpravilo("");
    setKraj("");
    setNarocnik("");
    setDatum(defaultDate);
    setWorkerId("");
    setSteps([newStep()]);
    setCustomerNotes([]);
  };

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerId || !opravilo) return;
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
    onAddTask({
      workerId,
      opravilo,
      kraj,
      narocnik,
      datum,
      steps: steps.filter((s) => s.text.trim().length > 0).map((s) => ({ text: s.text.trim(), requiresAttachment: s.requiresAttachment })),
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
          maxWidth: "420px",
          width: "92%",
        }}
        className="outline-none max-h-[92vh] overflow-y-auto"
      >
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
                    maxLength={40}
                    placeholder={t("modalTaskCustomerPlaceholder")}
                  />
                </div>

                {customerNotes.length > 0 && (
                  <CustomerNotesBanner notes={customerNotes} compact />
                )}

                <div>
                  <AuraLabel>{t("modalTaskDate")}</AuraLabel>
                  <AuraInput
                    type="text"
                    value={datum}
                    onChange={(e) => setDatum(e.target.value)}
                    maxLength={10}
                    placeholder="02.02.2026"
                    className="placeholder:text-slate-300"
                  />
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
              <div className="text-center">
                <h3 className="text-xl font-semibold tracking-tight text-slate-900">
                  {t("modalTaskStepsHeading")}
                </h3>
              </div>

              {customerNotes.length > 0 && (
                <CustomerNotesBanner notes={customerNotes} compact />
              )}

              <div className="flex flex-col gap-2">
                {steps.map((s, index) => (
                  <div key={s.id} className="flex items-start gap-2">
                    <span className="text-[10px] text-slate-400 font-semibold mt-2.5 w-4 shrink-0">
                      {index + 1}.
                    </span>
                    <div className="flex-1 min-w-0">
                      <AuraInput
                        type="text"
                        value={s.text}
                        onChange={(e) => updateStepText(s.id, e.target.value.slice(0, 30))}
                        maxLength={30}
                        placeholder={t("modalStepPlaceholder")}
                      />
                      <span className="text-[10px] text-slate-400">{s.text.length}/30</span>
                    </div>
                    <AuraIconButton
                      active={s.requiresAttachment}
                      onClick={() => toggleStepAttachment(s.id)}
                      icon={
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                        </svg>
                      }
                      title={t("modalStepAttachmentTitle")}
                    />
                    <button
                      type="button"
                      onClick={() => removeStep(s.id)}
                      className="shrink-0 mt-1.5 p-1.5 text-slate-300 hover:text-red-500 bg-transparent border-none outline-none"
                      aria-label={t("modalDeleteStep")}
                      title={t("modalDeleteStep")}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleAddTwoSteps}
                className="text-xs font-semibold text-[#1B3A6B] hover:underline self-center"
              >
                {t("modalTaskAddSteps")}
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 h-10 rounded-xl border border-slate-200 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  {t("modalTaskBack")}
                </button>
                <button type="submit" className={`flex-1 ${auraButton}`}>
                  {t("modalScheduleSubmit")}
                </button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
