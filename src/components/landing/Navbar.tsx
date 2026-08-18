"use client";

import React from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/useLanguage";
import { Logo } from "@/components/Logo";
import { useLandingSession } from "@/lib/useLandingSession";

function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  } else {
    window.location.href = `/#${id}`;
  }
}

export function Navbar() {
  const { t } = useLanguage();
  const session = useLandingSession();
  const loginHref = session.status === "authenticated" ? session.dashboardHref : "/login";
  const loginLabel = session.status === "authenticated" ? t("navDashboard") : t("navLogin");

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <nav className="max-w-7xl mx-auto px-3 md:px-6 pt-5">
        <div 
          className="relative overflow-hidden w-full max-w-[1232px] mx-auto flex flex-col justify-center"
          style={{
            boxSizing: "border-box",
            padding: "10px 18px",
            height: "72px",
            background: "rgba(255, 255, 255, 0.002)",
            border: "1px solid rgba(255, 255, 255, 0.9)",
            boxShadow: "0px 14px 38px -22px rgba(15, 23, 42, 0.42), inset 0px 1px 0px 1px #FFFFFF",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderRadius: "9999px",
          }}
        >
          {/* Extra white layer so dark sections do not bleed through too much */}
          <div className="absolute inset-0 rounded-full bg-white/36 pointer-events-none" />

          <div 
            className="relative z-10 flex flex-row justify-between items-center w-full"
            style={{
              height: "52px",
              alignSelf: "stretch",
            }}
          >
            {/* Brand Logo */}
            <Link 
              href="/" 
              className="flex items-center justify-center bg-white border border-[#E2E8F0] shadow-[0px_1px_2px_rgba(15,23,42,0.04),inset_0px_1px_0px_1px_#FFFFFF] rounded-[6px] hover:-translate-y-0.5 transition-all duration-300"
              style={{
                boxSizing: "border-box",
                padding: "6px 16px 6px 8px",
                width: "184px",
                height: "52px",
              }}
            >
              <Logo className="h-10 w-10" textClassName="text-[18px]" />
            </Link>

            {/* Desktop Navigation Links */}
            <div 
              className="hidden md:flex flex-row items-center"
              style={{
                gap: "28px",
                height: "16px",
              }}
            >
              <a 
                href="#pisarna"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection("pisarna");
                }}
                className="hover:text-blue-600 transition-colors duration-200"
                style={{
                  height: "16px",
                  fontFamily: "'Inter', sans-serif",
                  fontStyle: "normal",
                  fontWeight: 400,
                  fontSize: "12px",
                  lineHeight: "16px",
                  display: "flex",
                  alignItems: "center",
                  color: "#475569",
                  whiteSpace: "nowrap",
                  overflow: "visible",
                }}
              >
                {t("navOffice")}
              </a>
              <a 
                href="#teren"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection("teren");
                }}
                className="hover:text-blue-600 transition-colors duration-200"
                style={{
                  height: "16px",
                  fontFamily: "'Inter', sans-serif",
                  fontStyle: "normal",
                  fontWeight: 400,
                  fontSize: "12px",
                  lineHeight: "16px",
                  display: "flex",
                  alignItems: "center",
                  color: "#475569",
                  whiteSpace: "nowrap",
                  overflow: "visible",
                }}
              >
                {t("navField")}
              </a>
              <a 
                href="#cenik"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection("cenik");
                }}
                className="hover:text-blue-600 transition-colors duration-200"
                style={{
                  height: "16px",
                  fontFamily: "'Inter', sans-serif",
                  fontStyle: "normal",
                  fontWeight: 400,
                  fontSize: "12px",
                  lineHeight: "16px",
                  display: "flex",
                  alignItems: "center",
                  color: "#475569",
                  whiteSpace: "nowrap",
                  overflow: "visible",
                }}
              >
                {t("navPricing")}
              </a>
            </div>

            {/* Navigation CTAs */}
            <div 
              className="flex flex-row items-center"
              style={{
                gap: "8px",
                height: "34px",
              }}
            >
              <Link 
                href="/login" 
                className="hover:bg-white/10 hover:-translate-y-0.5 transition-all duration-300"
                style={{
                  boxSizing: "border-box",
                  display: "flex",
                  flexDirection: "row",
                  justifyContent: "center",
                  alignItems: "center",
                  padding: "8px 16px",
                  width: "82px",
                  height: "34px",
                  background: "rgba(255, 255, 255, 0.002)",
                  border: "1px solid #E2E8F0",
                  boxShadow: "0px 1px 2px rgba(15, 23, 42, 0.04), inset 0px 1px 0px 1px #FFFFFF",
                  borderRadius: "9999px",
                }}
              >
                <span
                  style={{
                    width: "48px",
                    height: "16px",
                    fontFamily: "'Inter', sans-serif",
                    fontStyle: "normal",
                    fontWeight: 400,
                    fontSize: "12px",
                    lineHeight: "16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                    color: "#334155",
                  }}
                >
                  {t("navSupport")}
                </span>
              </Link>
              <Link
                href={loginHref}
                className="hover:-translate-y-0.5 transition-all duration-300"
                style={{
                  boxSizing: "border-box",
                  display: "flex",
                  flexDirection: "row",
                  justifyContent: "center",
                  alignItems: "center",
                  padding: "8px 16px",
                  width: "auto",
                  minWidth: "72px",
                  height: "34px",
                  background: "linear-gradient(180deg, #3B82F6 0%, #2563EB 100%)",
                  border: "1px solid #1D4ED8",
                  boxShadow: "0px 5px 14px rgba(59, 130, 246, 0.28), inset 0px 1px 0px 1px rgba(255, 255, 255, 0.35)",
                  borderRadius: "9999px",
                }}
              >
                <span
                  style={{
                    height: "16px",
                    fontFamily: "'Inter', sans-serif",
                    fontStyle: "normal",
                    fontWeight: 400,
                    fontSize: "12px",
                    lineHeight: "16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                    color: "#FFFFFF",
                    whiteSpace: "nowrap",
                  }}
                >
                  {loginLabel}
                </span>
              </Link>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
