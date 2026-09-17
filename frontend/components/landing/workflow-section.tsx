"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import {
  FileCode,
  Eye,
  BrainCircuit,
  Play,
  ShieldCheck,
  CheckCircle2,
  Terminal,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ExecutionStep {
  id: string;
  stepNum: string;
  title: string;
  command: string;
  icon: React.ElementType;
  outputSummary: string;
  details: {
    label: string;
    value: string;
  }[];
}

const EXECUTION_STEPS: ExecutionStep[] = [
  {
    id: "define",
    stepNum: "01",
    title: "DEFINE GOAL",
    command: 'tracekit run "Verify user can add an item to cart"',
    icon: FileCode,
    outputSummary: "Natural-language test goal specified with target URL https://saucedemo.com",
    details: [
      { label: "Target URL", value: "https://saucedemo.com" },
      { label: "Goal Specification", value: "Locate backpack, add to cart, verify cart counter" },
      { label: "Session State", value: "Clean session (guest checkout)" },
    ],
  },
  {
    id: "observe",
    stepNum: "02",
    title: "OBSERVE PAGE",
    command: "await page.accessibility.snapshot()",
    icon: Eye,
    outputSummary: "Page state captured: accessibility tree, visible DOM coordinates, and screenshot",
    details: [
      { label: "Interactive Nodes", value: "14 buttons, 2 text inputs, 6 navigation links" },
      { label: "Target Node", value: 'button[role="button"][name="Add to cart"]' },
      { label: "Viewport Capture", value: "screenshot_step_02.png (1280x800)" },
    ],
  },
  {
    id: "reason",
    stepNum: "03",
    title: "REASON OVER DOM",
    command: "agent.synthesize_action(goal, dom_state)",
    icon: BrainCircuit,
    outputSummary: "LLM identifies unambiguous accessible selector and decides next action",
    details: [
      { label: "Model", value: "Gemini 3.6 Flash" },
      { label: "Locator Priority", value: "Accessible role/name over brittle CSS selector" },
      { label: "Selected Action", value: "CLICK with index=0 disambiguation" },
    ],
  },
  {
    id: "act",
    stepNum: "04",
    title: "ACT VIA PLAYWRIGHT",
    command: "await page.locator('button#add-to-cart').click()",
    icon: Play,
    outputSummary: "Real CDP browser action executed; button state updates to 'Remove'",
    details: [
      { label: "Browser Engine", value: "Headless Chromium via Playwright" },
      { label: "Action Dispatch", value: "Click dispatched at (x: 412, y: 320)" },
      { label: "DOM Mutation", value: "Shopping cart count incremented 0 -> 1" },
    ],
  },
  {
    id: "verify",
    stepNum: "05",
    title: "VERIFY DETERMINISTICALLY",
    command: "await expect(page.locator('.cart_badge')).toHaveText('1')",
    icon: ShieldCheck,
    outputSummary: "Deterministic Playwright assertion passes; evidence and report saved",
    details: [
      { label: "Assertion Type", value: "text invariant check" },
      { label: "Assertion Result", value: "PASSED (expected: '1', actual: '1')" },
      { label: "Artifacts Generated", value: "trace.json, verification.png, execution_log.md" },
    ],
  },
];

