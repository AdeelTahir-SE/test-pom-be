code = '''"use client";

import React, { useState } from "react";
import { X, ChevronDown, ArrowLeft, Paperclip, Check } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/lib/useLanguage";
import { parseFlexibleDate, startOfLocalDay } from "@/lib/officeDate";
import { CustomerNotesBanner } from "./CustomerNotesBanner";

interface TaskStepInput {
  id: string;
  text: string;
  requiresAttachment: boolean;
}

function newStep(): TaskStepInput {
  return {
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2) + Date.now().toString(36),
    text: "",
    requiresAttachment: false,
  };
}

interface CustomerNote {
  id: string;
  text: string;
  createdAt?: string;
}

interface AddTaskModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  workers: { id: string; name: string; phone: string | null }[];
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

function getInitials(name?: string): string {
  if (!name?.trim()) return "JN";
  return name
    .trim()
    .split(/\\s+/)
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function WorkerAvatar({ initials }: { initials?: string }) {
  return (
    <div className="relative inline-flex items-center justify-center w-14 h-14 rounded-[14px] bg-gradient-to-b from-white to-slate-100 border border-white shadow-[0_16px_34px_-20px_rgba(15,23,42,0.55),inset_0_1px_0_white] shrink-0">
      <div className="absolute inset-1 rounded-[12px] bg-gradient-to-b from-blue-400 to-blue-600 border border-blue-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_10px_22px_rgba(59,130,246,0.28)]" />
      <span className="relative font-sans text-[18px] font-semibold text-white">
        {initials || "—"}
      </span>
    </div>
  );
}

export function AddTaskModal({
  isOpen,
  onOpenChange,
  workers,
  defaultDate = "",
  onAddTask,
}: AddTaskModalProps) {
  const { t, lang } = useLanguage();
  const uid = React.useId();
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
  // TODO: integrate customer notes fetching when API is ready
  const [customerNotes, setCustomerNotes] = useState<CustomerNote[]>([]);
  const hasNoSteps = !steps.some((s) => s.text.trim().length > 0);

  React.useEffect(() => {
    if (isOpen) {
      setDatum(defaultDate);
      setDateError(null);
      setWorkerId("");
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
    const trimmed = raw.trim();
    if (!trimmed) {
      setDateError(null);
      return true;
    }
    const parsed = parseFlexibleDate(trimmed);
    if (!parsed) {
      setDateError(lang === "sl" ? "Neveljaven datum." : "Invalid date.");
      return false;
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

  const handleAddTwoSteps = () => {
    setSteps((prev) => [...prev, newStep(), newStep()]);
  };

  const updateStepText = (id: string, text: string) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, text } : s)));
  };

  const toggleStepAttachment = (id: string) => {
    setSteps((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, requiresAttachment: !s.requiresAttachment } : s
      )
    );
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
      steps: valid.map((s) => ({
        text: s.text.trim(),
        requiresAttachment: s.requiresAttachment,
      })),
    });
    resetAll();
    onOpenChange(false);
  };

  const selectedWorker = workers.find((w) => w.id === workerId);
  const selectedWorkerName = selectedWorker?.name;
  const selectedWorkerPhone = selectedWorker?.phone;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        onOpenChange(open);
        if (!open) resetAll();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="w-full max-w-[calc(100%-2rem)] min-[450px]:w-[450px] min-[820px]:w-[760px] sm:max-w-[calc(100%-2rem)] outline-none mx-auto p-3 bg-[#f1f5f9] rounded-[24px] min-[820px]:rounded-[32px] border-none shadow-2xl flex flex-col gap-0"
      >
        <DialogTitle className="sr-only">Dodaj opravilo</DialogTitle>

        <style
          dangerouslySetInnerHTML={{
            __html: `
          .custom-ios-scrollbar::-webkit-scrollbar { width: 5px; }
          .custom-ios-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-ios-scrollbar::-webkit-scrollbar-thumb { background: rgba(109,119,142,0.45); border-radius: 9999px; }
          .custom-ios-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(109,119,142,0.65); }
        `,
          }}
        />

        <div className="flex flex-col min-[820px]:flex-row items-stretch w-full gap-3">
          {/* Left Column */}
          <div className="flex w-full min-[820px]:w-[260px] flex-col min-[820px]:min-h-[581px] gap-3">
            {/* DELAVEC Card */}
            <div className="relative bg-white rounded-[20px] p-6 shadow-sm border border-slate-100 flex flex-col">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 min-[820px]:hidden transition-colors"
              >
                <X className="w-2.5 h-2.5" />
              </button>

              <div className="text-[10px] font-bold text-[#9CA9BD] uppercase tracking-widest mb-4">
                {lang === "sl" ? "TEREN" : "FIELD"}
              </div>

              {workerId ? (
                <div className="flex items-center gap-4">
                  <WorkerAvatar initials={getInitials(selectedWorkerName)} />
                  <div className="flex flex-col overflow-hidden">
                    <div className="font-semibold text-[#0f172a] text-sm truncate">
                      {selectedWorkerName}
                    </div>
                    {selectedWorkerPhone ? (
                      <div className="text-[#64748b] text-xs font-normal mt-0.5">
                        Tel. {selectedWorkerPhone}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <WorkerAvatar />
                  <div className="flex flex-col overflow-hidden">
                    <div className="font-bold text-[#0f172a] text-base truncate">
                      {lang === "sl" ? "Izberi delavca" : "Select worker"}
                    </div>
                    <div className="text-[#64748b] text-[13px] font-medium mt-0.5">
                      {lang === "sl" ? "Še ni izbran" : "Not selected yet"}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* PREGLED Card */}
            <div className="hidden min-[820px]:flex bg-white rounded-[20px] p-6 shadow-sm border border-slate-100 flex-1 flex-col">
              <div className="text-[10px] font-bold text-[#9CA9BD] uppercase tracking-widest mb-5">
                {lang === "sl" ? "PREGLED" : "OVERVIEW"}
              </div>

              <div className="flex flex-col gap-2">
                {opravilo && (
                  <div className="flex items-center gap-2 text-slate-700 font-medium">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-700 shrink-0" />
                    <span className="text-xs truncate">{opravilo}</span>
                  </div>
                )}
                {kraj && (
                  <div className="flex items-center gap-2 text-slate-700 font-medium">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-700 shrink-0" />
                    <span className="text-xs truncate">{kraj}</span>
                  </div>
                )}
                {narocnik && (
                  <div className="flex items-center gap-2 text-slate-700 font-medium">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-700 shrink-0" />
                    <span className="text-xs truncate">{narocnik}</span>
                  </div>
                )}
                {datum && (
                  <div className="flex items-center gap-2 text-slate-700 font-medium">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-700 shrink-0" />
                    <span className="text-xs truncate">{datum}</span>
                  </div>
                )}
                {workerId && (
                  <div className="flex items-center gap-2 text-slate-700 font-medium">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-700 shrink-0" />
                    <span className="text-xs truncate">{selectedWorkerName}</span>
                  </div>
                )}
              </div>

              <div className="mt-auto pt-8">
                <div className="w-full h-1.5 bg-[#cbd5e1] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#2b5493] rounded-full transition-all duration-300"
                    style={{ width: `${(step / 2) * 100}%` }}
                  />
                </div>
                <div className="text-right text-[11px] text-slate-700 font-bold mt-2">
                  {step}/2 {lang === "sl" ? "korak" : "step"}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="relative flex-1 bg-white rounded-[24px] p-6 sm:p-8 shadow-sm border border-slate-100 flex flex-col min-[820px]:min-h-[581px]">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="absolute top-4 right-4 w-7 h-7 hidden min-[820px]:flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 transition-colors"
            >
              <X className="w-2.5 h-2.5" />
            </button>

            {step === 1 ? (
              <>
                <h2 className="text-[22px] font-bold text-[#0f172a] mb-1">
                  {lang === "sl" ? "Dodaj opravilo" : "Add task"}
                </h2>
                <p className="text-slate-500 text-[13px] font-medium mb-6">
                  {lang === "sl"
                    ? "Vnesite podatke za novo delovno nalogo."
                    : "Enter details for the new work task."}
                </p>

                <form
                  onSubmit={handleNext}
                  className="flex-1 flex flex-col justify-between"
                >
                  <div className="flex flex-col gap-4">
                    {/* Opravilo */}
                    <div>
                      <label
                        htmlFor={`${uid}-opravilo`}
                        className="block text-[10px] font-bold text-[#9CA9BD] uppercase tracking-widest mb-1.5"
                      >
                        {lang === "sl" ? "OPRAVILO" : "TASK"}
                      </label>
                      <input
                        id={`${uid}-opravilo`}
                        className="w-full h-11 px-4 rounded-lg border border-slate-300 bg-[#F1F5F9] text-[#0f172a] text-sm font-medium focus:outline-none focus:ring-1 focus:ring-[#1c305a]/20 focus:border-[#1c305a] transition-all placeholder:text-slate-400"
                        value={opravilo}
                        onChange={(e) => setOpravilo(e.target.value)}
                        placeholder={
                          t("modalTaskFieldPlaceholder") || "Prenova kopalnice"
                        }
                        maxLength={22}
                        required
                      />
                    </div>

                    {/* Naročnik */}
                    <div>
                      <label
                        htmlFor={`${uid}-narocnik`}
                        className="block text-[10px] font-bold text-[#9CA9BD] uppercase tracking-widest mb-1.5"
                      >
                        {lang === "sl" ? "NAROČNIK" : "CUSTOMER"}
                      </label>
                      <input
                        id={`${uid}-narocnik`}
                        className="w-full h-11 px-4 rounded-lg border border-slate-300 bg-[#F1F5F9] text-[#0f172a] text-sm font-medium focus:outline-none focus:ring-1 focus:ring-[#1c305a]/20 focus:border-[#1c305a] transition-all placeholder:text-slate-400"
                        value={narocnik}
                        onChange={(e) => setNarocnik(e.target.value)}
                        placeholder={
                          t("modalTaskCustomerPlaceholder") || "Novak d.o.o."
                        }
                        maxLength={22}
                      />
                    </div>

                    {/* Kraj & Datum */}
                    <div className="flex flex-row gap-4 mt-6 sm:mt-0">
                      <div className="flex-1">
                        <label
                          htmlFor={`${uid}-kraj`}
                          className="block text-[10px] font-bold text-[#9CA9BD] uppercase tracking-widest mb-1.5"
                        >
                          {lang === "sl" ? "KRAJ" : "LOCATION"}
                        </label>
                        <input
                          id={`${uid}-kraj`}
                          className="w-full h-11 px-4 rounded-lg border border-slate-300 bg-[#F1F5F9] text-[#0f172a] text-sm font-medium focus:outline-none focus:ring-1 focus:ring-[#1c305a]/20 focus:border-[#1c305a] transition-all placeholder:text-slate-400"
                          value={kraj}
                          onChange={(e) => setKraj(e.target.value)}
                          placeholder={
                            t("modalTaskLocationPlaceholder") || "Ljubljana"
                          }
                          maxLength={18}
                        />
                      </div>
                      <div className="w-[120px] shrink-0">
                        <label
                          htmlFor={`${uid}-datum`}
                          className="block text-[10px] font-bold text-[#9CA9BD] uppercase tracking-widest mb-1.5"
                        >
                          {lang === "sl" ? "DATUM" : "DATE"}
                        </label>
                        <input
                          id={`${uid}-datum`}
                          className={`w-full h-11 px-4 rounded-lg border text-sm font-medium focus:outline-none focus:ring-1 focus:ring-[#1c305a]/20 focus:border-[#1c305a] transition-all placeholder:text-slate-400 ${
                            dateError
                              ? "border-red-300 ring-1 ring-red-300 bg-red-50"
                              : "border-slate-300 bg-[#F1F5F9]"
                          }`}
                          value={datum}
                          onChange={(e) => {
                            setDatum(e.target.value);
                            if (dateError) setDateError(null);
                          }}
                          placeholder="02.02.2026"
                          maxLength={10}
                        />
                        {dateError && (
                          <p className="mt-1 text-[11px] text-red-500 font-medium">
                            {dateError}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Delavec */}
                    <div>
                      <label
                        htmlFor={`${uid}-worker`}
                        className="block text-[10px] font-bold text-[#9CA9BD] uppercase tracking-widest mb-1.5"
                      >
                        {lang === "sl" ? "KDO" : "WHO"}
                      </label>
                      <div className="relative w-full">
                        <select
                          id={`${uid}-worker`}
                          className="w-full h-11 pl-4 pr-10 rounded-lg border border-slate-300 bg-[#F1F5F9] text-[#0f172a] text-sm font-medium focus:outline-none focus:ring-1 focus:ring-[#1c305a]/20 focus:border-[#1c305a] transition-all appearance-none"
                          value={workerId}
                          onChange={(e) => setWorkerId(e.target.value)}
                          required
                        >
                          <option value="" disabled>
                            {t("modalTaskWorkerSelect") ||
                              (lang === "sl"
                                ? "Izberi terenca"
                                : "Select field worker")}
                          </option>
                          {workers.map((w) => (
                            <option key={w.id} value={w.id}>
                              {w.name}
                            </option>
                          ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                          <ChevronDown className="w-2.5 h-1.5" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex mt-8 sm:mt-4">
                    <button
                      type="submit"
                      className="w-full h-12 rounded-lg bg-[#0A1128] text-white font-bold text-xs uppercase tracking-widest shadow-lg shadow-[#0A1128]/20 hover:bg-[#152042] transition-all"
                    >
                      {lang === "sl" ? "NAPREJ" : "NEXT"}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <div className="relative text-center flex flex-col gap-1 pb-4 border-b border-slate-100/80 mb-6">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="absolute left-0 top-1/2 -translate-y-1/2 text-[#1c305a] hover:text-[#2b5493] transition-colors cursor-pointer border-none bg-transparent outline-none p-1"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    {selectedWorkerName ||
                      (lang === "sl" ? "Izberi delavca" : "Select worker")}
                  </span>
                  <h3 className="text-2xl font-bold tracking-tight text-[#0f172a]">
                    {lang === "sl" ? "Dodaj nalogo" : "Add subtask"}
                  </h3>
                </div>

                <form
                  onSubmit={handleSubmit}
                  className="flex-1 flex flex-col justify-between"
                >
                  <div className="flex flex-col gap-4">
                    {customerNotes.length > 0 && (
                      <CustomerNotesBanner notes={customerNotes} compact />
                    )}

                    <div>
                      <div className="flex items-center gap-3 w-full mb-2">
                        <div className="flex-1">
                          <label className="block text-[10px] font-bold text-[#9CA9BD] uppercase tracking-widest">
                            {lang === "sl" ? "NALOGE" : "TASKS"}
                          </label>
                        </div>
                        <div
                          className="shrink-0 w-8 flex justify-center"
                          title={
                            t("modalStepAttachmentTitle") ||
                            (lang === "sl"
                              ? "Slikaj ob zaključku"
                              : "Photo required at completion")
                          }
                        >
                          <Paperclip className="w-3.5 h-3.5 text-[#64748B]" />
                        </div>
                        <div className="shrink-0 w-8" />
                      </div>
                      <div className="flex flex-col gap-2 max-h-[380px] overflow-y-auto pr-1 custom-ios-scrollbar">
                        {steps.map((s, index) => (
                          <div key={s.id} className="flex items-center gap-3 w-full">
                            <input
                              type="text"
                              value={s.text}
                              onChange={(e) =>
                                updateStepText(s.id, e.target.value.slice(0, 28))
                              }
                              placeholder={
                                lang === "sl"
                                  ? `Dodaj nalogo ${index + 1}`
                                  : `Add subtask ${index + 1}`
                              }
                              maxLength={28}
                              className="flex-1 h-9 px-3 rounded-lg border border-slate-300 bg-[#F1F5F9] text-[#0f172a] text-[13px] font-medium focus:outline-none focus:ring-1 focus:ring-[#1c305a]/20 focus:border-[#1c305a] transition-all placeholder:text-slate-400"
                            />

                            <button
                              type="button"
                              onClick={() => toggleStepAttachment(s.id)}
                              className="shrink-0 w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-200 cursor-pointer"
                              style={{
                                background: s.requiresAttachment
                                  ? "#1c305a"
                                  : "white",
                                borderColor: s.requiresAttachment
                                  ? "#1c305a"
                                  : "#cbd5e1",
                              }}
                            >
                              {s.requiresAttachment ? (
                                <Check className="w-2.5 h-2 text-white" strokeWidth={3} />
                              ) : null}
                            </button>

                            {steps.length > 1 ? (
                              <button
                                type="button"
                                onClick={() => removeStep(s.id)}
                                className="shrink-0 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-500 transition-all cursor-pointer border-none bg-transparent"
                                title={
                                  lang === "sl"
                                    ? "Izbriši nalogo"
                                    : "Delete subtask"
                                }
                              >
                                <X className="w-4 h-4" />
                              </button>
                            ) : (
                              <div className="shrink-0 w-8 h-8 flex items-center justify-center text-slate-300/40 cursor-not-allowed">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <button
                        type="button"
                        onClick={handleAddTwoSteps}
                        className="w-8 h-8 rounded-full border border-slate-200 bg-white text-slate-700 font-bold text-[13px] hover:bg-slate-50 transition-all flex items-center justify-center cursor-pointer shadow-sm"
                      >
                        +1
                      </button>
                    </div>
                  </div>

                  <div className="flex mt-4 justify-center w-full">
                    <button
                      type="submit"
                      disabled={hasNoSteps}
                      className={`h-12 px-10 rounded-lg font-bold text-xs uppercase tracking-widest transition-all shadow-md flex items-center justify-center ${
                        hasNoSteps
                          ? "bg-[#94a3b8]/60 text-white/80 cursor-not-allowed"
                          : "bg-[#0A1128] text-white hover:bg-[#152042] shadow-lg shadow-[#0A1128]/20"
                      }`}
                    >
                      {lang === "sl" ? "DODAJ NA URNIK" : "ADD TO SCHEDULE"}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
'''

with open('/mnt/agents/output/AddTaskModal.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Shranjeno.")
