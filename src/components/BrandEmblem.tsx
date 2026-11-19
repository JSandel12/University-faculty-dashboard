import React from "react";

interface BrandEmblemProps {
  className?: string;
}

/**
 * Custom non-trademarked geometric emblem combining an orbital diplomacy ring,
 * compass meridian lines, and classical academy columns.
 */
export function BrandEmblem({ className = "w-9 h-9" }: BrandEmblemProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Diplomat.Online Concept Emblem"
    >
      <circle
        cx="32"
        cy="32"
        r="28"
        stroke="currentColor"
        strokeWidth="2"
        strokeOpacity="0.85"
      />
      <ellipse
        cx="32"
        cy="32"
        rx="28"
        ry="11"
        transform="rotate(-24 32 32)"
        stroke="#C49A45"
        strokeWidth="1.75"
      />
      <path
        d="M21 44V25M32 44V20M43 44V25"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M17 44H47"
        stroke="#C49A45"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M32 10L35 16L32 19L29 16L32 10Z"
        fill="#C49A45"
      />
    </svg>
  );
}
