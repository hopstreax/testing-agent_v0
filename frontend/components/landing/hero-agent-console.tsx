"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import {
  ShieldCheck,
  Pause,
  Play,
  RotateCcw,
  Lock,
  Camera,
  CheckCircle2,
  Terminal,
  MousePointer2,
  Cpu,
  Eye,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ConsolePhase = 0 | 1 | 2 | 3;

interface PhaseConfig {
  id: ConsolePhase;
  key: "observe" | "reason" | "act" | "verify";
  label: string;
  durationMs: number;
  statusText: string;
  statusBadgeColor: string;
}

const PHASES: PhaseConfig[] = [
  {
    id: 0,
    key: "observe",
    label: "01 OBSERVE",
    durationMs: 2600,
    statusText: "PERCEIVING DOM",
    statusBadgeColor: "text-amber-400 bg-amber-950/70 border-amber-800/50",
  },
  {
    id: 1,
    key: "reason",
    label: "02 REASON",
    durationMs: 2200,
    statusText: "REASONING (Gemini)",
    statusBadgeColor: "text-purple-400 bg-purple-950/70 border-purple-800/50",
  },
  {
    id: 2,
    key: "act",
    label: "03 ACT",
    durationMs: 2400,
    statusText: "EXECUTING ACTION",
    statusBadgeColor: "text-blue-400 bg-blue-950/70 border-blue-800/50",
  },
  {
    id: 3,
    key: "verify",
    label: "04 VERIFY",
    durationMs: 3600,
    statusText: "DETERMINISTIC VERIFY",
    statusBadgeColor: "text-emerald-400 bg-emerald-950/70 border-emerald-800/50",
  },
];

