import React from "react";

// ── Shared icon box (same across both cards) ──────────────────────────────────
export function CardIconBox({ icon }: { icon: React.ReactNode }) {
  return (
    <div
      className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
      style={{
        background: "#EFF6FF",
        border: "1px solid #DBEAFE",
        boxShadow: "inset 0px 1px 0px 1px #FFFFFF",
      }}
    >
      {icon}
    </div>
  );
}

// ── Dashboard SVG icon (grid/overview) ───────────────────────────────────────
export function DashboardIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M11.2503 12.9168C11.2503 11.3452 11.2503 10.5602 11.7387 10.0718C12.227 9.5835 13.012 9.5835 14.5837 9.5835C16.1553 9.5835 16.9403 9.5835 17.4287 10.0718C17.917 10.5602 17.917 11.3452 17.917 12.9168V14.5835C17.917 16.1552 17.917 16.9402 17.4287 17.4285C16.9403 17.9168 16.1553 17.9168 14.5837 17.9168C13.012 17.9168 12.227 17.9168 11.7387 17.4285C11.2503 16.9402 11.2503 16.1552 11.2503 14.5835V12.9168ZM1.66699 7.0835C1.66699 8.65516 1.66699 9.44016 2.15533 9.9285C2.64366 10.4168 3.42866 10.4168 5.00033 10.4168C6.57199 10.4168 7.35699 10.4168 7.84533 9.9285C8.33366 9.44016 8.33366 8.65516 8.33366 7.0835V5.41683C8.33366 3.84516 8.33366 3.06016 7.84533 2.57183C7.35699 2.0835 6.57199 2.0835 5.00033 2.0835C3.42866 2.0835 2.64366 2.0835 2.15533 2.57183C1.66699 3.06016 1.66699 3.84516 1.66699 5.41683V7.0835ZM11.2503 4.5835C11.2503 3.80683 11.2503 3.4185 11.377 3.11266C11.5462 2.704 11.8708 2.37933 12.2795 2.21016C12.5853 2.0835 12.9737 2.0835 13.7503 2.0835H15.417C16.1937 2.0835 16.582 2.0835 16.8878 2.21016C17.2965 2.37933 17.6212 2.704 17.7903 3.11266C17.917 3.4185 17.917 3.80683 17.917 4.5835C17.917 5.36016 17.917 5.7485 17.7903 6.05433C17.6212 6.463 17.2965 6.78767 16.8878 6.95683C16.582 7.0835 16.1937 7.0835 15.417 7.0835H13.7503C12.9737 7.0835 12.5853 7.0835 12.2795 6.95683C11.8708 6.78767 11.5462 6.463 11.377 6.05433C11.2503 5.7485 11.2503 5.36016 11.2503 4.5835ZM1.66699 15.4168C1.66699 16.1935 1.66699 16.5818 1.79366 16.8877C1.96282 17.2963 2.28749 17.621 2.69616 17.7902C3.00199 17.9168 3.39033 17.9168 4.16699 17.9168H5.83366C6.61033 17.9168 6.99866 17.9168 7.30449 17.7902C7.71316 17.621 8.03783 17.2963 8.20699 16.8877C8.33366 16.5818 8.33366 16.1935 8.33366 15.4168C8.33366 14.6402 8.33366 14.2518 8.20699 13.946C8.03783 13.5373 7.71316 13.2127 7.30449 13.0435C6.99866 12.9168 6.61033 12.9168 5.83366 12.9168H4.16699C3.39033 12.9168 3.00199 12.9168 2.69616 13.0435C2.28749 13.2127 1.96282 13.5373 1.79366 13.946C1.66699 14.2518 1.66699 14.6402 1.66699 15.4168Z"
        stroke="#3B82F6"
        strokeWidth="1.25"
      />
    </svg>
  );
}

// ── Base card wrapper ─────────────────────────────────────────────────────────
interface SummaryCardProps {
  title: string;
  dark?: boolean;
  children: React.ReactNode;
}

export function UrgentIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g clipPath="url(#clip0_197_4935)">
        <path d="M17 0C7.61175 0 0 7.61175 0 17C0 26.3883 7.61175 34 17 34C26.3883 34 34 26.3883 34 17C34 7.61175 26.3883 0 17 0ZM15.0861 9.19842C14.9727 8.06367 15.8653 7.08333 17 7.08333C18.1348 7.08333 19.0273 8.06367 18.9139 9.19842C18.4708 13.6299 18.2223 16.1144 17.7792 20.5459C17.7381 20.9454 17.4023 21.25 17 21.25C16.5977 21.25 16.2619 20.9454 16.2208 20.5445L15.0861 9.19842ZM17 27.2708C16.0225 27.2708 15.2292 26.4775 15.2292 25.5C15.2292 24.5225 16.0225 23.7292 17 23.7292C17.9775 23.7292 18.7708 24.5225 18.7708 25.5C18.7708 26.4775 17.9775 27.2708 17 27.2708Z" fill="#FF0000"/>
      </g>
      <defs>
        <clipPath id="clip0_197_4935">
          <rect width="34" height="34" fill="white"/>
        </clipPath>
      </defs>
    </svg>
  );
}

