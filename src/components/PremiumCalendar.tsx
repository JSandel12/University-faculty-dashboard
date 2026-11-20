"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import {
  AlertCircle,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  GraduationCap,
  MapPin,
  Sparkles,
  User,
  Video,
  X,
} from "lucide-react";
import { DICT, type Lang } from "@/lib/i18n";
import type { GradeItem, ScheduleItem } from "@/lib/types";
import { MaskedTextReveal } from "./effects/KineticText";

interface PremiumCalendarProps {
  groupCode: string;
  schedule: ScheduleItem[];
  grades: GradeItem[];
  lang: Lang;
  onAskDeanAboutClass: (subject: string) => void;
}

type CalendarViewMode = "week" | "day" | "month";

const START_HOUR = 8.5; // 08:30
const END_HOUR = 16.5; // 16:30
const HOUR_HEIGHT = 74; // px per hour

function timeToDecimal(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) + (m || 0) / 60;
}

const KIND_STYLES: Record<
  ScheduleItem["kind"],
  { bg: string; border: string; labelRu: string; labelEn: string }
> = {
  lecture: {
    bg: "bg-[#1B4B8A]/10 dark:bg-[#1B4B8A]/25",
    border: "border-l-[#1B4B8A]",
    labelRu: "Лекция",
    labelEn: "Lecture",
  },
  seminar: {
    bg: "bg-emerald-500/10 dark:bg-emerald-500/15",
    border: "border-l-emerald-600",
    labelRu: "Семинар",
    labelEn: "Seminar",
  },
  language: {
    bg: "bg-violet-500/10 dark:bg-violet-500/18",
    border: "border-l-violet-600",
    labelRu: "Язык",
    labelEn: "Language",
  },
  exam: {
    bg: "bg-[#C49A45]/15 dark:bg-[#C49A45]/20",
    border: "border-l-[#C49A45]",
    labelRu: "Коллоквиум / Зачёт",
    labelEn: "Colloquium / Exam",
  },
};

