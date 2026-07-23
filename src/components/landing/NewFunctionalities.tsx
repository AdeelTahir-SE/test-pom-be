"use client";

import React from "react";
import { Paperclip } from "lucide-react";
import Link from "next/link";

export function NewFunctionalities() {
  return (
    <section id="nove-funkcionalnosti" className="max-w-7xl mx-auto px-6 py-20">
      {/* Section Header */}
      <div className="flex flex-col items-center gap-4 mb-14">
        <span
          className="inline-flex items-center justify-center w-[108px] h-[16px] text-blue-500 text-[12px] leading-[16px] tracking-[-0.48px] font-medium uppercase"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          PRAVKAR DODANO
        </span>

        <h2
          className="text-[48px] leading-[60px] tracking-[-1.5px] font-light text-slate-950"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          Novi funkcionalnosti
        </h2>

        <h3
          className="text-[32px] leading-[60px] tracking-[-2px] font-light text-slate-950"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          Za boljšo organizacijo dela
        </h3>

        <div
          className="max-w-[555px] text-[18px] leading-[28px] font-light text-slate-600 text-center"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          AI pomočnik pomaga urediti dokumente, aplikacija pa poskrbi, da:
          <ul className="mt-3 list-disc list-inside inline-block text-left">
            <li>pomembni detajli o naročnikih ostajajo v podjetju,</li>
            <li>poenostavijo delo,</li>
            <li>omogočijo boljšo izkušnjo strank in lahko povečajo prodajo.</li>
          </ul>
        </div>
      </div>

      {/* Light Privacy Workspace */}
      <div className="relative lg:h-[863px] min-h-[863px] overflow-hidden rounded-[2.75rem] bg-white/60 backdrop-blur-xl border border-white shadow-[0_30px_80px_-45px_rgba(15,23,42,0.35),inset_0_1px_0_rgba(255,255,255,1)]">
        {/* Soft Hero-style Glows */}
        <div className="absolute top-[-35%] left-[-10%] w-[34rem] h-[34rem] rounded-full bg-blue-200/35 blur-[6rem] pointer-events-none" />
        <div className="absolute bottom-[-40%] right-[-10%] w-[32rem] h-[32rem] rounded-full bg-sky-200/24 blur-[6rem] pointer-events-none" />

        {/* Subtle Dot Texture */}
        <div
          className="absolute inset-0 opacity-[0.16] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(15,23,42,0.10) 1px, transparent 0)",
            backgroundSize: "2rem 2rem",
          }}
        />

        {/* Left column — Operational Memory */}
        <div
          className="lg:absolute lg:top-[61px] lg:left-[70px] w-full lg:w-[574px]"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          <p className="w-full lg:w-[483px] h-[16px] text-[12px] leading-[16px] tracking-[-0.48px] font-medium text-blue-500 uppercase">
            OPERATIVNI SPOMIN
          </p>

          <h3 className="mt-[12px] w-full lg:w-[574px] h-[60px] text-[32px] leading-[60px] tracking-[-2px] font-light text-slate-950">
            Naročniki niso več samo imena v seznamu
          </h3>

          <div className="mt-[19px] w-full lg:w-[574px] text-[18px] leading-[28px] font-light text-slate-600">
            Vsak obisk prinese nove informacije.
            <br />
            Namesto da ostanejo v spominu zaposlenih, se shranijo in se ob
            naslednjem obisku tega naročnika samodejno prikažejo. Npr.
            <br />
            <br />
            <span className="inline-flex items-center gap-1">
              <span className="text-light-500">⚠</span>
              <span className="font-light">Pomembno za tega naročnika</span>
            </span>
            <ul className="list-disc ml-5 mt-1 marker:text-light-500">
              <li>Ključ prevzameš na recepciji.</li>
              <li>Kako in kdaj se lahko izklopi alarm.</li>
              <li>Vedno uporabi stranski vhod.</li>
              <li>Material odlagaj za garažo.</li>
            </ul>
          </div>

          <h4 className="mt-[8px] w-full lg:w-[574px] h-[60px] text-[20px] leading-[60px] font-normal text-slate-950">
            Manj vprašanj. Manj napak. Bolj profesionalno delo.
          </h4>

          <p className="mt-0 w-full lg:w-[574px] h-[168px] text-[18px] leading-[28px] font-light text-slate-600">
            Tako podjetje ne gradi le zgodovine opravljenega dela, ampak tudi
            svoj operativni spomin. Znanje in detajli ostanejo v podjetju, ne
            glede na menjave zaposlenih, dopuste ali čas, ki mine med obiski.
            Zaposlenim pomaga lažje slediti nalogam, manj je napak, novim
            zaposlenim pa pisarni ni več potrebno vedno znova razlagati iste
            podrobnosti.
          </p>
        </div>

        {/* Right column — Smart Documents */}
        <div
          className="lg:absolute lg:top-[61px] lg:right-[70px] w-full lg:w-[480px]"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          <p className="w-full lg:w-[483px] h-[16px] text-[12px] leading-[16px] tracking-[-0.48px] font-medium text-blue-500 uppercase">
            PAMETNI DOKUMENTI
          </p>

          <h3 className="mt-[12px] w-full lg:w-[574px] h-[60px] text-[32px] leading-[60px] tracking-[-2px] font-light text-slate-950">
            Dokumenti niso več samo priponke
          </h3>

          <p className="mt-[19px] text-[18px] leading-[28px] tracking-[-0.48px] font-light text-slate-600">
            Namesto tega:
          </p>

          <div className="space-y-0.5">
            <div className="flex items-center gap-2 text-[18px] leading-[28px] font-light text-slate-600">
              <Paperclip className="w-4 h-4 text-slate-500" />
              IMG_4821.pdf
            </div>
            <div className="flex items-center gap-2 text-[18px] leading-[28px] font-light text-slate-600">
              <Paperclip className="w-4 h-4 text-slate-500" />
              scan003.jpg
            </div>
          </div>

          <p className="mt-6 text-[18px] leading-[28px] tracking-[-0.48px] font-light text-slate-600">
            vidiš:
          </p>

          <div className="mt-2 space-y-4">
            <div
              className="text-[18px] leading-[28px] font-light italic"
              style={{ color: "rgba(14, 74, 123, 1)" }}
            >
              <p className="pl-6">Račun</p>
              <p className="pl-6">Hotel ABX d.o.o.</p>
              <p className="pl-6">684,20 €</p>
              <p className="pl-6">12.03.2025</p>
            </div>

            <p
              className="text-[18px] leading-[28px] font-light italic"
              style={{ color: "rgba(14, 74, 123, 1)" }}
            >
              in
            </p>

            <div
              className="text-[18px] leading-[28px] font-light italic"
              style={{ color: "rgba(14, 74, 123, 1)" }}
            >
              <p className="pl-6">Servisni zapisnik</p>
              <p className="pl-6">Hotel ABC</p>
              <p className="pl-6">Servis klimatske naprave</p>
              <p className="pl-6">Opravil: Marko</p>
            </div>
          </div>

          <p className="mt-6 w-full lg:w-[480px] text-[18px] leading-[28px] font-light text-slate-600">
            Pomembne informacije so vidne takoj, brez odpiranja vsake priponke
            posebej. Dokumenti dobijo dodatno vrednost in postanejo širše
            uporabni.
          </p>
        </div>

        {/* Industry examples pill */}
        <Link
          href="/primeri-iz-prakse"
          className="lg:absolute lg:bottom-[73px] lg:left-[406px] inline-flex items-center justify-center gap-[8px] rounded-full border bg-[#EFF6FF] border-[#DBEAFE] w-[225px] h-[50px] px-3 py-1.5 text-[16px] leading-[16.5px] font-normal text-[#3B82F6] hover:bg-blue-100 transition-colors whitespace-nowrap"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          <span className="w-[6px] h-[6px] rounded-full bg-[#3B82F6]" />
          Primeri iz različnih branž
        </Link>
      </div>
    </section>
  );
}
