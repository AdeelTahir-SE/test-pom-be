import React, { useMemo, useRef, useState, useEffect } from "react";

const ENTER_DURATION = 1.6;
const STAGGER_PER_100PX = 0.045;
const BASE_DELAY = 0.15;

const templates = [
  { g: "linear-gradient(160deg,#0F9AA8,#0C6E7A)", label: "402 13 21 21", sub: "circle", kind: "countdown" },
  { g: "linear-gradient(160deg,#3E6B8C,#2B4A63)", label: "Costium vs. Highphine", sub: "Next match live on TV", kind: "photo" },
  { g: "linear-gradient(200deg,#7A4FD1,#3E2C86)", label: "UPON THE MOUNTAINS", sub: "get lost in the peaks", kind: "hero", featured: true },
  { g: "#F4B400", label: "Chat, talk and see your friends", sub: "", kind: "app" },
  { g: "#C62828", label: "Simplicity", sub: "portrait blog", kind: "blog" },

  { g: "linear-gradient(160deg,#3B4A3F,#212B24)", label: "Nature Can't Wait", sub: "your part starts right now", kind: "photo" },
  { g: "linear-gradient(200deg,#28313D,#171D24)", label: "TO BE HEALED & REFRESHED", sub: "", kind: "photo" },
  { g: "#141414", label: "Portrait photography", sub: "John Doe Editor", kind: "portrait" },
  { g: "#1A1A1A", label: "", sub: "", kind: "eagle" },
  { g: "linear-gradient(160deg,#3A3A3A,#161616)", label: "EXPLORE", sub: "somewhere you've never been", kind: "travel" },

  { g: "linear-gradient(160deg,#EDEDED,#D8D8D8)", label: "Master Slider WordPress P", sub: "", kind: "ui" },
  { g: "linear-gradient(200deg,#3D2A1E,#1F150F)", label: "Getting married in", sub: "348 : 03 : 38 : 44", kind: "countdown2" },
  { g: "linear-gradient(160deg,#8A6A46,#5A422B)", label: "LISTEN TO", sub: "the sounds of nature", kind: "photo" },
  { g: "linear-gradient(200deg,#2C2C2C,#131313)", label: "LIVING IN TOWN", sub: "", kind: "photo" },
];

const positions = [
  { left: 850, top: 0 },
  { left: 1068, top: 275 },
  { left: 1285, top: 550, featured: true },
  { left: 1503, top: 825 },
  { left: 1720, top: 1100 },

  { left: 633, top: 275 },
  { left: 850, top: 550 },
  { left: 1068, top: 825 },
  { left: 1285, top: 1100 },
  { left: 1503, top: 1375 },

  { left: 415, top: 550 },
  { left: 633, top: 825 },
  { left: 850, top: 1100 },
  { left: 1068, top: 1375 },
];



function CardContent(t:any) {
  switch (t.kind) {
    case "hero":
      return (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", padding: "0 24px" }}>
          <div style={{ fontSize: 10, letterSpacing: ".15em", opacity: 0.85, marginBottom: 6 }}>GREAT ESCAPE</div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: ".03em", lineHeight: 1.2 }}>{t.label}</div>
          <div style={{ marginTop: 14, border: "1px solid rgba(255,255,255,.6)", borderRadius: 999, padding: "4px 14px", fontSize: 10, letterSpacing: ".1em" }}>DISCOVER</div>
        </div>
      );
    case "countdown":
      return (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", border: "2px solid rgba(255,255,255,.6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, marginBottom: 10 }}>
            {t.label}
          </div>
        </div>
      );
    case "app":
      return (
        <div style={{ flex: 1, padding: 20, display: "flex", flexDirection: "column", justifyContent: "center", color: "#3A2E00" }}>
          <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.3, maxWidth: "70%" }}>{t.label}</div>
          <div style={{ marginTop: 14, width: 64, height: 110, borderRadius: 12, background: "rgba(255,255,255,.85)", alignSelf: "flex-end", marginRight: 20 }} />
        </div>
      );
    case "blog":
      return (
        <div style={{ flex: 1, padding: 18, display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{t.label}</div>
          <div style={{ flex: 1, display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ height: 6, background: "rgba(255,255,255,.5)", borderRadius: 3, marginBottom: 6, width: "90%" }} />
              <div style={{ height: 6, background: "rgba(255,255,255,.5)", borderRadius: 3, marginBottom: 6, width: "75%" }} />
              <div style={{ height: 6, background: "rgba(255,255,255,.5)", borderRadius: 3, width: "60%" }} />
            </div>
            <div style={{ width: 70, height: "100%", background: "rgba(0,0,0,.35)", borderRadius: 6 }} />
          </div>
        </div>
      );
    case "portrait":
      return (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: 16, background: "radial-gradient(circle at 60% 35%, rgba(255,255,255,.08), transparent 60%)" }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{t.label}</div>
          <div style={{ fontSize: 10, opacity: 0.65 }}>{t.sub}</div>
        </div>
      );
    case "eagle":
      return <div style={{ flex: 1, background: "radial-gradient(circle at 65% 40%, #4a4a4a, #1a1a1a 70%)" }} />;
    case "travel":
      return (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: 18 }}>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: ".15em" }}>{t.label}</div>
          <div style={{ fontSize: 9, letterSpacing: ".1em", opacity: 0.7, marginTop: 6 }}>{t.sub}</div>
        </div>
      );
    case "ui":
      return (
        <div style={{ flex: 1, padding: 16, color: "#333", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ fontSize: 12, fontWeight: 600 }}>{t.label}</div>
          <div style={{ marginTop: 10, height: 8, background: "#bbb", borderRadius: 4, width: "80%" }} />
        </div>
      );
    case "countdown2":
      return (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
          <div style={{ fontSize: 11, opacity: 0.8 }}>{t.label}</div>
          <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: ".05em", marginTop: 6 }}>{t.sub}</div>
        </div>
      );
    default:
      return (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.25 }}>{t.label}</div>
          <div style={{ fontSize: 9, opacity: 0.7, marginTop: 4 }}>{t.sub}</div>
        </div>
      );
  }
}