export function PremiumCalendar({
  groupCode,
  schedule,
  grades,
  lang,
  onAskDeanAboutClass,
}: PremiumCalendarProps) {
  const t = DICT[lang];
  const [viewMode, setViewMode] = useState<CalendarViewMode>("week");
  const [selectedDay, setSelectedDay] = useState<number>(0); // 0=Mon..5=Sat
  const [changesOnly, setChangesOnly] = useState(false);
  const [activeClass, setActiveClass] = useState<ScheduleItem | null>(null);
  const [monthCursor, setMonthCursor] = useState<{ year: number; month: number }>({
    year: 2026,
    month: 10, // November 2026 (0-indexed)
  });
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<number>(19);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const inspectorRef = useRef<HTMLDivElement | null>(null);

  // GSAP transition when clicking different classes in the calendar
  useEffect(() => {
    const el = inspectorRef.current;
    if (!el || !activeClass) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { opacity: 0.35, y: 12, scale: 0.98 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.34,
          ease: "power3.out",
          clearProps: "transform",
        }
      );

      const rows = el.querySelectorAll(".cal-inspector-row");
      if (rows.length > 0) {
        gsap.fromTo(
          rows,
          { opacity: 0, y: 8 },
          {
            opacity: 1,
            y: 0,
            duration: 0.28,
            stagger: 0.045,
            ease: "power2.out",
            clearProps: "transform",
          }
        );
      }
    }, inspectorRef);

    return () => ctx.revert();
  }, [activeClass]);

  // Switch to Day timeline automatically on narrow screens on initial mount
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setViewMode("day");
    }
  }, []);

  // GSAP stagger when switching calendar view or day
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const blocks = el.querySelectorAll(".cal-anim");
    if (blocks.length === 0) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        blocks,
        { y: 12, opacity: 0, scale: 0.98 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.36,
          stagger: 0.03,
          ease: "power2.out",
          clearProps: "transform",
        }
      );
    }, gridRef);

    return () => ctx.revert();
  }, [viewMode, selectedDay, changesOnly, monthCursor]);

  const changesCount = useMemo(
    () => schedule.filter((s) => s.status !== "normal").length,
    [schedule]
  );

  const visibleSchedule = useMemo(
    () =>
      schedule.filter((s) => (changesOnly ? s.status !== "normal" : true)),
    [schedule, changesOnly]
  );

  const daySchedule = useMemo(
    () => visibleSchedule.filter((s) => s.dayIndex === selectedDay),
    [visibleSchedule, selectedDay]
  );

  // Exam & retake milestones mapped to calendar days
  const milestones = useMemo(() => {
    const map: Record<string, { label: string; urgent: boolean }[]> = {
      "2026-11-30": [
        {
          label:
            lang === "ru"
              ? "Дедлайн заявок на стажировку"
              : "Internship Application Deadline",
          urgent: false,
        },
      ],
      "2026-12-05": grades
        .filter((g) => g.status === "retake_needed")
        .map((g) => ({
          label:
            lang === "ru"
              ? `Пересдача: ${g.subject}`
              : `Retake: ${g.subjectEn}`,
          urgent: true,
        })),
      "2026-12-22": grades
        .filter((g) => g.examDate?.startsWith("22.12"))
        .map((g) => ({
          label:
            lang === "ru" ? `Зачёт: ${g.subject}` : `Credit: ${g.subjectEn}`,
          urgent: false,
        })),
      "2027-01-14": grades
        .filter((g) => g.examDate?.startsWith("14.01"))
        .map((g) => ({
          label:
            lang === "ru" ? `Экзамен: ${g.subject}` : `Exam: ${g.subjectEn}`,
          urgent: true,
        })),
      "2027-01-16": grades
        .filter((g) => g.examDate?.startsWith("16.01"))
        .map((g) => ({
          label:
            lang === "ru" ? `Экзамен: ${g.subject}` : `Exam: ${g.subjectEn}`,
          urgent: true,
        })),
    };
    return map;
  }, [grades, lang]);

  // Build month grid cells
  const monthDays = useMemo(() => {
    const { year, month } = monthCursor;
    const firstDay = new Date(year, month, 1);
    const totalDays = new Date(year, month + 1, 0).getDate();
    // Convert JS Sun=0..Sat=6 to Mon=0..Sun=6
    const startOffset = (firstDay.getDay() + 6) % 7;
    const cells: { day: number | null; dayOfWeek: number; key: string }[] = [];

    for (let i = 0; i < startOffset; i++) {
      cells.push({ day: null, dayOfWeek: i % 7, key: `empty-${i}` });
    }
    for (let d = 1; d <= totalDays; d++) {
      const dow = (startOffset + d - 1) % 7;
      const mm = String(month + 1).padStart(2, "0");
      const dd = String(d).padStart(2, "0");
      cells.push({ day: d, dayOfWeek: dow, key: `${year}-${mm}-${dd}` });
    }
    return cells;
  }, [monthCursor]);

  const monthTitle = useMemo(() => {
    return new Date(monthCursor.year, monthCursor.month, 1).toLocaleDateString(
      lang === "ru" ? "ru-RU" : "en-US",
      { month: "long", year: "numeric" }
    );
  }, [monthCursor, lang]);

  const stepMonth = (delta: number) => {
    setMonthCursor((prev) => {
      const d = new Date(prev.year, prev.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  // Current time indicator line (positioned around 10:15 for crisp demo visibility)
  const nowIndicatorTop = (10.25 - START_HOUR) * HOUR_HEIGHT;

  const statusPill = (status: ScheduleItem["status"]) => {
    if (status === "normal") return null;
    const map: Record<Exclude<ScheduleItem["status"], "normal">, string> = {
      room_changed: "bg-amber-500 text-white",
      teacher_replaced: "bg-indigo-600 text-white",
      online: "bg-sky-600 text-white",
      cancelled: "bg-rose-600 text-white",
    };
    return (
      <span
        className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${map[status]}`}
      >
        {t.statusLabels[status]}
      </span>
    );
  };

  const hours = [9, 10, 11, 12, 13, 14, 15, 16];

  return (
    <div className="space-y-5">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-widest text-[var(--accent)]">
            {lang === "ru"
              ? `Учебный календарь · ${groupCode}`
              : `Academic Calendar · ${groupCode}`}
          </p>
          <MaskedTextReveal
            text={
              lang === "ru"
                ? "Расписание и события"
                : "Schedule & Deadlines"
            }
            as="h2"
            className="font-serif text-2xl sm:text-3xl font-semibold mt-0.5"
          />
        </div>

        <div className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-2">
          <div className="inline-flex rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] p-1 shadow-sm shrink-0">
            {(
              [
                { id: "week", ru: "Неделя", en: "Week" },
                { id: "day", ru: "День", en: "Day" },
                { id: "month", ru: "Месяц", en: "Month" },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setViewMode(m.id)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold transition-colors whitespace-nowrap ${
                  viewMode === m.id
                    ? "bg-[#0D1B2A] dark:bg-[#1B4B8A] text-white"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {lang === "ru" ? m.ru : m.en}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setChangesOnly((v) => !v)}
            className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-2xl text-[11px] sm:text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 shadow-sm ${
              changesOnly
                ? "bg-amber-500/15 border-amber-500/45 text-amber-800 dark:text-amber-200"
                : "bg-[var(--bg-surface)] border-[var(--border-color)] text-[var(--text-primary)] hover:border-[var(--accent)]/40"
            }`}
            title={t.changesOnly}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#C49A45] shrink-0" />
            <span className="sm:hidden">
              {lang === "ru" ? "Изм." : "Changes"} ({changesCount})
            </span>
            <span className="hidden sm:inline">
              {t.changesOnly} ({changesCount})
            </span>
          </button>
        </div>
      </div>

      <div ref={gridRef} className="grid xl:grid-cols-12 gap-5 items-start">
        {/* MAIN CALENDAR CANVAS (8/9 cols on XL) */}
        <div className="xl:col-span-8 space-y-4 min-w-0">
          {/* === WEEK VIEW: Responsive Mobile Vertical Agenda + Desktop Time-Grid === */}
          {viewMode === "week" && (
            <>
              {/* Mobile Vertical Weekly Agenda (Zero horizontal scroll at 360px+) */}
              <div className="md:hidden space-y-3">
                {[0, 1, 2, 3, 4, 5].map((dayIdx) => {
                  const items = visibleSchedule.filter((s) => s.dayIndex === dayIdx);
                  if (items.length === 0 && changesOnly) return null;
                  return (
                    <div
                      key={dayIdx}
                      className="cal-anim rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] overflow-hidden shadow-sm"
                    >
                      <div className="px-4 py-2.5 bg-[var(--bg-page)] border-b border-[var(--border-color)] flex items-center justify-between">
                        <span className="text-xs font-semibold">
                          {t.dayLabelsFull[dayIdx]} · {16 + dayIdx}{" "}
                          {lang === "ru" ? "ноя" : "Nov"}
                        </span>
                        <span className="text-[11px] font-mono text-[var(--text-secondary)]">
                          {items.length}{" "}
                          {lang === "ru" ? "пар" : items.length === 1 ? "class" : "classes"}
                        </span>
                      </div>

                      {items.length === 0 ? (
                        <p className="px-4 py-3 text-xs text-[var(--text-secondary)]">
                          {lang === "ru" ? "Нет занятий" : "No classes"}
                        </p>
                      ) : (
                        <div className="divide-y divide-[var(--border-color)]">
                          {items.map((item) => {
                            const ks = KIND_STYLES[item.kind];
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => setActiveClass(item)}
                                className={`w-full text-left p-3.5 border-l-4 ${ks.border} hover:bg-[var(--bg-page)]/60 transition-colors`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-mono text-xs font-semibold text-[var(--accent)]">
                                    {item.startTime}–{item.endTime}
                                  </span>
                                  {statusPill(item.status)}
                                </div>
                                <p
                                  className={`text-sm font-semibold mt-1 ${
                                    item.status === "cancelled"
                                      ? "line-through opacity-60"
                                      : ""
                                  }`}
                                >
                                  {lang === "ru" ? item.subject : item.subjectEn}
                                </p>
                                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                                  <strong className="text-[var(--text-primary)]">
                                    {item.room}
                                  </strong>
                                  {item.originalRoom && (
                                    <span className="line-through ml-1.5 opacity-60">
                                      {item.originalRoom}
                                    </span>
                                  )}
                                  {" · "}
                                  {item.lecturer}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Desktop Proportional Time-Grid */}
              <div className="hidden md:block rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <div className="min-w-[640px]">
                  {/* Day Columns Header */}
                  <div className="grid grid-cols-[60px_repeat(6,1fr)] border-b border-[var(--border-color)] bg-[var(--bg-page)]/70">
                    <div className="p-3 text-[10px] font-mono text-[var(--text-secondary)] flex items-center justify-center">
                      MSK
                    </div>
                    {t.dayLabels.map((lbl, idx) => {
                      const dayNum = 16 + idx; // Nov 16..21 demo week
                      const hasChanges = visibleSchedule.some(
                        (s) => s.dayIndex === idx && s.status !== "normal"
                      );
                      const isToday = idx === selectedDay;
                      return (
                        <button
                          key={lbl}
                          type="button"
                          onClick={() => setSelectedDay(idx)}
                          className={`p-2.5 text-center border-l border-[var(--border-color)] transition-colors ${
                            isToday ? "bg-[#1B4B8A]/10" : "hover:bg-[var(--bg-subtle)]/50"
                          }`}
                        >
                          <div className="text-[11px] font-mono uppercase text-[var(--text-secondary)]">
                            {lbl}
                          </div>
                          <div className="mt-0.5 flex items-center justify-center gap-1">
                            <span
                              className={`w-7 h-7 rounded-full inline-flex items-center justify-center text-xs font-semibold ${
                                isToday
                                  ? "bg-[#0D1B2A] dark:bg-[#1B4B8A] text-white"
                                  : ""
                              }`}
                            >
                              {dayNum}
                            </span>
                            {hasChanges && (
                              <span
                                className="w-1.5 h-1.5 rounded-full bg-amber-500"
                                title={t.changesOnly}
                              />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Proportional Time Matrix */}
                  <div
                    className="relative grid grid-cols-[60px_repeat(6,1fr)]"
                    style={{ height: `${(END_HOUR - START_HOUR) * HOUR_HEIGHT}px` }}
                  >
                    {/* Left Hour Ruler */}
                    <div className="relative border-r border-[var(--border-color)]">
                      {hours.map((hr) => (
                        <div
                          key={hr}
                          className="absolute inset-x-0 text-right pr-2 text-[10px] font-mono text-[var(--text-secondary)] -translate-y-2"
                          style={{ top: `${(hr - START_HOUR) * HOUR_HEIGHT}px` }}
                        >
                          {String(hr).padStart(2, "0")}:00
                        </div>
                      ))}
                    </div>

                    {/* Horizontal Hour Lines */}
                    <div className="col-span-6 relative">
                      {hours.map((hr) => (
                        <div
                          key={hr}
                          className="absolute inset-x-0 border-t border-dashed border-[var(--border-color)] pointer-events-none"
                          style={{ top: `${(hr - START_HOUR) * HOUR_HEIGHT}px` }}
                        />
                      ))}

                      {/* Live Current Time Indicator */}
                      <div
                        className="absolute inset-x-0 z-20 pointer-events-none flex items-center"
                        style={{ top: `${nowIndicatorTop}px` }}
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-[#C49A45] -ml-1.5 shadow" />
                        <div className="flex-1 h-[1.5px] bg-[#C49A45]" />
                      </div>

                      {/* 6 Day Columns */}
                      <div className="grid grid-cols-6 h-full">
                        {[0, 1, 2, 3, 4, 5].map((dayIdx) => {
                          const items = visibleSchedule.filter(
                            (s) => s.dayIndex === dayIdx
                          );
                          return (
                            <div
                              key={dayIdx}
                              className={`relative border-l border-[var(--border-color)] ${
                                dayIdx === selectedDay ? "bg-[#1B4B8A]/[0.025]" : ""
                              }`}
                            >
                              {items.map((item) => {
                                const start = timeToDecimal(item.startTime);
                                const end = timeToDecimal(item.endTime);
                                const top = Math.max(0, (start - START_HOUR) * HOUR_HEIGHT);
                                const height = Math.max(58, (end - start) * HOUR_HEIGHT - 4);
                                const ks = KIND_STYLES[item.kind];

                                return (
                                  <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => setActiveClass(item)}
                                    style={{ top: `${top + 2}px`, height: `${height}px` }}
                                    className={`cal-anim absolute inset-x-1 rounded-xl border border-[var(--border-color)] border-l-4 ${ks.border} ${ks.bg} p-2 text-left flex flex-col justify-between overflow-hidden hover:ring-2 hover:ring-[var(--accent)] transition-shadow ${
                                      item.status === "cancelled" ? "opacity-55" : ""
                                    }`}
                                  >
                                    <div className="min-w-0">
                                      <div className="flex items-center justify-between gap-1">
                                        <span className="text-[10px] font-mono text-[var(--text-secondary)]">
                                          {item.startTime}
                                        </span>
                                        {item.status !== "normal" && (
                                          <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                                        )}
                                      </div>
                                      <p
                                        className={`text-[11px] font-semibold leading-snug line-clamp-2 mt-0.5 ${
                                          item.status === "cancelled" ? "line-through" : ""
                                        }`}
                                      >
                                        {lang === "ru" ? item.subject : item.subjectEn}
                                      </p>
                                    </div>
                                    <div className="text-[10px] font-mono text-[var(--text-secondary)] truncate">
                                      {item.room}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              </div>
            </>
          )}

          {/* === DAY TIMELINE VIEW (Ultra-clean 360px Mobile & Focus Mode) === */}
          {viewMode === "day" && (
            <div className="space-y-4">
              <div className="grid grid-cols-6 gap-1.5">
                {t.dayLabels.map((lbl, idx) => {
                  const active = selectedDay === idx;
                  const count = visibleSchedule.filter((s) => s.dayIndex === idx).length;
                  const changed = visibleSchedule.some(
                    (s) => s.dayIndex === idx && s.status !== "normal"
                  );
                  return (
                    <button
                      key={lbl}
                      type="button"
                      onClick={() => setSelectedDay(idx)}
                      className={`rounded-2xl py-2.5 px-1 text-center border transition-all ${
                        active
                          ? "bg-[#0D1B2A] dark:bg-[#1B4B8A] text-white border-transparent shadow-sm"
                          : "bg-[var(--bg-surface)] border-[var(--border-color)] text-[var(--text-secondary)]"
                      }`}
                    >
                      <div className="text-[11px] font-semibold">{lbl}</div>
                      <div className="text-[10px] font-mono opacity-80 mt-0.5">
                        {16 + idx}
                      </div>
                      <div className="mt-1 flex items-center justify-center gap-1">
                        <span className="text-[9px] font-mono opacity-70">{count}</span>
                        {changed && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#C49A45]" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {daySchedule.length === 0 ? (
                <div className="cal-anim rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-color)] p-8 text-center text-sm text-[var(--text-secondary)]">
                  {lang === "ru"
                    ? "В этот день по выбранному фильтру занятий нет."
                    : "No classes scheduled for this filter."}
                </div>
              ) : (
                <div className="relative pl-5 space-y-3 before:content-[''] before:absolute before:left-[7px] before:top-3 before:bottom-3 before:w-[2px] before:bg-[var(--border-color)]">
                  {daySchedule.map((item) => {
                    const ks = KIND_STYLES[item.kind];
                    return (
                      <div key={item.id} className="cal-anim relative">
                        <span
                          className={`absolute -left-5 top-5 w-3.5 h-3.5 rounded-full border-2 border-[var(--bg-page)] ${
                            item.status !== "normal"
                              ? "bg-[#C49A45]"
                              : "bg-[var(--accent)]"
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setActiveClass(item)}
                          className={`w-full text-left rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] border-l-4 ${ks.border} p-4 shadow-sm hover:border-[var(--accent)] transition-all`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-mono text-xs font-semibold text-[var(--accent)]">
                              {item.startTime} – {item.endTime}
                            </span>
                            {statusPill(item.status)}
                          </div>
                          <h3
                            className={`text-base font-semibold mt-1.5 ${
                              item.status === "cancelled" ? "line-through opacity-60" : ""
                            }`}
                          >
                            {lang === "ru" ? item.subject : item.subjectEn}
                          </h3>
                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--text-secondary)]">
                            <span className="inline-flex items-center gap-1 font-medium text-[var(--text-primary)]">
                              {item.status === "online" ? (
                                <Video className="w-3.5 h-3.5 text-sky-500" />
                              ) : (
                                <MapPin className="w-3.5 h-3.5 text-[var(--accent)]" />
                              )}
                              {item.room}
                              {item.originalRoom && (
                                <span className="line-through opacity-55 ml-1">
                                  {item.originalRoom}
                                </span>
                              )}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <User className="w-3.5 h-3.5" />
                              {item.lecturer}
                            </span>
                          </div>
                          {item.changeNote && (
                            <p className="mt-2.5 text-xs rounded-xl bg-amber-500/10 border border-amber-500/25 px-3 py-1.5 text-amber-800 dark:text-amber-200">
                              {lang === "ru" ? item.changeNote : item.changeNoteEn}
                            </p>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* === FULL INTERACTIVE MONTH VIEW === */}
          {viewMode === "month" && (
            <div className="cal-anim rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-color)] p-4 sm:p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-semibold capitalize">
                  {monthTitle}
                </h3>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => stepMonth(-1)}
                    className="p-2 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--accent)] hover:text-white transition-colors"
                    aria-label="Previous month"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => stepMonth(1)}
                    className="p-2 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--accent)] hover:text-white transition-colors"
                    aria-label="Next month"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-mono text-[var(--text-secondary)]">
                {[...t.dayLabels, lang === "ru" ? "Вс" : "Sun"].map((d) => (
                  <div key={d} className="py-1">
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1.5">
                {monthDays.map((cell) => {
                  if (!cell.day) {
                    return <div key={cell.key} className="h-14 sm:h-16" />;
                  }
                  const isSunday = cell.dayOfWeek === 6;
                  const dayEvents = milestones[cell.key] || [];
                  const dayClasses = isSunday
                    ? []
                    : visibleSchedule.filter((s) => s.dayIndex === cell.dayOfWeek);
                  const selected = selectedCalendarDate === cell.day;

                  return (
                    <button
                      key={cell.key}
                      type="button"
                      onClick={() => {
                        setSelectedCalendarDate(cell.day!);
                        if (!isSunday) {
                          setSelectedDay(cell.dayOfWeek);
                        }
                      }}
                      className={`h-14 sm:h-16 rounded-2xl p-1.5 border flex flex-col justify-between text-left transition-all ${
                        selected
                          ? "bg-[#0D1B2A] dark:bg-[#1B4B8A] text-white border-transparent shadow-sm"
                          : "bg-[var(--bg-page)]/70 border-[var(--border-color)] hover:border-[var(--accent)]"
                      }`}
                    >
                      <span className="text-xs font-mono font-semibold">
                        {cell.day}
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {dayClasses.length > 0 && (
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              selected ? "bg-white" : "bg-[var(--accent)]"
                            }`}
                          />
                        )}
                        {dayEvents.map((ev, i) => (
                          <span
                            key={i}
                            className={`w-1.5 h-1.5 rounded-full ${
                              ev.urgent ? "bg-rose-500" : "bg-[#C49A45]"
                            }`}
                          />
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Selected Day Summary under Month Grid */}
              <div className="pt-3 border-t border-[var(--border-color)] space-y-2">
                <p className="text-xs font-semibold text-[var(--text-secondary)]">
                  {selectedCalendarDate} · {t.dayLabelsFull[selectedDay]}
                </p>
                {daySchedule.slice(0, 3).map((cls) => (
                  <button
                    key={cls.id}
                    type="button"
                    onClick={() => setActiveClass(cls)}
                    className="w-full flex items-center justify-between gap-2 rounded-xl bg-[var(--bg-page)] px-3 py-2 text-left hover:ring-1 hover:ring-[var(--accent)]"
                  >
                    <span className="text-xs font-medium truncate">
                      <span className="font-mono text-[var(--accent)] mr-2">
                        {cls.startTime}
                      </span>
                      {lang === "ru" ? cls.subject : cls.subjectEn}
                    </span>
                    <span className="text-[11px] font-mono text-[var(--text-secondary)] shrink-0">
                      {cls.room}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT SIDEBAR: Mini-Agenda & Exam Milestones */}
        <div className="xl:col-span-4 space-y-4">
          {/* Selected Class Inspector OR Quick Prompt */}
          {activeClass ? (
            <div
              ref={inspectorRef}
              className="rounded-3xl bg-[var(--bg-surface)] border-2 border-[var(--accent)]/40 p-5 shadow-md space-y-3"
            >
              <div className="cal-inspector-row flex items-start justify-between gap-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--accent)] font-semibold">
                  {lang === "ru"
                    ? KIND_STYLES[activeClass.kind].labelRu
                    : KIND_STYLES[activeClass.kind].labelEn}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveClass(null)}
                  className="p-1 rounded-lg hover:bg-[var(--bg-subtle)]"
                  aria-label="Close inspector"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <h3 className="cal-inspector-row text-lg font-semibold leading-snug">
                {lang === "ru" ? activeClass.subject : activeClass.subjectEn}
              </h3>
              <div className="cal-inspector-row space-y-1.5 text-xs text-[var(--text-secondary)]">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-[var(--accent)]" />
                  <span>
                    {t.dayLabelsFull[activeClass.dayIndex]} · {activeClass.startTime}–
                    {activeClass.endTime}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-[var(--accent)]" />
                  <span className="font-semibold text-[var(--text-primary)]">
                    {activeClass.room}
                  </span>
                  {activeClass.originalRoom && (
                    <span className="line-through opacity-60">
                      {activeClass.originalRoom}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-[var(--accent)]" />
                  <span>{activeClass.lecturer}</span>
                </div>
              </div>
              {activeClass.changeNote && (
                <div className="cal-inspector-row rounded-2xl bg-amber-500/10 border border-amber-500/25 p-3 text-xs text-amber-800 dark:text-amber-200">
                  {lang === "ru" ? activeClass.changeNote : activeClass.changeNoteEn}
                </div>
              )}
              <button
                type="button"
                onClick={() =>
                  onAskDeanAboutClass(
                    lang === "ru" ? activeClass.subject : activeClass.subjectEn
                  )
                }
                className="cal-inspector-row w-full py-2.5 px-4 rounded-xl bg-[#0D1B2A] dark:bg-[#1B4B8A] text-white text-xs font-semibold hover:opacity-95"
              >
                {lang === "ru"
                  ? "Создать обращение в деканат по паре"
                  : "Submit Dean's Office Inquiry"}
              </button>
            </div>
          ) : (
            <div className="rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-color)] p-5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--accent)]">
                <CalendarIcon className="w-4 h-4" />
                <span>
                  {lang === "ru"
                    ? "Интерактивный инспектор"
                    : "Class Inspector"}
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {lang === "ru"
                  ? "Нажмите на любую пару в календаре, чтобы увидеть детали аудитории, причину переноса и быстрое обращение в деканат."
                  : "Click any class block in the calendar to view room details, change notes, and quick appeal actions."}
              </p>
            </div>
          )}

          {/* Exam & Deadline Milestones */}
          <div className="rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-color)] p-5 space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-[var(--accent)]" />
              {lang === "ru"
                ? "Ближайшие сессия и дедлайны"
                : "Upcoming Exams & Deadlines"}
            </h3>

            <div className="space-y-2">
              {Object.entries(milestones).flatMap(([dateIso, list]) =>
                list.map((ev, idx) => (
                  <div
                    key={`${dateIso}-${idx}`}
                    className={`rounded-2xl p-3 border text-xs flex items-start gap-2.5 ${
                      ev.urgent
                        ? "bg-rose-500/10 border-rose-500/30"
                        : "bg-[var(--bg-page)] border-[var(--border-color)]"
                    }`}
                  >
                    <AlertCircle
                      className={`w-4 h-4 shrink-0 mt-0.5 ${
                        ev.urgent ? "text-rose-500" : "text-[#C49A45]"
                      }`}
                    />
                    <div>
                      <p className="font-mono text-[10px] text-[var(--text-secondary)]">
                        {dateIso}
                      </p>
                      <p className="font-semibold mt-0.5">{ev.label}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
