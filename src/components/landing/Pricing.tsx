"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/useLanguage";

export function Pricing() {
  const { t } = useLanguage();
  const [isYearly, setIsYearly] = useState(false);
  const displayPrice = 59;

  const sections = [
    {
      title: t("priceSec1Title"),
      items: [t("priceSec1Item1"), t("priceSec1Item2"), t("priceSec1Item3")],
    },
    {
      title: t("priceSec2Title"),
      items: [t("priceSec2Item1"), t("priceSec2Item2"), t("priceSec2Item3")],
    },
    {
      title: t("priceSec3Title"),
      items: [
        t("priceSec3Item1"),
        t("priceSec3Item2"),
        t("priceSec3Item3"),
        t("priceSec3Item4"),
      ],
    },
  ];

  return (
    <section id="cenik" className="max-w-7xl mx-auto px-3 md:px-6 md:pt-20 pb-20">
      <div className="text-center max-w-3xl mx-auto mb-12">
        <p className="font-['Inter',sans-serif] text-[10px] md:text-xs font-semibold tracking-[-0.04em] text-blue-500 mb-4 uppercase">
          {t("priceTitle")}
        </p>
        <h2 className="text-2xl md:text-5xl font-light tracking-tight text-slate-950">
          {t("priceSubtitle")}
        </h2>
        <p
          className="mt-4 text-slate-500"
          style={{
            fontFamily: "'Inter', sans-serif",
            fontWeight: 300,
            fontSize: "clamp(1rem, 2.5vw, 1.125rem)",
            lineHeight: "28px",
          }}
        >
          Vključene vse funkcije — brez skritih stroškov
        </p>
      </div>

      {/* Skeuomorphic Toggle — yearly disabled for now */}
      <div className="mb-12 flex justify-center">
        <label className="relative flex items-center p-1 bg-[#e2e8f0] rounded-full cursor-not-allowed w-[16rem] shadow-[inset_0_2px_4px_rgba(0,0,0,0.06),0_1px_1px_rgba(255,255,255,1)] border border-slate-300">
          <input
            type="checkbox"
            className="sr-only"
            checked={isYearly}
            disabled
            onChange={() => setIsYearly(false)}
          />
          {/* Toggle Pill */}
          <div
            className={`absolute left-1 top-1 bottom-1 w-[calc(50%-0.25rem)] bg-gradient-to-b from-white to-slate-50 rounded-full shadow-[0_2px_5px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,1)] border border-slate-200 transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${
              isYearly ? "translate-x-full" : "translate-x-0"
            }`}
          />
          <span
            className={`relative w-1/2 text-center text-sm font-normal transition-colors duration-300 py-2.5 z-10 ${
              isYearly ? "text-slate-400" : "text-slate-800"
            }`}
          >
            {t("billingMonthly")}
          </span>
          <span
            className={`relative w-1/2 flex items-center justify-center gap-1.5 text-center text-sm font-normal transition-colors duration-300 py-2.5 z-10 opacity-60 ${
              isYearly ? "text-slate-800" : "text-slate-400"
            }`}
          >
            {t("billingAnnually")}
          </span>
        </label>
      </div>

      <div className="flex justify-center items-center">
        {/* Single Premium Pricing Card styled exactly like Aura Pro */}
        <div className="relative w-full max-w-xl rounded-[2rem] bg-gradient-to-b from-blue-50/50 to-[#f8fafc] border border-white shadow-[0_15px_35px_-10px_rgba(59,130,246,0.15),inset_0_2px_0_rgba(255,255,255,1)] transition-all duration-500 hover:shadow-[0_25px_50px_-12px_rgba(59,130,246,0.2),inset_0_2px_0_rgba(255,255,255,1)] hover:-translate-y-1">
          
          {/* Floating Badge */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-b from-blue-400 to-blue-500 text-white text-[0.65rem] font-medium rounded-full shadow-[0_2px_6px_rgba(59,130,246,0.4),inset_0_1px_0_rgba(255,255,255,0.4)] border border-blue-600 tracking-wide z-10 uppercase">
            {t("priceCardBadge")}
          </div>

          <div className="p-8 h-full flex flex-col justify-between min-h-[580px]">
            <div>
              {/* Header */}
              <div className="pt-2 flex flex-col items-center">
                <div className="flex items-baseline justify-center text-slate-800">
                  <span className="text-5xl font-normal tracking-tight">{displayPrice}</span>
                  <span className="text-4xl font-normal tracking-tight ml-0.5">€</span>
                  <span className="text-sm font-normal text-slate-400 ml-1">
                    {t("priceCardUnit")}
                  </span>
                </div>
                <p className="mt-4 text-sm font-normal text-slate-500 leading-relaxed whitespace-pre-line text-center">
                  {t("priceCardSub")}
                </p>
              </div>

              {/* Divider line */}
              <div className="my-6 h-px w-full bg-gradient-to-r from-transparent via-blue-200 to-transparent"></div>

              {/* Expanded Body */}
              <div className="flex flex-col gap-6">
                {sections.map((section, idx) => (
                  <div key={idx} className="flex flex-col gap-3">
                    <h4 className="text-[10px] md:text-xs font-medium text-blue-500 uppercase tracking-widest">
                      {section.title}
                    </h4>
                    <ul className="flex flex-col gap-y-3">
                      {section.items.map((item, itemIdx) => (
                        <li key={itemIdx} className="flex items-start gap-3 text-[13px] md:text-sm font-light md:font-normal text-slate-500 md:text-slate-700">
                          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0 mt-0.5">
                            <path fillRule="evenodd" clipRule="evenodd" d="M16.5 9C16.5 13.1423 13.1423 16.5 9 16.5C4.85775 16.5 1.5 13.1423 1.5 9C1.5 4.85775 4.85775 1.5 9 1.5C13.1423 1.5 16.5 4.85775 16.5 9ZM12.0225 6.7275C12.2418 6.94711 12.2418 7.30289 12.0225 7.5225L8.2725 11.2725C8.05289 11.4918 7.69711 11.4918 7.4775 11.2725L5.9775 9.7725C5.82701 9.63227 5.76506 9.42108 5.81596 9.22178C5.86686 9.02248 6.02248 8.86686 6.22178 8.81596C6.42108 8.76506 6.63227 8.82701 6.7725 8.9775L7.875 10.08L9.55125 8.40375L11.2275 6.7275C11.4471 6.50816 11.8029 6.50816 12.0225 6.7275Z" fill="#3B82F6"/>
                          </svg>
                          <span className="mt-[2px]">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-col gap-6 mt-8">
              <Link 
                href="/register" 
                className="w-full sm:w-[250px] sm:mx-auto inline-flex items-center justify-center gap-2 py-3 bg-gradient-to-b from-blue-500 to-blue-600 border border-blue-700 text-white text-sm font-normal shadow-[0_4px_10px_rgba(59,130,246,0.3),inset_0_1px_0_rgba(255,255,255,0.3)] hover:from-blue-400 hover:to-blue-500 active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] transition-all duration-300"
                style={{ borderRadius: "16px" }}
              >
                Naroči
              </Link>

              {/* Cancel Anytime with extra gap from top */}
              <div className="pt-4 border-t border-slate-200/60 flex items-center justify-center">
                <div className="flex items-start gap-3 text-sm font-normal text-slate-700">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0 mt-0.5">
                    <path fillRule="evenodd" clipRule="evenodd" d="M16.5 9C16.5 13.1423 13.1423 16.5 9 16.5C4.85775 16.5 1.5 13.1423 1.5 9C1.5 4.85775 4.85775 1.5 9 1.5C13.1423 1.5 16.5 4.85775 16.5 9ZM12.0225 6.7275C12.2418 6.94711 12.2418 7.30289 12.0225 7.5225L8.2725 11.2725C8.05289 11.4918 7.69711 11.4918 7.4775 11.2725L5.9775 9.7725C5.82701 9.63227 5.76506 9.42108 5.81596 9.22178C5.86686 9.02248 6.02248 8.86686 6.22178 8.81596C6.42108 8.76506 6.63227 8.82701 6.7725 8.9775L7.875 10.08L9.55125 8.40375L11.2275 6.7275C11.4471 6.50816 11.8029 6.50816 12.0225 6.7275Z" fill="#3B82F6"/>
                  </svg>
                  <span className="font-medium text-slate-900 mt-[2px]">{t("priceCancelAnytime")}</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      <p
        className="text-center max-w-4xl mx-auto mt-12 text-slate-500"
        style={{
          fontFamily: "'Inter', sans-serif",
          fontWeight: 300,
          fontSize: "clamp(1rem, 2.5vw, 1.125rem)",
          lineHeight: "28px",
        }}
      >
        Če vsak dan porabite nekaj minut za telefonske klice, iskanje informacij,
        <br />
        <span className="lg:whitespace-nowrap">
          usklajevanje ekip ali reševanje stvari, ki bi jih lahko odkrili prej, potem naša rešitev verjetno ni strošek.
        </span>
        <br />
        Je prihranek časa. Veliko ur na mesec.
      </p>
    </section>
  );
}