export function WorkflowSection() {
  const [activeStepIdx, setActiveStepIdx] = useState(0);
  const [resetNonce, setResetNonce] = useState(0);
  const [isInView, setIsInView] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const prefersReducedMotion = Boolean(shouldReduceMotion);

  const handleSelectStep = (idx: number) => {
    setActiveStepIdx(idx);
    setResetNonce((prev) => prev + 1);
  };

  // Pause auto-advance when section is outside viewport
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Automatically advance through the unfolding test execution; resets on manual selection
  useEffect(() => {
    if (prefersReducedMotion || !isInView) return;
    const timer = setTimeout(() => {
      setActiveStepIdx((prev) => (prev + 1) % EXECUTION_STEPS.length);
    }, 4200);
    return () => clearTimeout(timer);
  }, [activeStepIdx, isInView, prefersReducedMotion, resetNonce]);

  const activeStep = EXECUTION_STEPS[activeStepIdx];

  return (
    <section
      ref={sectionRef}
      id="how-it-works"
      className="py-16 sm:py-24 bg-[#08090b] border-b border-[#1b2026] relative scroll-mt-16"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
          <div>
            <div className="inline-flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-[#00e599] mb-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#00e599]" />
              <span>LIVE TEST UNFOLDING</span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-[-0.02em] text-white">
              Watch a test execute.
            </h2>
          </div>
          <p className="font-sans text-xs sm:text-sm text-zinc-400 font-normal leading-relaxed max-w-md sm:text-right">
            From initial natural-language intent to deterministic verification and report evidence.
          </p>
        </div>

        {/* ── Main Interactive Execution Workspace ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Execution Step Rail (lg:col-span-5) */}
          <div className="lg:col-span-5 relative pl-6 sm:pl-8 border-l border-[#1b2026] space-y-4">
            {/* Animated Active Rail Tracer */}
            {!prefersReducedMotion && (
              <motion.div
                className="absolute -left-[2px] w-[3px] rounded bg-gradient-to-b from-[#00e599] to-emerald-400"
                animate={{
                  top: `${(activeStepIdx / EXECUTION_STEPS.length) * 100}%`,
                  height: `${100 / EXECUTION_STEPS.length}%`,
                }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 30,
                }}
              />
            )}

            {EXECUTION_STEPS.map((step, idx) => {
              const Icon = step.icon;
              const isActive = activeStepIdx === idx;
              const isPast = activeStepIdx > idx;

              return (
                <button
                  type="button"
                  key={step.id}
                  onClick={() => handleSelectStep(idx)}
                  className={cn(
                    "group relative flex items-start gap-3.5 p-3 rounded-lg border transition-all duration-200 cursor-pointer select-none text-left w-full focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00e599]",
                    isActive
                      ? "border-[#00e599]/50 bg-[#12161b] shadow-xs"
                      : "border-transparent bg-transparent hover:border-[#1b2026] hover:bg-[#0d1013]"
                  )}
                  aria-label={`Step ${step.stepNum}: ${step.title}`}
                >
                  {/* Step Pin on the rail */}
                  <div
                    className={cn(
                      "absolute -left-[31px] sm:-left-[39px] top-3 flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full font-mono text-[10px] font-bold border transition-all duration-200",
                      isActive
                        ? "border-[#00e599] bg-[#00e599] text-[#08090b] shadow-xs scale-105"
                        : isPast
                        ? "border-emerald-700/60 bg-emerald-950/80 text-emerald-400"
                        : "border-[#222932] bg-[#0d1013] text-zinc-500 group-hover:border-zinc-700"
                    )}
                  >
                    {isPast ? <CheckCircle2 className="h-3 w-3" /> : step.stepNum}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between font-mono text-[10px] mb-0.5">
                      <div className="flex items-center gap-1.5">
                        <Icon className={cn("h-3 w-3", isActive ? "text-[#00e599]" : "text-zinc-500")} />
                        <span className={cn(isActive ? "text-[#00e599] font-bold" : "text-zinc-500")}>
                          STEP {step.stepNum}
                        </span>
                      </div>
                      {isActive && (
                        <span className="rounded bg-[#00e599]/15 border border-[#00e599]/40 px-1.5 py-0.2 text-[10px] font-semibold text-[#00e599]">
                          CURRENT
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-bold text-white tracking-tight">
                      {step.title}
                    </div>
                    <div className="text-[11px] text-zinc-400 font-mono truncate mt-0.5">
                      &gt; {step.command}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right: Detailed Execution Inspector (lg:col-span-7) */}
          <div className="lg:col-span-7 rounded-xl border border-[#1b2026] bg-[#0d1013] overflow-hidden shadow-xl">
            {/* Inspector Window Header */}
            <div className="flex items-center justify-between border-b border-[#1b2026] bg-[#101418] px-4 py-2.5 font-mono text-xs select-none">
              <div className="flex items-center gap-2 text-zinc-300">
                <Terminal className="h-3.5 w-3.5 text-[#00e599]" />
                <span className="font-semibold text-white">Execution Inspector</span>
                <span className="text-zinc-600">•</span>
                <span className="text-zinc-400 text-[11px]">Step #{activeStep.stepNum}</span>
              </div>
              <span className="text-[10px] rounded bg-[#12161b] border border-[#222932] px-2 py-0.5 text-zinc-400">
                TraceKit Engine v0.1
              </span>
            </div>

            {/* Inspector Body */}
            <div className="p-5 font-mono text-xs">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeStep.id}
                  initial={{ opacity: prefersReducedMotion ? 1 : 0, y: prefersReducedMotion ? 0 : 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  {/* Command line banner */}
                  <div className="rounded-lg bg-[#08090b] border border-[#222932] p-3">
                    <div className="text-[10px] text-zinc-500 uppercase font-semibold mb-1">
                      Executed Command:
                    </div>
                    <div className="text-sm font-semibold text-[#00e599] break-all">
                      {activeStep.command}
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="text-xs text-zinc-300 leading-relaxed font-sans">
                    {activeStep.outputSummary}
                  </div>

                  {/* Key-Value Telemetry Details */}
                  <div className="rounded-lg border border-[#222932] bg-[#12161b] p-3.5 space-y-2.5">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1 border-b border-zinc-800/60 pb-1.5">
                      Execution State Metrics
                    </div>
                    {activeStep.details.map((detail, dIdx) => (
                      <div key={dIdx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px]">
                        <span className="text-zinc-500">{detail.label}:</span>
                        <span className="text-zinc-200 font-medium sm:text-right">{detail.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Step status bar */}
                  <div className="pt-2 border-t border-[#1b2026] flex items-center justify-between text-[11px] text-zinc-500">
                    <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Step verified in deterministic runner</span>
                    </div>
                    <span>Latency: 142ms</span>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
