import React from "react";
import Link from "next/link";

interface BrandLogoProps {
  variant?: "mark-only" | "horizontal" | "stacked" | "event-lockup";
  size?: "sm" | "md" | "lg" | "xl";
  showAttribution?: boolean;
  className?: string;
  href?: string;
}

export function BrandLogo({
  variant = "event-lockup",
  size = "md",
  showAttribution = true,
  className = "",
  href = "/",
}: BrandLogoProps) {
  const markDimensions = {
    sm: "h-6 w-auto",
    md: "h-8 w-auto",
    lg: "h-11 w-auto",
    xl: "h-16 w-auto",
  }[size];

  const content = (
    <div className={`inline-flex items-center gap-3 select-none group ${className}`}>
      {/* Precision Vector Surrey AI Monogram: Geometric A + Orange Bar I */}
      <svg
        viewBox="0 0 120 100"
        className={`${markDimensions} transition-transform duration-300 group-hover:scale-105 shrink-0`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Surrey AI Monogram"
      >
        {/* Letter A with precise angular vertices */}
        <path
          d="M38 10L6 86H25L32 68H49L42 50H39L43.5 37L54 68H72L49 10H38Z"
          fill="currentColor"
          className="text-white"
        />
        {/* Letter I in signature Surrey AI electric flame orange */}
        <rect x="82" y="10" width="18" height="76" rx="1" fill="#FF5500" />
      </svg>

      {/* Typography Lockup */}
      {variant === "event-lockup" && (
        <div className="flex flex-col justify-center text-left">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-zinc-100">
              SURREY AI HACK
            </span>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#FF5500]/15 text-[#FF5500] font-semibold border border-[#FF5500]/30">
              2027
            </span>
          </div>
          {showAttribution && (
            <span className="font-mono text-[9px] tracking-wider text-zinc-400 uppercase mt-0.5">
              by Surrey Artificial Intelligence Society
            </span>
          )}
        </div>
      )}

      {variant === "stacked" && (
        <div className="flex flex-col text-left font-mono">
          <span className="text-[11px] font-bold tracking-widest text-zinc-100 uppercase leading-none">
            SURREY
          </span>
          <span className="text-[9px] tracking-wider text-zinc-400 uppercase leading-tight mt-0.5">
            ARTIFICIAL INTELLIGENCE
          </span>
          <span className="text-[9px] tracking-wider text-zinc-400 uppercase leading-tight">
            SOCIETY
          </span>
        </div>
      )}

      {variant === "horizontal" && (
        <div className="flex flex-col text-left">
          <span className="font-mono text-xs font-semibold tracking-wider text-zinc-200 uppercase">
            SURREY ARTIFICIAL INTELLIGENCE SOCIETY
          </span>
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5500]/50 rounded">
        {content}
      </Link>
    );
  }

  return content;
}
