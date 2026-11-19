"use client";

import React, { useCallback, useEffect, useRef } from "react";
import gsap from "gsap";
import { X, Globe, Moon, Sun, LogOut } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import { BrandEmblem } from "../BrandEmblem";

export interface NavEntry {
  id: string;
  label: string;
  badge?: number;
}

interface CurveMobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  items: NavEntry[];
  activeTab: string;
  onSelect: (id: string) => void;
  lang: Lang;
  onToggleLang: () => void;
  dark: boolean;
  onToggleDark: (e?: React.MouseEvent) => void;
  onLogout: () => void;
  logoutLabel: string;
  brandTitle: string;
  userName: string;
}

/**
 * Full-screen mobile SVG quadratic-bezier curve wipe drawer adapted from `svg-curve-morph-menu`.
 */
export function CurveMobileMenu({
  isOpen,
  onClose,
  items,
  activeTab,
  onSelect,
  lang,
  onToggleLang,
  dark,
  onToggleDark,
  onLogout,
  logoutLabel,
  brandTitle,
  userName,
}: CurveMobileMenuProps) {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const pathRef = useRef<SVGPathElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const hasMountedRef = useRef(false);

  const getPaths = useCallback(() => {
    const w = 1000;
    const h = 1000;
    const cx = 500;
    return {
      HIDDEN: `M${w},0 Q${cx},0 0,0 L0,0 L${w},0 Z`,
      BULGE: `M${w},380 Q${cx},740 0,380 L0,0 L${w},0 Z`,
      FULL: `M${w},${h} Q${cx},${h} 0,${h} L0,0 L${w},0 Z`,
    };
  }, []);

  useEffect(() => {
    const overlay = overlayRef.current;
    const path = pathRef.current;
    const content = contentRef.current;
    if (!overlay || !path || !content) return;

    const paths = getPaths();
    const links = content.querySelectorAll(".curve-menu-item");

    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      if (!isOpen) {
        gsap.set(overlay, { pointerEvents: "none", visibility: "hidden" });
        gsap.set(path, { attr: { d: paths.HIDDEN } });
        return;
      }
    }

    tlRef.current?.kill();

    if (isOpen) {
      gsap.set(overlay, { pointerEvents: "auto", visibility: "visible" });
      gsap.set(path, { attr: { d: paths.HIDDEN } });
      gsap.set(links, { y: 12, opacity: 0, force3D: false });

      const tl = gsap.timeline();
      tlRef.current = tl;
      tl.to(path, {
        duration: 0.34,
        attr: { d: paths.BULGE },
        ease: "power3.in",
      })
        .to(path, {
          duration: 0.32,
          attr: { d: paths.FULL },
          ease: "power3.out",
        })
        .to(
          links,
          {
            y: 0,
            opacity: 1,
            duration: 0.34,
            stagger: 0.04,
            ease: "power3.out",
            force3D: false,
          },
          "-=0.25"
        );
    } else {
      const tl = gsap.timeline({
        onComplete: () => {
          gsap.set(overlay, { pointerEvents: "none", visibility: "hidden" });
        },
      });
      tlRef.current = tl;
      tl.to(links, {
        y: -10,
        opacity: 0,
        duration: 0.16,
        stagger: 0.02,
        force3D: false,
      })
        .to(
          path,
          {
            duration: 0.28,
            attr: { d: paths.BULGE },
            ease: "power2.in",
          },
          "-=0.08"
        )
        .to(path, {
          duration: 0.25,
          attr: { d: paths.HIDDEN },
          ease: "power3.out",
        });
    }

    return () => {
      tlRef.current?.kill();
    };
  }, [isOpen, getPaths]);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 lg:hidden w-full overflow-hidden"
      style={{ visibility: "hidden", pointerEvents: "none" }}
      aria-hidden={!isOpen}
    >
      <svg
        viewBox="0 0 1000 1000"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full pointer-events-none"
      >
        <path
          ref={pathRef}
          fill={dark ? "#0A1525" : "#F5F3EE"}
          className="transition-colors duration-300"
        />
      </svg>

      <div
        ref={contentRef}
        className="relative z-10 w-full h-full flex flex-col justify-between p-5 pb-7 text-[#0D1B2A] dark:text-white overflow-hidden"
      >
        <div className="flex items-center justify-between gap-3 w-full min-w-0 shrink-0 curve-menu-item">
          <div className="flex items-center gap-2.5 min-w-0">
            <BrandEmblem className="w-8 h-8 text-[#0D1B2A] dark:text-white shrink-0" />
            <div className="min-w-0">
              <p className="font-semibold text-base leading-none truncate">{brandTitle}</p>
              <p className="text-xs text-slate-600 dark:text-white/60 mt-1 truncate">{userName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded-full shrink-0 bg-[#0D1B2A]/10 hover:bg-[#0D1B2A]/20 dark:bg-white/10 dark:hover:bg-white/20 text-[#0D1B2A] dark:text-white"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="my-4 flex-1 min-h-0 flex flex-col justify-center gap-2 w-full min-w-0 overflow-y-auto overflow-x-hidden py-3">
          {items.map((item, idx) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelect(item.id);
                  onClose();
                }}
                className={`curve-menu-item w-full min-w-0 flex items-center justify-between gap-3 text-left px-4 py-3.5 rounded-2xl transition-colors ${
                  active
                    ? "bg-[#0D1B2A] dark:bg-[#1B4B8A] text-white"
                    : "text-[#0D1B2A]/85 dark:text-white/85 hover:bg-[#0D1B2A]/10 dark:hover:bg-white/10"
                }`}
              >
                <span className="flex items-center gap-3 min-w-0 flex-1">
                  <span
                    className={`font-mono text-xs shrink-0 ${
                      active ? "text-[#DFB863]" : "text-[#9A7426] dark:text-[#DFB863]"
                    }`}
                  >
                    0{idx + 1}
                  </span>
                  <span className="text-lg sm:text-xl font-medium tracking-tight leading-snug truncate">
                    {item.label}
                  </span>
                </span>
                {item.badge ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-[#C49A45] text-[#0D1B2A] text-xs font-bold shrink-0">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        <div className="curve-menu-item shrink-0 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#0D1B2A]/15 dark:border-white/15">
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleLang}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0D1B2A]/10 dark:bg-white/10 text-xs font-medium"
            >
              <Globe className="w-4 h-4" />
              {lang === "ru" ? "EN" : "RU"}
            </button>
            <button
              onClick={onToggleDark}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0D1B2A]/10 dark:bg-white/10 text-xs font-medium"
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {dark ? "Light" : "Dark"}
            </button>
          </div>
          <button
            onClick={() => {
              onClose();
              onLogout();
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500/15 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200 text-xs font-medium"
          >
            <LogOut className="w-4 h-4" />
            {logoutLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
