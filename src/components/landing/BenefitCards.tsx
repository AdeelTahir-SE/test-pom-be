"use client";

import React from "react";
import { useLanguage } from "@/lib/useLanguage";

export function BenefitCards() {
  const { t } = useLanguage();

  return (
    <section id="prednosti" className="max-w-7xl mx-auto px-3 md:px-6 pb-20">
      {/* Header aligned Left */}
      <div className="max-w-3xl mb-16 text-left">
        <p className="font-['Inter',sans-serif] text-[14px] md:text-xs font-semibold tracking-tight text-blue-600 mb-3 uppercase">
          {t("benefitsLabel")}
        </p>
        <h2 className="text-[3rem] md:text-5xl font-light tracking-[-0.075em] text-slate-900 leading-[0.95]">
          {t("benefitsTitle")}
        </h2>
        <h3 className="text-lg md:text-2xl font-bold tracking-tight text-slate-900 mt-2">
          {t("benefitsSubtitle")}
        </h3>
      </div>

      <div className="grid md:grid-cols-2 gap-8 items-stretch">
        {/* MOBI Card - Left Column */}
        <div className="rounded-[2rem] bg-white/62 backdrop-blur-xl border border-white p-8 md:p-10 shadow-[0_10px_28px_-20px_rgba(15,23,42,0.24),inset_0_1px_0_white] hover:bg-white/82 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between relative overflow-hidden group">
          <div className="relative z-10">
            <span className="font-['Inter',sans-serif] text-[10px] md:text-xs font-semibold tracking-wider text-blue-600 uppercase">
              {t("benefitsMobiLabel")}
            </span>
            <h3 className="text-base md:text-2xl font-semibold text-slate-900 mt-3 mb-8">
              {t("benefitsMobiTitle")}
            </h3>

            <div className="space-y-5">
              <div className="flex gap-3.5 items-start">
                <span className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0 text-[10px] font-bold mt-0.5 shadow-sm">
                  ✓
                </span>
                <p className="text-sm leading-6 text-slate-600 font-light">
                  {t("benefitsMobiItem1")}
                </p>
              </div>
              <div className="flex gap-3.5 items-start">
                <span className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0 text-[10px] font-bold mt-0.5 shadow-sm">
                  ✓
                </span>
                <p className="text-sm leading-6 text-slate-600 font-light">
                  {t("benefitsMobiItem2")}
                </p>
              </div>
              <div className="flex gap-3.5 items-start">
                <span className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0 text-[10px] font-bold mt-0.5 shadow-sm">
                  ✓
                </span>
                <p className="text-sm leading-6 text-slate-600 font-light">
                  {t("benefitsMobiItem3")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* DESKTOP Card - Right Column */}
        <div className="rounded-[2rem] bg-white/62 backdrop-blur-xl border border-white p-8 md:p-10 shadow-[0_10px_28px_-20px_rgba(15,23,42,0.24),inset_0_1px_0_white] hover:bg-white/82 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between relative overflow-hidden group">
          <div className="relative z-10">
            <span className="font-['Inter',sans-serif] text-[10px] md:text-xs font-semibold tracking-wider text-blue-600 uppercase">
              {t("benefitsOfficeLabel")}
            </span>
            <h3 className="text-base md:text-2xl font-semibold text-slate-900 mt-3 mb-8">
              {t("benefitsOfficeTitle")}
            </h3>

            <div className="space-y-5">
              <div className="flex gap-3.5 items-start">
                <span className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0 text-[10px] font-bold mt-0.5 shadow-sm">
                  ✓
                </span>
                <p className="text-sm leading-6 text-slate-600 font-light">
                  {t("benefitsOfficeItem1")}
                </p>
              </div>
              <div className="flex gap-3.5 items-start">
                <span className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0 text-[10px] font-bold mt-0.5 shadow-sm">
                  ✓
                </span>
                <p className="text-sm leading-6 text-slate-600 font-light">
                  {t("benefitsOfficeItem2")}
                </p>
              </div>
              <div className="flex gap-3.5 items-start">
                <span className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0 text-[10px] font-bold mt-0.5 shadow-sm">
                  ✓
                </span>
                <p className="text-sm leading-6 text-slate-600 font-light">
                  {t("benefitsOfficeItem3")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
