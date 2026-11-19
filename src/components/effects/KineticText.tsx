"use client";

import React, { useEffect, useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

if (typeof window !== "undefined") {
  gsap.registerPlugin(CustomEase);
  try {
    CustomEase.create("hop", "M0,0 C0.02,0 0.02,1 1,1");
  } catch {
    // ignore if already registered
  }
}

/**
 * Masked word/line slide-up reveal using GSAP (inspired by `copy-text-reveal`).
 */
export function MaskedTextReveal({
  text,
  className = "",
  as: Tag = "h2",
  delay = 0,
}: {
  text: string;
  className?: string;
  as?: "h1" | "h2" | "h3" | "p";
  delay?: number;
}) {
  const rootRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const words = el.querySelectorAll(".k-word");
    const ctx = gsap.context(() => {
      gsap.fromTo(
        words,
        { yPercent: 115, opacity: 0 },
        {
          yPercent: 0,
          opacity: 1,
          duration: 0.55,
          delay,
          stagger: 0.032,
          ease: "power3.out",
          clearProps: "transform",
        }
      );
    }, rootRef);

    return () => ctx.revert();
  }, [text, delay]);

  const parts = text.split(" ");

  return (
    <Tag
      ref={rootRef as React.RefObject<never>}
      className={`leading-tight ${className}`}
    >
      {parts.map((word, idx) => (
        <span
          key={`${word}-${idx}`}
          className="inline-block overflow-hidden align-bottom mr-[0.26em] last:mr-0"
        >
          <span className="k-word inline-block will-change-transform">
            {word}
          </span>
        </span>
      ))}
    </Tag>
  );
}

/**
 * Dual-bar block wipe heading reveal adapted from `goodfella_reveal`.
 * Sweeps a sapphire + brass gold bar across each line to unveil typography.
 */
export function BlockRevealHeading({
  lines,
  className = "",
  delay = 0.05,
  ready = true,
}: {
  lines: string[];
  className?: string;
  delay?: number;
  ready?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useIsomorphicLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const wrappers = el.querySelectorAll(".gf-line-wrap");

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      wrappers.forEach((wrap) => {
        const textEl = wrap.querySelector(".gf-line-text");
        const barPrimary = wrap.querySelector(".gf-bar-primary");
        const barAccent = wrap.querySelector(".gf-bar-accent");
        if (textEl) gsap.set(textEl, { opacity: 1 });
        if (barPrimary && barAccent) gsap.set([barPrimary, barAccent], { scaleX: 0 });
      });
      return;
    }

    if (!ready) {
      wrappers.forEach((wrap) => {
        const textEl = wrap.querySelector(".gf-line-text");
        const barPrimary = wrap.querySelector(".gf-bar-primary");
        const barAccent = wrap.querySelector(".gf-bar-accent");
        if (textEl) gsap.set(textEl, { opacity: 0 });
        if (barPrimary && barAccent) {
          gsap.set([barPrimary, barAccent], {
            scaleX: 0,
            transformOrigin: "left center",
          });
        }
      });
      return;
    }

    const ctx = gsap.context(() => {
      wrappers.forEach((wrap, idx) => {
        const textEl = wrap.querySelector(".gf-line-text");
        const barPrimary = wrap.querySelector(".gf-bar-primary");
        const barAccent = wrap.querySelector(".gf-bar-accent");
        if (!textEl || !barPrimary || !barAccent) return;

        const tl = gsap.timeline({ delay: delay + idx * 0.1 });
        gsap.set(textEl, { opacity: 0 });
        gsap.set([barPrimary, barAccent], {
          scaleX: 0,
          transformOrigin: "left center",
        });

        tl.to(barAccent, {
          scaleX: 1,
          duration: 0.28,
          ease: "power3.inOut",
        })
          .to(
            barPrimary,
            {
              scaleX: 1,
              duration: 0.28,
              ease: "power3.inOut",
            },
            "-=0.18"
          )
          .set(textEl, { opacity: 1 })
          .set([barPrimary, barAccent], { transformOrigin: "right center" })
          .to([barPrimary, barAccent], {
            scaleX: 0,
            duration: 0.34,
            stagger: 0.05,
            ease: "power3.inOut",
          });
      });
    }, containerRef);

    return () => ctx.revert();
  }, [lines, delay, ready]);

  return (
    <div ref={containerRef} className={`flex flex-col items-start gap-1 ${className}`}>
      {lines.map((line, i) => (
        <div
          key={i}
          className="gf-line-wrap relative inline-block w-fit max-w-full overflow-hidden"
        >
          <span className="gf-line-text inline-block opacity-0">{line}</span>
          <span
            aria-hidden="true"
            className="gf-bar-accent absolute inset-0 bg-[#C49A45] pointer-events-none"
          />
          <span
            aria-hidden="true"
            className="gf-bar-primary absolute inset-0 bg-[#1B4B8A] pointer-events-none"
          />
        </div>
      ))}
    </div>
  );
}

