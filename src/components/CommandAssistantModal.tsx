"use client";

import React, { useLayoutEffect, useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import {
  ArrowRight,
  Calendar,
  FileText,
  GraduationCap,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { DICT, type Lang } from "@/lib/i18n";
import type {
  CertificateRequest,
  GradeItem,
  PublicUser,
  ScheduleItem,
} from "@/lib/types";

interface CommandAssistantModalProps {
  open: boolean;
  onClose: () => void;
  lang: Lang;
  user: PublicUser;
  schedule: ScheduleItem[];
  grades: GradeItem[];
  requests: CertificateRequest[];
  onNavigate: (tab: string) => void;
  onQuickOrderCert: () => void;
}

export function CommandAssistantModal({
  open,
  onClose,
  lang,
  user,
  schedule,
  grades,
  requests,
  onNavigate,
  onQuickOrderCert,
}: CommandAssistantModalProps) {
  const [query, setQuery] = useState("");
  const [rendered, setRendered] = useState(open);
  const t = DICT[lang];
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
      setRendered(false);
      onClose();
      return;
    }

    isClosingRef.current = true;
    gsap.killTweensOf([backdrop, panel]);

    gsap
      .timeline({
        onComplete: () => {
          isClosingRef.current = false;
          setRendered(false);
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
    if (open) {
      isClosingRef.current = false;
      setRendered(true);
    } else if (rendered && !isClosingRef.current) {
      // Closed externally (e.g., Cmd+K toggle)
      setRendered(false);
    }
  }, [open, rendered]);

  useIsomorphicLayout(() => {
    if (!rendered || !open) return;
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
      const items = panel.querySelectorAll(".cmd-stagger");
      if (items.length > 0) {
        gsap.fromTo(
          items,
          { opacity: 0, y: 8 },
          {
            opacity: 1,
            y: 0,
            duration: 0.28,
            stagger: 0.03,
            delay: 0.08,
            ease: "power2.out",
            clearProps: "transform",
          }
        );
      }
    }, backdropRef);

    return () => ctx.revert();
  }, [rendered, open]);

  useEffect(() => {
    if (!rendered) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") triggerClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rendered]);

  const smartAnswer = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;

    if (
      q.includes("пар") ||
      q.includes("ауд") ||
      q.includes("расп") ||
      q.includes("class") ||
      q.includes("room") ||
      q.includes("next")
    ) {
      const mondayOrFirst = schedule[0];
      const changed = schedule.filter((s) => s.status !== "normal");
      if (mondayOrFirst) {
        return {
          title:
            lang === "ru"
              ? `Ближайшая пара: ${mondayOrFirst.subject}`
              : `Next class: ${mondayOrFirst.subjectEn}`,
          body:
            lang === "ru"
              ? `${mondayOrFirst.startTime}–${mondayOrFirst.endTime} · ${mondayOrFirst.room} (${mondayOrFirst.lecturer}). Изменений на неделе: ${changed.length}.`
              : `${mondayOrFirst.startTime}–${mondayOrFirst.endTime} · ${mondayOrFirst.room} (${mondayOrFirst.lecturer}). Weekly changes: ${changed.length}.`,
          ctaLabel: lang === "ru" ? "Открыть расписание" : "Open Schedule",
          action: () => {
            onNavigate("schedule");
            triggerClose();
          },
        };
      }
    }

    if (
      q.includes("справ") ||
      q.includes("заяв") ||
      q.includes("pdf") ||
      q.includes("cert") ||
      q.includes("doc")
    ) {
      const readyCount = requests.filter((r) => r.status === "ready").length;
      return {
        title:
          lang === "ru"
            ? `Заявки и справки (${requests.length})`
            : `Requests & Certificates (${requests.length})`,
        body:
          lang === "ru"
            ? `Готовых документов с QR: ${readyCount}. Вы можете заказать новую справку об обучении, для визы или пересдачи в 2 клика.`
            : `Ready documents with QR: ${readyCount}. You can order a new certificate in 2 clicks.`,
        ctaLabel: lang === "ru" ? "Заказать справку сейчас" : "Order Certificate Now",
        action: () => {
          onQuickOrderCert();
          triggerClose();
        },
      };
    }

    if (
      q.includes("пересдач") ||
      q.includes("долг") ||
      q.includes("сесс") ||
      q.includes("оцен") ||
      q.includes("gpa") ||
      q.includes("retake") ||
      q.includes("exam")
    ) {
      const retakes = grades.filter((g) => g.status === "retake_needed");
      const upcoming = grades.filter((g) => g.status === "upcoming");
      return {
        title:
          lang === "ru"
            ? retakes.length > 0
              ? `Внимание: пересдача (${retakes[0].subject})`
              : "Академический статус: всё стабильно"
            : retakes.length > 0
              ? `Attention: Retake (${retakes[0].subjectEn})`
              : "Academic Standing: Good",
        body:
          lang === "ru"
            ? `GPA: ${user.profile?.gpa ?? "—"}. Предстоящих экзаменов/зачётов: ${upcoming.length}. Незакрытых долгов: ${retakes.length}.`
            : `GPA: ${user.profile?.gpa ?? "—"}. Upcoming exams: ${upcoming.length}. Retakes needed: ${retakes.length}.`,
        ctaLabel: lang === "ru" ? "Перейти к успеваемости" : "Open Academics",
        action: () => {
          onNavigate("academics");
          triggerClose();
        },
      };
    }

    return null;
  }, [query, schedule, requests, grades, user, lang, onNavigate, onClose, onQuickOrderCert]);

  const matchingClasses = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return schedule.slice(0, 3);
    return schedule
      .filter(
        (s) =>
          s.subject.toLowerCase().includes(q) ||
          s.subjectEn.toLowerCase().includes(q) ||
          s.room.toLowerCase().includes(q) ||
          s.lecturer.toLowerCase().includes(q)
      )
      .slice(0, 4);
  }, [query, schedule]);

  if (!rendered) return null;

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[75] bg-black/55 backdrop-blur-sm flex items-start justify-center p-3 sm:p-6 pt-12 sm:pt-20"
      onClick={triggerClose}
    >
      <div
        ref={panelRef}
        className="w-full max-w-xl rounded-3xl bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-color)] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--border-color)]">
          <Search className="w-5 h-5 text-[var(--accent)] shrink-0" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.assistantPlaceholder}
            className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--text-secondary)]"
          />
          <button
            type="button"
            onClick={triggerClose}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-subtle)]"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Quick Suggestion Chips */}
          <div className="flex flex-wrap gap-1.5">
            {(lang === "ru"
              ? ["Где сейчас пара?", "Справка об обучении", "Сессия и пересдачи"]
              : ["Next class?", "Order certificate", "Exams & retakes"]
            ).map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => setQuery(chip)}
                className="cmd-stagger text-xs px-2.5 py-1 rounded-full bg-[var(--bg-subtle)] hover:bg-[var(--accent)] hover:text-white transition-colors"
              >
                {chip}
              </button>
            ))}
          </div>

          {smartAnswer && (
            <div className="rounded-2xl bg-[#1B4B8A]/10 border border-[#1B4B8A]/25 p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--accent)]">
                <Sparkles className="w-4 h-4" />
                <span>{t.assistantTitle}</span>
              </div>
              <p className="text-sm font-semibold">{smartAnswer.title}</p>
              <p className="text-xs text-[var(--text-secondary)]">
                {smartAnswer.body}
              </p>
              <button
                type="button"
                onClick={smartAnswer.action}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)] hover:underline pt-1"
              >
                <span>{smartAnswer.ctaLabel}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                onNavigate("schedule");
                triggerClose();
              }}
              className="flex flex-col items-start gap-1 p-3 rounded-2xl bg-[var(--bg-subtle)] hover:ring-1 hover:ring-[var(--accent)] text-left"
            >
              <Calendar className="w-4 h-4 text-[var(--accent)]" />
              <span className="text-xs font-medium">{t.navSchedule}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onNavigate("academics");
                triggerClose();
              }}
              className="flex flex-col items-start gap-1 p-3 rounded-2xl bg-[var(--bg-subtle)] hover:ring-1 hover:ring-[var(--accent)] text-left"
            >
              <GraduationCap className="w-4 h-4 text-[var(--accent)]" />
              <span className="text-xs font-medium">{t.navAcademics}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onQuickOrderCert();
                triggerClose();
              }}
              className="flex flex-col items-start gap-1 p-3 rounded-2xl bg-[var(--bg-subtle)] hover:ring-1 hover:ring-[var(--accent)] text-left"
            >
              <FileText className="w-4 h-4 text-[var(--accent)]" />
              <span className="text-xs font-medium">{t.orderCertBtn}</span>
            </button>
          </div>

          {matchingClasses.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                {lang === "ru" ? "Занятия и аудитории" : "Classes & Rooms"}
              </p>
              <div className="space-y-1.5">
                {matchingClasses.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onNavigate("schedule");
                      triggerClose();
                    }}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl hover:bg-[var(--bg-subtle)] text-left"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate">
                        {lang === "ru" ? item.subject : item.subjectEn}
                      </p>
                      <p className="text-[11px] text-[var(--text-secondary)] truncate">
                        {t.dayLabels[item.dayIndex]} · {item.startTime} ·{" "}
                        {item.lecturer}
                      </p>
                    </div>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-[var(--bg-subtle)] shrink-0">
                      {item.room}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
