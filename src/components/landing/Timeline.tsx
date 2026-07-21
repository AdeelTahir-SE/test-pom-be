"use client";

import React from "react";
import { useLanguage } from "@/lib/useLanguage";

export function Timeline() {
  const { t } = useLanguage();

  return (
    <section id="workflow" className="max-w-7xl mx-auto px-3 md:px-6 pb-20 relative">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes auraConnectionFlow {
          0% { left: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { left: 80%; opacity: 0; }
        }
      `}} />

      {/* Section Intro */}
      <div className="text-center max-w-5xl mx-auto mb-16">
        <p className="font-['Inter',sans-serif] text-[10px] md:text-xs font-semibold tracking-[-0.04em] text-blue-500 mb-4 uppercase">
          {t("timelineTitle")}
        </p>
        <h2 className="text-3xl md:text-5xl font-normal tracking-tight text-slate-950 max-w-2xl mx-auto">
          {t("timelineSubtitle")}
        </h2>
      </div>

      {/* Timeline Shell */}
      <div className="relative overflow-hidden rounded-[2.75rem] bg-white/55 backdrop-blur-xl border border-white shadow-[0_30px_80px_-45px_rgba(15,23,42,0.35),inset_0_1px_0_rgba(255,255,255,1)] px-6 md:px-10 pt-16 pb-12">
        {/* Soft background glows */}
        <div className="absolute top-[-35%] left-[10%] w-[32rem] h-[32rem] rounded-full bg-blue-200/35 blur-[6rem] pointer-events-none" />
        <div className="absolute bottom-[-35%] right-[5%] w-[30rem] h-[30rem] rounded-full bg-sky-200/22 blur-[6rem] pointer-events-none" />

        {/* Subtle grid texture */}
        <div className="absolute inset-0 opacity-[0.16] pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(15,23,42,0.10) 1px, transparent 0)", backgroundSize: "2rem 2rem" }} />

        {/* Timeline Area */}
        <div className="relative">
          {/* Animated Connection Line */}
          <div className="hidden lg:block absolute left-0 right-0 top-[3.05rem] h-px">
            <div className="absolute inset-x-12 top-0 border-t border-dashed border-blue-300/60" />
            <div className="absolute top-[-1px] left-12 h-[2px] w-52 bg-gradient-to-r from-transparent via-[#1B3A6B] to-transparent rounded-full" style={{ animation: "auraConnectionFlow 4.5s linear infinite" }} />
          </div>

          {/* Premium Light Glow Behind Steps */}
          <div className="hidden lg:block pointer-events-none absolute top-4 left-1/2 h-20 w-full max-w-5xl -translate-x-1/2 rounded-full bg-gradient-to-r from-transparent via-blue-300/35 to-transparent blur-2xl" />
          <div className="hidden lg:block pointer-events-none absolute top-7 left-1/2 h-10 w-3/4 -translate-x-1/2 rounded-full bg-gradient-to-r from-transparent via-sky-200/45 to-transparent blur-xl" />

          {/* Steps Grid */}
          <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {/* Step 01 */}
            <div className="group relative flex flex-col items-center text-center">
              <div className="h-24 w-full relative flex items-center justify-center">
                <span className="relative inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-b from-white to-slate-100 border border-white shadow-[0_16px_34px_-20px_rgba(15,23,42,0.55),inset_0_1px_0_white]">
                  <span className="absolute inset-1 rounded-full bg-gradient-to-b from-blue-400 to-blue-600 border border-blue-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_10px_22px_rgba(59,130,246,0.28)]" />
                  <span className="relative font-['Inter',sans-serif] text-sm font-semibold text-white">01</span>
                </span>
              </div>
              <div className="mt-4 rounded-[2rem] bg-white/70 border border-white p-6 min-h-[15rem] shadow-[0_16px_36px_-26px_rgba(15,23,42,0.32),inset_0_1px_0_white] group-hover:-translate-y-1 group-hover:bg-white/85 transition-all duration-300 flex flex-col justify-between">
                <div>
                  <div className="w-11 h-11 mx-auto rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center shadow-[inset_0_1px_0_white] mb-5">
                    <iconify-icon icon="solar:document-text-linear" style={{ strokeWidth: 1.5 }} className="text-2xl text-blue-500" />
                  </div>
                  <h3 className="text-lg font-semibold tracking-tight text-slate-950">
                    {t("timelineStep1Title")}
                  </h3>
                  <p className="mt-3 text-xs leading-6 text-slate-500 font-light">
                    {t("timelineStep1Desc")}
                  </p>
                </div>
                <div className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-blue-50 border border-blue-100 px-3 py-1.5 text-[10px] font-semibold text-blue-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  Nalog pripravljen
                </div>
              </div>
            </div>

            {/* Step 02 */}
            <div className="group relative flex flex-col items-center text-center">
              <div className="h-24 w-full relative flex items-center justify-center">
                <span className="relative inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-b from-white to-slate-100 border border-white shadow-[0_16px_34px_-20px_rgba(15,23,42,0.55),inset_0_1px_0_white]">
                  <span className="absolute inset-1 rounded-full bg-gradient-to-b from-blue-400 to-blue-600 border border-blue-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_10px_22px_rgba(59,130,246,0.28)]" />
                  <span className="relative font-['Inter',sans-serif] text-sm font-semibold text-white">02</span>
                </span>
              </div>
              <div className="mt-4 rounded-[2rem] bg-white/70 border border-white p-6 min-h-[15rem] shadow-[0_16px_36px_-26px_rgba(15,23,42,0.32),inset_0_1px_0_white] group-hover:-translate-y-1 group-hover:bg-white/85 transition-all duration-300 flex flex-col justify-between">
                <div>
                  <div className="w-11 h-11 mx-auto rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center shadow-[inset_0_1px_0_white] mb-5">
                    <iconify-icon icon="solar:phone-linear" style={{ strokeWidth: 1.5 }} className="text-2xl text-blue-500" />
                  </div>
                  <h3 className="text-lg font-semibold tracking-tight text-slate-950">
                    {t("timelineStep2Title")}
                  </h3>
                  <p className="mt-3 text-xs leading-6 text-slate-500 font-light">
                    {t("timelineStep2Desc")}
                  </p>
                </div>
                <div className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-blue-50 border border-blue-100 px-3 py-1.5 text-[10px] font-semibold text-blue-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  Terenska sinhronizacija
                </div>
              </div>
            </div>

            {/* Step 03 */}
            <div className="group relative flex flex-col items-center text-center">
              <div className="h-24 w-full relative flex items-center justify-center">
                <span className="relative inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-b from-white to-slate-100 border border-white shadow-[0_16px_34px_-20px_rgba(15,23,42,0.55),inset_0_1px_0_white]">
                  <span className="absolute inset-1 rounded-full bg-gradient-to-b from-blue-400 to-blue-600 border border-blue-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_10px_22px_rgba(59,130,246,0.28)]" />
                  <span className="relative font-['Inter',sans-serif] text-sm font-semibold text-white">03</span>
                </span>
              </div>
              <div className="mt-4 rounded-[2rem] bg-white/70 border border-white p-6 min-h-[15rem] shadow-[0_16px_36px_-26px_rgba(15,23,42,0.32),inset_0_1px_0_white] group-hover:-translate-y-1 group-hover:bg-white/85 transition-all duration-300 flex flex-col justify-between">
                <div>
                  <div className="w-11 h-11 mx-auto rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center shadow-[inset_0_1px_0_white] mb-5">
                    <iconify-icon icon="solar:monitor-linear" style={{ strokeWidth: 1.5 }} className="text-2xl text-blue-500" />
                  </div>
                  <h3 className="text-lg font-semibold tracking-tight text-slate-950">
                    {t("timelineStep3Title")}
                  </h3>
                  <p className="mt-3 text-xs leading-6 text-slate-500 font-light">
                    {t("timelineStep3Desc")}
                  </p>
                </div>
                <div className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-blue-50 border border-blue-100 px-3 py-1.5 text-[10px] font-semibold text-blue-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  Spremljanje v živo
                </div>
              </div>
            </div>

            {/* Step 04 */}
            <div className="group relative flex flex-col items-center text-center">
              <div className="h-24 w-full relative flex items-center justify-center">
                <span className="relative inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-b from-white to-slate-100 border border-white shadow-[0_16px_34px_-20px_rgba(15,23,42,0.55),inset_0_1px_0_white]">
                  <span className="absolute inset-1 rounded-full bg-gradient-to-b from-blue-400 to-blue-600 border border-blue-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_10px_22px_rgba(59,130,246,0.28)]" />
                  <span className="relative font-['Inter',sans-serif] text-sm font-semibold text-white">04</span>
                </span>
              </div>
              <div className="mt-4 rounded-[2rem] bg-white/70 border border-white p-6 min-h-[15rem] shadow-[0_16px_36px_-26px_rgba(15,23,42,0.32),inset_0_1px_0_white] group-hover:-translate-y-1 group-hover:bg-white/85 transition-all duration-300 flex flex-col justify-between">
                <div>
                  <div className="w-11 h-11 mx-auto rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center shadow-[inset_0_1px_0_white] mb-5">
                    <iconify-icon icon="solar:inbox-in-linear" style={{ strokeWidth: 1.5 }} className="text-2xl text-blue-500" />
                  </div>
                  <h3 className="text-lg font-semibold tracking-tight text-slate-950">
                    {t("timelineStep4Title")}
                  </h3>
                  <p className="mt-3 text-xs leading-6 text-slate-500 font-light">
                    {t("timelineStep4Desc")}
                  </p>
                </div>
                <div className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-blue-50 border border-blue-100 px-3 py-1.5 text-[10px] font-semibold text-blue-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  Varno shranjeno
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
