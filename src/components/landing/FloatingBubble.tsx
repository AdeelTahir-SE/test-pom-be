"use client";

import React from "react";

interface FloatingBubbleProps {
  title: string;
  subtitle: string;
  rotation?: number;
  className?: string;
}

export function FloatingBubble({ title, subtitle, rotation = 0, className = "" }: FloatingBubbleProps) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes aura-float-soft {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes aura-bubble-in {
          0% { opacity: 0; transform: translateX(18px) translateY(8px) scale(0.96); filter: blur(6px); }
          100% { opacity: 1; transform: translateX(0) translateY(0) scale(1); filter: blur(0); }
        }
        .aura-float-bubble {
          opacity: 0;
          animation:
            aura-bubble-in 700ms cubic-bezier(0.22, 1, 0.36, 1) forwards,
            aura-float-soft 4.5s ease-in-out infinite;
        }
      `}} />
    <div
      className={`absolute z-20 pointer-events-none ${className}`}
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      <div className="aura-float-bubble rounded-2xl bg-white/90 backdrop-blur border border-white px-4 py-3 shadow-[0_18px_38px_-20px_rgba(15,23,42,0.45),inset_0_1px_0_white] min-w-48">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
            <iconify-icon
              icon="solar:chat-round-dots-linear"
              style={{ strokeWidth: 1.5 }}
              className="text-lg text-slate-600"
            />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-900 font-normal whitespace-nowrap">{title}</p>
            <p className="text-[10px] text-slate-400 font-light whitespace-nowrap">{subtitle}</p>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
