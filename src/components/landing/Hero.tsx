"use client";

import React from "react";
import { useLanguage } from "@/lib/useLanguage";
import { FloatingBubble } from "./FloatingBubble";

export function Hero() {
  const { t } = useLanguage();

  return (
    <section className="max-w-7xl mx-auto px-3 md:px-6 pt-32 md:pt-40 pb-20 md:pb-[140px] relative">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes aura-float-soft {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes aura-bubble-in {
          0% { opacity: 0; transform: translateX(18px) translateY(8px) scale(0.96); filter: blur(6px); }
          100% { opacity: 1; transform: translateX(0) translateY(0) scale(1); filter: blur(0); }
        }
        @keyframes aura-card-in {
          0% { opacity: 0; transform: translateY(12px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .aura-float-bubble {
          opacity: 0;
          animation:
            aura-bubble-in 700ms cubic-bezier(0.22, 1, 0.36, 1) forwards,
            aura-float-soft 4.5s ease-in-out infinite;
        }
        .aura-float-bubble:nth-child(1) { animation-delay: 300ms, 1100ms; }
        .aura-float-bubble:nth-child(2) { animation-delay: 600ms, 1400ms; }
        .aura-float-bubble:nth-child(3) { animation-delay: 900ms, 1700ms; }
        .aura-float-bubble:nth-child(4) { animation-delay: 1200ms, 2000ms; }
        .aura-hero-card {
          opacity: 0;
          animation: aura-card-in 700ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .aura-hero-card:nth-child(1) { animation-delay: 250ms; }
        .aura-hero-card:nth-child(2) { animation-delay: 450ms; }
        .aura-hero-card:nth-child(3) { animation-delay: 650ms; }
        .aura-hero-card:nth-child(4) { animation-delay: 850ms; }
      `}} />

      <div className="flex justify-center items-center text-center">
        {/* Hero Copy */}
        <div className="max-w-3xl">
          {/* Hero Label */}
          <div className="inline-flex items-center gap-2 rounded-full bg-white/75 border border-white px-3.5 py-2 shadow-[0_6px_18px_-12px_rgba(15,23,42,0.3),inset_0_1px_0_white] mb-8">
            <span className="font-['Inter',sans-serif] text-[10px] md:text-xs font-medium tracking-[-0.04em] text-slate-500 uppercase">
              {t("heroBadge")}
            </span>
          </div>

          {/* Hero Headline */}
          <h1 className="text-[3rem] md:text-[4.5rem] lg:text-[5.4rem] font-light tracking-[-0.075em] leading-[0.95] text-slate-950" style={{ textShadow: "0 1px 1px rgba(255,255,255,0.8)" }}>
            <span className="block">
              {t("heroTitle").split(".")[0]}.
            </span>
            <span className="inline-flex whitespace-nowrap mt-4 rounded-[1.35rem] bg-gradient-to-b from-blue-400 to-blue-600 border border-blue-700 px-4 md:px-5 pb-2.5 pt-1.5 text-white font-normal shadow-[0_18px_38px_-20px_rgba(59,130,246,0.55),inset_0_1px_0_rgba(255,255,255,0.38)] drop-shadow-[0_1px_1px_rgba(15,23,42,0.18)]">
              {(t("heroTitle").split(".")[1] || "").trim()}.
            </span>
          </h1>

          <h2 className="mt-6 text-lg md:text-xl font-bold md:font-medium text-slate-900 tracking-tight">
            {t("heroSubTitleMain")}
          </h2>

          <p className="mt-6 text-base md:text-lg leading-8 text-slate-600 font-light max-w-2xl mx-auto">
            {t("heroSubtitle")}
          </p>

          <p className="mt-4 text-base md:text-lg leading-8 text-slate-600 font-light max-w-2xl mx-auto">
            {t("heroSubText")}
          </p>

        </div>
      </div>

      <FloatingBubble
        title="Največ težav ne nastane na terenu ali v pisarni."
        subtitle="Največ jih nastane na poti med njima."
        rotation={0}
        className="right-8 bottom-16 md:bottom-[124px] hidden lg:block"
      />
    </section>
  );
}
