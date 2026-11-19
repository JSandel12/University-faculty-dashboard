"use client";

import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { QRCodeSVG } from "qrcode.react";
import { RotateCw, ShieldCheck } from "lucide-react";
import type { PublicUser } from "@/lib/types";
import type { Lang } from "@/lib/i18n";
import { BrandEmblem } from "../BrandEmblem";

interface StudentPass3DProps {
  user: PublicUser;
  lang: Lang;
  hintText: string;
}

const BEZEL_Z_LAYERS = [3.5, 2, 0.5, -1, -2.5, -4];

/**
 * Interactive 3D Digital Student ID Pass with rounded metallic Z-bezel edges
 * and cursor-tracking specular & ambient glow.
 */
export function StudentPass3D({ user, lang, hintText }: StudentPass3DProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const cubeRef = useRef<HTMLDivElement | null>(null);
  const [flipped, setFlipped] = useState(false);
  const rotationRef = useRef({ flip: 0, tiltX: 0, tiltY: 0 });

  const profile = user.profile;

  useEffect(() => {
    const cardEl = cardRef.current;
    const cubeEl = cubeRef.current;
    if (!cardEl || !cubeEl || !profile) return;

    const rotation = rotationRef.current;
    const depth = 10;

    const render = () => {
      gsap.set(cubeEl, {
        rotationX: rotation.flip + rotation.tiltX,
        rotationY: rotation.tiltY,
        z: -depth / 2,
      });
    };

    const ctx = gsap.context(() => {
      render();
    }, cardRef);

    const handleMouseEnter = () => {
      if (window.matchMedia("(hover: none)").matches) return;
      cardEl.style.setProperty("--glow-alpha", "1");
      setFlipped(true);
      gsap.to(rotation, {
        flip: 180,
        duration: 0.58,
        ease: "power2.inOut",
        overwrite: "auto",
        onUpdate: render,
      });
    };

    const handleMouseLeave = () => {
      if (window.matchMedia("(hover: none)").matches) return;
      cardEl.style.setProperty("--glow-alpha", "0");
      setFlipped(false);
      gsap.to(rotation, {
        flip: 0,
        tiltX: 0,
        tiltY: 0,
        duration: 0.58,
        ease: "power3.out",
        overwrite: "auto",
        onUpdate: render,
      });
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (window.matchMedia("(hover: none)").matches) return;
      const bounds = cardEl.getBoundingClientRect();
      const relX = ((event.clientX - bounds.left) / bounds.width) * 100;
      const relY = ((event.clientY - bounds.top) / bounds.height) * 100;
      cardEl.style.setProperty("--glow-x", `${relX.toFixed(1)}%`);
      cardEl.style.setProperty("--glow-y", `${relY.toFixed(1)}%`);
      cardEl.style.setProperty("--glow-alpha", "1");

      const cx = bounds.left + bounds.width / 2;
      const cy = bounds.top + bounds.height / 2;
      const offsetX = Math.max(-1, Math.min(1, (event.clientX - cx) / (bounds.width / 2)));
      const offsetY = Math.max(-1, Math.min(1, (event.clientY - cy) / (bounds.height / 2)));
      const invertFactor = rotation.flip > 90 ? -1 : 1;

      gsap.to(rotation, {
        tiltX: -offsetY * 16 * invertFactor,
        tiltY: offsetX * 16,
        duration: 0.36,
        ease: "power2.out",
        overwrite: "auto",
        onUpdate: render,
      });
    };

    cardEl.addEventListener("mouseenter", handleMouseEnter);
    cardEl.addEventListener("mouseleave", handleMouseLeave);
    cardEl.addEventListener("mousemove", handleMouseMove);

    return () => {
      cardEl.removeEventListener("mouseenter", handleMouseEnter);
      cardEl.removeEventListener("mouseleave", handleMouseLeave);
      cardEl.removeEventListener("mousemove", handleMouseMove);
      ctx.revert();
    };
  }, [profile]);

  if (!profile) return null;

  const handleToggleTap = () => {
    const cubeEl = cubeRef.current;
    const cardEl = cardRef.current;
    if (!cubeEl || !cardEl) return;
    const nextFlipped = !flipped;
    setFlipped(nextFlipped);
    cardEl.style.setProperty("--glow-x", "50%");
    cardEl.style.setProperty("--glow-y", "50%");
    cardEl.style.setProperty("--glow-alpha", nextFlipped ? "0.9" : "0");

    const rotation = rotationRef.current;
    gsap.to(rotation, {
      flip: nextFlipped ? 180 : 0,
      tiltX: 0,
      tiltY: 0,
      duration: 0.58,
      ease: "power2.inOut",
      overwrite: "auto",
      onUpdate: () => {
        gsap.set(cubeEl, {
          rotationX: rotation.flip + rotation.tiltX,
          rotationY: rotation.tiltY,
          z: -5,
        });
      },
    });
  };

  return (
    <div className="flex flex-col items-center">
      <div
        ref={cardRef}
        className="pass-card-stage"
        onClick={handleToggleTap}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleToggleTap();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={
          lang === "ru"
            ? "Интерактивный 3D студенческий билет"
            : "Interactive 3D Student ID"
        }
      >
        {/* Soft Ambient Cursor Halo */}
        <div className="pass-ambient-glow" aria-hidden="true" />

        <div ref={cubeRef} className="pass-cube">
          {/* Rounded Metallic Z-Bezel Slices */}
          {BEZEL_Z_LAYERS.map((zVal) => (
            <div
              key={zVal}
              aria-hidden="true"
              className="pass-bezel-slice"
              style={{ transform: `translateZ(${zVal}px)` }}
            />
          ))}

          {/* FRONT FACE */}
          <div className="pass-face pass-face-front bg-gradient-to-br from-[#0B1726] via-[#132B49] to-[#1D4E89] text-white p-5 flex flex-col justify-between border border-[#DFB863]/35 shadow-2xl">
            <div className="pass-cursor-sheen" aria-hidden="true" />

            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BrandEmblem className="w-7 h-7 text-white" />
                <div>
                  <p className="text-[10px] tracking-[0.18em] uppercase text-[#DFB863] font-semibold">
                    {lang === "ru" ? "КАМПУС-ПАСС" : "CAMPUS PASS"}
                  </p>
                  <p className="text-[11px] text-white/75 font-mono">
                    {profile.studentCardNo}
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-mono text-emerald-300 border border-emerald-400/25">
                <ShieldCheck className="w-3 h-3" />
                ACTIVE
              </span>
            </div>

            <div className="relative z-10 flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-white/70 truncate">
                  {lang === "ru" ? profile.faculty : profile.facultyEn}
                </p>
                <p className="text-base font-semibold leading-tight truncate mt-0.5">
                  {lang === "ru" ? user.fullName : user.fullNameEn}
                </p>
                <p className="text-xs text-[#DFB863] mt-1 font-mono">
                  {profile.groupCode} · {profile.course}{" "}
                  {lang === "ru" ? "курс" : "year"}
                </p>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-white/15 border border-[#DFB863]/35 flex items-center justify-center font-serif text-lg font-semibold shrink-0">
                {profile.photoInitials}
              </div>
            </div>
          </div>

          {/* BACK FACE */}
          <div className="pass-face pass-face-back bg-gradient-to-br from-[#FBF9F4] via-[#F7F3EA] to-[#EFE8D8] text-[#0D1B2A] p-4 flex items-center justify-between gap-3 border border-[#C49A45]/45 shadow-2xl">
            <div className="pass-cursor-sheen-back" aria-hidden="true" />

            <div className="relative z-10 flex flex-col justify-between h-full min-w-0">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-widest text-[#1B4B8A] font-semibold">
                  {lang === "ru" ? "ЭЛЕКТРОННЫЙ ПРОПУСК" : "DIGITAL VERIFICATION"}
                </p>
                <p className="text-xs font-semibold mt-1 truncate">
                  {lang === "ru" ? profile.program : profile.programEn}
                </p>
                <p className="text-[11px] text-slate-600 mt-1">
                  {lang === "ru" ? "Куратор: " : "Advisor: "}
                  {profile.advisorName}
                </p>
              </div>
              <div className="text-[11px] font-mono text-slate-700">
                <div>
                  {lang === "ru" ? "Действует до: " : "Valid until: "}
                  <span className="font-semibold">{profile.validUntil}</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {lang === "ru"
                    ? "Турникет · Библиотека · Чит. зал"
                    : "Gates · Library · Labs"}
                </div>
              </div>
            </div>

            <div className="relative z-10 p-2 bg-white rounded-2xl border border-[#C49A45]/30 shrink-0 shadow-sm">
              <QRCodeSVG
                value={`DIPLOMAT-PASS:${profile.studentCardNo}:${profile.groupCode}`}
                size={84}
                level="M"
                bgColor="#FFFFFF"
                fgColor="#0D1B2A"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 flex justify-center w-full">
        <p className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-[var(--bg-page)] border border-[var(--border-color)] text-[11px] text-[var(--text-secondary)] max-w-full">
          <RotateCw className="w-3 h-3 text-[var(--accent)] shrink-0" />
          <span className="sm:hidden truncate">
            {lang === "ru"
              ? "Нажмите на пропуск · 180°"
              : "Tap pass to flip · 180°"}
          </span>
          <span className="hidden sm:inline">{hintText}</span>
        </p>
      </div>
    </div>
  );
}
