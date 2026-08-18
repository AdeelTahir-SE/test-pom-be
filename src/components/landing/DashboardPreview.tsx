"use client";

import React, { useRef, useState, useEffect } from "react";
import { useLanguage } from "@/lib/useLanguage";
import type { Worker, Order } from "@/lib/mockData";
import type { Message } from "@/lib/types/messages";
import { SummaryCard, OverviewRow, UrgentRow } from "@/components/dashboard/SummaryCard";
import { WorkerCard } from "@/components/dashboard/WorkerCard";
import { OfficeCard } from "@/components/dashboard/OfficeCard";
import { CommunicationCard } from "@/components/dashboard/CommunicationCard";

interface ColumnHeaderProps {
  title: string;
  onAddClick?: () => void;
}

function ColumnHeader({ title, onAddClick }: ColumnHeaderProps) {
  return (
    <div className="flex items-center justify-between pl-0 pr-6 mb-2">
      <span
        style={{
          fontFamily: "'PT Sans', sans-serif",
          fontSize: "24px",
          lineHeight: "24px",
        }}
        className="text-slate-900 font-bold md:font-medium dark:text-white"
      >
        {title}
      </span>
      <button
        onClick={onAddClick}
        style={{
          width: "36px",
          height: "36px",
          borderRadius: "12px",
          background: "rgba(255, 255, 255, 0.002)",
          border: "0.7px solid rgba(96, 165, 250, 0.5)",
          boxShadow: "0px 8px 18px -12px rgba(15, 23, 42, 0.35), inset 0px 1px 0px 1px #FFFFFF",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
        }}
        className="hover:bg-slate-50/50 transition-colors"
      >
        <svg width="12" height="12" viewBox="0 0 19 19" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M17.9705 9.48535H9.48528M9.48528 9.48535H1M9.48528 9.48535V1.00007M9.48528 9.48535V17.9706"
            stroke="#6D778E"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}

export function DashboardPreview() {
  const { t } = useLanguage();
  const viewportRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [scale, setScale] = useState(0.85);
  const [isMobile, setIsMobile] = useState(true);
  const [showPointers, setShowPointers] = useState(false);
  const [goDown, setGoDown] = useState(false);

  // Rotation controls for X, Y, Z axes
  const [rotateX, setRotateX] = useState(45);
  const [rotateY, setRotateY] = useState(9);
  const [rotateZ, setRotateZ] = useState(-31);

  // Responsive scaling and layout handler
  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      // Below 1024px represents mobile & tablets, which will use the flat scrolling preview
      setIsMobile(w < 1024);
      
      if (w >= 1280) {
        setScale(0.7);
      } else if (w >= 1024) {
        setScale(0.6);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Intersection observer to trigger desktop animation once when in viewport
  useEffect(() => {
    const el = viewportRef.current;
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
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [isMobile]);

  // Timer to sync pointer appearance and card hover launch (8.5 seconds)
  useEffect(() => {
    if (inView && !isMobile) {
      const timer = setTimeout(() => {
        setShowPointers(true);
      }, 8500);
      return () => clearTimeout(timer);
    }
  }, [inView, isMobile]);

  // Timer to trigger "go down" animation after all cards have arrived (7.0 seconds)
  useEffect(() => {
    if (inView && !isMobile) {
      const timer = setTimeout(() => {
        setGoDown(true);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [inView, isMobile]);

  // Mock data for mobile/tablet layout (standard 3-column view)
  const workers: Worker[] = [
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
        { id: "pt1_1", text: "Odvoz materiala - Stane", completed: true, completedAt: "10:34", hasAttachment: true },
        { id: "pt1_2", text: "Začetek del", completed: true, completedAt: "08:20" },
        { id: "pt1_3", text: "Odstranjevanje elementov", completed: true, completedAt: "09:10" },
        { id: "pt1_4", text: "Odvoz odpadkov", completed: true, completedAt: "09:55" },
        { id: "pt1_5", text: "Dostava ploščic - Adam", completed: false, requiresAttachment: true },
        { id: "pt1_6", text: "Polaganje ploščic", completed: false },
        { id: "pt1_7", text: "Menjava umivalnika, kadi", completed: false },
        { id: "pt1_8", text: "Dnevno poročilo", completed: false, requiresAttachment: true }
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
        { id: "pt2_1", text: "Čiščenje tal", completed: true, completedAt: "10:51", hasAttachment: true },
        { id: "pt2_2", text: "Čiščenje oken", completed: true, completedAt: "09:00" },
        { id: "pt2_3", text: "Čiščenje kopalnic", completed: true, completedAt: "09:45" },
        { id: "pt2_4", text: "Čiščenje kuhinje", completed: true, completedAt: "10:20" },
        { id: "pt2_5", text: "Dnevno poročilo", completed: false }
      ]
    },
    {
      id: "pw3",
      name: "PAVLE",
      avatar: "BD",
      role: "FxG d.o.o.",
      currentTask: "Dostava cvetja",
      status: "v_teku",
      phone: "+386 41 555 666",
      email: "bo.derek@pomocnik.net",
      unreadCount: 0,
      location: "Celje",
      tasks: [
        { id: "pt3_1", text: "Prevzem cvetja", completed: true, completedAt: "08:00" },
        { id: "pt3_2", text: "Dostava", completed: false },
        { id: "pt3_3", text: "Potrdilo o dostavi", completed: false, hasAttachment: true },
        { id: "pt3_4", text: "Dnevno poročilo", completed: false }
      ]
    }
  ];

  const orders: Order[] = [
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
      description: "",
      time: "12:00",
      createdAt: "11:34",
      priority: "visoka",
      status: "caka_potrditev",
      workerId: "pw2",
      workerName: "SIMON"
    },
    {
      id: "po3",
      title: "Kosilo s Kristino",
      description: "",
      time: "13:00",
      createdAt: "11:38",
      priority: "danes",
      status: "caka_potrditev",
      workerId: "pw3",
      workerName: "ADAM"
    }
  ];

  const messages: Message[] = [
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
    },
    {
      id: "pm3",
      workerId: "pw3",
      workerName: "ALEKS",
      text: "Preveri dokumente za Graz. Pokliči Ano.",
      time: "11:02",
      type: "glasovno",
      targetTask: "Popravilo dvigala"
    }
  ];

  // Hardcoded preview data for desktop 3D animated layout
  const previewWorkers: Worker[] = [
    {
      id: "apw1",
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
        { id: "apt1_1", text: "Odvoz materiala - Stane", completed: true },
        { id: "apt1_2", text: "Začetek del", completed: true },
        { id: "apt1_3", text: "Polaganje ploščic", completed: false }
      ]
    },
    {
      id: "apw2",
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
        { id: "apt2_1", text: "Čiščenje tal", completed: true },
        { id: "apt2_2", text: "Čiščenje kuhinje", completed: true },
        { id: "apt2_3", text: "Dnevno poročilo", completed: false }
      ]
    }
  ];

  const previewOrders: Order[] = [
    {
      id: "apo1",
      title: "Pokliči Maksa za rezervacijo",
      description: "Danes je zadnji dan.",
      time: "10:30",
      createdAt: "09:02",
      priority: "nujno",
      status: "caka_potrditev",
      workerId: "apw1",
      workerName: "LIAM"
    },
    {
      id: "apo2",
      title: "Podpiši izvozne dokumente",
      description: "Izvozna deklaracija za Avstrijo.",
      time: "12:00",
      createdAt: "11:34",
      priority: "visoka",
      status: "caka_potrditev",
      workerId: "apw2",
      workerName: "SIMON"
    }
  ];

  const previewMessages: Message[] = [
    {
      id: "apm1",
      workerId: "apw1",
      workerName: "ANA NOVAK",
      text: "Stranke ni bilo na naslovu. Začenjam pol ure kasneje.",
      time: "09:18",
      type: "glasovno",
      targetTask: "Čiščenje prostorov"
    },
    {
      id: "apm2",
      workerId: "apw2",
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

  const noop = () => {};

  return (
    <section
      id="pisarna"
      className="max-w-7xl mx-auto px-3 md:px-6 pb-20 w-full relative"
    >
      <style>{`
        /* --- Mobile & Tablet Styles --- */
        .dashboard-preview-scale {
          zoom: 1;
        }
        @media (min-width: 768px) {
          .dashboard-preview-scale {
            zoom: 0.85;
          }
        }
        @media (min-width: 1024px) {
          .dashboard-preview-scale {
            zoom: 0.75;
          }
        }
        @keyframes bounceHorizontal {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(5px); }
        }
        .animate-bounce-horizontal {
          animation: bounceHorizontal 1.2s infinite;
        }
        .scroll-helper-floating {
          position: absolute;
          right: 24px;
          z-index: 20;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          user-select: none;
          top: 240px;
        }
        @media (min-width: 1024px) {
          .scroll-helper-floating {
            display: none !important;
          }
        }
        @media (max-width: 767px) {
          .scroll-helper-floating {
            right: 16px;
            top: 290px;
          }
        }

        /* --- Desktop 3D Animation Styles --- */
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

      {/* Section Header */}
      <div className="text-center max-w-5xl mx-auto mb-16 px-3 md:px-0 pt-10">
        <p className="font-['Inter',sans-serif] text-[10px] md:text-xs font-semibold tracking-[-0.04em] text-blue-500 mb-4 uppercase">
          {t('cmdCenterLabel')}
        </p>
        <h2 className="text-3xl md:text-[40px] lg:text-5xl font-normal md:font-light tracking-tight text-slate-950 dark:text-white max-w-3xl mx-auto">
          {t('cmdCenterTitle')}
        </h2>
        <p className="mt-4 text-sm md:text-base text-slate-500 dark:text-slate-400 max-w-xl mx-auto font-light leading-relaxed">
          {t('cmdCenterDesc')}
        </p>
      </div>

      {isMobile ? (
        /* Original Mobile & Tablet Layout (Flat scrollable preview) */
        <div className="dashboard-preview-scale relative overflow-hidden rounded-[2.75rem] bg-white/55 dark:bg-[#101827]/55 backdrop-blur-xl border border-white dark:border-white/10 shadow-[0_30px_80px_-45px_rgba(15,23,42,0.35),inset_0_1px_0_rgba(255,255,255,1)] p-6 md:p-10">
          
          {/* Floating scroll helper icon */}
          <div 
            className="scroll-helper-floating lg:hidden"
            style={{ color: "rgba(102, 112, 133, 1)" }}
          >
            <div className="relative flex flex-col items-center shrink-0 w-16 h-14 animate-bounce-horizontal">
              {/* Horizontal arrows */}
              <svg 
                viewBox="0 0 64 27" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg" 
                style={{ width: "64px", height: "26.666666px" }}
              >
                <path d="M32 8C34.944 8 37.3333 10.3893 37.3333 13.3333C37.3333 16.2773 34.944 18.6667 32 18.6667C29.056 18.6667 26.6667 16.2773 26.6667 13.3333C26.6667 10.3893 29.056 8 32 8ZM21.7147 16C21.4907 15.144 21.3333 14.2613 21.3333 13.3333C21.3333 12.4053 21.4907 11.5227 21.7147 10.6667H16V0L0 13.3333L16 26.6667V16H21.7147ZM42.2853 10.6667C42.5093 11.5227 42.6667 12.4053 42.6667 13.3333C42.6667 14.2613 42.5093 15.144 42.2853 16H48V26.6667L64 13.3333L48 0V10.6667H42.2853Z" fill="currentColor"/>
              </svg>
              {/* Hand/Finger */}
              <svg 
                viewBox="0 0 33 39" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg" 
                style={{ 
                  width: "38.599998px", 
                  height: "38.599998px", 
                  position: "absolute", 
                  top: "18px",
                }}
              >
                <path d="M26.5954 12.151C24.6847 11.7457 19.1874 10.697 17.6917 10.4011V4.75262C17.6917 2.13265 15.5268 0 12.8667 0C10.2065 0 8.04167 2.13265 8.04167 4.75262V16.746C7.15065 16.2056 6.13097 15.7472 5.08555 15.596C2.15517 15.1746 0 17.1078 0 19.6136C0 20.9083 0.583825 22.2079 1.64372 23.2661C8.03202 29.6544 10.7919 31.5089 11.3886 38.6H27.3417V35.7886C27.3417 27.4993 32.1667 26.0888 32.1667 19.6587C32.1667 15.7215 30.4602 12.9728 26.5954 12.151ZM27.1696 25.053C25.8491 27.4382 24.2135 30.3911 24.1282 35.3833H14.2691C13.1015 29.2395 8.14138 25.2219 3.9179 20.9904C2.81137 19.887 3.28582 18.7869 4.62878 18.7821C6.66011 18.7725 9.55028 21.8122 11.2583 23.9368V4.75262C11.2583 3.92112 11.9949 3.21667 12.8667 3.21667C13.7384 3.21667 14.475 3.92112 14.475 4.75262V15.9273C14.475 16.4339 14.8867 16.8457 15.395 16.8457C15.9 16.8457 16.3117 16.4339 16.3117 15.9273V15.0025C16.3117 14.1437 17.0998 13.4939 17.9426 13.6628C18.5827 13.7898 19.0459 14.3512 19.0459 15.0025V17.0499C19.0459 17.5566 19.4576 17.9683 19.9642 17.9683C20.4709 17.9683 20.8826 17.5566 20.8826 17.0499V15.715C20.8826 14.861 21.6659 14.2161 22.5038 14.3833C23.1407 14.5088 23.6007 15.0653 23.6007 15.715V18.1806C23.6007 18.6872 24.0124 19.099 24.519 19.099C25.0257 19.099 25.4374 18.6872 25.4374 18.1806V16.7138C25.4374 15.8726 26.3139 15.3194 27.0747 15.6748C28.1121 16.1654 28.95 17.1738 28.95 19.6587C28.95 21.8379 28.2021 23.1857 27.1696 25.053Z" fill="currentColor"/>
              </svg>
            </div>
          </div>

          {/* Soft background glows */}
          <div className="absolute top-[-35%] left-[10%] w-[32rem] h-[32rem] rounded-full bg-blue-200/30 blur-[6rem] pointer-events-none" />
          <div className="absolute bottom-[-35%] right-[5%] w-[30rem] h-[30rem] rounded-full bg-sky-200/20 blur-[6rem] pointer-events-none" />

          {/* Outer Dashboard Shell */}
          <div className="relative">
            <div className="w-full overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-200">
              <div className="min-w-[1024px] lg:min-w-0 relative">
                
                {/* Summary Cards Row */}
                <div className="grid grid-cols-2 gap-6" style={{ marginBottom: "20px" }}>
                  <SummaryCard title="HITRI PREGLED">
                    <div className="flex flex-col gap-[4px]">
                      {workers.map(w => {
                        const done = w.tasks.filter(t => t.completed).length;
                        const total = w.tasks.length;
                        return (
                          <OverviewRow
                            key={w.id}
                            progress={`${done}/${total}`}
                            task={w.currentTask}
                            location={w.location ?? "Ljubljana"}
                            name={w.name}
                          />
                        );
                      })}
                    </div>
                  </SummaryCard>

                  <SummaryCard title="NUJNE ZADEVE" dark>
                    <div className="flex flex-col gap-[6px]">
                      <UrgentRow
                        time="10:30"
                        title="Pokliči Maksa za rezervacijo"
                        subtitle="Danes je zadnji dan."
                      />
                      <UrgentRow
                        time="10:53"
                        title="Prometna nesreča pri Celju"
                        subtitle="Zaprta cesta do 13:30."
                      />
                    </div>
                  </SummaryCard>
                </div>

                {/* 3 Columns Grid */}
                <div className="grid grid-cols-3 gap-6">
                  {/* Column 1 - Teren */}
                  <div className="flex flex-col gap-3">
                    <ColumnHeader title="DANES-TEREN" onAddClick={() => {}} />
                    <div
                      style={{
                        background: "linear-gradient(180deg, rgba(96, 165, 250, 0.08) 0%, rgba(37, 99, 235, 0.08) 100%)",
                        border: "1px solid #1D4ED8",
                        boxShadow: "0px 24px 60px -30px rgba(59, 130, 246, 0.55), inset 0px 1px 0px 1px rgba(255, 255, 255, 0.35)",
                        borderRadius: "32px",
                        padding: "16px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "24px",
                      }}
                      className="group hover:-translate-y-1 transition-all duration-300"
                    >
                      {workers.slice(0, 3).map((w, idx) => (
                        <WorkerCard
                          key={w.id}
                          worker={w}
                          onToggleTask={noop}
                          date="23/05/26"
                          orderId={idx === 2 ? "#486" : "#484"}
                          onClick={undefined}
                          disableActions={true}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Column 2 - Pisarna */}
                  <div className="flex flex-col gap-3">
                    <ColumnHeader title="DANES-PISARNA" onAddClick={() => {}} />
                    <div
                      style={{
                        background: "linear-gradient(180deg, #60A5FA 0%, #2563EB 100%)",
                        border: "1px solid #1D4ED8",
                        boxShadow: "0px 24px 60px -30px rgba(59, 130, 246, 0.55), inset 0px 1px 0px 1px rgba(255, 255, 255, 0.35)",
                        borderRadius: "32px",
                        padding: "16px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "24px",
                      }}
                      className="group hover:-translate-y-1 transition-all duration-300"
                    >
                      {orders.slice(0, 3).map((o, idx) => {
                        let buttonsConfig: 'call-tick-decline' | 'attachment-tick-decline' | 'none' = 'attachment-tick-decline';
                        if (idx === 0) {
                          buttonsConfig = 'call-tick-decline';
                        } else if (idx === 2) {
                          buttonsConfig = 'none';
                        }

                        return (
                          <CommunicationCard
                            key={o.id}
                            order={o}
                            buttonsConfig={buttonsConfig}
                            showRedButton={idx === 0}
                            onResolve={noop}
                            onDismiss={noop}
                            onArchive={noop}
                            onCall={noop}
                            onAttachmentClick={noop}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* Column 3 - Komunikacija */}
                  <div className="flex flex-col gap-3">
                    <ColumnHeader title="KOMUNIKACIJA" onAddClick={() => {}} />
                    <div
                      style={{
                        background: "linear-gradient(180deg, rgba(241, 241, 255, 0.19) 0%, rgba(241, 241, 255, 0.19) 100%)",
                        border: "0.6px solid #1D4ED8",
                        boxShadow: "0px 24px 60px -30px rgba(59, 130, 246, 0.55), inset 0px 1px 0px 1px rgba(255, 255, 255, 0.35)",
                        borderRadius: "32px",
                        padding: "16px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "24px",
                      }}
                      className="group hover:-translate-y-1 transition-all duration-300"
                    >
                      {messages.slice(0, 3).map((m, idx) => (
                        <OfficeCard
                          key={m.id}
                          message={m}
                          iconType={idx === 2 ? "document" : "mic"}
                          showRedButton={idx === 1}
                          onDismiss={noop}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Desktop 3D Perspective Layout (WITHOUT Grid lines) */
        <div
        ref={viewportRef}
        className={`relative w-full rounded-[24px] md:rounded-[44px] border border-slate-200/80 dark:border-white/10 overflow-hidden bg-white dark:bg-[#101827] shadow-xl transition-all duration-300 itp-in-view`}
        style={{ height: "780px" }}
      >
          {/* Ambient Decorative Glowing Orbs */}
          <div className="absolute top-[10%] left-[5%] w-[160px] h-[160px] rounded-full bg-blue-400/5 dark:bg-blue-500/10 blur-2xl pointer-events-none" style={{ animation: "itp-float-slow 7s ease-in-out infinite" }} />
          <div className="absolute bottom-[15%] right-[10%] w-[220px] h-[220px] rounded-full bg-indigo-400/5 dark:bg-indigo-500/10 blur-3xl pointer-events-none" style={{ animation: "itp-float-slow 9s ease-in-out infinite 1s" }} />

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
        </div>
      )}
    </section>
  );
}
