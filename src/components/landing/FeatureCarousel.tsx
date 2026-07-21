"use client";

import React, { useState } from "react";
import { useLanguage } from "@/lib/useLanguage";

export function FeatureCarousel() {
  const { t } = useLanguage();
  const [activeSlide, setActiveSlide] = useState(0);

  const slides = [
    {
      label: t("showcaseSlide1Label"),
      title: t("showcaseSlide1Title"),
      desc: t("showcaseSlide1Desc"),
      link: t("showcaseSlide1Link"),
      icon: "solar:checklist-minimalistic-linear",
      card: (
        <div className="rounded-[1.75rem] bg-white text-slate-900 border border-slate-200 p-6 shadow-[0_18px_50px_-30px_rgba(0,0,0,0.4),inset_0_1px_0_white]">
          <div className="flex justify-between items-center pb-4 mb-4 border-b border-slate-100">
            <div>
              <p className="text-[10px] text-slate-400 font-semibold tracking-wider font-['Inter',sans-serif]">
                {t("showcaseSlide1CardTitle")}
              </p>
              <p className="text-xs text-slate-500 font-light mt-0.5">Luka Dončič</p>
            </div>
            <span className="text-[10px] text-blue-600 bg-blue-50 border border-blue-100 rounded-full px-2 py-0.5 font-bold">
              {t("showcaseSlide1CardStatus")}
            </span>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-2 bg-slate-50 border border-slate-100 rounded-xl">
              <span className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-bold">✓</span>
              <span className="text-xs text-slate-700">{t("showcaseSlide1CardItem1")}</span>
            </div>
            <div className="flex items-center gap-3 p-2 bg-white border border-slate-100 rounded-xl">
              <span className="w-5 h-5 rounded-full border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-300">2</span>
              <span className="text-xs text-slate-700">{t("showcaseSlide1CardItem2")}</span>
            </div>
            <div className="flex items-center gap-3 p-2 bg-white border border-slate-100 rounded-xl">
              <span className="w-5 h-5 rounded-full border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-300">3</span>
              <span className="text-xs text-slate-700">{t("showcaseSlide1CardItem3")}</span>
            </div>
          </div>
        </div>
      )
    },
    {
      label: t("showcaseSlide2Label"),
      title: t("showcaseSlide2Title"),
      desc: t("showcaseSlide2Desc"),
      link: t("showcaseSlide2Link"),
      icon: "solar:microphone-linear",
      card: (
        <div className="rounded-[1.75rem] bg-white text-slate-900 border border-slate-200 p-6 shadow-[0_18px_50px_-30px_rgba(0,0,0,0.4),inset_0_1px_0_white]">
          <div className="flex justify-between items-center pb-4 mb-4 border-b border-slate-100">
            <div>
              <p className="text-[10px] text-blue-600 bg-blue-50 border border-blue-100 rounded-full px-2 py-0.5 font-bold font-['Inter',sans-serif]">
                {t("showcaseSlide2CardLabel")}
              </p>
              <p className="text-[10px] text-slate-400 font-light mt-1">{t("showcaseSlide2CardTime")}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center animate-pulse">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            </div>
          </div>
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
            <p className="text-xs text-slate-400 italic">Prevedeno v besedilo:</p>
            <p className="text-sm text-slate-800 font-light mt-1.5 leading-6">
              &ldquo;{t("showcaseSlide2CardText")}&rdquo;
            </p>
          </div>
          <div className="mt-4 flex items-center gap-2 text-[10px] text-emerald-600 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {t("showcaseSlide2CardStatus")}
          </div>
        </div>
      )
    },
    {
      label: t("showcaseSlide3Label"),
      title: t("showcaseSlide3Title"),
      desc: t("showcaseSlide3Desc"),
      link: t("showcaseSlide3Link"),
      icon: "solar:slider-minimalistic-horizontal-linear",
      card: (
        <div className="rounded-[1.75rem] bg-white text-slate-900 border border-slate-200 p-6 shadow-[0_18px_50px_-30px_rgba(0,0,0,0.4),inset_0_1px_0_white]">
          <div className="flex justify-between items-center pb-4 mb-4 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-800">{t("showcaseSlide3CardTitle")}</p>
            <button className="px-3 py-1 bg-slate-900 text-white rounded-full text-[10px] font-semibold">
              {t("showcaseSlide3CardSave")}
            </button>
          </div>
          <div className="space-y-2">
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between cursor-grab active:cursor-grabbing">
              <span className="text-xs text-slate-700">{t("showcaseSlide3CardItem1")}</span>
              <span className="text-slate-400 text-xs">☰</span>
            </div>
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between cursor-grab active:cursor-grabbing">
              <span className="text-xs text-slate-700">{t("showcaseSlide3CardItem2")}</span>
              <span className="text-slate-400 text-xs">☰</span>
            </div>
            <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between cursor-grab active:cursor-grabbing">
              <span className="text-xs text-blue-900 font-semibold">{t("showcaseSlide3CardItem3")}</span>
              <span className="text-blue-400 text-xs">☰</span>
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <section id="funkcionalnosti" className="max-w-7xl mx-auto px-6 py-20">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <p className="font-['Inter',sans-serif] text-[10px] md:text-xs font-semibold tracking-[-0.04em] text-blue-500 mb-4 uppercase">
          {t("showcaseTitle")}
        </p>
        <h2 className="text-3xl md:text-5xl font-normal tracking-tight text-slate-950">
          {t("showcaseSubtitle")}
        </h2>
      </div>

      <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-12 items-center bg-slate-50/50 border border-slate-100 rounded-[2.5rem] p-8 md:p-12 shadow-[0_20px_50px_-30px_rgba(15,23,42,0.1),inset_0_1px_0_white]">
        {/* Left Side: Controller list */}
        <div className="space-y-4">
          {slides.map((slide, idx) => (
            <button
              key={idx}
              onClick={() => setActiveSlide(idx)}
              className={`w-full text-left p-5 rounded-2xl border transition-all duration-300 flex items-start gap-4 ${
                activeSlide === idx
                  ? "bg-white border-slate-200 shadow-[0_8px_20px_-8px_rgba(15,23,42,0.08),inset_0_1px_0_white] scale-[1.02]"
                  : "bg-transparent border-transparent hover:bg-white/40 hover:border-slate-100"
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                activeSlide === idx ? "bg-blue-50 text-blue-500" : "bg-slate-100 text-slate-400"
              }`}>
                <iconify-icon icon={slide.icon} style={{ strokeWidth: 1.5 }} className="text-xl" />
              </div>
              <div>
                <p className={`text-sm font-semibold ${activeSlide === idx ? "text-slate-900" : "text-slate-600"}`}>
                  {slide.label}
                </p>
                <p className="text-xs text-slate-400 font-light mt-1">
                  {slide.title}
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* Right Side: Interactive Mockup Display */}
        <div className="relative flex justify-center items-center p-4">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-300/10 to-indigo-300/10 blur-3xl rounded-full pointer-events-none" />

          <div className="relative w-full max-w-md rounded-[2rem] bg-gradient-to-b from-slate-100 to-slate-200/50 border border-white/80 p-4 shadow-[0_30px_60px_-30px_rgba(15,23,42,0.25),inset_0_1px_0_white]">
            <div className="transition-all duration-500 ease-out transform scale-100 opacity-100">
              {(slides[activeSlide] ?? slides[0])?.card}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
