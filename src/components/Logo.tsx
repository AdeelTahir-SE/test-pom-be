import Image from "next/image";
import React from "react";

export function Logo({
  className = "h-8 w-8",
  showText = true,
  textClassName = "text-xl",
}: {
  className?: string;
  showText?: boolean;
  textClassName?: string;
}) {
  return (
    <div className="inline-flex items-center gap-2.5 select-none">
      <img
        className={`${className} shrink-0 object-contain`}
        src="/pomocnik-logo.png"
        alt="pomocnik.net"
        width={1254}
        height={1254}
        // sizes="40px"
        draggable={false}
      />
      {showText && (
        <span className={`${textClassName} font-bold tracking-tight text-[#0f172a] dark:text-white font-sans`}>
          pomocnik<span className="text-[#1B3A6B] dark:text-[#38bdf8]">.net</span>
        </span>
      )}
    </div>
  );
}
