"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Award,
  Bell,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  FileCheck2,
  FileText,
  Globe,
  GraduationCap,
  LayoutDashboard,
  Lock,
  LogOut,
  Menu,
  Moon,
  Plus,
  QrCode,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Sun,
  User as UserIcon,
} from "lucide-react";
import { DICT, type Lang } from "@/lib/i18n";
import type {
  CertificateRequest,
  GradeItem,
  NotificationItem,
  PublicUser,
  RequestTypeCode,
  ScheduleItem,
} from "@/lib/types";
import { BrandEmblem } from "./BrandEmblem";
import { CertificateModal } from "./CertificateModal";
import { CommandAssistantModal } from "./CommandAssistantModal";
import { PremiumCalendar } from "./PremiumCalendar";
import { StaffConsole } from "./StaffConsole";
import { CurveMobileMenu, type NavEntry } from "./effects/CurveMobileMenu";
import { DiplomaticGlobe3D } from "./effects/DiplomaticGlobe3D";
import {
  MaskedTextReveal,
  RollingCounter,
  SectionStage,
  WelcomeKineticTitle,
} from "./effects/KineticText";
import { StudentPass3D } from "./effects/StudentPass3D";

export interface PortalData {
  user: PublicUser;
  storageMode: "postgres" | "local_file";
  schedule: ScheduleItem[];
  grades: GradeItem[];
  requests: CertificateRequest[];
  notifications: NotificationItem[];
  students: PublicUser[];
}

interface PortalWorkspaceProps {
  data: PortalData;
  lang: Lang;
  onToggleLang: () => void;
  dark: boolean;
  onToggleDark: (e?: React.MouseEvent) => void;
  onRefresh: () => Promise<void>;
  onLogout: () => void;
}

const REQUEST_OPTIONS: {
  code: RequestTypeCode;
  ru: string;
  en: string;
}[] = [
  { code: "study_cert", ru: "Справка об обучении (ЭЦП + QR)", en: "Enrollment Certificate (QR)" },
  { code: "visa_cert", ru: "Справка для консульства / визы", en: "Consulate / Visa Support" },
  { code: "military_cert", ru: "Справка для военкомата", en: "Military Registration Form" },
  { code: "retake_permit", ru: "Направление на пересдачу", en: "Exam Retake Permit" },
  { code: "transcript", ru: "Выписка оценок (Transcript)", en: "Official Academic Transcript" },
  { code: "custom_appeal", ru: "Свободное обращение в деканат", en: "Custom Dean's Office Appeal" },
];

