"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  BrainCircuit,
  Globe,
  ShieldCheck,
  CheckCircle2,
  Terminal,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function ExecutionLoop() {
  const [activeStage, setActiveStage] = useState<0 | 1 | 2>(0);
  const [resetNonce, setResetNonce] = useState(0);
  const [isInView, setIsInView] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const prefersReducedMotion = Boolean(shouldReduceMotion);

  const handleSelectStage = (stage: 0 | 1 | 2) => {
    setActiveStage(stage);
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

  // Cycling through the 3 core loop stages: AI -> BROWSER -> VERIFICATION; resets on manual selection
  useEffect(() => {
    if (prefersReducedMotion || !isInView) return;
    const timer = setTimeout(() => {
      setActiveStage((prev) => ((prev + 1) % 3) as 0 | 1 | 2);
    }, 3600);
    return () => clearTimeout(timer);
  }, [activeStage, isInView, prefersReducedMotion, resetNonce]);

  return (
    <section
      ref={sectionRef}
      id="execution-loop"
      className="relative py-16 sm:py-24 bg-[#08090b] overflow-hidden border-b border-[#1b2026] scroll-mt-16"
    >
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-[#00e599] mb-3">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00e599]" />
            <span>TRACEKIT CORE THESIS</span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-[-0.02em] text-white leading-tight">
            The Execution Loop.
          </h2>
          <p className="mt-4 text-sm sm:text-base text-zinc-400 font-sans leading-relaxed">
            <strong className="text-white font-semibold">The AI decides what to do.</strong>{" "}
            Deterministic browser assertions decide whether it actually worked.
          </p>
        </div>

        {/* ── Main Loop Architecture Diagram ── */}
        <div className="relative grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-stretch">
          {/* ── NODE 1: AI AGENT ── */}
          <button
            type="button"
            onClick={() => handleSelectStage(0)}
            className={cn(
              "group relative flex flex-col justify-between text-left rounded-xl border p-5 sm:p-6 transition-all duration-200 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-purple-500",
              activeStage === 0
                ? "border-purple-500/50 bg-[#10131b] shadow-xs"
                : "border-[#1b2026] bg-[#0d1013] hover:border-zinc-700 hover:bg-[#12161b]"
            )}
            aria-label="Stage 01: AI Agent Decides Action"
          >
            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-3.5 border-b border-[#1b2026]">
                <div className="flex items-center gap-2.5">
                  <div
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-lg border transition-colors",
                      activeStage === 0
                        ? "border-purple-500/60 bg-purple-950/40 text-purple-400"
                        : "border-[#222932] bg-[#12161b] text-zinc-400"
                    )}
                  >
                    <BrainCircuit className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="font-mono text-[10px] text-zinc-500 uppercase font-semibold">STAGE 01</span>
                    <h3 className="font-display text-sm font-bold text-white tracking-tight">AI AGENT</h3>
                  </div>
                </div>
                <span className="font-mono text-[10px] rounded bg-purple-950/60 border border-purple-800/40 text-purple-300 px-2 py-0.5">
                  Decides Action
                </span>
              </div>

              {/* Responsibilities */}
              <div className="mt-4 space-y-2 text-xs text-zinc-400 font-sans">
                <div className="flex items-start gap-2">
                  <span className="mt-1.5 h-1 w-1 rounded-full bg-purple-400 shrink-0" />
                  <span><strong>Observe:</strong> Inspects DOM accessibility tree and coordinates.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="mt-1.5 h-1 w-1 rounded-full bg-purple-400 shrink-0" />
                  <span><strong>Reason:</strong> Synthesizes goal with visual perception.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="mt-1.5 h-1 w-1 rounded-full bg-purple-400 shrink-0" />
                  <span><strong>Formulate:</strong> Emits structured typed browser action.</span>
                </div>
              </div>
            </div>

            {/* Stage Telemetry Preview */}
            <div className="mt-6 pt-3 border-t border-[#1b2026] font-mono text-[10.5px]">
              <div className="text-purple-400 font-semibold mb-1 flex items-center gap-1.5">
                <Terminal className="h-3 w-3" />
                <span>Agent Decision:</span>
              </div>
              <div className="rounded bg-[#12161b] border border-[#222932] p-2 text-zinc-300 leading-snug">
                CLICK &#123; role: &quot;button&quot;, name: &quot;Add to cart&quot;, index: 0 &#125;
              </div>
            </div>
          </button>

          {/* ── NODE 2: REAL BROWSER ── */}
          <button
            type="button"
            onClick={() => handleSelectStage(1)}
            className={cn(
              "group relative flex flex-col justify-between text-left rounded-xl border p-5 sm:p-6 transition-all duration-200 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500",
              activeStage === 1
                ? "border-blue-500/50 bg-[#0e141c] shadow-xs"
                : "border-[#1b2026] bg-[#0d1013] hover:border-zinc-700 hover:bg-[#12161b]"
            )}
            aria-label="Stage 02: Real Browser Runtime Executes Change"
          >
            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-3.5 border-b border-[#1b2026]">
                <div className="flex items-center gap-2.5">
                  <div
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-lg border transition-colors",
                      activeStage === 1
                        ? "border-blue-500/60 bg-blue-950/40 text-blue-400"
                        : "border-[#222932] bg-[#12161b] text-zinc-400"
                    )}
                  >
                    <Globe className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="font-mono text-[10px] text-zinc-500 uppercase font-semibold">STAGE 02</span>
                    <h3 className="font-display text-sm font-bold text-white tracking-tight">BROWSER RUNTIME</h3>
                  </div>
                </div>
                <span className="font-mono text-[10px] rounded bg-blue-950/60 border border-blue-800/40 text-blue-300 px-2 py-0.5">
                  Executes Change
                </span>
              </div>

              {/* Responsibilities */}
              <div className="mt-4 space-y-2 text-xs text-zinc-400 font-sans">
                <div className="flex items-start gap-2">
                  <span className="mt-1.5 h-1 w-1 rounded-full bg-blue-400 shrink-0" />
                  <span><strong>Playwright Chromium:</strong> Dispatches real CDP browser actions.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="mt-1.5 h-1 w-1 rounded-full bg-blue-400 shrink-0" />
                  <span><strong>Performs:</strong> Click, type, hover, navigate, scroll.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="mt-1.5 h-1 w-1 rounded-full bg-blue-400 shrink-0" />
                  <span><strong>State Mutation:</strong> Triggers web app rerender & network requests.</span>
                </div>
              </div>
            </div>

            {/* Stage Telemetry Preview */}
            <div className="mt-6 pt-3 border-t border-[#1b2026] font-mono text-[10.5px]">
              <div className="text-blue-400 font-semibold mb-1 flex items-center gap-1.5">
                <Layers className="h-3 w-3" />
                <span>Resulting DOM State:</span>
              </div>
              <div className="rounded bg-[#12161b] border border-[#222932] p-2 text-zinc-300 leading-snug">
                button.state = &quot;Remove&quot; • cartCount = 1 • 200 OK
              </div>
            </div>
          </button>

          {/* ── NODE 3: DETERMINISTIC VERIFICATION ── */}
          <button
            type="button"
            onClick={() => handleSelectStage(2)}
            className={cn(
              "group relative flex flex-col justify-between text-left rounded-xl border p-5 sm:p-6 transition-all duration-200 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00e599]",
              activeStage === 2
                ? "border-[#00e599]/50 bg-[#0e1613] shadow-xs"
                : "border-[#1b2026] bg-[#0d1013] hover:border-zinc-700 hover:bg-[#12161b]"
            )}
            aria-label="Stage 03: Deterministic Verification Asserts Outcome"
          >
            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-3.5 border-b border-[#1b2026]">
                <div className="flex items-center gap-2.5">
                  <div
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-lg border transition-colors",
                      activeStage === 2
                        ? "border-[#00e599] bg-[#00e599]/20 text-[#00e599]"
                        : "border-[#222932] bg-[#12161b] text-zinc-400"
                    )}
                  >
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="font-mono text-[10px] text-zinc-500 uppercase font-semibold">STAGE 03</span>
                    <h3 className="font-display text-sm font-bold text-white tracking-tight">VERIFICATION</h3>
                  </div>
                </div>
                <span className="font-mono text-[10px] rounded bg-emerald-950/80 border border-emerald-800/60 text-emerald-300 px-2 py-0.5 font-semibold">
                  Asserts Outcome
                </span>
              </div>

              {/* Responsibilities */}
              <div className="mt-4 space-y-2 text-xs text-zinc-400 font-sans">
                <div className="flex items-start gap-2">
                  <span className="mt-1.5 h-1 w-1 rounded-full bg-[#00e599] shrink-0" />
                  <span><strong>Zero Guessing:</strong> Deterministic browser assertions evaluate invariants.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="mt-1.5 h-1 w-1 rounded-full bg-[#00e599] shrink-0" />
                  <span><strong>Checks:</strong> Visible, text, value, checked, count assertions.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="mt-1.5 h-1 w-1 rounded-full bg-[#00e599] shrink-0" />
                  <span><strong>Evidence:</strong> Captures screenshots and execution trace.</span>
                </div>
              </div>
            </div>

            {/* Stage Telemetry Preview */}
            <div className="mt-6 pt-3 border-t border-[#1b2026] font-mono text-[10.5px]">
              <div className="text-[#00e599] font-semibold mb-1 flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3" />
                <span>Deterministic Invariant:</span>
              </div>
              <div className="rounded bg-[#12161b] border border-emerald-900/50 p-2 text-emerald-300 leading-snug">
                expect(cart_badge).toHaveText(&quot;1&quot;) → PASSED
              </div>
            </div>
          </button>
        </div>

        {/* ── Architecture Loop Status Bar ── */}
        <div className="mt-8 rounded-xl border border-[#1b2026] bg-[#0d1013] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono text-xs">
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-[#00e599]" />
            <motion.span
              key={activeStage}
              initial={{ opacity: prefersReducedMotion ? 1 : 0, x: prefersReducedMotion ? 0 : 4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className="text-white font-semibold"
            >
              {activeStage === 0 && "AI Agent Reasoning"}
              {activeStage === 1 && "Browser Action Dispatched"}
              {activeStage === 2 && "Deterministic Invariant Confirmed"}
            </motion.span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="rounded bg-[#12161b] border border-[#222932] px-2 py-1 text-zinc-400">
              No LLM guessing in assertions
            </span>
            <span className="rounded bg-emerald-950/70 border border-emerald-800/50 px-2 py-1 text-emerald-300 font-semibold">
              100% Deterministic Outcome
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
