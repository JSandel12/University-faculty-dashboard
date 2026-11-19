"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { Lang } from "@/lib/i18n";
import { LoginView } from "./LoginView";
import { PortalWorkspace, type PortalData } from "./PortalWorkspace";
import { CabinetPreloader } from "./effects/CabinetPreloader";
import {
  WipeTransition,
  type WipeTransitionHandle,
} from "./effects/WipeTransition";

interface DecanatAppProps {
  initialPortalData: PortalData | null;
}

export function DecanatApp({ initialPortalData }: DecanatAppProps) {
  const [portalData, setPortalData] = useState<PortalData | null>(
    initialPortalData
  );
  const [lang, setLang] = useState<Lang>("ru");
  const [dark, setDark] = useState(false);
  const [curtainReady, setCurtainReady] = useState(false);
  const wipeRef = useRef<WipeTransitionHandle | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [dark]);

  const handleToggleDark = useCallback(
    (event?: React.MouseEvent) => {
      const nextDark = !dark;
      const doc = document as Document & {
        startViewTransition?: (cb: () => void) => {
          ready: Promise<void>;
          finished: Promise<void>;
        };
      };

      const prefersReduced =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (!doc.startViewTransition || prefersReduced) {
        setDark(nextDark);
        return;
      }

      const x =
        event && typeof event.clientX === "number" && event.clientX > 0
          ? event.clientX
          : window.innerWidth / 2;
      const y =
        event && typeof event.clientY === "number" && event.clientY > 0
          ? event.clientY
          : window.innerHeight / 2;

      const maxRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
      );

      const root = document.documentElement;
      root.style.setProperty("--vt-x", `${x}px`);
      root.style.setProperty("--vt-y", `${y}px`);
      root.style.setProperty("--vt-r", `${maxRadius}px`);
      root.classList.add("theme-transitioning");

      const transition = doc.startViewTransition(() => {
        flushSync(() => {
          setDark(nextDark);
        });
        root.classList.toggle("dark", nextDark);
      });

      transition.finished.finally(() => {
        root.classList.remove("theme-transitioning");
      });
    },
    [dark]
  );

  const handleToggleLang = useCallback(() => {
    const nextLang: Lang = lang === "ru" ? "en" : "ru";
    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => {
        finished: Promise<void>;
      };
    };

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!doc.startViewTransition || prefersReduced) {
      setLang(nextLang);
      return;
    }

    const root = document.documentElement;
    root.classList.add("lang-transitioning");
    if (nextLang === "ru") {
      root.classList.add("lang-rtl");
    } else {
      root.classList.remove("lang-rtl");
    }

    const transition = doc.startViewTransition(() => {
      flushSync(() => {
        setLang(nextLang);
      });
    });

    transition.finished.finally(() => {
      root.classList.remove("lang-transitioning", "lang-rtl");
    });
  }, [lang]);

  const fetchPortal = useCallback(async (): Promise<PortalData | null> => {
    try {
      const res = await fetch("/api/portal", { cache: "no-store" });
      if (!res.ok) {
        return null;
      }
      const json = (await res.json()) as PortalData;
      setPortalData(json);
      return json;
    } catch {
      return null;
    }
  }, []);

  const handleSuccessLogin = () => {
    void (async () => {
      const res = await fetch("/api/portal", { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as PortalData;
      if (wipeRef.current) {
        wipeRef.current.playTransition(() => {
          setPortalData(json);
        });
      } else {
        setPortalData(json);
      }
    })();
  };

  const handleLogout = () => {
    void (async () => {
      await fetch("/api/auth/logout", { method: "POST" });
      if (wipeRef.current) {
        wipeRef.current.playTransition(() => {
          setPortalData(null);
        });
      } else {
        setPortalData(null);
      }
    })();
  };

  return (
    <>
      <CabinetPreloader onRevealStart={() => setCurtainReady(true)} />
      <WipeTransition ref={wipeRef} />
      {portalData ? (
        <PortalWorkspace
          data={portalData}
          lang={lang}
          onToggleLang={handleToggleLang}
          dark={dark}
          onToggleDark={handleToggleDark}
          onRefresh={async () => {
            await fetchPortal();
          }}
          onLogout={handleLogout}
        />
      ) : (
        <LoginView
          lang={lang}
          onToggleLang={handleToggleLang}
          dark={dark}
          onToggleDark={handleToggleDark}
          onSuccessLogin={handleSuccessLogin}
          ready={curtainReady}
        />
      )}
    </>
  );
}