export default function CardAnimationSection() {
  const sectionRef = useRef(null);
  const [inView, setInView] = useState(false);

  // Trigger the entrance animation once, the first time the section
  // scrolls into the viewport — not on initial page load.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.35 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const cards = useMemo(() => {
    return positions.map((pos, originalIndex) => {
      const t = templates[originalIndex % templates.length];
      
      // Determine row assignment:
      // Group 1 (Green row): indices 0 to 4
      // Group 2 (Red row): indices 5 to 9
      // Group 3 (Blue row): indices 10 to 13
      let row = 0; // 0: Green, 1: Red, 2: Blue
      let indexInRow = 0;
      let maxIndexInRow = 4;
      
      if (originalIndex >= 0 && originalIndex <= 4) {
        row = 0; // Green row
        indexInRow = originalIndex;
        maxIndexInRow = 4;
      } else if (originalIndex >= 5 && originalIndex <= 9) {
        row = 1; // Red row
        indexInRow = originalIndex - 5;
        maxIndexInRow = 4;
      } else {
        row = 2; // Blue row
        indexInRow = originalIndex - 10;
        maxIndexInRow = 3;
      }

      // Delay sequence: Red row (row 1) first, Green row (row 0) second, Blue row (row 2) third
      let rowBaseDelay = 0;
      if (row === 1) {
        rowBaseDelay = 1.0;
      } else if (row === 0) {
        rowBaseDelay = 0.0;
      } else {
        rowBaseDelay = 2.0;
      }

      const delay = BASE_DELAY + rowBaseDelay + (maxIndexInRow - indexInRow) * 0.45;
      return { ...pos, t, delay };
    });
  }, []);

  const featured = cards.find((c) => c.featured);
  const shadowDelay = featured ? featured.delay + ENTER_DURATION - 0.15 : 0;

  return (
    <div
      ref={sectionRef}
      className={`itp-stage${inView ? " itp-in-view" : ""}`}
      style={{ position: "relative", top:"20vh", height: "100vh", width: "100%", overflow: "hidden", background: "#f5f6f8", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}
    >
      <style>{`
        .itp-grid-bg {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(to right, #dcdcdc 1px, transparent 1px),
            linear-gradient(to bottom, #dcdcdc 1px, transparent 1px);
          background-size: 90px 90px;
          opacity: 0.6;
        }
        .itp-card {
          position: absolute;
          height: 235px; width: 395px;
          overflow: hidden;
          border: 2px solid #fff;
          border-radius: 3px;
          box-shadow: 0 12px 30px rgba(0,0,0,0.15);
          opacity: 0;
          animation: itp-card-fly-in 1.6s cubic-bezier(0.22, 1, 0.36, 1) both;
          animation-play-state: paused;
        }
        .itp-in-view .itp-card { animation-play-state: running; }
        .itp-card-face {
          position: absolute; inset: 0;
          display: flex; flex-direction: column; color: #fff;
        }
        /* Start offset is rotated so it reads as bottom-left -> top-right on screen */
        @keyframes itp-card-fly-in {
          0%   { opacity: 0; transform: translate3d(-340px, 90px, 0); }
          55%  { opacity: 1; }
          100% { opacity: 1; transform: translate3d(0, 0, 0); }
        }
        .itp-ground-shadow {
          position: absolute;
          height: 235px; width: 395px;
          background: #000;
          z-index: 40;
          opacity: 0;
          animation: itp-shadow-fade-in 0.8s cubic-bezier(0.25, 1, 0.5, 1) both;
          animation-play-state: paused;
        }
        .itp-in-view .itp-ground-shadow { animation-play-state: running; }
        .itp-featured-wrap {
          position: absolute;
          z-index: 100;
          animation: itp-featured-full-animation 3.8s both;
          animation-play-state: paused;
          transform-style: preserve-3d;
        }
        .itp-in-view .itp-featured-wrap { animation-play-state: running; }
        @keyframes itp-featured-full-animation {
          0%   { transform: translate3d(-340px, 90px, 0) scale3d(1, 1, 1); animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1); }
          42%  { transform: translate3d(0, 0, 0) scale3d(1, 1, 1); animation-timing-function: step-end; }
          79%  { transform: translate3d(0, 0, 0) scale3d(1, 1, 1); animation-timing-function: cubic-bezier(0.25, 1, 0.5, 1); }
          100% { transform: translate3d(-105px, 160px, 180px) scale3d(1.2, 1.2, 1.2); }
        }
        @keyframes itp-shadow-fade-in {
          0%   { opacity: 0; filter: blur(4px); transform: translate3d(0, 0, 0) scale(0.9); }
          100% { opacity: 0.45; filter: blur(18px); transform: translate3d(-93px, 196px, 0) scale(1.05); }
        }
        .itp-featured-card {
          position: relative;
          height: 235px; width: 395px;
          overflow: hidden;
          border-radius: 3px;
          border: 3px solid #5B7CFF;
          box-shadow: 0 30px 60px rgba(0,0,0,.45), 0 12px 24px rgba(0,0,0,.25), 0 0 0 1px rgba(91,124,255,.8);
          opacity: 0;
          animation: itp-card-fade-in 1.6s cubic-bezier(0.22, 1, 0.36, 1) both;
          animation-play-state: paused;
        }
        .itp-in-view .itp-featured-card { animation-play-state: running; }
        @keyframes itp-card-fade-in {
          0%   { opacity: 0; }
          55%  { opacity: 1; }
          100% { opacity: 1; }
        }
        .itp-glow {
          position: absolute; inset: -20px;
          border-radius: 8px;
          background: rgba(75,116,255,0.3);
          filter: blur(24px);
          opacity: 0;
          animation: itp-fade-in-up 0.6s ease-out both;
          animation-play-state: paused;
        }
        .itp-in-view .itp-glow { animation-play-state: running; }
        .itp-pointer {
          position: absolute; left: 50%; top: -30px; z-index: 300;
          display: flex; flex-direction: column; align-items: center;
          transform-origin: bottom center;
          opacity: 0;
          animation: itp-pointer-fade-in 0.6s ease-out both;
          animation-play-state: paused;
        }
        .itp-in-view .itp-pointer { animation-play-state: running; }
        .itp-pointer-label {
          border-radius: 999px; background: #2F6BFF;
          padding: 4px 16px; font-size: 11px; font-weight: 600;
          letter-spacing: 0.05em; color: #fff;
          box-shadow: 0 8px 20px rgba(0,0,0,0.25);
          white-space: nowrap;
        }
        .itp-pointer-line { height: 48px; width: 2px; background: #fff; }
        .itp-pointer-dot {
          height: 12px; width: 12px; border-radius: 50%;
          border: 1px solid #fff; background: #fff;
          box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        }
        @keyframes itp-fade-in-up {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes itp-pointer-fade-in {
          from { opacity: 0; transform: translate3d(-50%, 6px, 0) rotate(47deg) rotateX(-58deg); }
          to   { opacity: 1; transform: translate3d(-50%, 0, 0) rotate(47deg) rotateX(-58deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .itp-card, .itp-featured-wrap, .itp-glow, .itp-pointer, .itp-ground-shadow {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>

      <div className="itp-grid-bg" />

      <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}>
        <div
          style={{
            position: "relative",
            height: 1500,
            width: 2600,
            transformStyle: "preserve-3d",
            transform: "perspective(3200px) rotateX(58deg) rotateZ(-47deg) scale(0.92)",
            transformOrigin: "center",
          }}
        >
          {featured && <div className="itp-ground-shadow" style={{ left: featured.left, top: featured.top, animationDelay: '5.0s' }} />}

          {cards.map((c, i) => {
            if (c.featured) {
              const pointerDelay = 5.0;
              return (
                <div key={i} className="itp-featured-wrap" style={{ left: c.left, top: c.top, animationDelay: `${c.delay}s`, zIndex: 10000 }}>
                  <div className="itp-pointer" style={{ animationDelay: `${pointerDelay}s` }}>
                    <div className="itp-pointer-label">SELECT TEMPLATE</div>
                    <div className="itp-pointer-line" />
                    <div className="itp-pointer-dot" />
                  </div>
                  <div className="itp-glow" style={{ animationDelay: `${pointerDelay}s` }} />
                  <div className="itp-featured-card" style={{ animationDelay: `${c.delay}s` }}>
                    <div className="itp-card-face" style={{ background: c?.t?.g }}>
                      <CardContent t={c.t} />
                    </div>
                  </div>
                </div>
              );
            }
            return (
              <div key={i} className="itp-card" style={{ left: c.left, top: c.top, animationDelay: `${c.delay}s`, zIndex: Math.round(c.left + c.top) }}>
                <div className="itp-card-face" style={{ background: c?.t?.g }}>
                  <CardContent t={c.t} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

