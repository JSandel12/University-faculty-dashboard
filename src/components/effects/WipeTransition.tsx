"use client";

import React, { forwardRef, useImperativeHandle, useRef } from "react";
import gsap from "gsap";

export interface WipeTransitionHandle {
  playTransition: (onMidpoint: () => void) => void;
}

/**
 * 4-column staggered GSAP wipe transition (from `Cool effects prompts.txt` / `waabi-page-transition`).
 * Flips transformOrigin between entry and exit for a crisp architectural curtain wipe.
 */
export const WipeTransition = forwardRef<WipeTransitionHandle>(
  function WipeTransition(_props, ref) {
    const wrapperRef = useRef<HTMLDivElement | null>(null);
    const colsRef = useRef<(HTMLDivElement | null)[]>([]);

    useImperativeHandle(ref, () => ({
      playTransition(onMidpoint: () => void) {
        const wrapper = wrapperRef.current;
        const cols = colsRef.current.filter(Boolean) as HTMLDivElement[];
        if (!wrapper || cols.length === 0) {
          onMidpoint();
          return;
        }

        const prefersReduced =
          typeof window !== "undefined" &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (prefersReduced) {
          onMidpoint();
          return;
        }

        gsap.killTweensOf(cols);
        gsap.set(wrapper, { display: "grid" });
        gsap.set(cols, { scaleY: 0, transformOrigin: "bottom center" });

        const tl = gsap.timeline({
          onComplete: () => {
            gsap.set(wrapper, { display: "none" });
          },
        });

        tl.to(cols, {
          scaleY: 1,
          duration: 0.28,
          stagger: 0.045,
          ease: "power3.inOut",
        })
          .add(() => {
            onMidpoint();
          })
          .set(cols, { transformOrigin: "top center" })
          .to(cols, {
            scaleY: 0,
            duration: 0.3,
            stagger: 0.045,
            ease: "power3.inOut",
            delay: 0.06,
          });
      },
    }));

    return (
      <div
        ref={wrapperRef}
        className="fixed inset-0 z-[90] grid-cols-4 pointer-events-none"
        style={{ display: "none" }}
        aria-hidden="true"
      >
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            ref={(el) => {
              colsRef.current[i] = el;
            }}
            className="w-full h-full bg-[#0D1B2A] border-r border-[#C49A45]/20 last:border-r-0"
          />
        ))}
      </div>
    );
  }
);
