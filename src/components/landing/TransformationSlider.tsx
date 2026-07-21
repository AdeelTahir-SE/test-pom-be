"use client";

import React, { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/lib/useLanguage";
import { FloatingBubble } from "./FloatingBubble";

// ── Shared text styles ────────────────────────────────────────────────────────
const LABEL_STYLE: React.CSSProperties = {
  fontFamily: "Inter, sans-serif",
  fontWeight: 500,
  fontSize: "12px",
  lineHeight: "16px",
  letterSpacing: "-0.48px",
  color: "#93C5FD",
  marginBottom: "12px",
};

const LABEL_STYLE_SLIDE_2: React.CSSProperties = {
  fontFamily: "Inter, sans-serif",
  fontWeight: 500,
  fontSize: "12px",
  lineHeight: "16px",
  letterSpacing: "-0.48px",
  color: "#93C5FD",
  marginBottom: "16px",
};

const TITLE_STYLE: React.CSSProperties = {
  fontFamily: "Inter, sans-serif",
  fontWeight: 300,
  fontSize: "32px",
  lineHeight: "48px",
  letterSpacing: "-1.2px",
  color: "#FFFFFF",
  margin: "0 0 20px 0",
};

const BODY_STYLE: React.CSSProperties = {
  fontFamily: "Inter, sans-serif",
  fontWeight: 300,
  fontSize: "18px",
  lineHeight: "24px",
  color: "#CBD5E1",
};

const EXAMPLE_STYLE: React.CSSProperties = {
  fontFamily: "Inter, sans-serif",
  fontWeight: 400,
  fontSize: "14px",
  lineHeight: "20px",
  color: "#CBD5E1",
};

// ── Shared button styles ──────────────────────────────────────────────────────
const BTN_WHITE: React.CSSProperties = {
  background: "#FFFFFF",
  boxShadow: "inset 0px 1px 0px #FFFFFF",
  borderRadius: "9999px",
  padding: "12px 24px",
  display: "inline-flex",
  alignItems: "center",
  gap: "10px",
  fontFamily: "Inter, sans-serif",
  fontSize: "14px",
  fontWeight: 400,
  lineHeight: "20px",
  color: "#0F172A",
  cursor: "default",
  border: "none",
  whiteSpace: "nowrap" as const,
};

const BTN_GLASS: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.07)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  boxShadow: "inset 0px 1px 0px 1px rgba(255, 255, 255, 0.08)",
  borderRadius: "9999px",
  padding: "12px 24px",
  display: "inline-flex",
  alignItems: "center",
  fontFamily: "Inter, sans-serif",
  fontSize: "14px",
  fontWeight: 400,
  lineHeight: "20px",
  color: "#FFFFFF",
  cursor: "pointer",
  whiteSpace: "nowrap" as const,
};

