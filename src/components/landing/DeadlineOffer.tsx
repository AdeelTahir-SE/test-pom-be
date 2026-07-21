"use client";

import React from "react";

export function DeadlineOffer() {
  return (
    <section id="ponudba" className="max-w-7xl mx-auto px-3 md:px-6 pb-20">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-12">
        <p
          className="mb-4 uppercase"
          style={{
            fontFamily: "'Inter', sans-serif",
            fontWeight: 500,
            fontSize: "12px",
            lineHeight: "16px",
            letterSpacing: "-0.48px",
            color: "#3B82F6",
          }}
        >
          ENOSTAVNO JE
        </p>
        <p
          className="text-slate-500 text-center"
          style={{
            fontFamily: "'Inter', sans-serif",
            fontWeight: 300,
            fontSize: "clamp(1rem, 2.5vw, 1.125rem)",
            lineHeight: "28px",
          }}
        >
          Brez uvajanja. Sistem lahko začnete uporabljati isti dan.
          <br className="hidden md:block" />
          Program ne zahteva spremembe načina dela. Samo uredi informacije, ki jih že imate.
          <br className="hidden md:block" />
          <span className="lg:whitespace-nowrap">Ne nadomešča vaših obstoječih programov. Le dopolni jih tam, kjer se danes izgublja največ časa.</span>
        </p>
      </div>

      {/* Wide dark card */}
      <div
        className="rounded-[36px] p-6 md:p-8 flex flex-col lg:flex-row gap-6 md:gap-8 relative overflow-hidden"
        style={{
          background: "linear-gradient(180deg, #1D2A3D 0%, #131C2B 100%)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          boxShadow:
            "0px 28px 70px -35px rgba(15, 23, 42, 0.72), inset 0px 1px 0px 1px rgba(255, 255, 255, 0.13)",
        }}
      >
        {/* Left copy */}
        <div className="flex-1 flex flex-col gap-4 relative z-10">
          <div className="flex items-center gap-2">
            <svg width="6" height="6" viewBox="0 0 6 6" fill="none" className="shrink-0">
              <rect width="6" height="6" rx="3" fill="#60A5FA" />
            </svg>
            <p
              className="uppercase"
              style={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 400,
                fontSize: "10px",
                lineHeight: "15px",
                letterSpacing: "-0.3px",
                color: "#FFFFFF",
              }}
            >
              PRILOŽNOST
            </p>
          </div>
          <h2
            className="text-2xl md:text-[2.25rem] font-light md:font-normal leading-[2rem] md:leading-[2.5rem]"
            style={{
              fontFamily: "'Inter', sans-serif",
              letterSpacing: "-0.9px",
              color: "#FFFFFF",
            }}
          >
            Samo do 15.08.
          </h2>
          <ul
            className="max-w-xl list-none p-0 m-0"
            style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 300,
              fontSize: "clamp(0.875rem, 2.2vw, 1rem)",
              lineHeight: "24px",
              color: "#CBD5E1",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            {[
              "zamrznjena cena do leta 2030",
              "vse nadgradnje osnovnega produkta brezplačno!",
            ].map((txt, i) => (
              <li key={i} className="flex items-start gap-[10px]">
                <span className="text-[#60A5FA] shrink-0">•</span>
                <span>{txt}</span>
              </li>
            ))}
          </ul>
          <p
            className="max-w-xl mt-3"
            style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 300,
              fontSize: "clamp(0.875rem, 2.2vw, 1rem)",
              lineHeight: "24px",
              color: "#CBD5E1",
            }}
          >
            Po tem datumu bo produkt prešel na redni cenik in nadgradnje ne bodo več vključene brez dodatnih stroškov.
          </p>
        </div>

        {/* Mini End-of-Day UI */}
        <div
          className="lg:w-[55%] rounded-[28px] p-4 flex flex-col gap-4 relative z-10"
          style={{
            background: "#FFFFFF",
            border: "1px solid rgba(255, 255, 255, 0.8)",
            boxShadow:
              "0px 18px 50px -30px rgba(0, 0, 0, 0.62), inset 0px 1px 0px 1px #FFFFFF",
          }}
        >
          {/* Header */}
          <div className="flex justify-between items-start pb-4 border-b border-slate-200">
            <div className="flex flex-col gap-1">
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 400,
                  fontSize: "10px",
                  lineHeight: "16px",
                  color: "#3B82F6",
                }}
              >
                TAKO IZGLEDA V PRAKSI
              </p>
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 300,
                  fontSize: "24px",
                  lineHeight: "28px",
                  letterSpacing: "-0.5px",
                  color: "#020617",
                }}
              >
                Malo sprememb, opazne razlike.
              </p>
            </div>
            <div
              className="w-10 h-10 rounded-2xl hidden md:flex items-center justify-center shrink-0"
              style={{
                background: "#EFF6FF",
                border: "1px solid #DBEAFE",
              }}
            >
              <svg
                width="17"
                height="17"
                viewBox="0 0 17 17"
                fill="none"
                className="shrink-0"
              >
                <path
                  d="M7.37957 0.56318L7.5103 2.05736M8.55608 14.0108L8.68681 15.5049M2.05648 8.55695L0.562308 8.68768M15.5041 7.38044L14.0099 7.51117M13.3357 1.71557L11.8084 3.37814M1.71402 2.73234L3.5068 4.10444M4.24552 12.548L2.73072 14.3533M14.3524 13.3358L12.5471 11.821"
                  stroke="#3B82F6"
                  strokeWidth="1.12491"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>

          {/* 3 small cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* 07:00 */}
            <div
              className="rounded-[16px] p-4 flex flex-col gap-1"
              style={{
                background: "#F8FAFC",
                border: "1px solid #E2E8F0",
                boxShadow: "inset 0px 1px 0px 1px #FFFFFF",
              }}
            >
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 400,
                  fontSize: "10px",
                  lineHeight: "15px",
                  letterSpacing: "-0.3px",
                  color: "#3B82F6",
                }}
              >
                07:00
              </p>
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 300,
                  fontSize: "12px",
                  lineHeight: "16px",
                  color: "#64748B",
                }}
              >
                Tajnica pripravi dan. Vnese kartice terencev in zaznamke za vodjo. Za vsak vnos porabi pol minute.
              </p>
            </div>

            {/* Tekom dneva */}
            <div
              className="rounded-[16px] p-4 flex flex-col gap-1"
              style={{
                background: "#E9F2FE",
                border: "1px solid #D0E1F8",
                boxShadow: "inset 0px 1px 0px 1px #FFFFFF",
              }}
            >
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 400,
                  fontSize: "10px",
                  lineHeight: "15px",
                  letterSpacing: "-0.3px",
                  color: "#3B82F6",
                }}
              >
                TEKOM DNEVA
              </p>
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 300,
                  fontSize: "12px",
                  lineHeight: "16px",
                  color: "#64748B",
                }}
              >
                Terenci poročajo. Potrditev naloge jim vzame le nekaj sekund. Vodja vidi potek del brez iskanja informacij.
              </p>
            </div>

            {/* 17:00 */}
            <div
              className="rounded-[16px] p-4 flex flex-col gap-1 relative overflow-hidden"
              style={{
                background: "linear-gradient(180deg, #60A5FA 0%, #2563EB 100%)",
                border: "1px solid #1D4ED8",
              }}
            >
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  boxShadow:
                    "0px 12px 28px -18px rgba(59, 130, 246, 0.7), inset 0px 1px 0px 1px rgba(255, 255, 255, 0.25)",
                }}
              />
              <p
                className="relative z-10"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 400,
                  fontSize: "10px",
                  lineHeight: "15px",
                  letterSpacing: "-0.3px",
                  color: "#FFFFFF",
                }}
              >
                17:00
              </p>
              <p
                className="relative z-10"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 300,
                  fontSize: "12px",
                  lineHeight: "16px",
                  color: "#DBEAFE",
                }}
              >
                Vodja odpre pregled dneva. V dveh minutah vidi vse. Vsi dokumenti so arhivirani in pripeti na naloge.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
