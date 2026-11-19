"use client";

import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { BrandEmblem } from "../BrandEmblem";

if (typeof window !== "undefined") {
  gsap.registerPlugin(CustomEase);
  try {
    CustomEase.create("curtainLift", ".82, 0, .18, 1");
  } catch {
    // ignore if already registered
  }
}

interface CabinetPreloaderProps {
  brandTitle?: string;
  brandSubtitle?: string;
  onRevealStart?: () => void;
}

/**
 * Split-second centered logo + 0->100% progress bar preloader followed by
 * a two-layer cinematic upward curtain lift (inspired by `bloom-paris-reveal`).
 */
export function CabinetPreloader({
  brandTitle = "Дипломат.Онлайн",
  brandSubtitle = "Цифровой деканат будущего",
  onRevealStart,
}: CabinetPreloaderProps) {
  const [done, setDone] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const barFillRef = useRef<HTMLDivElement | null>(null);
  const pctRef = useRef<HTMLSpanElement | null>(null);
  const centerBoxRef = useRef<HTMLDivElement | null>(null);
  const curtainPrimaryRef = useRef<HTMLDivElement | null>(null);
  const curtainGoldRef = useRef<HTMLDivElement | null>(null);

  const onRevealStartRef = useRef(onRevealStart);
  onRevealStartRef.current = onRevealStart;

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      onRevealStartRef.current?.();
      setDone(true);
      return;
    }

    const root = rootRef.current;
    const barFill = barFillRef.current;
    const pctEl = pctRef.current;
    const centerBox = centerBoxRef.current;
    const curtainPrimary = curtainPrimaryRef.current;
    const curtainGold = curtainGoldRef.current;

    if (!root || !barFill || !pctEl || !centerBox || !curtainPrimary || !curtainGold) {
      onRevealStartRef.current?.();
      setDone(true);
      return;
    }

    const ctx = gsap.context(() => {
      const counter = { val: 0 };

      gsap.set(centerBox, { opacity: 0, y: 12, scale: 0.96 });
      gsap.set(barFill, { scaleX: 0, transformOrigin: "left center" });

      const tl = gsap.timeline({
        onComplete: () => setDone(true),
      });

      // 1. Center logo & bar appear crisply
      tl.to(centerBox, {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.3,
        ease: "power3.out",
      });

      // 2. Loading bar fills 0 -> 100%
      tl.to(
        barFill,
        {
          scaleX: 1,
          duration: 0.68,
          ease: "power2.inOut",
        },
        "-=0.08"
      ).to(
        counter,
        {
          val: 100,
          duration: 0.68,
          ease: "power2.inOut",
          onUpdate: () => {
            if (pctRef.current) {
              pctRef.current.textContent = `${String(Math.round(counter.val)).padStart(3, "0")}%`;
            }
          },
        },
        "<"
      );

      // 3. Center badge tucks upward slightly & fades
      tl.to(centerBox, {
        y: -28,
        opacity: 0,
        duration: 0.25,
        ease: "power2.in",
      });

      // 4. Two-layer curtains lift cinematically upward, then trigger hero headline reveal
      tl.to(
        curtainPrimary,
        {
          yPercent: -100,
          duration: 0.62,
          ease: "curtainLift",
        },
        "-=0.06"
      )
        .to(
          curtainGold,
          {
            yPercent: -100,
            duration: 0.68,
            ease: "curtainLift",
          },
          "<+=0.07"
        )
        .call(
          () => {
            onRevealStartRef.current?.();
          },
          undefined,
          "-=0.32"
        );
    }, rootRef);

    return () => ctx.revert();
  }, []);

  if (done) return null;

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-[100] pointer-events-auto overflow-hidden"
      aria-label="Loading portal"
    >
      {/* Secondary Brass-Sapphire Trailing Curtain */}
      <div
        ref={curtainGoldRef}
        className="absolute inset-0 bg-gradient-to-b from-[#1B4B8A] via-[#132946] to-[#C49A45]"
      />

      {/* Primary Midnight Ink Curtain */}
      <div
        ref={curtainPrimaryRef}
        className="absolute inset-0 bg-[#081324] flex flex-col items-center justify-center px-6"
      >
        <div
          ref={centerBoxRef}
          className="flex flex-col items-center text-center max-w-xs w-full"
        >
          <div className="p-4 rounded-3xl bg-white/5 border border-[#C49A45]/35 shadow-2xl mb-4">
            <BrandEmblem className="w-12 h-12 text-white" />
          </div>

          <p className="font-serif text-2xl sm:text-3xl font-semibold text-white tracking-tight">
            {brandTitle}
          </p>
          <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#DFB863] mt-1">
            {brandSubtitle}
          </p>

          {/* Loading Bar + Percentage */}
          <div className="w-full mt-6 space-y-2">
            <div className="w-full h-[3px] rounded-full bg-white/15 overflow-hidden">
              <div
                ref={barFillRef}
                className="w-full h-full bg-gradient-to-r from-[#4D8DF6] via-[#DFB863] to-[#F6E2A8]"
              />
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono text-white/70">
              <span>INITIALIZING PORTAL</span>
              <span ref={pctRef} className="text-[#DFB863] font-semibold">
                000%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
