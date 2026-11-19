"use client";

import React from "react";
import type { Lang } from "@/lib/i18n";

interface LanguageSwitchProps {
  lang: Lang;
  onToggle: () => void;
  variant?: "glass" | "surface";
  className?: string;
}

function FlagRU({ className = "w-3.5 h-3.5" }: { className?: string }) {
  const clipId = React.useId();
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} rounded-full shrink-0 ring-1 ring-black/15`}
      aria-hidden="true"
    >
      <clipPath id={clipId}>
        <circle cx="12" cy="12" r="12" />
      </clipPath>
      <g clipPath={`url(#${clipId})`}>
        <rect width="24" height="8" y="0" fill="#FFFFFF" />
        <rect width="24" height="8" y="8" fill="#0039A6" />
        <rect width="24" height="8" y="16" fill="#D52B1E" />
      </g>
    </svg>
  );
}

function FlagUK({ className = "w-3.5 h-3.5" }: { className?: string }) {
  const clipId = React.useId();
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} rounded-full shrink-0 ring-1 ring-black/15`}
      aria-hidden="true"
    >
      <clipPath id={clipId}>
        <circle cx="12" cy="12" r="12" />
      </clipPath>
      <g clipPath={`url(#${clipId})`}>
        <rect width="24" height="24" fill="#012169" />
        <path d="M0 0L24 24M24 0L0 24" stroke="#FFFFFF" strokeWidth="4.2" />
        <path d="M0 0L24 24M24 0L0 24" stroke="#C8102E" strokeWidth="2.1" />
        <path d="M12 0V24M0 12H24" stroke="#FFFFFF" strokeWidth="6.4" />
        <path d="M12 0V24M0 12H24" stroke="#C8102E" strokeWidth="3.6" />
      </g>
    </svg>
  );
}

/**
 * Tactile iOS-style pill toggle switch for RU / EN with crisp SVG flags.
 */
export function LanguageSwitch({
  lang,
  onToggle,
  variant = "surface",
  className = "",
}: LanguageSwitchProps) {
  const isEn = lang === "en";

  const trackClass =
    variant === "glass"
      ? "bg-white/15 hover:bg-white/20 backdrop-blur-md border border-white/25"
      : "bg-slate-200/80 dark:bg-white/10 border border-slate-300/60 dark:border-white/15";

  const thumbClass =
    variant === "glass"
      ? "bg-white shadow-[0_2px_8px_rgba(13,27,42,0.28)]"
      : "bg-white dark:bg-[#1B4B8A] shadow-[0_2px_6px_rgba(13,27,42,0.18)]";

  const activeText =
    variant === "glass"
      ? "text-[#0D1B2A]"
      : "text-[#0D1B2A] dark:text-white";

  const inactiveText =
    variant === "glass"
      ? "text-white/75"
      : "text-slate-600 dark:text-white/65";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isEn}
      aria-label={isEn ? "Switch language to Russian" : "Switch language to English"}
      onClick={onToggle}
      className={`relative inline-grid grid-cols-2 items-center p-0.5 rounded-full h-8 w-[104px] select-none cursor-pointer transition-colors shrink-0 ${trackClass} ${className}`}
    >
      {/* Springy iPhone-style sliding pill thumb */}
      <span
        aria-hidden="true"
        className={`absolute top-0.5 left-0.5 h-7 w-[49px] rounded-full transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${thumbClass} ${
          isEn ? "translate-x-[50px]" : "translate-x-0"
        }`}
      />

      {/* Left Side: RU */}
      <span
        className={`relative z-10 flex items-center justify-center gap-1 text-[11px] font-bold tracking-tight transition-colors duration-200 ${
          !isEn ? activeText : inactiveText
        }`}
      >
        <FlagRU className="w-3.5 h-3.5" />
        <span>RU</span>
      </span>

      {/* Right Side: EN */}
      <span
        className={`relative z-10 flex items-center justify-center gap-1 text-[11px] font-bold tracking-tight transition-colors duration-200 ${
          isEn ? activeText : inactiveText
        }`}
      >
        <FlagUK className="w-3.5 h-3.5" />
        <span>EN</span>
      </span>
    </button>
  );
}
