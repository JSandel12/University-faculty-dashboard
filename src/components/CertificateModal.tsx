"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { QRCodeSVG } from "qrcode.react";
import { Printer, ShieldCheck, X } from "lucide-react";
import { DICT, type Lang } from "@/lib/i18n";
import type { CertificateRequest, PublicUser } from "@/lib/types";
import { BrandEmblem } from "./BrandEmblem";

interface CertificateModalProps {
  request: CertificateRequest | null;
  student: PublicUser;
  lang: Lang;
  onClose: () => void;
}

export function CertificateModal({
  request,
  student,
  lang,
  onClose,
}: CertificateModalProps) {
  const [renderedRequest, setRenderedRequest] =
    useState<CertificateRequest | null>(request);
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const isClosingRef = useRef(false);

  const useIsomorphicLayout =
    typeof window !== "undefined" ? useLayoutEffect : useEffect;

  const triggerClose = () => {
    if (isClosingRef.current) return;
    const backdrop = backdropRef.current;
    const panel = panelRef.current;

    if (
      !backdrop ||
      !panel ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setRenderedRequest(null);
      onClose();
      return;
    }

    isClosingRef.current = true;
    gsap.killTweensOf([backdrop, panel]);

    gsap
      .timeline({
        onComplete: () => {
          isClosingRef.current = false;
          setRenderedRequest(null);
          onClose();
        },
      })
      .to(panel, {
        opacity: 0,
        y: 12,
        scale: 0.94,
        duration: 0.2,
        ease: "power2.in",
      })
      .to(
        backdrop,
        {
          opacity: 0,
          duration: 0.18,
          ease: "power2.in",
        },
        "-=0.12"
      );
  };

  useIsomorphicLayout(() => {
    if (request) {
      isClosingRef.current = false;
      setRenderedRequest(request);
    } else if (renderedRequest && !isClosingRef.current) {
      setRenderedRequest(null);
    }
  }, [request, renderedRequest]);

  useIsomorphicLayout(() => {
    if (!renderedRequest || !request) return;
    const backdrop = backdropRef.current;
    const panel = panelRef.current;
    if (!backdrop || !panel) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        backdrop,
        { opacity: 0 },
        { opacity: 1, duration: 0.22, ease: "power2.out" }
      );
      gsap.fromTo(
        panel,
        { opacity: 0, y: 18, scale: 0.94 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.34,
          ease: "back.out(1.35)",
          clearProps: "transform",
        }
      );
    }, backdropRef);

    return () => ctx.revert();
  }, [renderedRequest, request]);

  useEffect(() => {
    if (!renderedRequest) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") triggerClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderedRequest]);

  if (!renderedRequest) return null;
  const activeReq = renderedRequest;
  const t = DICT[lang];
  const profile = student.profile;

  const issuedDate = new Date(activeReq.updatedAt).toLocaleDateString(
    lang === "ru" ? "ru-RU" : "en-US",
    { day: "2-digit", month: "long", year: "numeric" }
  );

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      onClick={triggerClose}
    >
      <div
        ref={panelRef}
        className="w-full max-w-2xl rounded-3xl bg-white text-[#0D1B2A] shadow-2xl overflow-hidden border border-slate-200 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Action Bar */}
        <div className="no-print flex items-center justify-between px-5 py-3.5 bg-[#0D1B2A] text-white">
          <div className="flex items-center gap-2 text-xs font-mono">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>{activeReq.verificationCode}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#C49A45] text-[#0D1B2A] text-xs font-semibold hover:opacity-90"
            >
              <Printer className="w-3.5 h-3.5" />
              {t.printCertBtn}
            </button>
            <button
              type="button"
              onClick={triggerClose}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="printable-certificate p-6 sm:p-10 space-y-6">
          <div className="flex items-start justify-between gap-4 border-b-2 border-[#0D1B2A]/15 pb-5">
            <div className="flex items-center gap-3">
              <BrandEmblem className="w-11 h-11 text-[#0D1B2A]" />
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#1B4B8A] font-semibold">
                  {t.contestBadgeShort}
                </p>
                <h3 className="font-serif text-2xl font-bold tracking-tight">
                  {lang === "ru"
                    ? "ЭЛЕКТРОННАЯ СПРАВКА ДЕКАНАТА"
                    : "DIGITAL DEAN'S OFFICE CERTIFICATE"}
                </h3>
                <p className="text-xs text-slate-500">
                  {lang === "ru"
                    ? "Цифровой деканат будущего «Дипломат.Онлайн»"
                    : "Digital Dean's Office Prototype «Diplomat.Online»"}
                </p>
              </div>
            </div>
            <div className="text-right font-mono text-xs text-slate-600">
              <div>№ {activeReq.verificationCode}</div>
              <div className="mt-0.5">{issuedDate}</div>
            </div>
          </div>

          <div className="space-y-3 text-sm leading-relaxed">
            <p className="font-semibold text-base text-[#1B4B8A]">
              {lang === "ru" ? activeReq.title : activeReq.titleEn}
            </p>
            <p>
              {lang === "ru" ? (
                <>
                  Настоящей справкой подтверждается, что{" "}
                  <strong>{activeReq.studentName}</strong> (студ. билет{" "}
                  <span className="font-mono">
                    {profile?.studentCardNo ?? "—"}
                  </span>
                  ) действительно обучается на{" "}
                  <strong>{profile?.course ?? 3} курсе</strong> очной формы
                  обучения, группа{" "}
                  <strong className="font-mono">{activeReq.groupCode}</strong>,{" "}
                  {profile?.faculty ?? ""}.
                </>
              ) : (
                <>
                  This document certifies that{" "}
                  <strong>{student.fullNameEn}</strong> (Student ID{" "}
                  <span className="font-mono">
                    {profile?.studentCardNo ?? "—"}
                  </span>
                  ) is an active full-time student in{" "}
                  <strong>Year {profile?.course ?? 3}</strong>, group{" "}
                  <strong className="font-mono">{activeReq.groupCode}</strong>,{" "}
                  {profile?.facultyEn ?? ""}.
                </>
              )}
            </p>
            <p className="text-slate-600">
              <span className="font-semibold text-slate-800">
                {lang === "ru" ? "Назначение: " : "Purpose: "}
              </span>
              {activeReq.purpose}
            </p>
            {activeReq.staffComment && (
              <p className="text-xs rounded-xl bg-slate-100 p-3 text-slate-700 border border-slate-200">
                <span className="font-semibold">
                  {lang === "ru" ? "Отметка специалиста: " : "Staff note: "}
                </span>
                {activeReq.staffComment}
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 pt-4 border-t border-slate-200">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 border-[#1B4B8A]/50 text-[#1B4B8A] text-xs font-mono">
                <ShieldCheck className="w-4 h-4" />
                <span>
                  {lang === "ru"
                    ? "ПОДПИСАНО ЭЦП КОНЦЕПТ-ДЕКАНАТА"
                    : "DIGITALLY SIGNED · CONCEPT SEAL"}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 max-w-xs">
                {lang === "ru"
                  ? "Демонстрационный документ конкурсного прототипа. Данные вымышленные."
                  : "Demonstration certificate generated by competition prototype using synthetic data."}
              </p>
            </div>

            <div className="flex items-center gap-3 self-start sm:self-end">
              <div className="text-right text-[10px] font-mono text-slate-500">
                <div>QR-VERIFY</div>
                <div>{activeReq.verificationCode}</div>
              </div>
              <div className="p-2 bg-white rounded-xl border border-slate-300">
                <QRCodeSVG
                  value={`VERIFIED:${activeReq.verificationCode}:${activeReq.groupCode}:${activeReq.status}`}
                  size={84}
                  level="M"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