export function SummaryCard({ title, dark = false, children }: SummaryCardProps) {
  return (
    <article
      className="rounded-[2rem] p-5 md:p-10 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-start"
      style={{
        background: dark ? "#1D2A3D" : "rgba(255, 255, 255, 0.002)",
        boxShadow: "0px 12px 30px rgba(15, 23, 42, 0.3), inset 0px 1px 0px #FFFFFF",
        minHeight: "auto",
        width: "100%",
      }}
    >
      <style>{`
        @media (min-width: 640px) and (max-width: 1023px) {
          .summary-card-text {
            font-size: 16px !important;
            line-height: 20px !important;
          }
        }
      `}</style>
      {/* Header */}
      <div className="flex items-center gap-[15px] mb-3 md:mb-6">
        {dark ? (
          <div className="w-10 h-10 flex items-center justify-center shrink-0">
            <UrgentIcon />
          </div>
        ) : (
          <CardIconBox icon={<DashboardIcon />} />
        )}
        <h2
          style={{
            fontFamily: "'PT Sans', sans-serif !important",
            lineHeight: "24px",
            color: dark ? "#FFFFFF" : "#1C1A1A",
          }}
          className="text-lg font-medium md:text-2xl md:font-medium"
        >
          {title}
        </h2>
      </div>

      {/* Rows */}
      <div className="flex flex-col gap-3 md:gap-0">
        {children}
      </div>
    </article>
  );
}

// ── HITRI PREGLED row ─────────────────────────────────────────────────────────
interface OverviewRowProps {
  progress: string;   // e.g. "4/8"
  task: string;       // e.g. "Kopalnica prenova"
  location: string;   // e.g. "Ljubljana"
  name: string;       // e.g. "Anthony Hopkins"
}

export function OverviewRow({ progress, task, location, name }: OverviewRowProps) {
  const textStyle: React.CSSProperties = {
    fontFamily: "'PT Sans', sans-serif",
    fontWeight: 400,
    fontSize: "14px",
    lineHeight: "18px",
    color: "#64748B",
  };
  const dotStyle: React.CSSProperties = { color: "#64748B", fontSize: "14px" };

  return (
    <div className="flex items-center gap-2 min-w-0 w-full overflow-hidden">
      <span className="shrink-0 summary-card-text" style={{ ...textStyle, minWidth: "28px" }}>{progress}</span>
      <span className="shrink-0 summary-card-text" style={dotStyle}>•</span>
      <span className="truncate summary-card-text" style={textStyle}>{task}</span>
      <span className="shrink-0 summary-card-text" style={dotStyle}>•</span>
      <span className="truncate summary-card-text" style={textStyle}>{location}</span>
      <span className="shrink-0 summary-card-text" style={dotStyle}>•</span>
      <span className="truncate summary-card-text" style={textStyle}>{name}</span>
    </div>
  );
}

// ── NUJNE ZADEVE row ──────────────────────────────────────────────────────────
interface UrgentRowProps {
  time: string;       // e.g. "10:14"
  title: string;      // e.g. "Kopalnica prenova • Anthony Hopkins"
  subtitle?: string;  // e.g. "Prometna nesreča pri Celju. Zamuda 45 minut."
}

export function UrgentRow({ time, title, subtitle }: UrgentRowProps) {
  const textStyle: React.CSSProperties = {
    fontFamily: "'PT Sans', sans-serif",
    fontWeight: 400,
    fontSize: "14px",
    lineHeight: "14px",
    color: "#E0E4E9",
  };

  return (
    <div className="flex items-start gap-4">
      <span className="summary-card-text" style={{ ...textStyle, minWidth: "34px", paddingTop: subtitle ? "0px" : "0px" }}>
        {time}
      </span>
      <div>
        <p className="summary-card-text" style={textStyle}>{title}</p>
        {subtitle && (
          <p className="summary-card-text" style={{ ...textStyle, marginTop: "6px", wordBreak: "break-word" }}>{subtitle}</p>
        )}
      </div>
    </div>
  );
}
