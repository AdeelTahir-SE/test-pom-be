import React from "react";

export function Logo({ className = "h-8 w-auto", showText = true }: { className?: string; showText?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 select-none">
      <svg
        className={className}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="32" height="32" rx="8" fill="#1B3A6B" />
        {/* Diary pad lines */}
        <line x1="8" y1="10" x2="24" y2="10" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
        <line x1="8" y1="15" x2="20" y2="15" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
        <line x1="8" y1="20" x2="16" y2="20" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
        
        {/* Active checkmark or pulse dot */}
        <circle cx="23" cy="21" r="5" fill="#10B981" />
        <path
          d="M21 21L22.5 22.5L25 19.5"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {showText && (
        <span className="text-xl font-bold tracking-tight text-[#0f172a] dark:text-white font-sans">
          pomocnik<span className="text-[#1B3A6B] dark:text-[#38bdf8]">.net</span>
        </span>
      )}
    </div>
  );
}
