"use client";

import React, { useRef, useState } from "react";
import {
  ArrowRight,
  Globe,
  Lock,
  Moon,
  ShieldCheck,
  Sparkles,
  Sun,
  UserCheck,
} from "lucide-react";
import { DICT, type Lang } from "@/lib/i18n";
import { BrandEmblem } from "./BrandEmblem";
import { FluidGradientCanvas } from "./effects/FluidGradientCanvas";
import { BlockRevealHeading } from "./effects/KineticText";

interface LoginViewProps {
  lang: Lang;
  onToggleLang: () => void;
  dark: boolean;
  onToggleDark: (e?: React.MouseEvent) => void;
  onSuccessLogin: () => void;
  ready?: boolean;
}

const DEMO_ACCOUNTS = [
  {
    username: "alexey.volkov",
    password: "Student2026!",
    role: "student" as const,
    nameRu: "Волков Алексей",
    nameEn: "Alexey Volkov",
    metaRu: "МО-304 · 3 курс · GPA 4.82",
    metaEn: "MO-304 · Yr 3 · GPA 4.82",
    badgeKey: "demoStudent1Tag" as const,
  },
  {
    username: "maria.kuznetsova",
    password: "Student2026!",
    role: "student" as const,
    nameRu: "Кузнецова Мария",
    nameEn: "Maria Kuznetsova",
    metaRu: "МП-207 · 2 курс · 1 пересдача",
    metaEn: "MP-207 · Yr 2 · 1 Retake",
    badgeKey: "demoStudent2Tag" as const,
  },
  {
    username: "elena.sokolova",
    password: "Decanat2026!",
    role: "staff" as const,
    nameRu: "Соколова Елена",
    nameEn: "Elena Sokolova",
    metaRu: "Сотрудник деканата · Заявки и пары",
    metaEn: "Dean's Office Staff · Approvals",
    badgeKey: "demoStaffTag" as const,
  },
];

