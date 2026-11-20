"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import {
  AlertTriangle,
  Award,
  BellPlus,
  CalendarCog,
  CheckCircle2,
  Clock,
  FileCheck2,
  MapPin,
  RotateCcw,
  Search,
  Send,
  Sparkles,
  Ticket,
  Users,
  Video,
  X,
  XCircle,
} from "lucide-react";
import { DICT, type Lang } from "@/lib/i18n";
import type {
  CertificateRequest,
  PublicUser,
  RequestStatus,
  ScheduleItem,
  ScheduleStatus,
} from "@/lib/types";
import {
  MaskedTextReveal,
  RollingCounter,
  WelcomeKineticTitle,
} from "./effects/KineticText";

interface StaffConsoleProps {
  activeTab: string;
  lang: Lang;
  requests: CertificateRequest[];
  schedule: ScheduleItem[];
  students: PublicUser[];
  onRefresh: () => Promise<void>;
  onToast: (msg: string) => void;
}

export function StaffConsole({
  activeTab,
  lang,
  requests,
  schedule,
  students,
  onRefresh,
  onToast,
}: StaffConsoleProps) {
  const t = DICT[lang];
  const [commentById, setCommentById] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [queueSearch, setQueueSearch] = useState("");

  // Schedule editor state
  const [selectedGroup, setSelectedGroup] = useState<string>("МО-304");
  const [selectedDayFilter, setSelectedDayFilter] = useState<number | "all">("all");
  const [changesOnlyStaff, setChangesOnlyStaff] = useState(false);
  const [scheduleSearch, setScheduleSearch] = useState("");
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editRoom, setEditRoom] = useState("");
  const [editStatus, setEditStatus] = useState<ScheduleStatus>("room_changed");
  const [editNote, setEditNote] = useState("");
  const staffInspectorRef = useRef<HTMLDivElement | null>(null);
  const staffQueueListRef = useRef<HTMLDivElement | null>(null);

  // Animate Staff Queue cards when status filter changes
  useEffect(() => {
    const el = staffQueueListRef.current;
    if (!el || activeTab !== "staff_queue") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const cards = el.querySelectorAll(".staff-req-card");
    if (cards.length === 0) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        cards,
        { opacity: 0, y: 10 },
        {
          opacity: 1,
          y: 0,
          duration: 0.28,
          stagger: 0.035,
          ease: "power2.out",
          clearProps: "transform",
        }
      );
    }, staffQueueListRef);

    return () => ctx.revert();
  }, [filterStatus, activeTab]);

  // Broadcast state
  const [bcGroup, setBcGroup] = useState("ALL");
  const [bcCategory, setBcCategory] = useState<"dean_news" | "deadline" | "schedule">("dean_news");
  const [bcUrgent, setBcUrgent] = useState(false);
  const [bcTitle, setBcTitle] = useState("");
  const [bcBody, setBcBody] = useState("");
  const [bcSending, setBcSending] = useState(false);

  const handleUpdateRequest = async (id: string, status: RequestStatus) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          staffComment: commentById[id] || undefined,
        }),
      });
      if (!res.ok) {
        onToast(lang === "ru" ? "Ошибка обновления заявки" : "Failed to update request");
        return;
      }
      await onRefresh();
      onToast(
        lang === "ru"
          ? "Статус заявки обновлён и отправлен студенту"
          : "Request updated & student notified"
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleQuickClassAction = async (
    item: ScheduleItem,
    status: ScheduleStatus,
    room: string,
    changeNote?: string
  ) => {
    setBusyId(item.id);
    try {
      const res = await fetch("/api/staff/schedule", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          status,
          room,
          changeNote,
        }),
      });
      if (!res.ok) {
        onToast(lang === "ru" ? "Ошибка сохранения пары" : "Failed to update class");
        return;
      }
      setEditingClassId(null);
      await onRefresh();
      onToast(
        lang === "ru"
          ? `Обновлено (${item.groupCode}) · уведомление отправлено группе`
          : `Updated (${item.groupCode}) · group notified`
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleSaveSchedule = async (id: string) => {
    const target = schedule.find((s) => s.id === id);
    if (!target) return;
    await handleQuickClassAction(target, editStatus, editRoom, editNote);
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setBcSending(true);
    try {
      const res = await fetch("/api/staff/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetGroup: bcGroup,
          category: bcCategory,
          urgent: bcUrgent,
          title: bcTitle,
          body: bcBody,
        }),
      });
      if (!res.ok) {
        onToast(lang === "ru" ? "Заполните заголовок и текст" : "Fill title and message");
        return;
      }
      setBcTitle("");
      setBcBody("");
      setBcUrgent(false);
      await onRefresh();
      onToast(lang === "ru" ? "Объявление разослано студентам" : "Announcement sent");
    } finally {
      setBcSending(false);
    }
  };

  const filteredRequests = useMemo(() => {
    const q = queueSearch.trim().toLowerCase();
    return requests.filter((r) => {
      if (filterStatus !== "all" && r.status !== filterStatus) return false;
      if (q) {
        return (
          r.studentName.toLowerCase().includes(q) ||
          r.groupCode.toLowerCase().includes(q) ||
          r.verificationCode.toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q) ||
          r.purpose.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [requests, filterStatus, queueSearch]);

  const queueStats = useMemo(() => {
    const pending = requests.filter(
      (r) => r.status === "submitted" || r.status === "in_review"
    ).length;
    const ready = requests.filter((r) => r.status === "ready").length;
    const changedClasses = schedule.filter((s) => s.status !== "normal").length;
    const avgGpa =
      students.length > 0
        ? students.reduce((acc, s) => acc + (s.profile?.gpa ?? 0), 0) /
          students.length
        : 0;
    return { pending, ready, changedClasses, avgGpa };
  }, [requests, schedule, students]);

  const groupClasses = useMemo(
    () =>
      schedule.filter((s) => {
        if (s.groupCode !== selectedGroup) return false;
        if (selectedDayFilter !== "all" && s.dayIndex !== selectedDayFilter) return false;
        if (changesOnlyStaff && s.status === "normal") return false;
        const q = scheduleSearch.trim().toLowerCase();
        if (q) {
          return (
            s.subject.toLowerCase().includes(q) ||
            s.subjectEn.toLowerCase().includes(q) ||
            s.room.toLowerCase().includes(q) ||
            s.lecturer.toLowerCase().includes(q)
          );
        }
        return true;
      }),
    [schedule, selectedGroup, selectedDayFilter, changesOnlyStaff, scheduleSearch]
  );

  const selectedEditClass = useMemo(
    () =>
      schedule.find((s) => s.id === editingClassId) ??
      groupClasses[0] ??
      null,
    [schedule, editingClassId, groupClasses]
  );

  // Sync editor inputs cleanly when switching selected class
  const selectClassForEdit = (cls: ScheduleItem, scrollMobile = false) => {
    setEditingClassId(cls.id);
    setEditRoom(cls.room);
    setEditStatus(cls.status === "normal" ? "room_changed" : cls.status);
    setEditNote(cls.changeNote || "");
    if (scrollMobile && typeof window !== "undefined" && window.innerWidth < 1024) {
      window.setTimeout(() => {
        staffInspectorRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 60);
    }
  };

  useEffect(() => {
    if (!editingClassId && groupClasses[0] && activeTab === "staff_schedule") {
      selectClassForEdit(groupClasses[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedGroup, groupClasses]);

  // Animate right-side schedule inspector when switching selected class
  useEffect(() => {
    const el = staffInspectorRef.current;
    if (!el || !selectedEditClass || activeTab !== "staff_schedule") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { opacity: 0.35, y: 10, scale: 0.985 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.3,
          ease: "power3.out",
          clearProps: "transform",
        }
      );
    }, staffInspectorRef);

    return () => ctx.revert();
  }, [selectedEditClass?.id, activeTab]);

  if (activeTab === "staff_schedule") {
    return (
      <div className="space-y-4 sm:space-y-5 min-w-0">
        {/* Header + Group Selector */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-serif font-semibold flex items-center gap-2">
              <CalendarCog className="w-5 h-5 text-[var(--accent)] shrink-0" />
              {t.navStaffSchedule}
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              {lang === "ru"
                ? "Выберите пару из списка — правки и переносы мгновенно уходят студентам группы."
                : "Select any class — room edits and alerts sync immediately to the group."}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {["МО-304", "МП-207"].map((grp) => {
              const changedCnt = schedule.filter(
                (s) => s.groupCode === grp && s.status !== "normal"
              ).length;
              return (
                <button
                  key={grp}
                  type="button"
                  onClick={() => {
                    setSelectedGroup(grp);
                    setEditingClassId(null);
                  }}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-semibold border transition-colors ${
                    selectedGroup === grp
                      ? "bg-[#0D1B2A] dark:bg-[#1B4B8A] text-white border-transparent shadow-sm"
                      : "bg-[var(--bg-surface)] border-[var(--border-color)]"
                  }`}
                >
                  <span>{grp}</span>
                  {changedCnt > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-[#C49A45] text-[#0D1B2A] text-[10px]">
                      {changedCnt}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Clean Single-Row Swipeable Day Strip + Changes Toggle + Search */}
        <div className="rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] p-3 space-y-2.5 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1">
            <button
              type="button"
              onClick={() => setSelectedDayFilter("all")}
              className={`whitespace-nowrap shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                selectedDayFilter === "all"
                  ? "bg-[#0D1B2A] dark:bg-[#1B4B8A] text-white"
                  : "bg-[var(--bg-page)] text-[var(--text-secondary)]"
              }`}
            >
              {lang === "ru" ? "Все" : "All"}
            </button>
            {t.dayLabels.map((lbl, idx) => (
              <button
                key={lbl}
                type="button"
                onClick={() => setSelectedDayFilter(idx)}
                className={`whitespace-nowrap shrink-0 px-2.5 py-1.5 rounded-xl text-xs font-mono font-medium transition-colors ${
                  selectedDayFilter === idx
                    ? "bg-[#0D1B2A] dark:bg-[#1B4B8A] text-white"
                    : "bg-[var(--bg-page)] text-[var(--text-secondary)]"
                }`}
              >
                {lbl}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setChangesOnlyStaff((v) => !v)}
              className={`whitespace-nowrap shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                changesOnlyStaff
                  ? "bg-amber-500/15 border-amber-500/45 text-amber-800 dark:text-amber-200"
                  : "bg-[var(--bg-page)] border-[var(--border-color)] text-[var(--text-secondary)]"
              }`}
            >
              <Sparkles className="w-3 h-3 text-[#C49A45]" />
              {lang === "ru" ? "Правки" : "Edits"}
            </button>
          </div>

          <div className="relative sm:w-60 shrink-0">
            <Search className="w-3.5 h-3.5 text-[var(--text-secondary)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={scheduleSearch}
              onChange={(e) => setScheduleSearch(e.target.value)}
              placeholder={
                lang === "ru"
                  ? "Предмет, ауд., преп..."
                  : "Class, room, lecturer..."
              }
              className="w-full rounded-xl bg-[var(--bg-page)] border border-[var(--border-color)] pl-8 pr-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
          </div>
        </div>

        {/* Master-Detail Split: Compact Class List (Left) + Animated Editor Inspector (Right) */}
        <div className="grid lg:grid-cols-12 gap-4 items-start">
          {/* Class Feed */}
          <div className="lg:col-span-7 space-y-2.5 min-w-0">
            {groupClasses.length === 0 ? (
              <div className="rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-color)] p-6 text-center text-xs text-[var(--text-secondary)]">
                {lang === "ru"
                  ? "Нет занятий по выбранному фильтру."
                  : "No classes match this filter."}
              </div>
            ) : (
              groupClasses.map((item) => {
                const isSelected = selectedEditClass?.id === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => selectClassForEdit(item, true)}
                    className={`stagger-item w-full text-left rounded-2xl bg-[var(--bg-surface)] border p-3.5 sm:p-4 transition-all flex items-start justify-between gap-3 ${
                      isSelected
                        ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/20 shadow-sm"
                        : item.status !== "normal"
                          ? "border-amber-500/40 hover:border-[var(--accent)]/50"
                          : "border-[var(--border-color)] hover:border-[var(--accent)]/50"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono text-[var(--text-secondary)]">
                        <span className="px-2 py-0.5 rounded-md bg-[var(--bg-subtle)] text-[var(--text-primary)] font-semibold">
                          {t.dayLabels[item.dayIndex]}
                        </span>
                        <span>
                          {item.startTime}–{item.endTime}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full font-semibold ${
                            item.status === "normal"
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                              : item.status === "cancelled"
                                ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                                : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                          }`}
                        >
                          {t.statusLabels[item.status]}
                        </span>
                      </div>
                      <p className="text-sm sm:text-base font-semibold mt-1.5 leading-snug">
                        {lang === "ru" ? item.subject : item.subjectEn}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5 truncate">
                        <strong className="text-[var(--text-primary)]">{item.room}</strong>
                        {item.originalRoom && item.originalRoom !== item.room && (
                          <span className="line-through ml-1.5 opacity-60">
                            {item.originalRoom}
                          </span>
                        )}
                        {" · "}
                        {item.lecturer}
                      </p>
                    </div>

                    <span
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-xl shrink-0 ${
                        isSelected
                          ? "bg-[#0D1B2A] dark:bg-[#1B4B8A] text-white"
                          : "bg-[var(--bg-page)] text-[var(--accent)] border border-[var(--border-color)]"
                      }`}
                    >
                      {lang === "ru" ? "Править" : "Edit"}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {/* Right Inspector: Animated Class Control Panel */}
          <div className="lg:col-span-5 lg:sticky lg:top-6 min-w-0">
            {selectedEditClass ? (
              <div
                ref={staffInspectorRef}
                className="rounded-3xl bg-[var(--bg-surface)] border-2 border-[var(--accent)]/35 p-4 sm:p-5 shadow-md space-y-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--accent)] font-semibold">
                      {selectedEditClass.groupCode} · {t.dayLabelsFull[selectedEditClass.dayIndex]} · {selectedEditClass.startTime}
                    </span>
                    <h3 className="text-base sm:text-lg font-semibold mt-1 leading-snug">
                      {lang === "ru" ? selectedEditClass.subject : selectedEditClass.subjectEn}
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      {selectedEditClass.lecturer} · <strong className="text-[var(--text-primary)]">{selectedEditClass.room}</strong>
                    </p>
                  </div>
                  {editingClassId && (
                    <button
                      type="button"
                      onClick={() => setEditingClassId(null)}
                      className="p-1 rounded-lg hover:bg-[var(--bg-subtle)] lg:hidden"
                      aria-label="Reset"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* 1-Click Quick Status Actions */}
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    disabled={busyId === selectedEditClass.id}
                    onClick={() =>
                      void handleQuickClassAction(
                        selectedEditClass,
                        "online",
                        "Онлайн · Webinar",
                        lang === "ru"
                          ? "Переведено в онлайн-формат деканатом"
                          : "Switched to online format by Dean's Office"
                      )
                    }
                    className="inline-flex items-center justify-center gap-1 py-2 px-2 rounded-xl bg-sky-500/12 text-sky-700 dark:text-sky-300 hover:bg-sky-500/20 text-[11px] font-semibold"
                  >
                    <Video className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{lang === "ru" ? "В онлайн" : "Online"}</span>
                  </button>

                  <button
                    type="button"
                    disabled={busyId === selectedEditClass.id || selectedEditClass.status === "cancelled"}
                    onClick={() =>
                      void handleQuickClassAction(
                        selectedEditClass,
                        "cancelled",
                        selectedEditClass.room,
                        lang === "ru"
                          ? "Пара отменена распоряжением деканата"
                          : "Class cancelled by Dean's Office"
                      )
                    }
                    className="inline-flex items-center justify-center gap-1 py-2 px-2 rounded-xl bg-rose-500/12 text-rose-700 dark:text-rose-300 hover:bg-rose-500/20 text-[11px] font-semibold disabled:opacity-45"
                  >
                    <XCircle className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{lang === "ru" ? "Отмена" : "Cancel"}</span>
                  </button>

                  <button
                    type="button"
                    disabled={busyId === selectedEditClass.id || selectedEditClass.status === "normal"}
                    onClick={() =>
                      void handleQuickClassAction(
                        selectedEditClass,
                        "normal",
                        selectedEditClass.originalRoom || selectedEditClass.room,
                        ""
                      )
                    }
                    className="inline-flex items-center justify-center gap-1 py-2 px-2 rounded-xl bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 text-[11px] font-semibold disabled:opacity-45"
                  >
                    <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{lang === "ru" ? "По плану" : "Restore"}</span>
                  </button>
                </div>

                {/* Quick Room Presets */}
                <div className="space-y-1.5 pt-2 border-t border-[var(--border-color)]">
                  <p className="text-[11px] text-[var(--text-secondary)] font-medium">
                    {lang === "ru" ? "Быстрый перенос аудитории:" : "Quick room transfer:"}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {["Зал № 4", "Ауд. 308", "Ауд. 114", "Конф.-зал 2", "Лаб. 501"].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setEditRoom(preset);
                          setEditStatus("room_changed");
                        }}
                        className={`text-[11px] font-mono px-2.5 py-1 rounded-lg border transition-colors ${
                          editRoom === preset
                            ? "bg-[#0D1B2A] dark:bg-[#1B4B8A] text-white border-transparent"
                            : "bg-[var(--bg-page)] border-[var(--border-color)] hover:border-[var(--accent)]"
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Detailed Editor Fields */}
                <div className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] text-[var(--text-secondary)] mb-1">
                        {lang === "ru" ? "Статус" : "Status"}
                      </label>
                      <select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value as ScheduleStatus)}
                        className="w-full rounded-xl bg-[var(--bg-page)] border border-[var(--border-color)] px-2.5 py-2 text-xs"
                      >
                        <option value="normal">{t.statusLabels.normal}</option>
                        <option value="room_changed">{t.statusLabels.room_changed}</option>
                        <option value="online">{t.statusLabels.online}</option>
                        <option value="teacher_replaced">{t.statusLabels.teacher_replaced}</option>
                        <option value="cancelled">{t.statusLabels.cancelled}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-[var(--text-secondary)] mb-1">
                        {lang === "ru" ? "Аудитория / ссылка" : "Room / Link"}
                      </label>
                      <input
                        type="text"
                        value={editRoom}
                        onChange={(e) => setEditRoom(e.target.value)}
                        className="w-full rounded-xl bg-[var(--bg-page)] border border-[var(--border-color)] px-2.5 py-2 text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] text-[var(--text-secondary)] mb-1">
                      {lang === "ru" ? "Комментарий для студентов" : "Note for students"}
                    </label>
                    <input
                      type="text"
                      value={editNote}
                      onChange={(e) => setEditNote(e.target.value)}
                      placeholder={lang === "ru" ? "Напр.: потоковая лекция" : "E.g. combined lecture"}
                      className="w-full rounded-xl bg-[var(--bg-page)] border border-[var(--border-color)] px-3 py-2 text-xs"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  disabled={busyId === selectedEditClass.id}
                  onClick={() => void handleSaveSchedule(selectedEditClass.id)}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#0D1B2A] dark:bg-[#1B4B8A] text-white text-xs font-semibold hover:opacity-95"
                >
                  {lang === "ru" ? "Сохранить и уведомить группу" : "Save & Notify Group"}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === "staff_broadcast") {
    const templates =
      lang === "ru"
        ? [
            {
              label: "Сессия и допуски",
              title: "Открыт приём заявлений на досрочную сдачу и пересдачи",
              body: "Оформите электронное направление в разделе «Заявки и справки» до 30 ноября. Бумажный обходной лист не требуется.",
              cat: "deadline" as const,
              urgent: true,
            },
            {
              label: "Переход в онлайн",
              title: "Профилактика корпуса: часть семинаров переведена онлайн",
              body: "Проверьте актуальные ссылки в разделе «Расписание». Изменения уже отмечены синим бейджем «Онлайн-формат».",
              cat: "schedule" as const,
              urgent: false,
            },
            {
              label: "Стажировки",
              title: "Стартовал отбор на весенние дипломатические стажировки",
              body: "Кандидатам со средним баллом от 4.2 достаточно прикрепить цифровую выписку оценок с QR-кодом.",
              cat: "dean_news" as const,
              urgent: false,
            },
          ]
        : [
            {
              label: "Exams & Permits",
              title: "Retake & early exam permits now open online",
              body: "Submit your digital permit request under Requests & Docs before November 30.",
              cat: "deadline" as const,
              urgent: true,
            },
            {
              label: "Online Switch",
              title: "Campus maintenance: selected seminars moved online",
              body: "Check your updated webinar links inside the Schedule calendar.",
              cat: "schedule" as const,
              urgent: false,
            },
            {
              label: "Internships",
              title: "Spring Diplomatic Internships now accepting transcripts",
              body: "Students with GPA ≥ 4.2 can attach their digital QR transcript directly.",
              cat: "dean_news" as const,
              urgent: false,
            },
          ];

    return (
      <div className="grid lg:grid-cols-12 gap-5">
        <form
          onSubmit={handleBroadcast}
          className="stagger-item lg:col-span-7 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-color)] p-4 sm:p-6 space-y-4 min-w-0"
        >
          <div>
            <MaskedTextReveal
              text={t.navStaffBroadcast}
              as="h2"
              className="font-serif text-2xl sm:text-3xl font-semibold"
            />
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              {lang === "ru"
                ? "Выберите готовый шаблон или напишите объявление с мгновенной доставкой."
                : "Pick a quick template or compose a live announcement."}
            </p>
          </div>

          {/* 1-Tap Broadcast Templates */}
          <div className="flex flex-wrap gap-1.5">
            {templates.map((tpl) => (
              <button
                key={tpl.label}
                type="button"
                onClick={() => {
                  setBcTitle(tpl.title);
                  setBcBody(tpl.body);
                  setBcCategory(tpl.cat);
                  setBcUrgent(tpl.urgent);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--bg-page)] border border-[var(--border-color)] hover:border-[var(--accent)] text-[11px] font-medium transition-colors"
              >
                <Sparkles className="w-3 h-3 text-[#C49A45]" />
                {tpl.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1">
                {lang === "ru" ? "Получатели" : "Recipients"}
              </label>
              <select
                value={bcGroup}
                onChange={(e) => setBcGroup(e.target.value)}
                className="w-full rounded-xl bg-[var(--bg-page)] border border-[var(--border-color)] px-3 py-2 text-xs"
              >
                <option value="ALL">{lang === "ru" ? "Все студенты" : "All Students"}</option>
                <option value="МО-304">МО-304</option>
                <option value="МП-207">МП-207</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1">
                {lang === "ru" ? "Категория" : "Category"}
              </label>
              <select
                value={bcCategory}
                onChange={(e) =>
                  setBcCategory(e.target.value as "dean_news" | "deadline" | "schedule")
                }
                className="w-full rounded-xl bg-[var(--bg-page)] border border-[var(--border-color)] px-3 py-2 text-xs"
              >
                <option value="dean_news">{lang === "ru" ? "Новости деканата" : "Dean News"}</option>
                <option value="deadline">{lang === "ru" ? "Дедлайн" : "Deadline"}</option>
                <option value="schedule">{lang === "ru" ? "Расписание" : "Schedule"}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1">
              {lang === "ru" ? "Заголовок" : "Title"}
            </label>
            <input
              type="text"
              required
              value={bcTitle}
              onChange={(e) => setBcTitle(e.target.value)}
              placeholder={
                lang === "ru"
                  ? "Напр.: Продлён приём документов на повышенную стипендию"
                  : "E.g. Merit scholarship deadline extended"
              }
              className="w-full rounded-xl bg-[var(--bg-page)] border border-[var(--border-color)] px-3 py-2.5 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1">
              {lang === "ru" ? "Текст объявления" : "Message"}
            </label>
            <textarea
              required
              rows={3}
              value={bcBody}
              onChange={(e) => setBcBody(e.target.value)}
              placeholder={
                lang === "ru"
                  ? "Подробности, сроки и кнопка действия для студентов..."
                  : "Details, deadlines, and instructions..."
              }
              className="w-full rounded-xl bg-[var(--bg-page)] border border-[var(--border-color)] px-3 py-2.5 text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={bcUrgent}
                onChange={(e) => setBcUrgent(e.target.checked)}
                className="rounded"
              />
              <span>
                {lang === "ru"
                  ? "Срочное уведомление"
                  : "Mark as urgent"}
              </span>
            </label>

            <button
              type="submit"
              disabled={bcSending}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#0D1B2A] dark:bg-[#1B4B8A] text-white text-xs font-semibold"
            >
              <Send className="w-4 h-4" />
              {lang === "ru" ? "Опубликовать объявление" : "Publish Announcement"}
            </button>
          </div>
        </form>

        {/* Student Roster & Academic Risk Radar */}
        <div className="stagger-item lg:col-span-5 space-y-4 min-w-0">
          <div className="rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-color)] p-4 sm:p-5 space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-[var(--accent)]" />
              {lang === "ru" ? "Радар контингента" : "Student Risk & Merit Radar"}
            </h3>
            {students.map((stu) => {
              const isRisk = (stu.profile?.gpa ?? 5) < 4.1;
              return (
                <div
                  key={stu.id}
                  className={`rounded-2xl p-3.5 border ${
                    isRisk
                      ? "bg-rose-500/5 border-rose-500/30"
                      : "bg-[var(--bg-page)] border-[var(--border-color)]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold truncate">
                      {lang === "ru" ? stu.fullName : stu.fullNameEn}
                    </p>
                    <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-[var(--bg-subtle)] shrink-0">
                      {stu.profile?.groupCode}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    {lang === "ru" ? stu.profile?.faculty : stu.profile?.facultyEn}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <span className="font-mono font-semibold">
                      GPA {stu.profile?.gpa} · {stu.profile?.attendancePct}%
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold ${
                        isRisk
                          ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                          : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                      }`}
                    >
                      {isRisk ? (
                        <AlertTriangle className="w-3 h-3" />
                      ) : (
                        <Award className="w-3 h-3" />
                      )}
                      {lang === "ru"
                        ? stu.profile?.scholarshipStatus
                        : stu.profile?.scholarshipStatusEn}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Default Staff Tab: Dean Command Center + Requests Queue
  const bookedAppointments = useMemo(
    () =>
      requests
        .filter((r) => r.appointmentSlot && r.queueTicket && r.status !== "rejected")
        .sort((a, b) =>
          (a.appointmentSlot ?? "").localeCompare(b.appointmentSlot ?? "")
        ),
    [requests]
  );

  const quickReplies =
    lang === "ru"
      ? [
          "Подписано ЭЦП деканата",
          "Готово к выдаче в каб. 214",
          "Уточните назначение справки",
        ]
      : [
          "Digitally signed by Dean's Office",
          "Ready for pickup in Rm. 214",
          "Please clarify certificate purpose",
        ];

  return (
    <div className="space-y-5">
      {/* Command Center Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-widest text-[var(--accent)]">
            {lang === "ru"
              ? "Единый пульт специалиста деканата"
              : "Unified Dean's Office Command Center"}
          </p>
          <WelcomeKineticTitle
            className="font-serif text-2xl sm:text-4xl font-semibold tracking-tight mt-1"
            greeting={lang === "ru" ? "Очередь," : "Queue,"}
            name={lang === "ru" ? "Деканат" : "Dean's Office"}
          />
        </div>
      </div>

      {/* Live Telemetry KPI Strip (2x2 on Mobile, 4x1 on Desktop) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="stagger-item rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] p-3.5 sm:p-4">
          <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
            <span>{lang === "ru" ? "В очереди" : "Pending"}</span>
            {queueStats.pending > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            )}
          </div>
          <p className="text-2xl font-bold font-mono mt-1 text-amber-600 dark:text-amber-400">
            <RollingCounter value={queueStats.pending} />
          </p>
        </div>

        <div className="stagger-item rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] p-3.5 sm:p-4">
          <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
            <span>{lang === "ru" ? "Выдано PDF" : "Issued PDF"}</span>
            <FileCheck2 className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold font-mono mt-1">
            <RollingCounter value={queueStats.ready} />
          </p>
        </div>

        <div className="stagger-item rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] p-3.5 sm:p-4">
          <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
            <span>{lang === "ru" ? "Правки пар" : "Class Edits"}</span>
            <CalendarCog className="w-3.5 h-3.5 text-[var(--accent)]" />
          </div>
          <p className="text-2xl font-bold font-mono mt-1">
            <RollingCounter value={queueStats.changedClasses} />
          </p>
        </div>

        <div className="stagger-item rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] p-3.5 sm:p-4">
          <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
            <span>{lang === "ru" ? "Средний GPA" : "Avg GPA"}</span>
            <Award className="w-3.5 h-3.5 text-[#C49A45]" />
          </div>
          <p className="text-2xl font-bold font-mono mt-1">
            <RollingCounter value={queueStats.avgGpa} decimals={2} />
          </p>
        </div>
      </div>

      {/* Booked 10-Min Queue Appointments in Rm. 214 */}
      {bookedAppointments.length > 0 && (
        <div className="stagger-item rounded-3xl bg-[var(--bg-surface)] border border-amber-500/35 p-4 sm:p-5 space-y-3 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Ticket className="w-4 h-4 text-[#C49A45]" />
              {lang === "ru"
                ? "Запись по талонам в каб. 214 · Слоты сегодня"
                : "Booked 10-Min Office Visits · Rm. 214 Today"}
            </h2>
            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-200 font-semibold">
              {bookedAppointments.length}{" "}
              {lang === "ru" ? "визит(а)" : "booked"}
            </span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {bookedAppointments.map((app) => (
              <div
                key={app.id}
                className="rounded-2xl bg-[var(--bg-page)] border border-[var(--border-color)] p-3 text-xs space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-bold text-[#0D1B2A] dark:text-[#0D1B2A] bg-[#DFB863] px-2 py-0.5 rounded-md">
                    {app.appointmentSlot} · {app.queueTicket}
                  </span>
                  <span className="text-[10px] font-mono text-[var(--text-secondary)]">
                    {app.groupCode}
                  </span>
                </div>
                <p className="font-semibold truncate">{app.studentName}</p>
                <p className="text-[11px] text-[var(--text-secondary)] truncate">
                  {lang === "ru" ? app.title : app.titleEn}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mobile-Friendly Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
          {(["all", "submitted", "in_review", "ready", "rejected"] as const).map(
            (st) => {
              const count =
                st === "all"
                  ? requests.length
                  : requests.filter((r) => r.status === st).length;
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => setFilterStatus(st)}
                  className={`whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                    filterStatus === st
                      ? "bg-[#0D1B2A] dark:bg-[#1B4B8A] text-white border-transparent"
                      : "bg-[var(--bg-surface)] border-[var(--border-color)]"
                  }`}
                >
                  {st === "all"
                    ? lang === "ru"
                      ? `Все (${count})`
                      : `All (${count})`
                    : `${t.reqStatusLabels[st]} (${count})`}
                </button>
              );
            }
          )}
        </div>

        <div className="relative sm:w-64">
          <Search className="w-3.5 h-3.5 text-[var(--text-secondary)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={queueSearch}
            onChange={(e) => setQueueSearch(e.target.value)}
            placeholder={
              lang === "ru" ? "Студент, группа, код..." : "Student, group, code..."
            }
            className="w-full rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] pl-8 pr-3 py-2 text-xs outline-none focus:ring-1 focus:ring-[var(--accent)]"
          />
        </div>
      </div>

      {/* Request Queue Cards */}
      <div ref={staffQueueListRef} className="grid gap-3.5">
        {filteredRequests.length === 0 ? (
          <div className="rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-color)] p-8 text-center text-sm text-[var(--text-secondary)]">
            {lang === "ru"
              ? "Заявок по этому фильтру нет."
              : "No requests match this filter."}
          </div>
        ) : (
          filteredRequests.map((req) => (
            <div
              key={req.id}
              className="staff-req-card stagger-item rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] p-4 sm:p-5 space-y-3 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono text-[var(--text-secondary)]">
                    <span className="px-2 py-0.5 rounded-md bg-[var(--bg-page)] border border-[var(--border-color)]">
                      {req.verificationCode}
                    </span>
                    <span className="font-semibold text-[var(--text-primary)]">
                      {req.studentName}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-[#1B4B8A]/10 text-[var(--accent)] font-semibold">
                      {req.groupCode}
                    </span>
                    {req.queueTicket && req.appointmentSlot && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-800 dark:text-amber-200 font-semibold">
                        {req.queueTicket} · {req.appointmentSlot}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm sm:text-base font-semibold mt-1.5">
                    {lang === "ru" ? req.title : req.titleEn}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    {req.purpose}
                  </p>
                </div>
                <span
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0 ${
                    req.status === "ready"
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                      : req.status === "rejected"
                        ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                        : req.status === "in_review"
                          ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                          : "bg-blue-500/15 text-blue-700 dark:text-blue-300"
                  }`}
                >
                  {t.reqStatusLabels[req.status]}
                </span>
              </div>

              {/* 1-Tap Quick Reply Chips for Mobile Speed */}
              <div className="flex flex-wrap gap-1.5">
                {quickReplies.map((qr) => (
                  <button
                    key={qr}
                    type="button"
                    onClick={() =>
                      setCommentById((prev) => ({ ...prev, [req.id]: qr }))
                    }
                    className="text-[10px] px-2.5 py-1 rounded-full bg-[var(--bg-page)] border border-[var(--border-color)] hover:border-[var(--accent)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    + {qr}
                  </button>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5 pt-2 border-t border-[var(--border-color)]">
                <input
                  type="text"
                  value={commentById[req.id] ?? req.staffComment ?? ""}
                  onChange={(e) =>
                    setCommentById((prev) => ({ ...prev, [req.id]: e.target.value }))
                  }
                  placeholder={
                    lang === "ru"
                      ? "Комментарий для студента..."
                      : "Comment for student..."
                  }
                  className="flex-1 rounded-xl bg-[var(--bg-page)] border border-[var(--border-color)] px-3 py-2 text-xs"
                />
                <div className="grid grid-cols-3 sm:flex gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    disabled={busyId === req.id}
                    onClick={() => void handleUpdateRequest(req.id, "in_review")}
                    className="inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl bg-amber-500/15 text-amber-800 dark:text-amber-200 text-[11px] sm:text-xs font-semibold hover:opacity-85"
                  >
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">
                      {lang === "ru" ? "В работу" : "Review"}
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={busyId === req.id}
                    onClick={() => void handleUpdateRequest(req.id, "ready")}
                    className="inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl bg-emerald-600 text-white text-[11px] sm:text-xs font-semibold hover:opacity-90"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">
                      {lang === "ru" ? "Одобрить" : "Approve"}
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={busyId === req.id}
                    onClick={() => void handleUpdateRequest(req.id, "rejected")}
                    className="inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl bg-rose-500/15 text-rose-700 dark:text-rose-300 text-[11px] sm:text-xs font-semibold hover:opacity-85"
                  >
                    <XCircle className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">
                      {lang === "ru" ? "Отклонить" : "Reject"}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