export function HeroAgentConsole() {
  const [phase, setPhase] = useState<ConsolePhase>(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const prefersReducedMotion = Boolean(shouldReduceMotion);
  const [clickRippleKey, setClickRippleKey] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);

  // When entering ACT phase, trigger click ripple shortly after cursor arrival
  useEffect(() => {
    if (phase === 2 && !prefersReducedMotion) {
      const rippleTimer = setTimeout(() => {
        setClickRippleKey((k) => k + 1);
      }, 700);
      return () => clearTimeout(rippleTimer);
    }
  }, [phase, prefersReducedMotion]);

  // Main state machine auto-advance timer
  const advancePhase = useCallback(() => {
    setPhase((prev) => ((prev + 1) % 4) as ConsolePhase);
  }, []);

  useEffect(() => {
    if (isPaused || isHovered || prefersReducedMotion) return;

    const currentDuration = PHASES[phase].durationMs;
    const timer = setTimeout(() => {
      advancePhase();
    }, currentDuration);

    return () => clearTimeout(timer);
  }, [phase, isPaused, isHovered, prefersReducedMotion, advancePhase]);

  // Pause when document tab is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsPaused(true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  const handleManualPhaseSelect = (selectedPhase: ConsolePhase) => {
    setPhase(selectedPhase);
  };

  const handleReset = () => {
    setPhase(0);
    setIsPaused(false);
  };

  const isCartAdded = phase === 2 || phase === 3;
  const isTargetLocked = phase === 1 || phase === 2;

  // Agent cursor coordinates for each phase within browser canvas
  const cursorCoords = {
    0: { x: "78%", y: "24%", opacity: 0 },
    1: { x: "75%", y: "55%", opacity: 0.85 },
    2: { x: "72%", y: "78%", opacity: 1 },
    3: { x: "85%", y: "16%", opacity: 0.9 },
  }[phase];

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="w-full rounded-xl border border-[#1b2026] bg-[#0d1013] shadow-xl shadow-black/80 overflow-hidden transition-all duration-300 hover:border-zinc-700/80"
      aria-label="TraceKit Agent Console interactive demonstration"
    >
      {/* ── Top Bar: Session Telemetry & Window Controls ── */}
      <div className="flex items-center justify-between border-b border-[#1b2026] bg-[#101418] px-3.5 py-2.5 select-none">
        {/* Left: Window Dots & Title */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <span className="h-2 w-2 rounded-full bg-zinc-600" />
            <span className="h-2 w-2 rounded-full bg-zinc-600" />
            <span className="h-2 w-2 rounded-full bg-zinc-600" />
          </div>
          <div className="flex items-center gap-2 border-l border-zinc-800/80 pl-2.5 font-mono text-[11px]">
            <span className="font-semibold text-zinc-200">TraceKit Agent Console</span>
            <span className="hidden sm:inline text-zinc-600">•</span>
            <span className="hidden sm:inline text-zinc-400 text-[10px]">session #live-run-914</span>
          </div>
        </div>

        {/* Right: Engine Specs & Controls */}
        <div className="flex items-center gap-2 font-mono text-[10px] text-zinc-400">
          <span className="hidden md:inline rounded bg-[#12161b] border border-[#222932] px-1.5 py-0.5 text-zinc-400">
            Chromium • 1280×800
          </span>
          {prefersReducedMotion ? (
            <span className="text-zinc-500">Motion Paused</span>
          ) : (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsPaused((prev) => !prev)}
                className="flex items-center gap-1 rounded bg-[#12161b] hover:bg-[#161c22] border border-[#222932] px-2 py-0.5 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                title={isPaused ? "Resume execution" : "Pause execution"}
                aria-label={isPaused ? "Resume execution" : "Pause execution"}
              >
                {isPaused ? <Play className="h-2.5 w-2.5 text-[#00e599]" /> : <Pause className="h-2.5 w-2.5 text-zinc-400" />}
                <span className="text-[10px]">{isPaused ? "Resume" : "Pause"}</span>
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="p-1 text-zinc-500 hover:text-zinc-300 cursor-pointer transition-colors"
                title="Reset animation cycle"
                aria-label="Reset animation cycle"
              >
                <RotateCcw className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Phase Tab Selector: OBSERVE → REASON → ACT → VERIFY ── */}
      <div className="border-b border-[#1b2026] bg-[#0d1013] px-3 py-2">
        <div
          className="grid grid-cols-4 gap-1.5 sm:gap-2 font-mono text-[10px] sm:text-[11px]"
          role="tablist"
          aria-label="Workflow Phases"
        >
          {PHASES.map((p) => {
            const isActive = phase === p.id;
            return (
              <button
                key={p.id}
                role="tab"
                id={`console-tab-${p.key}`}
                aria-selected={isActive}
                type="button"
                onClick={() => handleManualPhaseSelect(p.id)}
                className={cn(
                  "relative flex items-center justify-center gap-1 sm:gap-1.5 rounded-md px-1.5 sm:px-2.5 py-1.5 font-medium transition-all duration-150 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00e599]",
                  isActive
                    ? "text-white font-semibold"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-[#12161b]"
                )}
              >
                {/* Active tab sliding highlight via Motion layoutId */}
                {isActive && (
                  <motion.div
                    layoutId="consoleActivePhaseIndicator"
                    className="absolute inset-0 rounded-md border border-[#00e599]/40 bg-[#00e599]/10"
                    transition={{
                      type: prefersReducedMotion ? "tween" : "spring",
                      stiffness: 400,
                      damping: 35,
                      duration: prefersReducedMotion ? 0.01 : undefined,
                    }}
                  />
                )}

                <span className="relative z-10 truncate">{p.label}</span>
                {isActive && (
                  <span
                    className="relative z-10 h-1.5 w-1.5 shrink-0 rounded-full bg-[#00e599]"
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Dual-Pane Workspace: Telemetry Left / Browser Right ── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 p-3.5 sm:p-4 bg-[#08090b]">
        {/* Left Pane: Agent Telemetry & Reasoning (md:col-span-5) */}
        <div className="md:col-span-5 flex flex-col justify-between rounded-lg border border-[#1b2026] bg-[#0d1013] p-3 font-mono text-xs">
          <div>
            {/* Telemetry Header */}
            <div className="flex items-center justify-between border-b border-[#1b2026] pb-2 mb-2.5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-300">
                <Terminal className="h-3.5 w-3.5 text-[#00e599]" />
                <span>AGENT TELEMETRY</span>
              </div>
              <span
                className={cn(
                  "rounded border px-1.5 py-0.5 text-[9px] font-semibold tracking-wider uppercase",
                  PHASES[phase].statusBadgeColor
                )}
              >
                {PHASES[phase].statusText}
              </span>
            </div>

            {/* Dynamic Telemetry Feed by Phase */}
            <div className="min-h-[160px] text-[11px] leading-relaxed">
              <AnimatePresence mode="wait">
                {phase === 0 && (
                  <motion.div
                    key="telemetry-observe"
                    initial={{ opacity: prefersReducedMotion ? 1 : 0, y: prefersReducedMotion ? 0 : 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.18 }}
                    className="space-y-1.5 text-zinc-300"
                  >
                    <div className="flex items-center gap-1 text-[#00e599] font-semibold">
                      <Eye className="h-3 w-3" />
                      <span>&gt; page.accessibility.snapshot()</span>
                    </div>
                    <div className="text-zinc-400 pl-3 border-l border-zinc-800 space-y-1 text-[10.5px]">
                      <div>• Parsed 14 interactive DOM nodes</div>
                      <div>• Found product: &quot;Sauce Labs Backpack&quot;</div>
                      <div className="text-amber-300/90 font-medium">
                        • Target identified:
                        <span className="block text-zinc-300 font-mono text-[10px] mt-0.5 bg-[#12161b] p-1 rounded border border-[#222932]">
                          role=&quot;button&quot; name=&quot;Add to cart&quot;
                        </span>
                      </div>
                    </div>
                    <div className="text-[10px] text-zinc-500 pt-1">
                      Objective: verify cart increment
                    </div>
                  </motion.div>
                )}

                {phase === 1 && (
                  <motion.div
                    key="telemetry-reason"
                    initial={{ opacity: prefersReducedMotion ? 1 : 0, y: prefersReducedMotion ? 0 : 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.18 }}
                    className="space-y-1.5 text-zinc-300"
                  >
                    <div className="flex items-center gap-1.5 text-purple-400 font-semibold">
                      <Cpu className="h-3 w-3" />
                      <span>AI: Gemini 3.6 Flash</span>
                    </div>
                    <div className="rounded bg-[#12161b] border border-purple-900/30 p-2 text-[10.5px] text-zinc-300 leading-snug">
                      <div className="text-purple-300 text-[10px] font-semibold uppercase mb-0.5">Strategy:</div>
                      &quot;Product located in primary inventory grid. Dispatching click to add item.&quot;
                    </div>
                    <div className="rounded bg-[#12161b] border border-[#222932] p-1.5 text-[10px] space-y-0.5">
                      <div className="text-zinc-500 uppercase font-semibold text-[9px]">Accessible Locator:</div>
                      <div className="text-emerald-400">role=&quot;button&quot;</div>
                      <div className="text-zinc-300">name=&quot;Add to cart&quot;</div>
                    </div>
                  </motion.div>
                )}

                {phase === 2 && (
                  <motion.div
                    key="telemetry-act"
                    initial={{ opacity: prefersReducedMotion ? 1 : 0, y: prefersReducedMotion ? 0 : 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.18 }}
                    className="space-y-1.5 text-zinc-300"
                  >
                    <div className="flex items-center gap-1.5 text-blue-400 font-semibold">
                      <Zap className="h-3 w-3" />
                      <span>Dispatching Playwright action:</span>
                    </div>
                    <div className="rounded bg-[#12161b] border border-blue-900/40 p-2 text-[10.5px] space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">action:</span>
                        <span className="rounded bg-blue-950 px-1.5 py-0.5 text-blue-300 font-bold border border-blue-800/60 text-[9.5px]">
                          CLICK
                        </span>
                      </div>
                      <div className="text-[10px] text-zinc-400 truncate">
                        <span className="text-zinc-500">locator: </span>
                        <span className="text-zinc-200">button#add-to-cart-sauce-labs-backpack</span>
                      </div>
                      <div className="text-[10px] text-zinc-400">
                        <span className="text-zinc-500">index: </span>
                        <span className="text-zinc-200">0 (unique)</span>
                      </div>
                    </div>
                    <div className="text-[10px] text-emerald-400/90 flex items-center gap-1 pt-0.5">
                      <CheckCircle2 className="h-2.5 w-2.5" />
                      <span>DOM mutation triggered</span>
                    </div>
                  </motion.div>
                )}

                {phase === 3 && (
                  <motion.div
                    key="telemetry-verify"
                    initial={{ opacity: prefersReducedMotion ? 1 : 0, y: prefersReducedMotion ? 0 : 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.18 }}
                    className="space-y-1.5 text-zinc-300"
                  >
                    <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                      <ShieldCheck className="h-3 w-3" />
                      <span>Executing Deterministic Assertion:</span>
                    </div>
                    <div className="rounded bg-[#12161b] border border-emerald-900/50 p-2 text-[10.5px] space-y-1">
                      <div className="text-[#00e599] font-mono text-[10.5px]">
                        expect(cart_badge).toHaveText(&quot;1&quot;)
                      </div>
                      <div className="flex items-center justify-between pt-0.5 text-[10px] text-zinc-400">
                        <span>Expected: &quot;1&quot;</span>
                        <span className="text-emerald-400 font-semibold">Actual: &quot;1&quot;</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[10px] pt-1 text-zinc-400 border-t border-zinc-800/60">
                      <span>Status: <strong className="text-emerald-400">PASSED</strong></span>
                      <span className="text-zinc-500">Match confirmed</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Telemetry Footer Spec Note */}
          <div className="pt-2 border-t border-[#1b2026] flex items-center justify-between text-[10px] text-zinc-500">
            <span>Locator priority: role/name &gt; selector</span>
            <span className="text-zinc-400 font-medium">Trace verified</span>
          </div>
        </div>

        {/* Right Pane: Target Browser & Live Canvas (md:col-span-7) */}
        <div className="md:col-span-7 flex flex-col justify-between rounded-lg border border-[#1b2026] bg-[#0d1013] overflow-hidden">
          {/* Browser Window Address Bar */}
          <div className="flex items-center justify-between border-b border-[#1b2026] bg-[#101418] px-3 py-1.5 text-[10px] font-mono">
            <div className="flex items-center gap-1.5 text-zinc-400 truncate max-w-[200px] sm:max-w-none">
              <Lock className="h-2.5 w-2.5 text-emerald-400 shrink-0" />
              <span className="text-zinc-300 truncate">https://www.saucedemo.com/inventory.html</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[9px] text-zinc-500 hidden sm:inline">42ms</span>
              {/* Dynamic Cart Badge in Browser Header */}
              <div
                className={cn(
                  "flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold transition-all duration-200",
                  isCartAdded
                    ? "bg-[#00e599]/20 text-[#00e599] border border-[#00e599]/50 shadow-xs"
                    : "bg-[#12161b] text-zinc-400 border border-[#222932]"
                )}
              >
                <span>Cart</span>
                <motion.span
                  key={isCartAdded ? "cart-1" : "cart-0"}
                  initial={{ scale: prefersReducedMotion ? 1 : 1.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className="font-bold"
                >
                  ({isCartAdded ? 1 : 0})
                </motion.span>
              </div>
            </div>
          </div>

          {/* Browser Web Canvas */}
          <div className="relative p-3 sm:p-3.5 bg-[#08090b] min-h-[175px] flex flex-col justify-center select-none overflow-hidden">
            {/* Simulated Web Application Product Card - Refined as Inspected Node */}
            <div className="relative rounded-lg border border-[#1b2026] bg-[#101418] p-3 flex items-center justify-between gap-3 shadow-xs">
              {/* Product Info */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-[#12161b] border border-[#222932] text-zinc-400">
                  <svg
                    className="h-6 w-6 text-zinc-300"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                    />
                  </svg>
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white truncate">Sauce Labs Backpack</div>
                  <div className="font-mono text-[11px] text-zinc-400">$29.99</div>
                  <div className="text-[10px] text-zinc-500 truncate hidden sm:block">
                    Carryall with padded laptop sleeve
                  </div>
                </div>
              </div>

              {/* Target Button with Inspector Bounding Box */}
              <div className="relative shrink-0">
                {/* DevTools Inspector Bounding Box Overlay */}
                {isTargetLocked && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="absolute -inset-1.5 rounded-md border-2 border-dashed border-[#00e599] bg-[#00e599]/[0.06] pointer-events-none z-10"
                  >
                    {/* Inspector tag banner */}
                    <div className="absolute -top-3.5 right-0 rounded bg-[#00e599] text-[#08090b] font-mono text-[8px] font-bold px-1 py-0.2 tracking-wider shadow-xs uppercase">
                      role=&quot;button&quot;
                    </div>
                  </motion.div>
                )}

                {/* Click Ripple Wave Effect */}
                {phase === 2 && !prefersReducedMotion && (
                  <motion.div
                    key={`ripple-${clickRippleKey}`}
                    initial={{ scale: 0.8, opacity: 0.9 }}
                    animate={{ scale: 2.2, opacity: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="absolute inset-0 rounded bg-[#00e599]/40 pointer-events-none z-20"
                  />
                )}

                {/* Interactive / Animated Action Button */}
                <motion.button
                  type="button"
                  onClick={() => setPhase(2)}
                  animate={
                    phase === 2 && !prefersReducedMotion
                      ? { scale: [1, 0.92, 1] }
                      : { scale: 1 }
                  }
                  transition={{ duration: 0.25 }}
                  className={cn(
                    "relative z-0 rounded px-2.5 py-1.5 text-[10px] font-semibold transition-all cursor-pointer select-none font-sans",
                    isCartAdded
                      ? "bg-[#18221f] text-[#00e599] border border-[#00e599]/50 shadow-xs shadow-[#00e599]/20"
                      : "bg-[#00e599] text-[#08090b] hover:bg-[#00f5a0] shadow-sm"
                  )}
                >
                  {isCartAdded ? "Remove" : "Add to cart"}
                </motion.button>
              </div>
            </div>

            {/* Simulated Animated Agent Cursor - Clean Precision Pointer */}
            {!prefersReducedMotion && (
              <motion.div
                animate={{
                  left: cursorCoords.x,
                  top: cursorCoords.y,
                  opacity: cursorCoords.opacity,
                }}
                transition={{
                  type: "spring",
                  stiffness: 280,
                  damping: 24,
                  mass: 0.7,
                }}
                className="absolute pointer-events-none z-30 flex items-center gap-1.5"
                style={{ transform: "translate(-6px, -4px)" }}
              >
                <MousePointer2 className="h-4 w-4 text-[#00e599] fill-[#00e599] drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]" />
                <span className="rounded bg-[#08090b] border border-[#00e599]/60 px-1.5 py-0.5 font-mono text-[8px] font-semibold text-[#00e599] shadow-md">
                  Agent
                </span>
              </motion.div>
            )}
          </div>

          {/* Micro Evidence Banner inside right pane */}
          <div className="border-t border-[#1b2026] bg-[#101418] px-3 py-1.5 flex items-center justify-between text-[10px] font-mono text-zinc-500">
            <span className="flex items-center gap-1.5">
              <Camera className="h-3 w-3 text-zinc-400" />
              <span>DOM Observer Active</span>
            </span>
            <span className={cn(phase === 3 ? "text-emerald-400 font-semibold" : "text-zinc-500")}>
              {phase === 3 ? "Evidence recorded" : "Capturing trace..."}
            </span>
          </div>
        </div>
      </div>

      {/* ── Bottom Drawer: Deterministic Verification Engine ── */}
      <div className="border-t border-[#1b2026] bg-[#0d1013] p-3 sm:px-4 sm:py-3 font-mono">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          {/* Left: Assertion Headline & Core Thesis */}
          <div className="flex items-start sm:items-center gap-2.5">
            <div
              className={cn(
                "mt-0.5 sm:mt-0 flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors",
                phase === 3
                  ? "bg-[#00e599]/20 text-[#00e599] border border-[#00e599]/60"
                  : "bg-[#12161b] border border-[#222932] text-zinc-500"
              )}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn("text-xs font-semibold tracking-tight", phase === 3 ? "text-white" : "text-zinc-400")}>
                  {phase === 3
                    ? "✓ DETERMINISTIC VERIFICATION PASSED"
                    : "Deterministic Verification: Standby (Armed)"}
                </span>

                {phase === 3 && (
                  <span className="rounded bg-emerald-950/80 border border-emerald-800/60 px-1.5 py-0.2 text-[9.5px] font-bold text-emerald-300">
                    1 / 1 Assertions
                  </span>
                )}
                {phase === 3 && (
                  <span className="text-[10px] text-zinc-400 hidden md:inline">
                    142ms duration
                  </span>
                )}
              </div>

              {/* Explicit Core Thesis Line */}
              <div className="text-[10px] text-zinc-400 mt-0.5">
                <span className="text-[#00e599] font-medium">LLM chose action</span> •{" "}
                <span className="text-zinc-300">Playwright deterministically verified outcome</span>
              </div>
            </div>
          </div>

          {/* Right: Evidence File Badge */}
          <div className="flex items-center gap-2 text-[10.5px] text-zinc-400 shrink-0">
            <span className="rounded border border-[#222932] bg-[#12161b] px-2 py-0.5 text-zinc-300 flex items-center gap-1.5">
              <Camera className="h-3 w-3 text-[#00e599]" />
              <span className="text-[10px] text-zinc-300 truncate max-w-[140px] sm:max-w-none">
                sauce_cart_verified.png
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
