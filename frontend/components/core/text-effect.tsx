"use client";

import React, { useEffect, useId, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

export type PresetType = "blur" | "fade-in-blur" | "scale" | "fade" | "slide";
export type PerType = "word" | "char" | "line";

export interface TextEffectProps {
  children: string;
  per?: PerType;
  as?: keyof React.JSX.IntrinsicElements;
  variants?: Record<string, unknown>;
  className?: string;
  style?: React.CSSProperties;
  preset?: PresetType;
  delay?: number;
  speedReveal?: number;
  speedSegment?: number;
  trigger?: boolean;
  onAnimationComplete?: () => void;
  segmentWrapperClassName?: string;
}

const keyframeMap: Record<PresetType, string> = {
  fade: "textEffectFade",
  slide: "textEffectSlide",
  scale: "textEffectScale",
  blur: "textEffectBlur",
  "fade-in-blur": "textEffectBlur",
};

function subscribeReducedMotion(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function getReducedMotionSnapshot() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getReducedMotionServerSnapshot() {
  return false;
}

/**
 * TextEffect component for animated text reveals.
 * Compatible with motion-primitives API while using pure CSS keyframe animations,
 * requiring zero external animation dependencies.
 */
export function TextEffect({
  children,
  per = "word",
  as: Component = "p",
  className,
  style,
  preset = "fade",
  delay = 0,
  speedReveal = 1,
  speedSegment = 1,
  trigger = true,
  onAnimationComplete,
  segmentWrapperClassName,
}: TextEffectProps) {
  const instanceId = useId();
  const prefersReducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot
  );

  const text = typeof children === "string" ? children : String(children ?? "");

  // Normalize delay: support both seconds (e.g. 0.5) and milliseconds (e.g. 500)
  const delaySec = delay ? (delay > 10 ? delay / 1000 : delay) : 0;
  const staggerSec =
    (per === "char" ? 0.025 : per === "word" ? 0.08 : 0.15) / Math.max(0.1, speedReveal);
  const durationSec =
    (per === "char" ? 0.3 : per === "word" ? 0.35 : 0.4) /
    Math.max(0.1, speedReveal * speedSegment);

  const animationName = keyframeMap[preset] || "textEffectFade";

  // Calculate total segments for completion callback
  useEffect(() => {
    if (!onAnimationComplete || !trigger) return;
    let totalItems = 1;
    if (per === "char") {
      totalItems = text.length;
    } else if (per === "word") {
      totalItems = text.trim().split(/\s+/).length;
    } else if (per === "line") {
      totalItems = text.split("\n").length;
    }

    const totalDurationMs =
      prefersReducedMotion
        ? 10
        : (delaySec + totalItems * staggerSec + durationSec) * 1000;
    const timer = setTimeout(() => {
      onAnimationComplete();
    }, totalDurationMs);

    return () => clearTimeout(timer);
  }, [
    onAnimationComplete,
    trigger,
    per,
    text,
    delaySec,
    staggerSec,
    durationSec,
    prefersReducedMotion,
  ]);

  // Render per character
  if (per === "char") {
    const tokens = text.split(/(\s+)/);
    let charCounter = 0;

    return (
      <Component
        className={cn(className)}
        style={style}
        aria-label={text}
      >
        <span className="sr-only">{text}</span>
        <span
          aria-hidden="true"
          className={cn("contents", segmentWrapperClassName)}
        >
          {tokens.map((token, tokenIdx) => {
            if (/^\s+$/.test(token)) {
              return <React.Fragment key={`${instanceId}-s-${tokenIdx}`}>{token}</React.Fragment>;
            }

            const chars = Array.from(token);
            return (
              <span
                key={`${instanceId}-w-${tokenIdx}`}
                className="inline-block whitespace-nowrap"
              >
                {chars.map((char, charIdx) => {
                  const index = charCounter++;
                  const charDelay = delaySec + index * staggerSec;

                  return (
                    <span
                      key={`${instanceId}-c-${tokenIdx}-${charIdx}`}
                      className="inline-block text-effect-char"
                      style={
                        prefersReducedMotion || !trigger
                          ? { opacity: trigger ? 1 : 0 }
                          : {
                              animationName,
                              animationDuration: `${durationSec}s`,
                              animationTimingFunction: "cubic-bezier(0.25, 1, 0.5, 1)",
                              animationFillMode: "both",
                              animationDelay: `${charDelay}s`,
                            }
                      }
                    >
                      {char}
                    </span>
                  );
                })}
              </span>
            );
          })}
        </span>
      </Component>
    );
  }

  // Render per word
  if (per === "word") {
    const tokens = text.split(/(\s+)/);
    let wordCounter = 0;

    return (
      <Component
        className={cn(className)}
        style={style}
        aria-label={text}
      >
        <span className="sr-only">{text}</span>
        <span
          aria-hidden="true"
          className={cn("contents", segmentWrapperClassName)}
        >
          {tokens.map((token, tokenIdx) => {
            if (/^\s+$/.test(token)) {
              return <React.Fragment key={`${instanceId}-s-${tokenIdx}`}>{token}</React.Fragment>;
            }

            const index = wordCounter++;
            const wordDelay = delaySec + index * staggerSec;

            return (
              <span
                key={`${instanceId}-w-${tokenIdx}`}
                className="inline-block whitespace-nowrap text-effect-word"
                style={
                  prefersReducedMotion || !trigger
                    ? { opacity: trigger ? 1 : 0 }
                    : {
                        animationName,
                        animationDuration: `${durationSec}s`,
                        animationTimingFunction: "cubic-bezier(0.25, 1, 0.5, 1)",
                        animationFillMode: "both",
                        animationDelay: `${wordDelay}s`,
                      }
                }
              >
                {token}
              </span>
            );
          })}
        </span>
      </Component>
    );
  }

  // Render per line
  const lines = text.split("\n");

  return (
    <Component
      className={cn(className)}
      style={style}
      aria-label={text}
    >
      <span className="sr-only">{text}</span>
      <span
        aria-hidden="true"
        className={cn("contents", segmentWrapperClassName)}
      >
        {lines.map((line, lineIdx) => {
          const lineDelay = delaySec + lineIdx * staggerSec;

          return (
            <span
              key={`${instanceId}-l-${lineIdx}`}
              className="block text-effect-line"
              style={
                prefersReducedMotion || !trigger
                  ? { opacity: trigger ? 1 : 0 }
                  : {
                      animationName,
                      animationDuration: `${durationSec}s`,
                      animationTimingFunction: "cubic-bezier(0.25, 1, 0.5, 1)",
                      animationFillMode: "both",
                      animationDelay: `${lineDelay}s`,
                    }
              }
            >
              {line}
            </span>
          );
        })}
      </span>
    </Component>
  );
}