/**
 * Kinetic numeric counter using GSAP interpolation.
 */
export function RollingCounter({
  value,
  decimals = 0,
  suffix = "",
  className = "",
}: {
  value: number;
  decimals?: number;
  suffix?: string;
  className?: string;
}) {
  const spanRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const el = spanRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.textContent = `${value.toFixed(decimals)}${suffix}`;
      return;
    }

    const state = { n: 0 };
    const tween = gsap.to(state, {
      n: value,
      duration: 0.9,
      ease: "power3.out",
      onUpdate: () => {
        if (spanRef.current) {
          spanRef.current.textContent = `${state.n.toFixed(decimals)}${suffix}`;
        }
      },
    });
    return () => {
      tween.kill();
    };
  }, [value, decimals, suffix]);

  return (
    <span ref={spanRef} className={className}>
      {value.toFixed(decimals)}
      {suffix}
    </span>
  );
}

/**
 * Editorial welcome headline with GSAP masked word rise + animated brass underline on the student's name.
 */
export function WelcomeKineticTitle({
  greeting,
  name,
  className = "",
}: {
  greeting: string;
  name: string;
  className?: string;
}) {
  const rootRef = useRef<HTMLHeadingElement | null>(null);
  const lineRef = useRef<HTMLSpanElement | null>(null);

  useIsomorphicLayoutEffect(() => {
    const el = rootRef.current;
    const line = lineRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const words = el.querySelectorAll(".wk-word");
    const ctx = gsap.context(() => {
      gsap.fromTo(
        words,
        { yPercent: 115, opacity: 0 },
        {
          yPercent: 0,
          opacity: 1,
          duration: 0.65,
          stagger: 0.06,
          delay: 0.08,
          ease: "power4.out",
          clearProps: "transform",
        }
      );

      if (line) {
        gsap.fromTo(
          line,
          { scaleX: 0, transformOrigin: "left center" },
          {
            scaleX: 1,
            duration: 0.55,
            delay: 0.28,
            ease: "power3.out",
          }
        );
      }
    }, rootRef);

    return () => ctx.revert();
  }, [greeting, name]);

  const greetingWords = greeting.split(" ");

  return (
    <h1 ref={rootRef} className={`leading-[1.1] ${className}`}>
      {greetingWords.map((w, i) => (
        <span
          key={`${w}-${i}`}
          className="inline-block overflow-hidden align-bottom mr-[0.24em]"
        >
          <span className="wk-word inline-block will-change-transform">{w}</span>
        </span>
      ))}
      <span className="relative inline-block overflow-hidden align-bottom pb-1">
        <span className="wk-word inline-block text-[var(--accent)] will-change-transform">
          {name}
        </span>
        <span
          ref={lineRef}
          aria-hidden="true"
          className="absolute left-0 right-0 bottom-0 h-[2.5px] rounded-full bg-gradient-to-r from-[#C49A45] to-[#1B4B8A]"
        />
      </span>
    </h1>
  );
}

/**
 * Premium Section Choreography Wrapper:
 * Pure GPU transform + opacity (zero software blur repaints) + top brass-gold hairline beam.
 */
export function SectionStage({
  tabKey,
  children,
}: {
  tabKey: string;
  children: React.ReactNode;
}) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const beamRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const isFirstRender = useRef(true);

  useIsomorphicLayoutEffect(() => {
    const stage = stageRef.current;
    const beam = beamRef.current;
    const content = contentRef.current;
    if (!stage || !beam || !content) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const ctx = gsap.context(() => {
      gsap.killTweensOf([beam, content]);

      gsap.set(beam, {
        scaleX: 0,
        opacity: 1,
        transformOrigin: "left center",
      });

      gsap.fromTo(
        content,
        {
          opacity: 0,
          y: 10,
        },
        {
          opacity: 1,
          y: 0,
          duration: 0.28,
          ease: "power3.out",
          clearProps: "transform",
        }
      );

      gsap
        .timeline()
        .to(beam, {
          scaleX: 1,
          duration: 0.22,
          ease: "power2.out",
        })
        .set(beam, { transformOrigin: "right center" })
        .to(beam, {
          scaleX: 0,
          opacity: 0,
          duration: 0.24,
          ease: "power2.inOut",
        });

      const items = content.querySelectorAll(".stagger-item");
      if (items.length > 0) {
        gsap.fromTo(
          items,
          { y: 12, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.28,
            stagger: 0.025,
            ease: "power2.out",
            clearProps: "transform",
          }
        );
      }
    }, stageRef);

    return () => ctx.revert();
  }, [tabKey]);

  return (
    <div ref={stageRef} key={tabKey} className="relative">
      <div
        ref={beamRef}
        aria-hidden="true"
        className="pointer-events-none h-[2px] w-full rounded-full bg-gradient-to-r from-[#1B4B8A] via-[#C49A45] to-[#DFB863] opacity-0 mb-3"
      />
      <div ref={contentRef}>{children}</div>
    </div>
  );
}
