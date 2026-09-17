"use client";

import React, { useState } from "react";
import {
  AlertOctagon,
  Camera,
  Terminal,
  ChevronRight,
  XCircle,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function FailureExplanation() {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  return (
    <section id="diagnostics" className="py-16 sm:py-24 bg-[#08090b] border-b border-[#1b2026] relative overflow-hidden scroll-mt-16">
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
          <div>
            <div className="inline-flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-amber-400 mb-2">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              <span>DETERMINISTIC DIAGNOSTICS</span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-[-0.02em] text-white">
              A failed test shouldn&apos;t end with a mystery.
            </h2>
          </div>
          <p className="font-sans text-xs sm:text-sm text-zinc-400 font-normal leading-relaxed max-w-md sm:text-right">
            TraceKit explains exactly what changed, why the assertion failed, and attaches the visual evidence.
          </p>
        </div>

        {/* ── Main Two-Column Layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Traditional Error vs TraceKit Explanation (lg:col-span-5) */}
          <div className="lg:col-span-5 space-y-6">
            {/* The Old Way Box */}
            <div className="rounded-xl border border-red-900/30 bg-red-950/10 p-5">
              <div className="flex items-center gap-2 text-xs font-mono text-red-400 mb-2 font-semibold">
                <XCircle className="h-4 w-4" />
                <span>GENERIC TEST RUNNER OUTPUT</span>
              </div>
              <div className="rounded bg-[#08090b] border border-red-900/25 p-3 font-mono text-[11px] text-zinc-400 space-y-1">
                <div className="text-red-400">✕ TEST FAILED: Timeout 30000ms exceeded</div>
                <div className="text-zinc-500 text-[10px] truncate">&gt; waiting for locator(&apos;#submit-order&apos;)</div>
                <div className="text-zinc-500 text-[10px]">No explanation. Is it a bug, network lag, or a selector change?</div>
              </div>
            </div>

            {/* TraceKit Diagnostic Advantage */}
            <div className="rounded-xl border border-[#1b2026] bg-[#0d1013] p-5 space-y-4">
              <div className="font-mono text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#00e599]" />
                <span>The TraceKit Diagnostic Standard</span>
              </div>
              <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                TraceKit differentiates <strong className="text-amber-300 font-medium">Application Behavior Mismatches</strong> (actual product regressions) from <strong className="text-zinc-200 font-medium">Environment Errors</strong> (infrastructure/network downtime).
              </p>

              <div className="space-y-2 pt-2 border-t border-[#1b2026] font-mono text-[11px]">
                <div className="flex items-center justify-between text-zinc-300">
                  <span className="text-zinc-500">Classification:</span>
                  <span className="text-amber-400 font-medium">Exact regression category</span>
                </div>
                <div className="flex items-center justify-between text-zinc-300">
                  <span className="text-zinc-500">Root Cause:</span>
                  <span className="text-white font-medium">Plain-English summary</span>
                </div>
                <div className="flex items-center justify-between text-zinc-300">
                  <span className="text-zinc-500">Visual Evidence:</span>
                  <span className="text-[#00e599] font-medium">Deterministic screenshot</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Realistic Failure Diagnosis Workspace (lg:col-span-7) */}
          <div className="lg:col-span-7 rounded-xl border border-[#1b2026] bg-[#0d1013] p-5 sm:p-6 shadow-xl flex flex-col gap-4">
            {/* Header: Run Status & Classification */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1b2026] pb-3.5">
              <div className="flex items-center gap-2.5">
                <AlertOctagon className="h-5 w-5 text-amber-400" />
                <div>
                  <div className="font-mono text-xs font-bold text-white">
                    Deterministic Failure Diagnosis
                  </div>
                  <span className="font-mono text-[10px] text-zinc-400">Run #live-checkout-422</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded border border-amber-800/60 bg-amber-950/80 text-amber-300">
                  APPLICATION_BEHAVIOR_MISMATCH
                </span>
                <span className="font-mono text-[10px] bg-[#12161b] text-zinc-300 border border-[#222932] px-2 py-0.5 rounded">
                  ASSERTION_FAILED
                </span>
              </div>
            </div>

            {/* Root Cause Summary */}
            <div className="rounded-lg bg-[#08090b] border border-[#222932] p-3.5 font-mono text-xs space-y-2">
              <div className="text-zinc-400">
                <strong className="text-amber-300 uppercase text-[10.5px]">Root Cause Summary: </strong>
                <span>
                  The checkout form halted because the application returned HTTP 422 Unprocessable Entity due to missing billing CVV validation. The &quot;Place order&quot; button remained disabled.
                </span>
              </div>

              {/* Expected vs Observed */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-[#1b2026] text-[11px]">
                <div className="rounded bg-[#12161b] p-2 border border-[#222932]">
                  <div className="text-zinc-500 font-semibold text-[10px] uppercase">Expected:</div>
                  <div className="text-zinc-200 mt-0.5">button[name=&quot;Place order&quot;] to be enabled</div>
                </div>
                <div className="rounded bg-red-950/30 p-2 border border-red-900/40">
                  <div className="text-red-400 font-semibold text-[10px] uppercase">Observed:</div>
                  <div className="text-red-200 mt-0.5">aria-disabled=&quot;true&quot; (422 response)</div>
                </div>
              </div>
            </div>

            {/* Evidence & Telemetry Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 font-mono text-[11px]">
              <div className="rounded-lg border border-[#222932] bg-[#12161b] p-2.5 flex items-center gap-2">
                <Camera className="h-4 w-4 text-[#00e599] shrink-0" />
                <div className="truncate">
                  <div className="text-[10px] font-semibold text-zinc-500 uppercase">Evidence:</div>
                  <div className="text-zinc-200 text-[10px] truncate">checkout-disabled.png</div>
                </div>
              </div>

              <div className="rounded-lg border border-[#222932] bg-[#12161b] p-2.5 flex items-center gap-2">
                <Layers className="h-4 w-4 text-amber-400 shrink-0" />
                <div className="truncate">
                  <div className="text-[10px] font-semibold text-zinc-500 uppercase">Network Trace:</div>
                  <div className="text-amber-300 text-[10px] truncate">POST /checkout → 422</div>
                </div>
              </div>

              <div className="rounded-lg border border-[#222932] bg-[#12161b] p-2.5 flex items-center gap-2">
                <Terminal className="h-4 w-4 text-blue-400 shrink-0" />
                <div className="truncate">
                  <div className="text-[10px] font-semibold text-zinc-500 uppercase">Failed At:</div>
                  <div className="text-zinc-200 text-[10px] truncate">Step #4 (Verification)</div>
                </div>
              </div>
            </div>

            {/* Collapsible Technical Details */}
            <div className="pt-2 border-t border-[#1b2026]">
              <button
                type="button"
                aria-expanded={showTechnicalDetails}
                onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                className="flex items-center gap-1.5 font-mono text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer select-none"
              >
                <ChevronRight
                  className={cn("h-3 w-3 transition-transform duration-150", showTechnicalDetails && "rotate-90")}
                />
                <Terminal className="h-3 w-3 text-zinc-500" />
                <span>Inspect Playwright assertion exception</span>
              </button>

              {showTechnicalDetails && (
                <div className="mt-2.5 rounded-lg border border-[#222932] bg-[#08090b] p-3 font-mono text-[10.5px] leading-relaxed text-zinc-400 whitespace-pre-wrap">
                  AssertionError: Timed out 5000ms waiting for expect(locator).toBeEnabled(){"\n"}
                  Locator: page.getByRole(&apos;button&apos;, &#123; name: &apos;Place order&apos; &#125;){"\n"}
                  Expected: enabled{"\n"}
                  Received: disabled{"\n"}
                  Trace: CDP Execution ID #8194, Server Status: 422
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