export function PortalWorkspace({
  data,
  lang,
  onToggleLang,
  dark,
  onToggleDark,
  onRefresh,
  onLogout,
}: PortalWorkspaceProps) {
  const t = DICT[lang];
  const { user, schedule, grades, requests, notifications, students, storageMode } = data;
  const isStaff = user.role === "staff";

  const [activeTab, setActiveTab] = useState<string>(
    isStaff ? "staff_queue" : "overview"
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [certPreview, setCertPreview] = useState<CertificateRequest | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Request creation form
  const [showNewReqForm, setShowNewReqForm] = useState(false);
  const [reqType, setReqType] = useState<RequestTypeCode>("study_cert");
  const [reqPurpose, setReqPurpose] = useState("");
  const [reqDelivery, setReqDelivery] = useState<"digital_pdf" | "paper_pickup">(
    "digital_pdf"
  );
  const [submittingReq, setSubmittingReq] = useState(false);

  // Notifications filter
  const [notifFilter, setNotifFilter] = useState<"all" | "urgent">("all");

  // Student requests filter
  const [stuReqFilter, setStuReqFilter] = useState<string>("all");

  // IDOR Security check output
  const [idorTestResult, setIdorTestResult] = useState<{
    status: number;
    body: string;
  } | null>(null);
  const [idorTesting, setIdorTesting] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setAssistantOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.readBy.includes(user.id)).length,
    [notifications, user.id]
  );

  const navItems: NavEntry[] = useMemo(() => {
    if (isStaff) {
      const pending = requests.filter(
        (r) => r.status === "submitted" || r.status === "in_review"
      ).length;
      return [
        { id: "staff_queue", label: t.navStaffQueue, badge: pending || undefined },
        { id: "staff_schedule", label: t.navStaffSchedule },
        { id: "staff_broadcast", label: t.navStaffBroadcast },
        { id: "notifications", label: t.navNotifications, badge: unreadCount || undefined },
        { id: "profile", label: t.navProfile },
      ];
    }
    return [
      { id: "overview", label: t.navOverview },
      { id: "schedule", label: t.navSchedule },
      { id: "academics", label: t.navAcademics },
      { id: "requests", label: t.navRequests, badge: requests.length || undefined },
      { id: "notifications", label: t.navNotifications, badge: unreadCount || undefined },
      { id: "profile", label: t.navProfile },
    ];
  }, [isStaff, t, requests, unreadCount]);

  const scheduleChangesCount = useMemo(
    () => schedule.filter((s) => s.status !== "normal").length,
    [schedule]
  );

  const retakesNeeded = useMemo(
    () => grades.filter((g) => g.status === "retake_needed"),
    [grades]
  );

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingReq(true);
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          typeCode: reqType,
          purpose: reqPurpose,
          deliveryFormat: reqDelivery,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        showToast(json.error || "Ошибка отправки");
        return;
      }
      setReqPurpose("");
      setShowNewReqForm(false);
      await onRefresh();
      showToast(
        lang === "ru"
          ? "Заявка принята и направлена в деканат"
          : "Request submitted to Dean's Office"
      );
    } finally {
      setSubmittingReq(false);
    }
  };

  const handleMarkRead = async (id: string) => {
    await fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await onRefresh();
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter((n) => !n.readBy.includes(user.id));
    if (unread.length === 0) return;
    await Promise.all(
      unread.map((n) =>
        fetch("/api/notifications/read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: n.id }),
        })
      )
    );
    await onRefresh();
    showToast(
      lang === "ru" ? "Все уведомления прочитаны" : "All notifications marked read"
    );
  };

  const handleTestIdor = async () => {
    setIdorTesting(true);
    try {
      const targetOtherReq =
        user.id === "stu-volkov" ? "req-k-1" : "req-v-1";
      const res = await fetch(`/api/requests/${targetOtherReq}`);
      const text = await res.text();
      setIdorTestResult({ status: res.status, body: text });
    } finally {
      setIdorTesting(false);
    }
  };

  const renderStatusBadge = (status: ScheduleItem["status"]) => {
    const styles: Record<ScheduleItem["status"], string> = {
      normal: "bg-slate-500/10 text-[var(--text-secondary)]",
      room_changed: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30",
      teacher_replaced: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30",
      online: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30",
      cancelled: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30",
    };
    return (
      <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${styles[status]}`}>
        {t.statusLabels[status]}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] flex flex-col lg:flex-row">
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden lg:flex lg:w-72 lg:flex-col lg:fixed lg:inset-y-0 bg-[var(--bg-surface)] border-r border-[var(--border-color)] p-5 justify-between z-30 isolate">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-[#0D1B2A] text-white">
              <BrandEmblem className="w-7 h-7" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-base leading-none truncate">
                {t.brandTitle}
              </p>
              <p className="text-[11px] text-[var(--text-secondary)] mt-1 truncate">
                {t.brandSubtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setAssistantOpen(true)}
            className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-2xl bg-[var(--bg-page)] border border-[var(--border-color)] hover:border-[var(--accent)] text-xs text-[var(--text-secondary)] transition-colors"
          >
            <span className="flex items-center gap-2 truncate">
              <Search className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
              <span className="truncate">{t.quickFind}</span>
            </span>
            <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-subtle)]">
              ⌘K
            </kbd>
          </button>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-sm font-medium transition-all ${
                    active
                      ? "bg-[#0D1B2A] dark:bg-[#1B4B8A] text-white shadow-sm"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <span className="truncate">{item.label}</span>
                  {item.badge ? (
                    <span
                      className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${
                        active
                          ? "bg-[#C49A45] text-[#0D1B2A] font-bold"
                          : "bg-[var(--bg-subtle)] text-[var(--text-primary)]"
                      }`}
                    >
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="space-y-3 pt-4 border-t border-[var(--border-color)]">
          <div className="rounded-2xl bg-[var(--bg-page)] p-3 border border-[var(--border-color)]">
            <p className="text-xs font-semibold truncate">
              {lang === "ru" ? user.fullName : user.fullNameEn}
            </p>
            <p className="text-[11px] text-[var(--text-secondary)] truncate mt-0.5">
              {isStaff
                ? lang === "ru"
                  ? "Сотрудник деканата"
                  : "Dean's Office Staff"
                : `${user.profile?.groupCode} · ${user.profile?.facultyShort}`}
            </p>
          </div>

          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onToggleLang}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[var(--bg-subtle)] text-xs font-medium"
            >
              <Globe className="w-3.5 h-3.5" />
              {lang === "ru" ? "EN" : "RU"}
            </button>
            <button
              type="button"
              onClick={onToggleDark}
              className="p-2 rounded-xl bg-[var(--bg-subtle)]"
              aria-label="Toggle theme"
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-300 text-xs font-medium"
            >
              <LogOut className="w-3.5 h-3.5" />
              {t.logout}
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN COLUMN */}
      <div className="flex-1 lg:pl-72 flex flex-col min-h-screen pb-24 lg:pb-10">
        {/* Sleek Academic Pulse & Concept Strip */}
        <div className="bg-[#0D1B2A] text-white/90 text-[11px] px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between gap-2 border-b border-[#C49A45]/30">
          <span className="flex items-center gap-2 truncate">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <span className="truncate font-medium">
              {lang === "ru"
                ? "Осенний семестр 2026 · 12-я учебная неделя · До сессии 38 дн."
                : "Fall Semester 2026 · Week 12 · 38 days to finals"}
            </span>
          </span>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 border border-[#C49A45]/35 text-[10px] text-[#F2D593] font-medium shrink-0">
            <Sparkles className="w-3 h-3 text-[#DFB863]" />
            <span>
              {lang === "ru"
                ? "Концепт для конкурса · Демо-данные"
                : "Contest Concept · Demo Data"}
            </span>
          </span>
        </div>

        {/* Mobile Sticky Header */}
        <header className="lg:hidden sticky top-0 z-30 bg-white/80 dark:bg-[#0D192B]/80 backdrop-blur-2xl backdrop-saturate-150 border-b border-slate-200/80 dark:border-white/15 px-4 py-3 flex items-center justify-between gap-2 shadow-sm">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-xl bg-[#0D1B2A] text-white shrink-0">
              <BrandEmblem className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate leading-none">
                {t.brandTitle}
              </p>
              <p className="text-[11px] text-[var(--text-secondary)] truncate mt-0.5">
                {isStaff ? "Staff" : user.profile?.groupCode} ·{" "}
                {lang === "ru"
                  ? user.fullName.split(" ")[0]
                  : user.fullNameEn.split(" ")[0]}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setAssistantOpen(true)}
              className="p-2 rounded-xl bg-slate-100 dark:bg-white/10 text-[#0D1B2A] dark:text-white"
              aria-label="Search"
            >
              <Search className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("notifications")}
              className="relative p-2 rounded-xl bg-slate-100 dark:bg-white/10 text-[#0D1B2A] dark:text-white"
              aria-label={t.navNotifications}
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#C49A45] text-[#0D1B2A] text-[9px] font-bold flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* MAIN CONTENT */}
        <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7">
          <SectionStage tabKey={activeTab}>
          <div className="space-y-6">
          {isStaff &&
          (activeTab === "staff_queue" ||
            activeTab === "staff_schedule" ||
            activeTab === "staff_broadcast") ? (
            <StaffConsole
              activeTab={activeTab}
              lang={lang}
              requests={requests}
              schedule={schedule}
              students={students}
              onRefresh={onRefresh}
              onToast={showToast}
            />
          ) : null}

          {/* === STUDENT OVERVIEW === */}
          {!isStaff && activeTab === "overview" && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-mono uppercase tracking-widest text-[var(--accent)]">
                    {lang === "ru"
                      ? user.profile?.faculty
                      : user.profile?.facultyEn}
                  </p>
                  <WelcomeKineticTitle
                    className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight mt-1"
                    greeting={lang === "ru" ? "Добро пожаловать," : "Welcome back,"}
                    name={
                      lang === "ru"
                        ? user.fullName.split(" ")[1] || user.fullName
                        : user.fullNameEn.split(" ")[0]
                    }
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("requests");
                    setShowNewReqForm(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#0D1B2A] dark:bg-[#1B4B8A] text-white text-xs sm:text-sm font-semibold shadow-sm hover:opacity-95"
                >
                  <Plus className="w-4 h-4" />
                  {t.orderCertBtn}
                </button>
              </div>

              {/* Top Bento Grid */}
              <div className="grid lg:grid-cols-12 gap-5 items-start">
                {/* Left 7 cols: Next Class + Study Health */}
                <div className="lg:col-span-7 space-y-5 min-w-0">
                  {/* Next Class Card */}
                  {schedule[0] && (
                    <div className="stagger-item rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-color)] p-5 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <span className="text-xs font-mono uppercase tracking-wider text-[var(--accent)] font-semibold flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          {t.nextClassLabel} · {t.dayLabels[schedule[0].dayIndex]}
                        </span>
                        {renderStatusBadge(schedule[0].status)}
                      </div>
                      <h2 className="text-lg sm:text-xl font-semibold">
                        {lang === "ru"
                          ? schedule[0].subject
                          : schedule[0].subjectEn}
                      </h2>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-[var(--text-secondary)]">
                        <span className="font-mono font-semibold text-[var(--text-primary)]">
                          {schedule[0].startTime}–{schedule[0].endTime}
                        </span>
                        <span>
                          {schedule[0].room}
                          {schedule[0].originalRoom && (
                            <span className="line-through ml-1.5 opacity-60">
                              {schedule[0].originalRoom}
                            </span>
                          )}
                        </span>
                        <span>{schedule[0].lecturer}</span>
                      </div>
                      {schedule[0].changeNote && (
                        <div className="mt-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 px-3.5 py-2 text-xs text-amber-800 dark:text-amber-200">
                          {lang === "ru"
                            ? schedule[0].changeNote
                            : schedule[0].changeNoteEn}
                        </div>
                      )}
                      <div className="mt-4 pt-3 border-t border-[var(--border-color)] flex items-center justify-between text-xs">
                        <span className="text-[var(--text-secondary)]">
                          {lang === "ru"
                            ? `Изменений на неделе: ${scheduleChangesCount}`
                            : `Weekly changes: ${scheduleChangesCount}`}
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveTab("schedule")}
                          className="font-semibold text-[var(--accent)] hover:underline"
                        >
                          {lang === "ru" ? "Всё расписание →" : "Full schedule →"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Study Health Summary */}
                  <div className="stagger-item rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-color)] p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-semibold flex items-center gap-2">
                        <GraduationCap className="w-5 h-5 text-[var(--accent)]" />
                        {t.studyHealthTitle}
                      </h3>
                      <button
                        type="button"
                        onClick={() => setActiveTab("academics")}
                        className="text-xs font-semibold text-[var(--accent)] hover:underline"
                      >
                        {lang === "ru" ? "Детали →" : "Details →"}
                      </button>
                    </div>

                    {retakesNeeded.length > 0 ? (
                      <div className="rounded-2xl bg-rose-500/10 border border-rose-500/30 p-3.5 flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                        <div className="text-xs">
                          <p className="font-semibold text-rose-700 dark:text-rose-300">
                            {lang === "ru"
                              ? `Требуется пересдача: ${retakesNeeded[0].subject}`
                              : `Retake Required: ${retakesNeeded[0].subjectEn}`}
                          </p>
                          <p className="text-[var(--text-secondary)] mt-0.5">
                            {lang === "ru"
                              ? `Дедлайн: ${retakesNeeded[0].examDate}. Направление можно оформить в разделе «Заявки».`
                              : `Deadline: ${retakesNeeded[0].examDate}. Request your retake permit online.`}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/25 p-3.5 flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <div className="text-xs">
                          <p className="font-semibold text-emerald-800 dark:text-emerald-300">
                            {lang === "ru"
                              ? "Академический статус: все дисциплины в графике"
                              : "Academic Standing: On Track with Honors"}
                          </p>
                          <p className="text-[var(--text-secondary)] mt-0.5">
                            {lang === "ru"
                              ? user.profile?.scholarshipStatus
                              : user.profile?.scholarshipStatusEn}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-2 sm:gap-3">
                      <div className="rounded-2xl bg-[var(--bg-page)] p-2.5 sm:p-3 min-w-0">
                        <p className="text-[10px] sm:text-[11px] text-[var(--text-secondary)] truncate">
                          {t.gpaLabel}
                        </p>
                        <p className="text-lg sm:text-xl font-bold font-mono mt-0.5">
                          <RollingCounter
                            value={user.profile?.gpa ?? 0}
                            decimals={2}
                          />
                        </p>
                      </div>
                      <div className="rounded-2xl bg-[var(--bg-page)] p-2.5 sm:p-3 min-w-0">
                        <p className="text-[10px] sm:text-[11px] text-[var(--text-secondary)] truncate">
                          {t.attendanceLabel}
                        </p>
                        <p className="text-lg sm:text-xl font-bold font-mono mt-0.5">
                          <RollingCounter
                            value={user.profile?.attendancePct ?? 0}
                            suffix="%"
                          />
                        </p>
                      </div>
                      <div className="rounded-2xl bg-[var(--bg-page)] p-2.5 sm:p-3 min-w-0">
                        <p className="text-[10px] sm:text-[11px] text-[var(--text-secondary)] truncate">
                          {t.creditsLabel}
                        </p>
                        <p className="text-lg sm:text-xl font-bold font-mono mt-0.5">
                          <RollingCounter value={user.profile?.creditsEarned ?? 0} />
                          <span className="text-[11px] sm:text-xs font-normal text-[var(--text-secondary)]">
                            /{user.profile?.creditsTotal}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right 5 cols: Interactive 3D Student Pass + Recent Requests */}
                <div className="lg:col-span-5 space-y-5 min-w-0">
                  <div className="stagger-item rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-color)] p-5 shadow-sm flex flex-col items-center">
                    <StudentPass3D
                      user={user}
                      lang={lang}
                      hintText={t.flipPassHint}
                    />
                  </div>

                  <div className="stagger-item rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-color)] p-5 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold flex items-center gap-2">
                        <FileCheck2 className="w-4 h-4 text-[var(--accent)]" />
                        {t.navRequests}
                      </h3>
                      <button
                        type="button"
                        onClick={() => setActiveTab("requests")}
                        className="text-xs font-semibold text-[var(--accent)] hover:underline"
                      >
                        {lang === "ru" ? "Все →" : "All →"}
                      </button>
                    </div>
                    {requests.slice(0, 2).map((req) => (
                      <div
                        key={req.id}
                        className="rounded-2xl bg-[var(--bg-page)] p-3 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-semibold truncate">
                            {lang === "ru" ? req.title : req.titleEn}
                          </p>
                          <p className="text-[11px] text-[var(--text-secondary)] font-mono mt-0.5">
                            {req.verificationCode} · {t.reqStatusLabels[req.status]}
                          </p>
                        </div>
                        {req.status === "ready" && (
                          <button
                            type="button"
                            onClick={() => setCertPreview(req)}
                            className="px-2.5 py-1.5 rounded-xl bg-[var(--accent)] text-white text-[11px] font-semibold shrink-0"
                          >
                            PDF
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Interactive Three.js 3D News, Events & Partner Hackathons Hub */}
              <DiplomaticGlobe3D
                lang={lang}
                onRegisterOrRequest={(eventTitle) => {
                  setActiveTab("requests");
                  setShowNewReqForm(true);
                  setReqType("custom_appeal");
                  setReqPurpose(
                    lang === "ru"
                      ? `Справка об участии / освобождение: ${eventTitle}`
                      : `Participation / Excusal request: ${eventTitle}`
                  );
                }}
              />
            </div>
          )}

          {/* === SCHEDULE TAB (Premium Calendar) === */}
          {!isStaff && activeTab === "schedule" && (
            <PremiumCalendar
              groupCode={user.profile?.groupCode ?? ""}
              schedule={schedule}
              grades={grades}
              lang={lang}
              onAskDeanAboutClass={(subject) => {
                setActiveTab("requests");
                setShowNewReqForm(true);
                setReqType("custom_appeal");
                setReqPurpose(
                  lang === "ru"
                    ? `Вопрос по дисциплине «${subject}»`
                    : `Inquiry regarding "${subject}"`
                );
              }}
            />
          )}

          {/* === ACADEMICS TAB === */}
          {!isStaff && activeTab === "academics" && (
            <div className="space-y-5">
              <div>
                <MaskedTextReveal
                  text={t.navAcademics}
                  as="h2"
                  className="font-serif text-2xl sm:text-3xl font-semibold"
                />
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  {t.studyHealthTitle} · {user.profile?.program}
                </p>
              </div>

              {/* KPI Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="stagger-item rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] p-4">
                  <p className="text-xs text-[var(--text-secondary)]">{t.gpaLabel}</p>
                  <p className="text-2xl font-bold font-mono mt-1">
                    <RollingCounter value={user.profile?.gpa ?? 0} decimals={2} />
                  </p>
                </div>
                <div className="stagger-item rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] p-4">
                  <p className="text-xs text-[var(--text-secondary)]">{t.creditsLabel}</p>
                  <p className="text-2xl font-bold font-mono mt-1">
                    <RollingCounter value={user.profile?.creditsEarned ?? 0} />/
                    {user.profile?.creditsTotal}
                  </p>
                </div>
                <div className="stagger-item rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] p-4">
                  <p className="text-xs text-[var(--text-secondary)]">{t.attendanceLabel}</p>
                  <p className="text-2xl font-bold font-mono mt-1">
                    <RollingCounter
                      value={user.profile?.attendancePct ?? 0}
                      suffix="%"
                    />
                  </p>
                </div>
                <div className="stagger-item rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] p-4">
                  <p className="text-xs text-[var(--text-secondary)]">{t.scholarshipLabel}</p>
                  <p className="text-xs font-semibold mt-2 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-[#C49A45] shrink-0" />
                    <span>
                      {lang === "ru"
                        ? user.profile?.scholarshipStatus
                        : user.profile?.scholarshipStatusEn}
                    </span>
                  </p>
                </div>
              </div>

              <div className="grid gap-3">
                {grades.map((g) => (
                  <div
                    key={g.id}
                    className={`stagger-item rounded-2xl bg-[var(--bg-surface)] border p-4 sm:p-5 ${
                      g.status === "retake_needed"
                        ? "border-rose-500/40"
                        : "border-[var(--border-color)]"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-[11px] font-mono text-[var(--text-secondary)]">
                          <span>
                            {g.semester} {lang === "ru" ? "семестр" : "semester"}
                          </span>
                          <span>·</span>
                          <span>{g.credits} з.е.</span>
                          {g.examDate && (
                            <>
                              <span>·</span>
                              <span className="text-[var(--accent)] font-semibold">
                                {g.examDate}
                              </span>
                            </>
                          )}
                        </div>
                        <h3 className="text-base font-semibold mt-1">
                          {lang === "ru" ? g.subject : g.subjectEn}
                        </h3>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                          {g.lecturer}
                        </p>
                      </div>

                      <div className="w-full sm:w-auto flex flex-row sm:flex-col items-center sm:items-end justify-between gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--border-color)]">
                        <span
                          className={`inline-block text-xs font-semibold px-3 py-1 rounded-full ${
                            g.status === "retake_needed"
                              ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                              : g.status === "upcoming"
                                ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                                : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                          }`}
                        >
                          {lang === "ru" ? g.gradeLabel : g.gradeLabelEn}
                        </span>
                        {g.score100 !== null && (
                          <div className="sm:mt-1 flex items-center justify-end gap-2">
                            <div className="w-24 h-1.5 rounded-full bg-[var(--bg-subtle)] overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  g.status === "retake_needed"
                                    ? "bg-rose-500"
                                    : "bg-[var(--accent)]"
                                }`}
                                style={{ width: `${g.score100}%` }}
                              />
                            </div>
                            <span className="text-[11px] font-mono">
                              {g.score100}/100
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* === REQUESTS & CERTIFICATES TAB === */}
          {!isStaff && activeTab === "requests" && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <MaskedTextReveal
                    text={t.navRequests}
                    as="h2"
                    className="font-serif text-2xl sm:text-3xl font-semibold"
                  />
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    {lang === "ru"
                      ? "Оформление без очередей. Готовые справки содержат ЭЦП и QR-код."
                      : "Queue-free online requests. Approved certificates include a verifiable QR PDF."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNewReqForm((v) => !v)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-[#0D1B2A] dark:bg-[#1B4B8A] text-white text-xs sm:text-sm font-semibold"
                >
                  <Plus className="w-4 h-4" />
                  {t.orderCertBtn}
                </button>
              </div>

              {/* Student Request Status Filter Pills */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {(["all", "submitted", "in_review", "ready"] as const).map(
                  (st) => {
                    const cnt =
                      st === "all"
                        ? requests.length
                        : requests.filter((r) => r.status === st).length;
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setStuReqFilter(st)}
                        className={`whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                          stuReqFilter === st
                            ? "bg-[#0D1B2A] dark:bg-[#1B4B8A] text-white border-transparent"
                            : "bg-[var(--bg-surface)] border-[var(--border-color)]"
                        }`}
                      >
                        {st === "all"
                          ? lang === "ru"
                            ? `Все (${cnt})`
                            : `All (${cnt})`
                          : `${t.reqStatusLabels[st]} (${cnt})`}
                      </button>
                    );
                  }
                )}
              </div>

              {showNewReqForm && (
                <form
                  onSubmit={handleSubmitRequest}
                  className="rounded-3xl bg-[var(--bg-surface)] border border-[var(--accent)]/40 p-5 space-y-4 shadow-sm"
                >
                  <h3 className="text-base font-semibold">{t.submitRequestTitle}</h3>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-[var(--text-secondary)] mb-1">
                        {lang === "ru" ? "Тип документа / заявления" : "Request Type"}
                      </label>
                      <select
                        value={reqType}
                        onChange={(e) => setReqType(e.target.value as RequestTypeCode)}
                        className="w-full rounded-xl bg-[var(--bg-page)] border border-[var(--border-color)] px-3 py-2.5 text-xs sm:text-sm"
                      >
                        {REQUEST_OPTIONS.map((opt) => (
                          <option key={opt.code} value={opt.code}>
                            {lang === "ru" ? opt.ru : opt.en}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-[var(--text-secondary)] mb-1">
                        {lang === "ru" ? "Формат получения" : "Delivery Format"}
                      </label>
                      <select
                        value={reqDelivery}
                        onChange={(e) =>
                          setReqDelivery(
                            e.target.value as "digital_pdf" | "paper_pickup"
                          )
                        }
                        className="w-full rounded-xl bg-[var(--bg-page)] border border-[var(--border-color)] px-3 py-2.5 text-xs sm:text-sm"
                      >
                        <option value="digital_pdf">{t.deliveryDigital}</option>
                        <option value="paper_pickup">{t.deliveryPaper}</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-[var(--text-secondary)] mb-1">
                      {lang === "ru" ? "Куда предъявляется / комментарий" : "Purpose / Details"}
                    </label>
                    <input
                      type="text"
                      required
                      minLength={3}
                      maxLength={300}
                      value={reqPurpose}
                      onChange={(e) => setReqPurpose(e.target.value)}
                      placeholder={t.purposePlaceholder}
                      className="w-full rounded-xl bg-[var(--bg-page)] border border-[var(--border-color)] px-3.5 py-2.5 text-sm"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowNewReqForm(false)}
                      className="px-4 py-2 rounded-xl bg-[var(--bg-subtle)] text-xs font-medium"
                    >
                      {lang === "ru" ? "Отмена" : "Cancel"}
                    </button>
                    <button
                      type="submit"
                      disabled={submittingReq}
                      className="px-5 py-2 rounded-xl bg-[var(--accent)] text-white text-xs font-semibold"
                    >
                      {t.sendRequestBtn}
                    </button>
                  </div>
                </form>
              )}

              <div className="grid gap-3.5">
                {requests
                  .filter((r) =>
                    stuReqFilter === "all" ? true : r.status === stuReqFilter
                  )
                  .map((req) => (
                  <div
                    key={req.id}
                    className="stagger-item rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] p-4 sm:p-5 space-y-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-[11px] font-mono text-[var(--text-secondary)]">
                          <span>{req.verificationCode}</span>
                          <span>·</span>
                          <span>
                            {new Date(req.createdAt).toLocaleDateString(
                              lang === "ru" ? "ru-RU" : "en-US"
                            )}
                          </span>
                        </div>
                        <h3 className="text-base font-semibold mt-1">
                          {lang === "ru" ? req.title : req.titleEn}
                        </h3>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                          {req.purpose}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-semibold px-3 py-1 rounded-full ${
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
                        {req.status === "ready" && (
                          <button
                            type="button"
                            onClick={() => setCertPreview(req)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0D1B2A] dark:bg-[#1B4B8A] text-white text-xs font-semibold"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            {t.openCertificateBtn}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Visual 3-step pipeline */}
                    <div className="grid grid-cols-3 gap-2 pt-2">
                      {(["submitted", "in_review", "ready"] as const).map((step, i) => {
                        const order = {
                          submitted: 0,
                          in_review: 1,
                          ready: 2,
                          rejected: 1,
                        }[req.status];
                        const reached = req.status !== "rejected" && order >= i;
                        return (
                          <div key={step} className="space-y-1">
                            <div
                              className={`h-1.5 rounded-full ${
                                req.status === "rejected" && i === 1
                                  ? "bg-rose-500"
                                  : reached
                                    ? "bg-emerald-500"
                                    : "bg-[var(--bg-subtle)]"
                              }`}
                            />
                            <p className="text-[10px] text-[var(--text-secondary)]">
                              {t.reqStatusLabels[step]}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    {req.staffComment && (
                      <p className="text-xs rounded-xl bg-[var(--bg-page)] px-3 py-2 text-[var(--text-secondary)]">
                        {req.staffComment}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* === NOTIFICATIONS TAB === */}
          {activeTab === "notifications" && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <MaskedTextReveal
                  text={t.navNotifications}
                  as="h2"
                  className="font-serif text-2xl sm:text-3xl font-semibold"
                />
                <div className="flex flex-wrap gap-2">
                  {(["all", "urgent"] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setNotifFilter(f)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border ${
                        notifFilter === f
                          ? "bg-[var(--accent)] text-white border-transparent"
                          : "bg-[var(--bg-surface)] border-[var(--border-color)]"
                      }`}
                    >
                      {f === "all"
                        ? lang === "ru"
                          ? "Все"
                          : "All"
                        : lang === "ru"
                          ? "Срочные"
                          : "Urgent"}
                    </button>
                  ))}
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={() => void handleMarkAllRead()}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--bg-subtle)] hover:bg-[var(--accent)] hover:text-white transition-colors"
                    >
                      {lang === "ru" ? "Прочитать все" : "Mark all read"}
                    </button>
                  )}
                </div>
              </div>

              <div className="grid gap-3">
                {notifications
                  .filter((n) => (notifFilter === "urgent" ? n.urgent : true))
                  .map((n) => {
                    const isRead = n.readBy.includes(user.id);
                    return (
                      <div
                        key={n.id}
                        className={`stagger-item rounded-2xl bg-[var(--bg-surface)] border p-4 sm:p-5 transition-all ${
                          n.urgent && !isRead
                            ? "border-amber-500/50"
                            : "border-[var(--border-color)]"
                        } ${isRead ? "opacity-80" : ""}`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 text-[11px] font-mono text-[var(--text-secondary)]">
                              {n.urgent && (
                                <span className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-300 font-semibold">
                                  {lang === "ru" ? "ВАЖНО" : "URGENT"}
                                </span>
                              )}
                              <span>
                                {new Date(n.createdAt).toLocaleString(
                                  lang === "ru" ? "ru-RU" : "en-US",
                                  {
                                    day: "2-digit",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }
                                )}
                              </span>
                            </div>
                            <h3 className="text-sm sm:text-base font-semibold">
                              {lang === "ru" ? n.title : n.titleEn}
                            </h3>
                            <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
                              {lang === "ru" ? n.body : n.bodyEn}
                            </p>
                          </div>

                          {!isRead && (
                            <button
                              type="button"
                              onClick={() => void handleMarkRead(n.id)}
                              className="px-3 py-1.5 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--accent)] hover:text-white text-xs font-medium shrink-0 transition-colors"
                            >
                              {t.markRead}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* === PROFILE & SECURITY TAB === */}
          {activeTab === "profile" && (
            <div className="grid lg:grid-cols-12 gap-5">
              <div className="stagger-item lg:col-span-7 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-color)] p-5 sm:p-6 space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <UserIcon className="w-5 h-5 text-[var(--accent)]" />
                  {lang === "ru" ? "Профиль и учебные данные" : "Profile & Academic Record"}
                </h2>

                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  {[
                    {
                      k: lang === "ru" ? "ФИО" : "Full Name",
                      v: lang === "ru" ? user.fullName : user.fullNameEn,
                    },
                    {
                      k: lang === "ru" ? "Логин" : "Username",
                      v: user.username,
                    },
                    {
                      k: "Email",
                      v: user.email,
                    },
                    {
                      k: lang === "ru" ? "Роль" : "Role",
                      v: isStaff
                        ? lang === "ru"
                          ? "Сотрудник деканата"
                          : "Dean's Office Staff"
                        : lang === "ru"
                          ? "Студент"
                          : "Student",
                    },
                    ...(user.profile
                      ? [
                          {
                            k: lang === "ru" ? "Факультет" : "Faculty",
                            v: lang === "ru" ? user.profile.faculty : user.profile.facultyEn,
                          },
                          {
                            k: lang === "ru" ? "Направление" : "Program",
                            v: lang === "ru" ? user.profile.program : user.profile.programEn,
                          },
                          {
                            k: lang === "ru" ? "Курс / Группа" : "Year / Group",
                            v: `${user.profile.course} / ${user.profile.groupCode}`,
                          },
                          {
                            k: lang === "ru" ? "Студенческий билет" : "Student ID",
                            v: user.profile.studentCardNo,
                          },
                        ]
                      : [
                          {
                            k: lang === "ru" ? "Подразделение" : "Department",
                            v: lang === "ru" ? user.department || "" : user.departmentEn || "",
                          },
                        ]),
                  ].map((row) => (
                    <div
                      key={row.k}
                      className="rounded-2xl bg-[var(--bg-page)] p-3 border border-[var(--border-color)]"
                    >
                      <p className="text-[11px] text-[var(--text-secondary)]">{row.k}</p>
                      <p className="font-medium mt-0.5 break-words">{row.v}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Security & Live IDOR Verification Panel */}
              <div className="stagger-item lg:col-span-5 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-color)] p-5 sm:p-6 space-y-4">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="w-5 h-5" />
                  <h3 className="text-base font-semibold">
                    {lang === "ru" ? "Защита данных и архитектура" : "Security & Data Isolation"}
                  </h3>
                </div>

                <ul className="space-y-2 text-xs text-[var(--text-secondary)]">
                  <li className="flex items-start gap-2">
                    <Lock className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
                    <span>
                      {lang === "ru"
                        ? "Пароли хранятся в хешированном виде (scrypt + уникальная 16-байтовая соль + timingSafeEqual)."
                        : "Passwords stored as salted scrypt hashes with constant-time verification."}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
                    <span>
                      {lang === "ru"
                        ? "Сессия защищена httpOnly HMAC-SHA256 cookie. Ключи не попадают в браузер."
                        : "Sessions use httpOnly HMAC-SHA256 cookies. Secrets never reach the browser."}
                    </span>
                  </li>
                </ul>

                {!isStaff && (
                  <div className="pt-3 border-t border-[var(--border-color)] space-y-2.5">
                    <p className="text-xs font-semibold">{t.securityTestTitle}</p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {t.securityTestDesc}
                    </p>
                    <button
                      type="button"
                      disabled={idorTesting}
                      onClick={() => void handleTestIdor()}
                      className="w-full py-2.5 px-4 rounded-xl bg-[#0D1B2A] dark:bg-[#1B4B8A] text-white text-xs font-semibold"
                    >
                      {idorTesting ? "..." : t.securityTestBtn}
                    </button>
                    {idorTestResult && (
                      <div className="rounded-xl bg-[#0D1B2A] text-emerald-300 p-3 font-mono text-[11px] overflow-x-auto">
                        <div>HTTP {idorTestResult.status} Forbidden</div>
                        <div className="text-white/80 mt-1 break-all">
                          {idorTestResult.body}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
          </div>
          </SectionStage>
        </main>
      </div>

      {/* MOBILE FROSTED GLASS BOTTOM DOCK (360px+) */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/75 dark:bg-[#0B1726]/75 backdrop-blur-2xl backdrop-saturate-150 border-t border-slate-200/80 dark:border-white/15 shadow-[0_-8px_28px_rgba(13,27,42,0.14)] dark:shadow-[0_-8px_28px_rgba(0,0,0,0.5)] px-1.5 py-1.5 flex items-center justify-around">
        {navItems.slice(0, 4).map((item) => {
          const active = activeTab === item.id;
          const Icon =
            item.id === "overview" || item.id === "staff_queue"
              ? LayoutDashboard
              : item.id === "schedule" || item.id === "staff_schedule"
                ? Calendar
                : item.id === "academics"
                  ? GraduationCap
                  : item.id === "requests"
                    ? FileText
                    : item.id === "staff_broadcast"
                      ? Send
                      : Bell;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`relative flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-2xl text-[10px] font-semibold transition-colors ${
                active
                  ? "bg-[#0D1B2A]/10 dark:bg-white/15 text-[#0D1B2A] dark:text-white"
                  : "text-slate-700 dark:text-slate-300"
              }`}
            >
              <Icon
                className={`w-4 h-4 ${
                  active ? "text-[#1B4B8A] dark:text-[#60A5FA]" : ""
                }`}
              />
              <span className="max-w-[60px] truncate">{item.label}</span>
              {item.badge ? (
                <span className="absolute top-0.5 right-1.5 w-3.5 h-3.5 rounded-full bg-[#C49A45] text-[#0D1B2A] text-[9px] font-bold flex items-center justify-center">
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}

        {/* 5th Slot: Opens GSAP SVG Curve Menu (Profile, Notifications, Theme, Lang, Sign Out) */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className={`relative flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-2xl text-[10px] font-semibold transition-colors ${
            mobileMenuOpen || activeTab === "profile" || activeTab === "notifications"
              ? "bg-[#0D1B2A]/10 dark:bg-white/15 text-[#0D1B2A] dark:text-white"
              : "text-slate-700 dark:text-slate-300"
          }`}
        >
          <Menu className="w-4 h-4" />
          <span>{lang === "ru" ? "Меню" : "More"}</span>
        </button>
      </nav>

      {/* GSAP SVG-CURVE MOBILE DRAWER */}
      <CurveMobileMenu
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        items={navItems}
        activeTab={activeTab}
        onSelect={(id) => setActiveTab(id)}
        lang={lang}
        onToggleLang={onToggleLang}
        dark={dark}
        onToggleDark={onToggleDark}
        onLogout={onLogout}
        logoutLabel={t.logout}
        brandTitle={t.brandTitle}
        userName={lang === "ru" ? user.fullName : user.fullNameEn}
      />

      {/* COMMAND / ASSISTANT MODAL */}
      <CommandAssistantModal
        open={assistantOpen}
        onClose={() => setAssistantOpen(false)}
        lang={lang}
        user={user}
        schedule={schedule}
        grades={grades}
        requests={requests}
        onNavigate={(tab) => setActiveTab(tab)}
        onQuickOrderCert={() => {
          setActiveTab("requests");
          setShowNewReqForm(true);
        }}
      />

      {/* PRINTABLE QR CERTIFICATE MODAL */}
      <CertificateModal
        request={certPreview}
        student={user}
        lang={lang}
        onClose={() => setCertPreview(null)}
      />

      {/* TOAST */}
      {toast && (
        <div className="fixed bottom-20 lg:bottom-6 right-4 z-[80] rounded-2xl bg-[#0D1B2A] text-white px-4 py-3 text-xs font-medium shadow-xl border border-[#C49A45]/40">
          {toast}
        </div>
      )}
    </div>
  );
}