function MockPhoneScreen() {
  const done = 1;
  const total = 3;

  return (
    <div
      style={{
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        padding: "8px",
        isolation: "isolate",
        width: "100%",
        maxWidth: "450px",
        height: "828px",
        background: "#F1F5F9",
        border: "8px solid #FFFFFF",
        boxShadow: "0px 20px 50px rgba(0, 0, 0, 0.15)",
        borderRadius: "48px",
        position: "relative",
        overflow: "hidden",
        gap: "20px",
        margin: "0 auto",
        textAlign: "left",
      }}
      className="text-slate-800 select-none"
    >
      {/* ── Status Bar ── */}
      <div 
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "20px 24px 8px",
          width: "100%",
          height: "48px"
        }}
        className="shrink-0"
      >
        <span 
          style={{
            fontFamily: "'Inter', sans-serif",
            fontWeight: 500,
            fontSize: "14px",
            lineHeight: "20px",
            color: "#1E293B"
          }}
        >
          10:24
        </span>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }} className="text-[#1E293B]">
          {/* Network Icon */}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 14.6665H14" stroke="#1E293B" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 7.33301C2 6.70434 2 6.39034 2.19533 6.19501C2.39067 5.99967 2.70467 5.99967 3.33333 5.99967C3.962 5.99967 4.276 5.99967 4.47133 6.19501C4.66667 6.39034 4.66667 6.70434 4.66667 7.33301V11.333C4.66667 11.9617 4.66667 12.2757 4.47133 12.471C4.276 12.6663 3.962 12.6663 3.33333 12.6663C2.70467 12.6663 2.39067 12.6663 2.19533 12.471C2 12.2757 2 11.9617 2 11.333V7.33301M6.66667 4.66634C6.66667 4.03767 6.66667 3.72367 6.862 3.52834C7.05733 3.33301 7.37133 3.33301 8 3.33301C8.62867 3.33301 8.94267 3.33301 9.138 3.52834C9.33333 3.72367 9.33333 4.03767 9.33333 4.66634V11.333C9.33333 11.9617 9.33333 12.2757 9.138 12.471C8.94267 12.6663 8 12.6663 7.37133 12.6663C7.05733 12.6663 6.862 12.471C6.66667 12.2757 6.66667 11.9617 6.66667 11.333V4.66634M11.3333 2.66634C11.3333 2.03767 11.3333 1.72367 11.5287 1.52834C11.724 1.33301 12.038 1.33301 12.6667 1.33301C13.2953 1.33301 13.6093 1.33301 13.8047 1.52834C14 1.72367 14 2.03767 14 2.66634V11.333C14 11.9617 14 12.2757 13.8047 12.471C13.6093 12.6663 13.2953 12.6663 12.6667 12.6663C12.038 12.6663 11.724 12.6663 11.5287 12.471C11.3333 12.2757 11.3333 11.9617 11.3333 11.333V2.66634" stroke="#1E293B"/>
          </svg>

          {/* Charge Icon */}
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1.66602 9.99967C1.66602 6.85717 1.66602 5.28551 2.64268 4.30967C3.61935 3.33384 5.19018 3.33301 8.33268 3.33301H9.58268C12.7252 3.33301 14.2968 3.33301 15.2727 4.30967C16.2485 5.28634 16.2493 6.85717 16.2493 9.99967C16.2493 13.1422 16.2493 14.7138 15.2727 15.6897C14.296 16.6655 12.7252 16.6663 9.58268 16.6663H8.33268C5.19018 16.6663 3.61852 16.6663 2.64268 15.6897C1.66685 14.713 1.66602 13.1422 1.66602 9.99967V9.99967M16.666 8.33301C17.4518 8.33301 17.8443 8.33301 18.0885 8.57717C18.3327 8.8222 18.3327 9.21384 18.3327 9.99967C18.3327 10.7855 18.3327 11.178 18.0885 11.4222C17.8443 11.6663 17.4518 11.6663 16.666 11.6663V8.33301" stroke="#1E293B" strokeWidth="1.25"/>
            <path d="M9.58333 7.5L7.5 10H10.4167L8.33333 12.5" stroke="#1E293B" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      {/* ── Header Row ── */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 8px 16px",
          width: "100%",
          height: "56px"
        }}
        className="shrink-0"
      >
        <h2
          style={{
            fontFamily: "'Source Sans 3', sans-serif",
            fontWeight: 300,
            fontSize: "24px",
            lineHeight: "32px",
            letterSpacing: "-0.5px",
            color: "#0F172A"
          }}
        >
          pomocnik.net
        </h2>

        {/* Settings button */}
        <div 
          style={{
            boxSizing: "border-box",
            width: "36px",
            height: "36px",
            background: "rgba(255, 255, 255, 0.9)",
            border: "0.7px solid rgba(96, 165, 250, 0.5)",
            boxShadow: "0px 8px 18px -12px rgba(15, 23, 42, 0.35), inset 0px 1px 0px 1px #FFFFFF",
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#64748B"
          }}
          className="shrink-0"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.43l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 0 1 0-.255c.007-.378-.138-.75-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
          </svg>
        </div>
      </div>

      {/* Main Task Card */}
      <div
        style={{
          border: "1px solid #1D4ED8",
          boxShadow: "0px 24px 60px -30px rgba(59, 130, 246, 0.55), inset 0px 1px 0px 1px rgba(255, 255, 255, 0.35)",
          borderRadius: "32px 32px 4px 4px",
          display: "flex",
          flexDirection: "column",
          width: "100%",
          overflow: "hidden",
          gap: "10px",
          background: "rgba(255, 255, 255, 0.3)"
        }}
      >
        <div 
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "24px 20px 12px 20px",
            gap: "8px"
          }}
        >
          <span
            style={{
              fontFamily: "'PT Sans', sans-serif",
              fontWeight: 400,
              fontSize: "10px",
              lineHeight: "15px",
              color: "#94A3B8",
              whiteSpace: "nowrap"
            }}
            className="flex-1 min-w-0"
          >
            ANTHONY H. • 23/05/26 • #484
          </span>

          {/* Progress badge */}
          <div
            style={{
              width: "36px",
              height: "36px",
              background: "rgba(255, 255, 255, 0.9)",
              border: "1px solid rgba(29, 78, 216, 0.5)",
              borderRadius: "12px",
              display: "flex",
              alignItems: "baseline",
              justifyContent: "center",
              paddingTop: "3px",
              flexShrink: 0
            }}
          >
            <span
              style={{
                fontFamily: "'PT Sans', sans-serif",
                fontWeight: 700,
                fontSize: "20px",
                color: "#EB1D1D",
                lineHeight: "27px"
              }}
            >
              {done}
            </span>
            <span
              style={{
                fontFamily: "'PT Sans', sans-serif",
                fontWeight: 700,
                fontSize: "14px",
                color: "#5A5A65",
                lineHeight: "27px"
              }}
            >
              /{total}
            </span>
          </div>
        </div>

        {/* Inner white details block */}
        <div
          style={{
            background: "#FFFFFF",
            borderTop: "1px solid rgba(29, 78, 216, 0.15)",
            borderBottom: "1px solid rgba(29, 78, 216, 0.15)",
            padding: "16px 20px",
            display: "flex",
            flexDirection: "column",
            gap: "2px"
          }}
        >
          <p 
            style={{ 
              fontFamily: "'Source Sans 3', sans-serif", 
              fontWeight: 400, 
              fontSize: "16px", 
              color: "#0F172A", 
              lineHeight: "20px" 
            }}
          >
            Kopalnica prenova
          </p>
          <p 
            style={{ 
              fontFamily: "'Source Sans 3', sans-serif", 
              fontWeight: 400, 
              fontSize: "14px", 
              color: "#465467", 
              lineHeight: "20px", 
              marginTop: "2px" 
            }}
          >
            Ljubljana • Novak d.o.o.
          </p>
        </div>

        {/* Bottom block (tasks list) */}
        <div 
          style={{ 
            display: "flex", 
            flexDirection: "column", 
            gap: "10px", 
            padding: "20px" 
          }}
        >
          {/* Task 1 */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%" }}>
            <div
              style={{
                width: "16px",
                height: "16px",
                background: "transparent",
                borderRadius: "4px",
                border: "2px solid #41C46D",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <svg width="10" height="7" viewBox="0 0 10 7" fill="none">
                <path d="M1 3.5L3.5 6L9 1" stroke="#41C46D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span
              style={{
                fontFamily: "'PT Sans', sans-serif",
                fontWeight: 400,
                fontSize: "12px",
                lineHeight: "16px",
                color: "#94A3B8"
              }}
              className="flex-1 truncate"
            >
              Odvoz materiala
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <svg width="13" height="15" viewBox="0 0 14 16" fill="none" className="text-slate-400">
                <path d="M0.5 7.54918L6.15229 1.78552C7.83319 0.0714946 10.5585 0.0714946 12.2394 1.78552C13.9203 3.49954 13.9201 6.27867 12.2392 7.99269L5.71734 14.6431C4.59674 15.7858 2.7802 15.7856 1.6596 14.6429C0.538995 13.5002 0.53872 11.6478 1.65932 10.5051L8.1812 3.85471C8.7415 3.28337 9.65041 3.28337 10.2107 3.85471C10.771 4.42605 10.7706 5.35216 10.2103 5.9235L4.55802 11.6872" stroke="currentColor" strokeOpacity="0.15" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span style={{ fontSize: "12px", color: "#D3D3D3" }}>10:34</span>
            </div>
          </div>

          {/* Task 2 */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%" }}>
            <div
              style={{
                width: "16px",
                height: "16px",
                background: "#E1E4E8",
                borderRadius: "4px"
              }}
            />
            <span
              style={{
                fontFamily: "'PT Sans', sans-serif",
                fontWeight: 400,
                fontSize: "14px",
                lineHeight: "18px",
                color: "#64748B"
              }}
              className="flex-1 truncate"
            >
              Dostava ploščic - Adam
            </span>
          </div>

          {/* Task 3 */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%" }}>
            <div
              style={{
                width: "16px",
                height: "16px",
                background: "#E1E4E8",
                borderRadius: "4px"
              }}
            />
            <span
              style={{
                fontFamily: "'PT Sans', sans-serif",
                fontWeight: 400,
                fontSize: "14px",
                lineHeight: "18px",
                color: "#64748B"
              }}
              className="flex-1 truncate"
            >
              Polaganje ploščic
            </span>
          </div>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px", width: "100%", marginTop: "16px", padding: "0 8px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "12px", border: "0.7px solid rgba(96, 165, 250, 0.5)", background: "rgba(255, 255, 255, 0.9)", display: "flex", alignItems: "center", justifyContent: "center" }} className="shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" stroke="#60A5FA" strokeWidth="1.5" />
                <circle cx="12" cy="12" r="6" stroke="#2563EB" strokeWidth="1.5" />
                <circle cx="12" cy="12" r="2" fill="#2563EB" />
                <path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke="#2563EB" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <span style={{ fontSize: "10px", fontWeight: 700, color: "#6D778E", letterSpacing: "0.5px" }}>PODROBNO</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "10px", fontWeight: 700, color: "#6D778E", letterSpacing: "0.5px" }}>DODAJ KORAK</span>
            <div style={{ width: "36px", height: "36px", borderRadius: "12px", border: "0.7px solid rgba(96, 165, 250, 0.5)", background: "rgba(255, 255, 255, 0.9)", display: "flex", alignItems: "center", justifyContent: "center" }} className="shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "12px", border: "0.7px solid rgba(96, 165, 250, 0.5)", background: "rgba(255, 255, 255, 0.9)", display: "flex", alignItems: "center", justifyContent: "center" }} className="shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1E293B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </div>
            <span style={{ fontSize: "10px", fontWeight: 700, color: "#6D778E", letterSpacing: "0.5px" }}>POKLIČI</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "10px", fontWeight: 700, color: "#6D778E", letterSpacing: "0.5px" }}>E-POŠTA</span>
            <div style={{ width: "36px", height: "36px", borderRadius: "12px", border: "0.7px solid rgba(96, 165, 250, 0.5)", background: "rgba(255, 255, 255, 0.9)", display: "flex", alignItems: "center", justifyContent: "center" }} className="shrink-0">
              <span style={{ fontSize: "18px", fontWeight: 300, color: "#1E293B" }}>@</span>
            </div>
          </div>
        </div>
      </div>

      {/* Voice / message shortcuts block */}
      <div
        style={{
          width: "100%",
          background: "rgba(255, 255, 255, 0.3)",
          border: "1px solid #1D4ED8",
          borderRadius: "24px",
          padding: "24px 20px",
          display: "flex",
          justifyContent: "space-around",
          alignItems: "center",
          marginTop: "auto"
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "72px", height: "72px", borderRadius: "20px", border: "1px solid rgba(59, 130, 246, 0.3)", background: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0px 10px 25px -10px rgba(59, 130, 246, 0.3)" }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" fill="#64748B" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
            </svg>
          </div>
          <span style={{ fontSize: "10px", fontWeight: 700, color: "#6D778E", letterSpacing: "0.8px" }}>GLASOVNO</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "72px", height: "72px", borderRadius: "20px", border: "1px solid rgba(59, 130, 246, 0.3)", background: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0px 10px 25px -10px rgba(59, 130, 246, 0.3)" }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </div>
          <span style={{ fontSize: "10px", fontWeight: 700, color: "#6D778E", letterSpacing: "0.8px" }}>SPOROČILA</span>
        </div>
      </div>

      {/* Home Indicator */}
      <div style={{ width: "134px", height: "5px", background: "#000000", borderRadius: "100px", margin: "10px auto 0" }} className="shrink-0" />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function TransformationSlider() {
  const { t } = useLanguage();
  const [activeSlide, setActiveSlide] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (sectionRef.current) {
      sectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [activeSlide]);

  const handleScrollToPricing = (e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById("cenik");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section
      id="teren"
      ref={sectionRef}
      className="ts-section"
      style={{
        maxWidth: "1280px",
        margin: "0 auto",
        paddingBottom: "80px",
        paddingRight: "24px",
        paddingLeft: "24px",
        position: "relative",
        zIndex: 20,
      }}
    >
      <style>{`
        .ts-desktop-only {
          display: block;
        }
        .ts-mobile-only {
          display: none !important;
        }
        @media (min-width: 640px) and (max-width: 1023px) {
          .ts-desktop-only {
            display: block !important;
          }
          .ts-mobile-mockup {
            height: auto !important;
          }
          .ts-slide-content {
            height: auto !important;
          }
          .ts-slide1-body {
            font-size: 16px !important;
            line-height: 24px !important;
          }
          .ts-slide1-button-row {
            padding-left: 0 !important;
            margin-top: 32px !important;
          }
          .ts-slide2-image {
            width: 240px !important;
          }
          .ts-slide2-image img {
            width: 240px !important;
            height: auto !important;
          }
          .ts-slide {
            gap: 32px !important;
          }
        }
        @media (min-width: 360px) and (max-width: 639px) {
          .ts-mobile-only img {
            width: 300px !important;
          }
          .ts-slide-image img {
            width: 300px !important;
          }
        }
        @media (max-width: 1024px) {
          .ts-outer-card {
            padding: 40px !important;
          }
          .ts-slide {
            gap: 32px !important;
          }
        }
        @media (max-width: 639px) {
          .ts-section {
            padding-left: 12px !important;
            padding-right: 12px !important;
          }
          .ts-desktop-only {
            display: none !important;
          }
          .ts-mobile-only {
            display: flex !important;
          }
          .ts-outer-card {
            padding: 24px !important;
            border-radius: 24px !important;
          }
          .ts-slide {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 24px !important;
          }
          .ts-slide-image {
            width: 100% !important;
            display: flex;
            justify-content: center;
          }
          .ts-slide-image img {
            width: 260px !important;
            height: auto !important;
            max-width: 100%;
          }
          .ts-slide-image img.ts-mobile-mockup {
            width: calc(100% + 48px) !important;
            max-width: none !important;
            margin-left: -24px;
            margin-right: -24px;
          }
          .ts-slide-content {
            height: auto !important;
            padding-top: 0 !important;
            align-items: stretch !important;
          }
          .ts-title {
            font-size: 24px !important;
            line-height: 32px !important;
            letter-spacing: -0.5px !important;
          }
          .ts-body {
            font-size: 15px !important;
            line-height: 22px !important;
          }
          .ts-button-row {
            padding-left: 0 !important;
            padding-bottom: 0 !important;
            margin-top: 24px;
            justify-content: center !important;
          }
        }
      `}</style>

      {/* ── Outer card wrapper (allows bubble to hang outside) ─────────────── */}
      <div style={{ position: "relative" }}>

        {/* ── Outer card ──────────────────────────────────────────────────────── */}
        <div
        className="ts-outer-card"
        style={{
          background: "linear-gradient(180deg, #172033 0%, #101827 100%)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          boxShadow:
            "0px 40px 90px -45px rgba(15, 23, 42, 0.78), inset 0px 1px 0px 1px rgba(255, 255, 255, 0.14)",
          borderRadius: "44px",
          padding: "64px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* ── Glow blobs ─────────────────────────────────────────────────────── */}
        <div
          style={{
            position: "absolute",
            left: "-12%",
            bottom: "-25%",
            width: "45%",
            height: "45%",
            borderRadius: "9999px",
            background: "rgba(125, 211, 252, 0.1)",
            filter: "blur(40px)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "42%",
            top: "20%",
            width: "25%",
            height: "25%",
            borderRadius: "9999px",
            background: "rgba(255, 255, 255, 0.05)",
            filter: "blur(32px)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />

        {/* ── Slide content ──────────────────────────────────────────────────── */}
        <div style={{ position: "relative", zIndex: 10 }}>

          {/* ─────────────────── SLIDE 1 ─────────────────── */}
          {activeSlide === 0 && (
            <div
              className="ts-slide"
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "flex-start",
                gap: "64px",
              }}
            >
              {/* Left: phone image */}
              <div className="ts-slide-image ts-desktop-only" style={{ flexShrink: 0, width: "318px" }}>
                <img
                  src="/mobile.png"
                  alt="Zaslon za terence"
                  className="ts-mobile-mockup"
                  style={{
                    width: "318px",
                    height: "600px",
                    objectFit: "contain",
                    objectPosition: "top",
                    display: "block",
                  }}
                />
              </div>

              {/* Right: text + buttons */}
              <div
                className="ts-slide-content"
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  height: "600px",
                  paddingTop: "18px",
                }}
              >
                <div style={LABEL_STYLE}>PLATFORMA ZA TERENCE</div>
                <h3 className="ts-title" style={TITLE_STYLE}>En zaslon - vse je dosegljivo z enim dotikom</h3>

                {/* Mobile-only image inside the card, displayed after the title */}
                <div className="ts-mobile-only" style={{ width: "100%", justifyContent: "center", marginTop: "24px", marginBottom: "24px" }}>
                  <img
                    src="/mobile.png"
                    alt="Zaslon za terence"
                    style={{
                      width: "260px",
                      height: "auto",
                      display: "block",
                    }}
                  />
                </div>

                <div className="ts-body ts-slide1-body" style={{ ...BODY_STYLE, flex: 1, lineHeight: "28px" }}>
                  <p style={{ margin: "0 0 4px 0" }}>Prilagojen zaslon, ki bo v pomoč terencem.</p>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {[
                      "Enostavno dodajanje novih korakov",
                      "pod ikonico 'Podrobno' so vse informacije in dokumentacija, ki je vezana na to delovno nalogo",
                      "Komunikacija s pisarno/vodjo na štiri načine. Klik na ikonico s telefonom avtomatično kliče pisarno/vodjo, klik na glasovno sporočilo avtomatično pošlje sporočilo po končanem pisku.",
                    ].map((txt, i) => (
                      <li
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "10px",
                          marginBottom: "2px",
                        }}
                      >
                        <span style={{ color: "#60A5FA", flexShrink: 0 }}>•</span>
                        <span>{txt}</span>
                      </li>
                    ))}
                  </ul>
                  <p style={{ fontWeight: 400, margin: "16px 0 0 0" }}>
                    Pomembno: Terenci se ne učijo novega sistema. Samo opravijo svoje delo.
                  </p>
                  <p style={{ margin: "16px 0 0 0" }}>
                    Ne dodajamo še ene nove aplikacije, ampak samo optimiziramo način dela.
                  </p>
                </div>

                {/* Buttons — left-aligned at the bottom */}
                <div
                  className="ts-button-row ts-slide1-button-row"
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    gap: "16px",
                    paddingBottom: "40px",
                    paddingLeft: "50px",
                    width: "100%",
                  }}
                >
                  <button onClick={() => setActiveSlide(1)} style={{ ...BTN_WHITE, cursor: "pointer" }}>
                    Glasovna sporočila
                    <svg width="14" height="11" viewBox="0 0 14 11" fill="none">
                      <path
                        d="M0.5625 5.0625H12.5625M12.5625 5.0625L8.0625 0.5625M12.5625 5.0625L8.0625 9.5625"
                        stroke="#0F172A"
                        strokeWidth="1.125"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ─────────────────── SLIDE 2 ─────────────────── */}
          {activeSlide === 1 && (
            <div
              className="ts-slide"
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",  /* vertically center both columns relative to each other */
                gap: "64px",
              }}
            >
              {/* Left: all text content */}
              <div
                className="ts-slide-content"
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                }}
              >
                <div style={LABEL_STYLE_SLIDE_2}>GLASOVNA SPOROČILA</div>
                <h3 className="ts-title" style={TITLE_STYLE}>Teren govori. Pisarna ukrepa. Delo teče hitreje.</h3>

                {/* Intro paragraph */}
                <p className="ts-body" style={{ ...BODY_STYLE, margin: "0 0 36px 0" }}>
                  Namesto telefonskega klica terenec govori v mikrofon. AI iz govora pripravi
                  kratek, jasen zapis, ki je takoj prikazan na delovni tabli pisarne. Informacije
                  postanejo uporabne takoj in pisarna lahko ukrepa.
                </p>

                {/* Example 1 */}
                <div style={{ marginBottom: "16px" }}>
                  {/* Label + quoted speech: weight 400 */}
                  <p style={{ fontFamily: "Inter, sans-serif", fontWeight: 400, fontSize: "14px", lineHeight: "20px", color: "#EEF4FB", margin: "0 0 4px 0" }}>
                    Primer. Terenec govori:
                  </p>
                  <p style={{ fontFamily: "Inter, sans-serif", fontWeight: 300, fontSize: "14px", lineHeight: "20px", color: "#CBD5E1", margin: "0 0 16px 0" }}>
                    &ldquo;Poslušaj, prišlo je do prometne nesreče na obvoznici, premikamo se s polžjo hitrostjo in zabijam čas tukaj, ko se mudi. Zgleda, da bom lahko prevzel šele okrog enajstih namesto ob desetih.&rdquo;
                  </p>
                  {/* AI label + AI output: weight 400 for label, 300 for quote */}
                  <p style={{ fontFamily: "Inter, sans-serif", fontWeight: 400, fontSize: "14px", lineHeight: "20px", color: "#EEF4FB", margin: "0 0 4px 0" }}>
                    AI sporočilo pretvori v tekst, ki se prikaže na delovni tabli pisarne.
                  </p>
                  <p style={{ fontFamily: "Inter, sans-serif", fontWeight: 300, fontSize: "14px", lineHeight: "20px", color: "#CBD5E1", margin: "0 0 16px 0" }}>
                    &ldquo;Prometna nesreča na obvoznici. Prevzem okrog 11:00.&rdquo;
                  </p>
                  {/* Outcome: weight 400 */}
                  <p style={{ fontFamily: "Inter, sans-serif", fontWeight: 400, fontSize: "14px", lineHeight: "20px", color: "#EEF4FB", margin: "0 0 24px 0" }}>
                    Pisarna je obveščena, naročnika lahko obvesti o zamudi ali organizira prevzem tovora preko drugega.
                  </p>
                </div>

                {/* Example 2 */}
                <div style={{ marginBottom: "16px" }}>
                  <p style={{ fontFamily: "Inter, sans-serif", fontWeight: 400, fontSize: "14px", lineHeight: "20px", color: "#EEF4FB", margin: "0 0 4px 0" }}>
                    Drug primer: Terenec govori:
                  </p>
                  <p style={{ fontFamily: "Inter, sans-serif", fontWeight: 300, fontSize: "14px", lineHeight: "20px", color: "#CBD5E1", margin: "0 0 16px 0" }}>
                    &ldquo;Evo, vse smo zaključil. Aja, porabil smo še dve kartuši silikona pa eno PU peno. Ne vem, če je še kaj ostalo v kakem kombiju al če mamo v skladišču.&rdquo;
                  </p>
                  <p style={{ fontFamily: "Inter, sans-serif", fontWeight: 400, fontSize: "14px", lineHeight: "20px", color: "#EEF4FB", margin: "0 0 4px 0" }}>
                    AI prepozna porabljen material in pripravi zapis, ki se prikaže na delovni tabli pisarne.
                  </p>
                  <p style={{ fontFamily: "Inter, sans-serif", fontWeight: 300, fontSize: "14px", lineHeight: "20px", color: "#CBD5E1", margin: "0 0 16px 0" }}>
                    &ldquo;Porabljeno: 2× kartuša silikona, 1× PU pena. Preveri zalogo.&rdquo;
                  </p>
                  <p style={{ fontFamily: "Inter, sans-serif", fontWeight: 400, fontSize: "14px", lineHeight: "20px", color: "#EEF4FB", margin: "0 0 24px 0" }}>
                    Pisarna posodobi zalogo in doda artikle na seznam za naročilo.
                  </p>
                </div>

                {/* Example 3 */}
                <p style={{ fontFamily: "Inter, sans-serif", fontWeight: 400, fontSize: "14px", lineHeight: "20px", color: "#EEF4FB", margin: 0 }}>
                  Tretji primer: Terenci konec dneva v 15 sekundah povzamejo opravljena dela v dnevnem poročilu.
                </p>
              </div>

              {/* Right: voiceToText.jpg image — vertically centered (alignItems:center on parent handles this) */}
              <div className="ts-slide-image ts-slide2-image" style={{ flexShrink: 0, width: "304px" }}>
                <img
                  src="/voiceToText.jpg"
                  alt="Voice to text demo"
                  style={{
                    width: "304px",
                    height: "419px",
                    objectFit: "cover",
                    objectPosition: "top",
                    borderRadius: "21.6px",
                    border: "1px solid #FFFFFF",
                    display: "block",
                  }}
                />
              </div>
            </div>
          )}

        </div>

        {/* ── Navigation dots ─────────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "8px",
            marginTop: "40px",
            position: "relative",
            zIndex: 10,
          }}
        >
          {[0, 1].map((i) => (
            <button
              key={i}
              onClick={() => setActiveSlide(i)}
              style={{
                width: "14px",
                height: "14px",
                borderRadius: "9999px",
                background: activeSlide === i ? "#FFFFFF" : "rgba(255,255,255,0.3)",
                border: "none",
                cursor: "pointer",
                transition: "all 0.2s",
                transform: activeSlide === i ? "scale(1.1)" : "scale(1)",
                padding: 0,
              }}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>

        {activeSlide === 0 && (
          <FloatingBubble
            title="Platforma ne doda dela."
            subtitle="Samo šum odstrani."
            rotation={3}
            className="right-8 bottom-8 hidden lg:block"
          />
        )}
      </div>
      </div>
    </section>
  );
}
