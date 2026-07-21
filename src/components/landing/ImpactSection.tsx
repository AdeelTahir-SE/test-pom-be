"use client";

import React from "react";
import { FloatingBubble } from "./FloatingBubble";

const items = [
  "Vodja ima boljši pregled nad terenom s pol manj klici in preverjanji",
  "Tajnica ima manj usklajevanj in prenašanja sporočil",
  "Terenske ekipe poročajo pogosteje in z manj prekinitvami dela",
  "Morebitne nepravilnosti so odkrite, še preden postanejo problemi",
  "Vsa dokumentacija in komunikacija ostaneta povezani s projektom",
  "Ko pride do vprašanja ali težave, je lažje ugotoviti, kaj se je zgodilo",
];

export function ImpactSection() {
  return (
    <section id="spremembe" className="max-w-7xl mx-auto px-3 md:px-6 md:pt-20 pb-20 relative">
      {/* Header */}
      <div className="text-center mx-auto mb-12">
        <p
          className="text-xs font-medium text-blue-500 mb-4 uppercase"
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "12px",
            lineHeight: "16px",
            letterSpacing: "-0.48px",
          }}
        >
          SPREMEMBE BODO OPAZNE
        </p>
        <h2
          className="font-light text-slate-950 lg:whitespace-nowrap text-2xl md:text-5xl"
          style={{
            fontFamily: "'Inter', sans-serif",
            lineHeight: "1.2",
            letterSpacing: "-0.04em",
          }}
        >
          Kaj se spremeni po nekaj tednih uporabe
        </h2>
        <p
          className="mt-4 text-slate-500 max-w-3xl mx-auto"
          style={{
            fontFamily: "'Inter', sans-serif",
            fontWeight: 300,
            fontSize: "clamp(1rem, 2.5vw, 1.125rem)",
            lineHeight: "28px",
          }}
        >
          Namesto iskanja informacij po klicih in sporočilih ima vodja vedno pred sabo jasen pregled;
          <br className="hidden md:block" />{" "}
          kaj je treba narediti, kaj je bilo dogovorjeno in kaj se trenutno dogaja – tudi ko ni v pisarni.
        </p>
      </div>

      {/* Accordion List */}
      <div className="flex flex-col items-center gap-3 max-w-2xl mx-auto">
        {items.map((text, idx) => (
          <div
            key={idx}
            className="w-full rounded-[32px] border border-white"
            style={{
              background: "rgba(255, 255, 255, 0.002)",
              boxShadow:
                "0px 14px 34px -26px rgba(15, 23, 42, 0.32), inset 0px 1px 0px 1px #FFFFFF",
            }}
          >
            <div className="flex items-center gap-4 p-3 md:px-6 md:py-5">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                style={{
                  background: "#EFF6FF",
                  border: "1px solid #DBEAFE",
                  boxShadow: "inset 0px 1px 0px 1px #FFFFFF",
                }}
              >
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 40 40"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="shrink-0"
                >
                  <path
                    d="M11.5732 20.382L16.9355 25.7443L28.4269 14.2539"
                    stroke="#3B82F6"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <p
                className="text-slate-500 md:text-slate-950 text-sm md:text-lg font-normal md:font-light"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  lineHeight: "28px",
                  letterSpacing: "-0.45px",
                }}
              >
                {text}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Hanging bubble */}
      <FloatingBubble
        title="Največja sprememba po nekaj tednih ni nova tehnologija."
        subtitle="Je občutek, da imaš podjetje pod nadzorom in vodenje je lažje."
        rotation={0}
        className="right-8 bottom-8 hidden lg:block"
      />
    </section>
  );
}
