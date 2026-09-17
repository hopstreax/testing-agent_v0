"use client";

import React from "react";
import {
  Code2,
  BrainCircuit,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TRADITIONAL_LOOP = [
  { label: "Write static test script", subtext: "Predefined hardcoded test paths" },
  { label: "Rigid CSS/XPath selector", subtext: "Tied to implementation details" },
  { label: "Blind action dispatch", subtext: "No dynamic DOM state perception" },
  { label: "UI refactor occurs", subtext: "Selector changed or DOM restructured", isBreak: true },
  { label: "Test breaks (Flaky false-alarm)", subtext: "Build failed without actual bug", isBreak: true },
  { label: "Manual script maintenance", subtext: "Engineers re-record selectors", isBreak: true },
];

const TRACEKIT_LOOP = [
  { label: "Natural-language goal", subtext: 'Plain English intent: "Verify checkout"' },
  { label: "AI observes live DOM state", subtext: "Inspects accessibility tree & interactive elements" },
  { label: "Autonomous locator synthesis", subtext: "Prefers accessible role/name over brittle selectors" },
  { label: "Playwright executes action", subtext: "Typed CDP actions with element coordinates" },
  { label: "Deterministic verification", subtext: "Zero-LLM-hallucination Playwright assertions" },
  { label: "Inspectable evidence + diagnosis", subtext: "Screenshot, trace, and automated root cause" },
];

export function ComparisonSection() {
  return (
    <section id="comparison" className="py-16 sm:py-24 bg-[#08090b] border-b border-[#1b2026] relative scroll-mt-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-[#00e599] mb-3">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00e599]" />
            <span>THE TWO TESTING PARADIGMS</span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-[-0.02em] text-white">
            Two testing loops.
          </h2>
          <p className="mt-3 text-sm sm:text-base text-zinc-400 font-sans leading-relaxed">
            Comparing brittle hardcoded automation against autonomous perception paired with deterministic assertions.
          </p>
        </div>

        {/* ── Side-by-side Loops Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          {/* ── Left Column: Traditional Scripted Tests ── */}
          <div className="rounded-xl border border-[#1b2026] bg-[#0d1013] p-5 sm:p-7 flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-[#1b2026]">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#222932] bg-[#12161b] text-zinc-400">
                    <Code2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-mono text-sm font-bold text-zinc-300">TRADITIONAL SCRIPTED TESTS</h3>
                    <span className="font-mono text-[10px] text-zinc-500">Rigid Execution Loop</span>
                  </div>
                </div>
                <span className="font-mono text-[10px] rounded bg-[#12161b] border border-[#222932] text-zinc-400 px-2 py-0.5">
                  High Maintenance
                </span>
              </div>

              {/* Steps Flow */}
              <div className="mt-6 space-y-3 relative pl-6 border-l border-zinc-800/80">
                {TRADITIONAL_LOOP.map((item, idx) => (
                  <div key={idx} className="relative group">
                    {/* Pin */}
                    <div
                      className={cn(
                        "absolute -left-[30px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full border text-[9px] font-mono",
                        item.isBreak
                          ? "border-red-800/60 bg-red-950/80 text-red-400"
                          : "border-[#222932] bg-[#12161b] text-zinc-500"
                      )}
                    >
                      {item.isBreak ? "!" : idx + 1}
                    </div>

                    <div
                      className={cn(
                        "rounded-lg border p-2.5 transition-colors text-xs font-mono",
                        item.isBreak
                          ? "border-red-900/40 bg-red-950/15 text-red-300"
                          : "border-[#222932] bg-[#12161b] text-zinc-300"
                      )}
                    >
                      <div className="font-semibold">{item.label}</div>
                      <div className="text-[10px] text-zinc-500 font-sans mt-0.5">{item.subtext}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Summary */}
            <div className="mt-6 pt-3 border-t border-[#1b2026] font-mono text-[10.5px] text-zinc-500 flex items-center justify-between">
              <span>Failure Mode: Selector drift & flakiness</span>
              <span className="text-red-400 font-medium">Constant maintenance</span>
            </div>
          </div>

          {/* ── Right Column: TraceKit Autonomous Loop ── */}
          <div className="relative rounded-xl border border-[#00e599]/40 bg-[#0d1013] p-5 sm:p-7 flex flex-col justify-between shadow-xs">
            <div>
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#1b2026]">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#00e599]/50 bg-[#00e599]/15 text-[#00e599] shadow-xs">
                    <BrainCircuit className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-mono text-sm font-bold text-white">TRACEKIT AUTONOMOUS LOOP</h3>
                    <span className="font-mono text-[10px] text-[#00e599]">Deterministic Browser Loop</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[10px] rounded bg-[#00e599]/15 border border-[#00e599]/40 text-[#00e599] px-2 py-0.5 font-semibold">
                    AUTONOMOUS LOOP
                  </span>
                  <span className="font-mono text-[10px] rounded bg-emerald-950/80 border border-emerald-800/60 text-emerald-300 px-2 py-0.5 font-semibold">
                    Zero Selector Maintenance
                  </span>
                </div>
              </div>

              {/* Steps Flow */}
              <div className="mt-6 space-y-3 relative pl-6 border-l border-emerald-900/60">
                {TRACEKIT_LOOP.map((item, idx) => (
                  <div key={idx} className="relative group">
                    {/* Pin */}
                    <div className="absolute -left-[30px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full border border-emerald-700/60 bg-emerald-950/80 text-emerald-400 text-[9px] font-mono font-bold">
                      {idx + 1}
                    </div>

                    <div className="rounded-lg border border-[#222932] bg-[#12161b] p-2.5 text-xs font-mono text-zinc-200">
                      <div className="font-semibold text-white flex items-center justify-between">
                        <span>{item.label}</span>
                        <CheckCircle2 className="h-3 w-3 text-[#00e599] shrink-0" />
                      </div>
                      <div className="text-[10px] text-zinc-400 font-sans mt-0.5">{item.subtext}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Summary */}
            <div className="mt-6 pt-3 border-t border-[#1b2026] font-mono text-[10.5px] text-zinc-400 flex items-center justify-between">
              <span>Resolution: Deterministic Playwright verification</span>
              <span className="text-[#00e599] font-medium">Self-adapting</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
