"use client";

import React from "react";
import { Logo } from "@/components/Logo";
import { useLandingSession } from "@/lib/useLandingSession";

export function Footer() {
  const session = useLandingSession();
  const loginHref = session.status === "authenticated" ? session.dashboardHref : "/login";
  const loginLabel = session.status === "authenticated" ? "Nadzorna plošča" : "Prijava";
  const linkClass =
    "underline hover:no-underline transition-all";

  return (
    <footer
      className="pb-0"
      style={{ background: "#E9F2FE" }}
    >
      {/* Horizontal divider */}
      <div
        className="h-px w-full mb-5"
        style={{
          background:
            "linear-gradient(90deg, rgba(191, 219, 254, 0) 0%, #BFDBFE 50%, rgba(191, 219, 254, 0) 100%)",
        }}
      />

      <div className="max-w-7xl mx-auto px-3 md:px-6 flex flex-col items-center gap-1">
        {/* Links row */}
        <div
          className="flex flex-wrap items-center justify-center gap-3 md:gap-1.5 text-[13px] leading-6"
          style={{
            fontFamily: "'Inter', sans-serif",
            fontWeight: 400,
            color: "#1D2A3D",
          }}
        >
          <a href={loginHref} className={`${linkClass} hidden md:inline`}>{loginLabel}</a>
          <span className="hidden md:inline">•</span>
          <a href="#" className={linkClass}>Podpora</a>
          <span>•</span>
          <a href="#" className={linkClass}>Pogoji uporabe</a>
          <span>•</span>
          <a href="#" className={linkClass}>Politika zasebnosti</a>
        </div>

        {/* Copyright row */}
        <div
          className="flex flex-wrap items-center justify-center gap-2 text-xs max-[340px]:text-[11px] leading-6"
          style={{
            fontFamily: "'Inter', sans-serif",
            fontWeight: 400,
            color: "#1D2A3D",
          }}
        >
          <Logo className="h-5 w-5 rounded-md" showText={false} />
          <span>© 2026 Vse pravice zadržane.</span>
        </div>
      </div>
    </footer>
  );
}
