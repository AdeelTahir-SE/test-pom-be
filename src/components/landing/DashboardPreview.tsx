"use client";

import React from "react";
import { useLanguage } from "@/lib/useLanguage";
import type { Worker, Order, Message } from "@/lib/mockData";
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
        className="text-slate-900 font-bold md:font-medium"
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

  // Hardcoded preview data — completely independent from /dashboard/office state
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

  const noop = () => {};

  return (
    <section id="pisarna" className="max-w-7xl mx-auto px-0 md:px-6 md:pt-10 pb-20 relative">
      <style>{`
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
      `}</style>

      {/* Section Header */}
      <div className="text-center max-w-5xl mx-auto mb-16 px-3 md:px-0">
        <p className="font-['Inter',sans-serif] text-[10px] md:text-xs font-semibold tracking-[-0.04em] text-blue-500 mb-4 uppercase">
          {"ZA PISARNO"}
        </p>
        <h2 className="text-3xl md:text-5xl font-normal md:font-light tracking-tight text-slate-950 max-w-3xl mx-auto">
          {"Komandni center"}
        </h2>
        <p className="mt-4 text-sm md:text-base text-slate-500 max-w-xl mx-auto font-light leading-relaxed">
          {"Vsak delovni dan je bolje organiziran. Ekipa dela samostojneje, komunikacije je manj, a je hitrejša, pregled nad deli je boljši in vodenje lažje."}
        </p>
      </div>

      {/* Main Glassmorphic Wrapper */}
      <div className="dashboard-preview-scale relative overflow-hidden rounded-[2.75rem] bg-white/55 backdrop-blur-xl border border-white shadow-[0_30px_80px_-45px_rgba(15,23,42,0.35),inset_0_1px_0_rgba(255,255,255,1)] p-6 md:p-10">
        
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

              {/* 3 Columns Grid - with all 3 cards in each column exactly like the dashboard */}
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
                    onResolve={noop}
                    onDismiss={noop}
                    onArchive={noop}
                  />
                ))}
              </div>
            </div>
          </div>
          </div>
          </div>

        </div>
      </div>
    </section>
  );
}
