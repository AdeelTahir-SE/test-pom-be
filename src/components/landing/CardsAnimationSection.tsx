import React, { useRef, useState, useEffect } from "react";
import { useLanguage } from "@/lib/useLanguage";
import type { Worker, Order } from "@/lib/mockData";
import type { Message } from "@/lib/types/messages";
import { WorkerCard } from "@/components/dashboard/WorkerCard";
import { OfficeCard } from "@/components/dashboard/OfficeCard";
import { CommunicationCard } from "@/components/dashboard/CommunicationCard";

export default function CardAnimationSection() {
  const { t } = useLanguage();
  const viewportRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [scale, setScale] = useState(0.85);
  const [isMobile, setIsMobile] = useState(false);
  const [showPointers, setShowPointers] = useState(false);
  const [goDown, setGoDown] = useState(false);

  // Rotation controls for X, Y, Z axes
  const [rotateX, setRotateX] = useState(45);
  const [rotateY, setRotateY] = useState(9);
  const [rotateZ, setRotateZ] = useState(-31);

  // Responsive scaling handler
  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      setIsMobile(w < 768);
      if (w >= 1280) {
        setScale(0.7);
      } else if (w >= 1024) {
        setScale(0.6);
      } else if (w >= 768) {
        setScale(0.44);
      } else {
        // Mobile scaling factor (based on 1300 width)
        setScale(Math.max(0.25, ((w - 32) / 1300) * 0.88));
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Intersection observer to trigger animation once
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    // Use a smaller threshold on mobile since the stacked cards are much taller
    const isMobileViewport = window.innerWidth < 768;
    const threshold = isMobileViewport ? 0.08 : 0.3;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true);
            observer.disconnect();
          }
        });
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Timer to sync pointer appearance and card hover launch (8.5 seconds)
  useEffect(() => {
    if (inView) {
      const timer = setTimeout(() => {
        setShowPointers(true);
      }, 8500);
      return () => clearTimeout(timer);
    }
  }, [inView]);

  // Timer to trigger "go down" animation after all cards have arrived (7.0 seconds)
  useEffect(() => {
    if (inView) {
      const timer = setTimeout(() => {
        setGoDown(true);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [inView]);

  // Hardcoded preview data
  const previewWorkers: Worker[] = [
    {
      id: "pw1",
      name: "Anthony H",
      avatar: "AH",
      role: "Novak d.o.o.",
      currentTask: "Kopalnica prenova",
      status: "v_teku",
      phone: "+386 40 123 456",
      email: "anthony.hopkins@pomocnik.net",
      unreadCount: 1,
      location: "Ljubljana",
      tasks: [
        { id: "pt1_1", text: "Odvoz materiala - Stane", completed: true },
        { id: "pt1_2", text: "Začetek del", completed: true },
        { id: "pt1_3", text: "Polaganje ploščic", completed: false }
      ]
    },
    {
      id: "pw2",
      name: "ANA NOVAK",
      avatar: "AN",
      role: "JGD d.o.o.",
      currentTask: "Čiščenje prostorov",
      status: "zakasnitev",
      phone: "+386 31 987 654",
      email: "alec.navarro@pomocnik.net",
      unreadCount: 0,
      location: "Ljubljana",
      tasks: [
        { id: "pt2_1", text: "Čiščenje tal", completed: true },
        { id: "pt2_2", text: "Čiščenje kuhinje", completed: true },
        { id: "pt2_3", text: "Dnevno poročilo", completed: false }
      ]
    }
  ];

  const previewOrders: Order[] = [
    {
      id: "po1",
      title: "Pokliči Maksa za rezervacijo",
      description: "Danes je zadnji dan.",
      time: "10:30",
      createdAt: "09:02",
      priority: "nujno",
      status: "caka_potrditev",
      workerId: "pw1",
      workerName: "LIAM"
    },
    {
      id: "po2",
      title: "Podpiši izvozne dokumente",
      description: "Izvozna deklaracija za Avstrijo.",
      time: "12:00",
      createdAt: "11:34",
      priority: "visoka",
      status: "caka_potrditev",
      workerId: "pw2",
      workerName: "SIMON"
    }
  ];

  const previewMessages: Message[] = [
    {
      id: "pm1",
      workerId: "pw1",
      workerName: "ANA NOVAK",
      text: "Stranke ni bilo na naslovu. Začenjam pol ure kasneje.",
      time: "09:18",
      type: "glasovno",
      targetTask: "Čiščenje prostorov"
    },
    {
      id: "pm2",
      workerId: "pw2",
      workerName: "ANTHONY H",
      text: "Prometna nesreča pri Celju. Zaprta cesta do 13:30.",
      time: "10:53",
      type: "glasovno",
      targetTask: "Kopalnica prenova"
    }
  ];

  // The 6 cards in order of appearance mapping to the columns (width 1300 scale):
  // isPointerCard triggers the rise-and-float animation at the end
  const cards = [
    { left: 450, top: 280, col: 2, row: 1, type: "order", data: previewOrders[0], delay: 0.0, isPointerCard: true },
    { left: 0, top: 280, col: 1, row: 1, type: "worker", data: previewWorkers[0], delay: 0.6 },
    { left: 450, top: 570, col: 2, row: 2, type: "order", data: previewOrders[1], delay: 1.2 },
    { left: 900, top: 280, col: 3, row: 1, type: "message", data: previewMessages[0], delay: 1.8 },
    { left: 0, top: 570, col: 1, row: 2, type: "worker", data: previewWorkers[1], delay: 2.4 },
    { left: 900, top: 570, col: 3, row: 2, type: "message", data: previewMessages[1], delay: 3.0 }
  ];

  const renderCardContent = (c: typeof cards[0]) => {
    const noop = () => {};
    if (c.type === "worker") {
      return (
        <WorkerCard
          worker={c.data as any}
          onToggleTask={noop}
          date="23/05/26"
          orderId={c.row === 2 ? "#486" : "#484"}
          onClick={undefined}
          disableActions={true}
        />
      );
    } else if (c.type === "order") {
      return (
        <CommunicationCard
          order={c.data as any}
          buttonsConfig={c.row === 1 ? "call-tick-decline" : "attachment-tick-decline"}
          showRedButton={c.row === 1}
          onResolve={noop}
          onDismiss={noop}
          onArchive={noop}
          onCall={noop}
          onAttachmentClick={noop}
        />
      );
    } else {
      return (
        <OfficeCard
          message={c.data as any}
          iconType={c.row === 2 ? "document" : "mic"}
          showRedButton={c.row === 2}
          onDismiss={noop}
        />
      );
    }
  };

  return (
    <section
      id="komandni-center"
      className="max-w-7xl mx-auto px-3 md:px-6 pb-20 w-full relative"
    >

      {/* Animation Viewport */}
      <div
        ref={viewportRef}
        className="relative w-full rounded-[24px] md:rounded-[44px] border border-slate-200/80 dark:border-white/10 overflow-hidden bg-white/60 dark:bg-[#101827]/60 backdrop-blur-md shadow-xl transition-all duration-300"
        style={{ height: isMobile ? "auto" : "780px" }}
      >
        <style>{`
          .itp-grid-bg {
            position: absolute; inset: 0;
            background-image:
              linear-gradient(to right, rgba(148, 163, 184, 0.15) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(148, 163, 184, 0.15) 1px, transparent 1px);
            background-size: 80px 80px;
            opacity: 0.8;
          }
          .dark .itp-grid-bg {
            background-image:
              linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
          }
          .itp-card {
            position: absolute;
            height: auto; width: 395px;
            overflow: visible;
            border-radius: 12px;
            opacity: 0;
            animation: itp-card-slide-in 3.5s cubic-bezier(0.05, 0.95, 0.05, 1) both;
            animation-play-state: paused;
            will-change: transform, opacity;
            backface-visibility: hidden;
            transform-style: preserve-3d;
          }
          /* High-performance shadows using pseudo-element opacity */
          .itp-card::after {
            content: "";
            position: absolute;
            inset: 0;
            border-radius: 12px;
            pointer-events: none;
            z-index: -1;
            box-shadow: -20px 40px 15px rgba(15, 23, 42, 0.28);
            opacity: 1;
            transition: opacity 1.2s cubic-bezier(0.05, 0.95, 0.05, 1);
          }
          /* Fade out shadow when card settles on the flat surface */
          .itp-card.itp-go-down::after {
            opacity: 0;
          }
          /* Fade shadow back in when card is hovering/pointer active */
          .itp-card.itp-card-hovering::after {
            opacity: 1 !important;
          }
          .itp-in-view .itp-card,
          .itp-in-view .itp-nujno-block,
          .itp-in-view .itp-overview-block {
            animation-play-state: running;
          }
          .itp-nujno-block,
          .itp-overview-block {
            will-change: transform, opacity;
            backface-visibility: hidden;
            transform-style: preserve-3d;
          }
          @keyframes itp-card-slide-in {
            0%   { 
              opacity: 0; 
              transform: translate3d(1200px, 800px, 200px); 
            }
            20%  { 
              opacity: 1; 
            }
            100% { 
              opacity: 1; 
              transform: translate3d(0, 0, 40px);
            }
          }
          /* Rise-up and fix styling in the air for top cards when pointers activate */
          .itp-card-hovering {
            opacity: 1 !important;
            animation: itp-card-rise-up 1.2s cubic-bezier(0.05, 0.95, 0.05, 1) forwards !important;
            animation-delay: 0s !important;
          }
          @keyframes itp-card-rise-up {
            0% {
              transform: translate3d(0, 0, 0);
            }
            100% {
              transform: translate3d(0, 0, 45px);
            }
          }
          /* All cards go down together */
          .itp-card.itp-go-down {
            opacity: 1 !important;
            animation: itp-card-go-down 1.2s cubic-bezier(0.05, 0.95, 0.05, 1) forwards;
            animation-delay: 0s !important;
          }
          @keyframes itp-card-go-down {
            0% {
              opacity: 1;
              transform: translate3d(0, 0, 40px);
            }
            100% {
              opacity: 1;
              transform: translate3d(0, 0, 0);
            }
          }
          /* Overview and urgent blocks slide in completely to flat state */
          @keyframes itp-block-slide-in {
            0%   { 
              opacity: 0; 
              transform: translate3d(1200px, 800px, 200px); 
            }
            20%  { 
              opacity: 1; 
            }
            100% { 
              opacity: 1; 
              transform: translate3d(0, 0, 0); 
            }
          }
          .itp-pointer {
            position: absolute; z-index: 300;
            display: flex; flex-direction: column; align-items: center;
            transform-origin: bottom center;
            transform: translate3d(-50%, 0, 45px) rotateZ(${rotateZ * -1}deg) rotateY(${rotateY * -1}deg) rotateX(${rotateX * -1}deg);
            transform-style: preserve-3d;
          }
          .itp-pointer-flat {
            position: absolute; z-index: 300;
            display: flex; flex-direction: column; align-items: center;
            transform-origin: bottom center;
            transform: translate3d(-50%, 0, 0px) rotateZ(${rotateZ * -1}deg) rotateY(${rotateY * -1}deg) rotateX(${rotateX * -1}deg);
            transform-style: preserve-3d;
          }
          .itp-pointer-label {
            border-radius: 999px; background: #2F6BFF;
            padding: 6px 18px; font-size: 12px; font-weight: 600;
            letter-spacing: 0.05em; color: #fff;
            box-shadow: 0 10px 25px rgba(47, 107, 255, 0.35);
            white-space: nowrap;
            transform-origin: bottom center;
            transform: scale(0);
            opacity: 0;
            animation: itp-label-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
            animation-delay: calc(var(--ptr-delay, 0s) + 0.7s);
          }
          @keyframes itp-label-pop {
            to { transform: scale(1); opacity: 1; }
          }
          .itp-pointer-line {
            height: 40px; width: 2px; background: #2F6BFF;
            transform-origin: bottom center;
            transform: scaleY(0);
            animation: itp-line-grow 0.5s ease-out forwards;
            animation-delay: calc(var(--ptr-delay, 0s) + 0.3s);
          }
          @keyframes itp-line-grow {
            to { transform: scaleY(1); }
          }
          .itp-pointer-dot {
            height: 10px; width: 10px; border-radius: 50%;
            border: 2px solid #2F6BFF; background: #fff;
            box-shadow: 0 4px 10px rgba(0,0,0,0.15);
            transform: scale(0);
            animation: itp-dot-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
            animation-delay: var(--ptr-delay, 0s);
          }
          @keyframes itp-dot-pop {
            to { transform: scale(1); }
          }
          @keyframes itp-float-slow {
            0%, 100% { transform: translateY(0px) scale(1); }
            50% { transform: translateY(-12px) scale(1.05); }
          }
        `}</style>

        {/* Grid Background */}
        <div className="itp-grid-bg" />

        {/* Ambient Decorative Glowing Orbs */}
        <div className="absolute top-[10%] left-[5%] w-[160px] h-[160px] rounded-full bg-blue-400/5 dark:bg-blue-500/10 blur-2xl pointer-events-none" style={{ animation: "itp-float-slow 7s ease-in-out infinite" }} />
        <div className="absolute bottom-[15%] right-[10%] w-[220px] h-[220px] rounded-full bg-indigo-400/5 dark:bg-indigo-500/10 blur-3xl pointer-events-none" style={{ animation: "itp-float-slow 9s ease-in-out infinite 1s" }} />

        {/* Block Header */}
        <div className="text-left pt-10 md:pt-12 px-6 md:px-12 pb-4 flex flex-col items-start relative md:absolute md:left-0 md:top-0 w-full md:max-w-2xl z-20">
          <h2 className="font-['Inter',sans-serif] text-3xl md:text-[40px] lg:text-5xl font-normal md:font-light tracking-tight leading-tight text-slate-950 dark:text-white mt-2">
            {t('cmdCenterTitle')}
          </h2>
          <p className="font-['Inter',sans-serif] text-sm md:text-base font-light text-slate-500 dark:text-slate-400 mt-4 max-w-2xl leading-relaxed">
            <p>Vsak delovni dan je bolje organiziran.
             Ekipa dela samostojneje,</p><p> komunikacije je manj, a je hitrejša, pregled nad deli </p><p>je boljši in vodenje lažje.</p>
          </p>
        </div>

        {isMobile ? (
          /* Responsive Mobile Layout (Flat stack, no 3D) */
          <div className="flex flex-col gap-6 px-4 py-8 max-w-md mx-auto w-full relative z-10">
            {/* NUJNE ZADEVE Block */}
            <MobileScrollReveal>
              <div className="relative rounded-2xl border border-slate-200 dark:border-white/10 p-5 shadow-lg bg-[#1D2A3D] w-full">
                <div className="flex items-center gap-3 mb-3">
                  <svg width="20" height="20" viewBox="0 0 34 34" fill="none">
                    <path d="M17 0C7.61175 0 0 7.61175 0 17C0 26.3883 7.61175 34 17 34C26.3883 34 34 26.3883 34 17C34 7.61175 26.3883 0 17 0ZM15.0861 9.19842C14.9727 8.06367 15.8653 7.08333 17 7.08333C18.1348 7.08333 19.0273 8.06367 18.9139 9.19842C18.4708 13.6299 18.2223 16.1144 17.7792 20.5459C17.7381 20.9454 17.4023 21.25 17 21.25C16.5977 21.25 16.2619 20.9454 16.2208 20.5445L15.0861 9.19842ZM17 27.2708C16.0225 27.2708 15.2292 26.4775 15.2292 25.5C15.2292 24.5225 16.0225 23.7292 17 23.7292C17.9775 23.7292 18.7708 24.5225 18.7708 25.5C18.7708 26.4775 17.9775 27.2708 17 27.2708Z" fill="#FF3B30"/>
                  </svg>
                  <span className="font-['PT_Sans',sans-serif] font-bold text-white text-xs tracking-wide uppercase">NUJNE ZADEVE</span>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex items-start gap-3">
                    <span className="text-xs font-semibold text-[#FF3B30] min-w-[34px]">10:30</span>
                    <div>
                      <p className="text-xs text-white font-medium">Pokliči Maksa za rezervacijo</p>
                      <p className="text-[10px] text-slate-300">Danes je zadnji dan.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-xs font-semibold text-[#FF3B30] min-w-[34px]">10:53</span>
                    <div>
                      <p className="text-xs text-white font-medium">Prometna nesreča pri Celju</p>
                      <p className="text-[10px] text-slate-300">Zaprta cesta do 13:30.</p>
                    </div>
                  </div>
                </div>
              </div>
            </MobileScrollReveal>

            {/* HITRI PREGLED Block */}
            <MobileScrollReveal>
              <div className="relative rounded-2xl border border-slate-200 dark:border-white/10 p-5 shadow-lg bg-white dark:bg-[#111827] w-full">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/30">
                    <svg width="12" height="12" viewBox="0 0 20 20" fill="none" className="text-blue-500">
                      <path d="M11.2503 12.9168C11.2503 11.3452 11.2503 10.5602 11.7387 10.0718C12.227 9.5835 13.012 9.5835 14.5837 9.5835C16.1553 9.5835 16.9403 9.5835 17.4287 10.0718C17.917 10.5602 17.917 11.3452 17.917 12.9168V14.5835C17.917 16.1552 17.917 16.9402 17.4287 17.4285C16.9403 17.9168 16.1553 17.9168 14.5837 17.9168C13.012 17.9168 12.227 17.9168 11.7387 17.4285C11.2503 16.9402 11.2503 16.1552 11.2503 14.5835V12.9168ZM1.66699 7.0835C1.66699 8.65516 1.66699 9.44016 2.15533 9.9285C2.64366 10.4168 3.42866 10.4168 5.00033 10.4168C6.57199 10.4168 7.35699 10.4168 7.84533 9.9285C8.33366 9.44016 8.33366 8.65516 8.33366 7.0835V5.41683C8.33366 3.84516 8.33366 3.06016 7.84533 2.57183C7.35699 2.0835 6.57199 2.0835 5.00033 2.0835C3.42866 2.0835 2.64366 2.0835 2.15533 2.57183C1.66699 3.06016 1.66699 3.84516 1.66699 5.41683V7.0835ZM11.2503 4.5835C11.2503 3.80683 11.2503 3.4185 11.377 3.11266C11.5462 2.704 11.8708 2.37933 12.2795 2.21016C12.5853 2.0835 12.9737 2.0835 13.7503 2.0835H15.417C16.1937 2.0835 16.582 2.0835 16.8878 2.21016C17.2965 2.37933 17.6212 2.704 17.7903 3.11266C17.917 3.4185 17.917 3.80683 17.917 4.5835C17.917 5.36016 17.917 5.7485 17.7903 6.05433C17.6212 6.463 17.2965 6.78767 16.8878 6.95683C16.582 7.0835 16.1937 7.0835 15.417 7.0835H13.7503C12.9737 7.0835 12.5853 7.0835 12.2795 6.95683C11.8708 6.78767 11.5462 6.463 11.377 6.05433C11.2503 5.7485 11.2503 5.36016 11.2503 4.5835ZM1.66699 15.4168C1.66699 16.1935 1.66699 16.5818 1.79366 16.8877C1.96282 17.2963 2.28749 17.621 2.69616 17.7902C3.00199 17.9168 3.39033 17.9168 4.16699 17.9168H5.83366C6.61033 17.9168 6.99866 17.9168 7.30449 17.7902C7.71316 17.621 8.03783 17.2963 8.20699 16.8877C8.33366 16.5818 8.33366 16.1935 8.33366 15.4168C8.33366 14.6402 8.33366 14.2518 8.20699 13.946C8.03783 13.5373 7.71316 13.2127 7.30449 13.0435C6.99866 12.9168 6.61033 12.9168 5.83366 12.9168H4.16699C3.39033 12.9168 3.00199 12.9168 2.69616 13.0435C2.28749 13.2127 1.96282 13.5373 1.79366 13.946C1.66699 14.2518 1.66699 14.6402 1.66699 15.4168Z" fill="#3B82F6" strokeWidth="1.25" />
                    </svg>
                  </div>
                  <span className="font-['PT_Sans',sans-serif] font-bold text-slate-800 dark:text-slate-200 text-xs tracking-wide uppercase">HITRI PREGLED</span>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 min-w-[28px]">3/8</span>
                    <span>•</span>
                    <span className="truncate">Kopalnica prenova</span>
                    <span>•</span>
                    <span className="shrink-0">Ljubljana</span>
                    <span>•</span>
                    <span className="truncate font-medium text-slate-600 dark:text-slate-400">Anthony H</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 min-w-[28px]">4/5</span>
                    <span>•</span>
                    <span className="truncate">Čiščenje prostorov</span>
                    <span>•</span>
                    <span className="shrink-0">Ljubljana</span>
                    <span>•</span>
                    <span className="truncate font-medium text-slate-600 dark:text-slate-400">ANA NOVAK</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 min-w-[28px]">1/4</span>
                    <span>•</span>
                    <span className="truncate">Dostava cvetja</span>
                    <span>•</span>
                    <span className="shrink-0">Celje</span>
                    <span>•</span>
                    <span className="truncate font-medium text-slate-600 dark:text-slate-400">PAVLE</span>
                  </div>
                </div>
              </div>
            </MobileScrollReveal>

            {/* The 6 Cards */}
            {cards.map((c, i) => (
              <MobileScrollReveal key={i}>
                <div className="relative overflow-hidden rounded-2xl shadow-lg bg-white dark:bg-[#111827] w-full">
                  {renderCardContent(c)}
                </div>
              </MobileScrollReveal>
            ))}
          </div>
        ) : (
          /* Desktop & Tablet 3D Perspective Layout */
          <div className={`w-full h-full relative transition-opacity duration-700 ${inView ? "itp-in-view opacity-100" : "opacity-0"}`}>
            <div style={{ position: "absolute", left: "53%", top: "48%", transform: "translate(-50%, -50%)" }}>
              <div
                style={{
                  position: "relative",
                  height: 820,
                  width: 1300,
                  transformStyle: "preserve-3d",
                  transform: `perspective(3200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg) scale(${scale})`,
                  transformOrigin: "center center",
                  willChange: "transform",
                  backfaceVisibility: "hidden",
                }}
              >
                {/* 3D Column Pointers */}
                {showPointers && (
                  <>
                    {/* Pointer 2 - Left Column (Teren) */}
                    <div className="itp-pointer-flat" style={{ left: 0 + 197, top: 230, '--ptr-delay': '0.2s' } as React.CSSProperties}>
                      <div className="flex flex-col items-center">
                        <div className="itp-pointer-label">{t('ptrField')}</div>
                        <div className="itp-pointer-line" />
                        <div className="itp-pointer-dot" />
                      </div>
                    </div>

                    {/* Pointer 1 - Middle Column (Opomniki za šefa) */}
                    <div className="itp-pointer" style={{ left: 450 + 197, top: 230, '--ptr-delay': '1.0s' } as React.CSSProperties}>
                      <div className="flex flex-col items-center">
                        <div className="itp-pointer-label">{t('ptrReminders')}</div>
                        <div className="itp-pointer-line" />
                        <div className="itp-pointer-dot" />
                      </div>
                    </div>

                    {/* Pointer 3 - Right Column (Komunikacija) */}
                    <div className="itp-pointer-flat" style={{ left: 900 + 197, top: 230, '--ptr-delay': '1.8s' } as React.CSSProperties}>
                      <div className="flex flex-col items-center">
                        <div className="itp-pointer-label">{t('ptrCommunication')}</div>
                        <div className="itp-pointer-line" />
                        <div className="itp-pointer-dot" />
                      </div>
                    </div>
                  </>
                )}

                {/* HITRI PREGLED Block (Overview) */}
                <div
                  className="itp-overview-block border border-slate-200 dark:border-white/10 bg-white/90 dark:bg-[#111827]/90"
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    width: 580,
                    height: 230,
                    borderRadius: 24,
                    boxShadow: "0px 15px 35px rgba(15, 23, 42, 0.08)",
                    padding: "24px 28px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                    opacity: 0,
                    animation: "itp-block-slide-in 3.5s cubic-bezier(0.05, 0.95, 0.05, 1) both",
                    animationPlayState: inView ? "running" : "paused",
                    animationDelay: "13.5s",
                    overflow: "hidden"
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/30">
                      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" className="text-blue-500">
                        <path d="M11.2503 12.9168C11.2503 11.3452 11.2503 10.5602 11.7387 10.0718C12.227 9.5835 13.012 9.5835 14.5837 9.5835C16.1553 9.5835 16.9403 9.5835 17.4287 10.0718C17.917 10.5602 17.917 11.3452 17.917 12.9168V14.5835C17.917 16.1552 17.917 16.9402 17.4287 17.4285C16.9403 17.9168 16.1553 17.9168 14.5837 17.9168C13.012 17.9168 12.227 17.9168 11.7387 17.4285C11.2503 16.9402 11.2503 16.1552 11.2503 14.5835V12.9168ZM1.66699 7.0835C1.66699 8.65516 1.66699 9.44016 2.15533 9.9285C2.64366 10.4168 3.42866 10.4168 5.00033 10.4168C6.57199 10.4168 7.35699 10.4168 7.84533 9.9285C8.33366 9.44016 8.33366 8.65516 8.33366 7.0835V5.41683C8.33366 3.84516 8.33366 3.06016 7.84533 2.57183C7.35699 2.0835 6.57199 2.0835 5.00033 2.0835C3.42866 2.0835 2.64366 2.0835 2.15533 2.57183C1.66699 3.06016 1.66699 3.84516 1.66699 5.41683V7.0835ZM11.2503 4.5835C11.2503 3.80683 11.2503 3.4185 11.377 3.11266C11.5462 2.704 11.8708 2.37933 12.2795 2.21016C12.5853 2.0835 12.9737 2.0835 13.7503 2.0835H15.417C16.1937 2.0835 16.582 2.0835 16.8878 2.21016C17.2965 2.37933 17.6212 2.704 17.7903 3.11266C17.917 3.4185 17.917 3.80683 17.917 4.5835C17.917 5.36016 17.917 5.7485 17.7903 6.05433C17.6212 6.463 17.2965 6.78767 16.8878 6.95683C16.582 7.0835 16.1937 7.0835 15.417 7.0835H13.7503C12.9737 7.0835 12.5853 7.0835 12.2795 6.95683C11.8708 6.78767 11.5462 6.463 11.377 6.05433C11.2503 5.7485 11.2503 5.36016 11.2503 4.5835ZM1.66699 15.4168C1.66699 16.1935 1.66699 16.5818 1.79366 16.8877C1.96282 17.2963 2.28749 17.621 2.69616 17.7902C3.00199 17.9168 3.39033 17.9168 4.16699 17.9168H5.83366C6.61033 17.9168 6.99866 17.9168 7.30449 17.7902C7.71316 17.621 8.03783 17.2963 8.20699 16.8877C8.33366 16.5818 8.33366 16.1935 8.33366 15.4168C8.33366 14.6402 8.33366 14.2518 8.20699 13.946C8.03783 13.5373 7.71316 13.2127 7.30449 13.0435C6.99866 12.9168 6.61033 12.9168 5.83366 12.9168H4.16699C3.39033 12.9168 3.00199 12.9168 2.69616 13.0435C2.28749 13.2127 1.96282 13.5373 1.79366 13.946C1.66699 14.2518 1.66699 14.6402 1.66699 15.4168Z" fill="#3B82F6" strokeWidth="1.25" />
                      </svg>
                    </div>
                    <span className="font-['PT_Sans',sans-serif] font-bold text-slate-800 dark:text-slate-200 text-sm tracking-wide">HITRI PREGLED</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-slate-700 dark:text-slate-300 min-w-[28px]">3/8</span>
                      <span>•</span>
                      <span className="truncate">Kopalnica prenova</span>
                      <span>•</span>
                      <span className="shrink-0">Ljubljana</span>
                      <span>•</span>
                      <span className="truncate font-medium text-slate-600 dark:text-slate-400">Anthony H</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-slate-700 dark:text-slate-300 min-w-[28px]">4/5</span>
                      <span>•</span>
                      <span className="truncate">Čiščenje prostorov</span>
                      <span>•</span>
                      <span className="shrink-0">Ljubljana</span>
                      <span>•</span>
                      <span className="truncate font-medium text-slate-600 dark:text-slate-400">ANA NOVAK</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-slate-700 dark:text-slate-300 min-w-[28px]">1/4</span>
                      <span>•</span>
                      <span className="truncate">Dostava cvetja</span>
                      <span>•</span>
                      <span className="shrink-0">Celje</span>
                      <span>•</span>
                      <span className="truncate font-medium text-slate-600 dark:text-slate-400">PAVLE</span>
                    </div>
                  </div>
                </div>

                {/* NUJNE ZADEVE Block (Urgent) */}
                <div
                  className="itp-nujno-block border border-slate-200 dark:border-white/10 bg-[#1D2A3D]"
                  style={{
                    position: "absolute",
                    left: 610,
                    top: 0,
                    width: 590,
                    height: 230,
                    borderRadius: 24,
                    boxShadow: "0px 15px 35px rgba(15, 23, 42, 0.25)",
                    padding: "24px 28px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                    opacity: 0,
                    animation: "itp-block-slide-in 3.5s cubic-bezier(0.05, 0.95, 0.05, 1) both",
                    animationPlayState: inView ? "running" : "paused",
                    animationDelay: "12.0s",
                    overflow: "hidden"
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 flex items-center justify-center shrink-0">
                      <svg width="22" height="22" viewBox="0 0 34 34" fill="none">
                        <path d="M17 0C7.61175 0 0 7.61175 0 17C0 26.3883 7.61175 34 17 34C26.3883 34 34 26.3883 34 17C34 7.61175 26.3883 0 17 0ZM15.0861 9.19842C14.9727 8.06367 15.8653 7.08333 17 7.08333C18.1348 7.08333 19.0273 8.06367 18.9139 9.19842C18.4708 13.6299 18.2223 16.1144 17.7792 20.5459C17.7381 20.9454 17.4023 21.25 17 21.25C16.5977 21.25 16.2619 20.9454 16.2208 20.5445L15.0861 9.19842ZM17 27.2708C16.0225 27.2708 15.2292 26.4775 15.2292 25.5C15.2292 24.5225 16.0225 23.7292 17 23.7292C17.9775 23.7292 18.7708 24.5225 18.7708 25.5C18.7708 26.4775 17.9775 27.2708 17 27.2708Z" fill="#FF3B30"/>
                      </svg>
                    </div>
                    <span className="font-['PT_Sans',sans-serif] font-bold text-white text-sm tracking-wide">NUJNE ZADEVE</span>
                  </div>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start gap-4">
                      <span className="text-xs font-semibold text-[#FF3B30] min-w-[34px]">10:30</span>
                      <div>
                        <p className="text-xs text-white font-medium">Pokliči Maksa za rezervacijo</p>
                        <p className="text-[11px] text-slate-300 mt-1">Danes je zadnji dan.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <span className="text-xs font-semibold text-[#FF3B30] min-w-[34px]">10:53</span>
                      <div>
                        <p className="text-xs text-white font-medium">Prometna nesreča pri Celju</p>
                        <p className="text-[11px] text-slate-300 mt-1">Zaprta cesta do 13:30.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* The 6 Cards */}
                {cards.map((c, i) => (
                  <div
                    key={i}
                    className={`itp-card ${goDown ? "itp-go-down" : ""} ${c.isPointerCard && showPointers ? "itp-card-hovering" : ""}`}
                    style={{
                      left: c.left,
                      top: c.top,
                      animationDelay: `${c.delay}s`,
                      zIndex: Math.round(c.left + c.top),
                    }}
                  >
                    <div className="w-full h-full relative bg-white dark:bg-[#111827] rounded-[12px] overflow-hidden">
                      {renderCardContent(c)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

interface MobileScrollRevealProps {
  children: React.ReactNode;
}

function MobileScrollReveal({ children }: MobileScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry && entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.05,
        rootMargin: "0px 0px -40px 0px",
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="w-full"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(80px)",
        transition: "transform 1.8s cubic-bezier(0.05, 0.95, 0.05, 1), opacity 1.8s ease-out",
      }}
    >
      {children}
    </div>
  );
}