export function LoginView({
  lang,
  onToggleLang,
  dark,
  onToggleDark,
  onSuccessLogin,
  ready = true,
}: LoginViewProps) {
  const t = DICT[lang];
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const heroRef = useRef<HTMLDivElement | null>(null);

  const performLogin = async (u: string, p: string) => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: u, password: p }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error || "Ошибка входа");
        setLoading(false);
        return;
      }
      onSuccessLogin();
    } catch {
      setError(
        lang === "ru"
          ? "Не удалось связаться с сервером"
          : "Network error while signing in"
      );
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void performLogin(username, password);
  };

  return (
    <div
      ref={heroRef}
      className="min-h-screen flex flex-col lg:grid lg:grid-cols-12 bg-[var(--bg-page)] text-[var(--text-primary)]"
    >
      {/* LEFT PANEL: WebGL Fluid Diplomatic Hero */}
      <div className="relative lg:col-span-6 xl:col-span-7 overflow-hidden bg-[#081324] text-white flex flex-col justify-between px-4 pt-4 pb-11 sm:p-8 lg:p-12 rounded-b-[28px] lg:rounded-none shadow-lg lg:shadow-none lg:min-h-screen">
        <FluidGradientCanvas className="absolute inset-0 w-full h-full opacity-95" />
        <div
          className="absolute inset-0 bg-gradient-to-t from-[#081324]/75 via-[#081324]/20 to-[#081324]/45 pointer-events-none"
          aria-hidden="true"
        />

        {/* Top Bar */}
        <div className="relative z-10 flex items-center justify-between gap-2 hero-stagger">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 sm:p-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 shrink-0">
              <BrandEmblem className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm sm:text-base tracking-tight leading-none truncate">
                {t.brandTitle}
              </p>
              <p className="text-[11px] sm:text-xs text-white/75 mt-1 truncate">
                {t.brandSubtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onToggleLang}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/15 text-xs font-medium transition-colors"
            >
              <Globe className="w-3.5 h-3.5" />
              {lang === "ru" ? "EN" : "RU"}
            </button>
            <button
              type="button"
              onClick={onToggleDark}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/15 transition-colors"
              aria-label="Toggle theme"
            >
              {dark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Center Editorial Headline */}
        <div className="relative z-10 mt-5 mb-2 lg:my-auto max-w-2xl">
          <div className="hero-stagger inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#C49A45]/20 border border-[#C49A45]/45 text-[#F2D593] text-[10px] sm:text-xs font-medium mb-3 sm:mb-5">
            <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
            <span className="sm:hidden">{t.contestBadgeShort}</span>
            <span className="hidden sm:inline">{t.contestBadge}</span>
          </div>

          <h1 className="font-serif text-[26px] sm:text-4xl xl:text-5xl font-semibold leading-[1.08] tracking-tight">
            <BlockRevealHeading
              ready={ready}
              lines={
                lang === "ru"
                  ? [
                      "Единый цифровой деканат",
                      "для студента",
                      "нового поколения",
                    ]
                  : [
                      "Unified Digital Dean's Office",
                      "for the Modern",
                      "Student Generation",
                    ]
              }
            />
          </h1>

          <p className="hidden sm:block hero-stagger mt-4 text-sm sm:text-base text-white/80 leading-relaxed max-w-xl">
            {t.loginSub}
          </p>

          <div className="hero-stagger mt-4 sm:mt-6 grid grid-cols-3 gap-2 sm:gap-4 max-w-lg">
            {[
              {
                v: "2 клика",
                vEn: "2 taps",
                k: "Справки PDF",
                kEn: "Certificates",
              },
              {
                v: "3 корпуса",
                vEn: "3 Wings",
                k: "Карта и пары",
                kEn: "Campus & Map",
              },
              {
                v: "24/7",
                vEn: "24/7",
                k: "Без очередей",
                kEn: "Zero Queues",
              },
            ].map((stat) => (
              <div
                key={stat.v}
                className="rounded-xl sm:rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 px-2.5 py-2 sm:px-3 sm:py-2.5"
              >
                <div className="font-mono text-xs sm:text-base font-semibold text-[#F2D593]">
                  {lang === "ru" ? stat.v : stat.vEn}
                </div>
                <div className="text-[10px] sm:text-[11px] text-white/75 mt-0.5 truncate">
                  {lang === "ru" ? stat.k : stat.kEn}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Note (Desktop only to keep mobile form above the fold) */}
        <div className="hidden lg:flex relative z-10 hero-stagger items-center justify-between text-[11px] text-white/60 border-t border-white/15 pt-4">
          <span>
            {lang === "ru"
              ? "Адаптировано под структуру факультетов МО и МП · Только вымышленные данные"
              : "Adapted to IR & International Law structure · 100% synthetic data"}
          </span>
          <span className="font-mono">v2026.11</span>
        </div>
      </div>

      {/* RIGHT PANEL: Floating Elevated Auth Card on Mobile + Clean Split on Desktop */}
      <div className="relative z-20 -mt-6 lg:mt-0 lg:col-span-6 xl:col-span-5 flex flex-col justify-center px-3 pb-10 sm:p-8 lg:p-12">
        <div className="w-full max-w-md mx-auto rounded-3xl lg:rounded-none bg-[var(--bg-surface)] lg:bg-transparent border border-[var(--border-color)] lg:border-0 shadow-xl lg:shadow-none p-5 sm:p-7 lg:p-0">
          <div className="hero-stagger">
            <h2 className="text-2xl font-semibold tracking-tight">
              {t.signInBtn}
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              {lang === "ru"
                ? "Используйте учётные данные или выберите готовый аккаунт жюри ниже."
                : "Enter credentials or select a pre-configured jury demo account below."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="hero-stagger mt-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                {t.usernameLabel}
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="alexey.volkov"
                autoComplete="username"
                required
                className="w-full rounded-xl bg-[var(--bg-page)] lg:bg-[var(--bg-surface)] border border-[var(--border-color)] px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                {t.passwordLabel}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                autoComplete="current-password"
                required
                className="w-full rounded-xl bg-[var(--bg-page)] lg:bg-[var(--bg-surface)] border border-[var(--border-color)] px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
            </div>

            {error && (
              <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 px-3.5 py-2.5 text-xs text-rose-600 dark:text-rose-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#0D1B2A] dark:bg-[#1B4B8A] text-white font-medium text-sm py-3 px-4 hover:opacity-95 transition-opacity disabled:opacity-60"
            >
              <Lock className="w-4 h-4" />
              <span>{loading ? t.signingIn : t.signInBtn}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Jury Demo Accounts */}
          <div className="hero-stagger mt-8 pt-6 border-t border-[var(--border-color)]">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
              <UserCheck className="w-4 h-4" />
              <span>{t.demoAccountsTitle}</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-1 mb-3">
              {t.demoAccountsHint}
            </p>

            <div className="space-y-2.5">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.username}
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setUsername(acc.username);
                    setPassword(acc.password);
                    void performLogin(acc.username, acc.password);
                  }}
                  className="w-full text-left rounded-2xl bg-[var(--bg-page)] lg:bg-[var(--bg-surface)] border border-[var(--border-color)] hover:border-[var(--accent)] p-3 sm:p-3.5 transition-all group shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold group-hover:text-[var(--accent)] transition-colors">
                      {lang === "ru" ? acc.nameRu : acc.nameEn}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        acc.role === "staff"
                          ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                          : "bg-blue-500/10 text-blue-700 dark:text-blue-300"
                      }`}
                    >
                      {t[acc.badgeKey]}
                    </span>
                  </div>
                  <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                    {lang === "ru" ? acc.metaRu : acc.metaEn}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-[var(--text-secondary)] bg-[var(--bg-subtle)] rounded-lg px-2.5 py-1">
                    <span>
                      {acc.username} / {acc.password}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 opacity-60 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-4 flex items-center gap-2 text-[11px] text-[var(--text-secondary)]">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>
                {lang === "ru"
                  ? "Пароли хешированы через scrypt + salt, сессия в httpOnly HMAC-cookie."
                  : "Passwords hashed via scrypt + per-user salt, sessions stored in httpOnly HMAC cookies."}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
