"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Terminal } from "lucide-react";
import { useAuth } from "@/context/auth-context";

export function FinalCTA() {
  const { isAuthenticated, isLoading } = useAuth();

  const runTestHref = isLoading ? "#" : isAuthenticated ? "/test" : "/login";

  const handleRunTestClick = (e: React.MouseEvent) => {
    if (isLoading) {
      e.preventDefault();
    }
  };

  return (
    <section id="final-cta-section" className="relative py-20 sm:py-28 bg-[#08090b] overflow-hidden">
      {/* Subtle Terminal Scanline Backdrop */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "radial-gradient(#00e599 1px, transparent 1px), radial-gradient(#00e599 1px, #08090b 1px)",
          backgroundSize: "32px 32px",
          backgroundPosition: "0 0, 16px 16px",
        }}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
        {/* Terminal Header Pin */}
        <div className="inline-flex items-center gap-2 rounded-md border border-[#1b2026] bg-[#0d1013] px-3 py-1 font-mono text-[11px] text-zinc-400 mb-8">
          <Terminal className="h-3.5 w-3.5 text-[#00e599]" />
          <span>INITIALIZE AUTONOMOUS RUN</span>
        </div>

        {/* Large Typography Narrative */}
        <h2 className="font-display text-3xl sm:text-5xl lg:text-6xl font-bold tracking-[-0.025em] text-white leading-[1.12] max-w-4xl mx-auto">
          Describe what you want tested.
          <span className="block text-zinc-400 font-medium text-2xl sm:text-4xl lg:text-5xl mt-2 sm:mt-3">
            TraceKit handles the browser.
          </span>
          <span className="block text-[#00e599] font-bold text-2xl sm:text-4xl lg:text-5xl mt-1 sm:mt-2">
            You inspect the result.
          </span>
        </h2>

        {/* Action Buttons */}
        <div className="mt-10 sm:mt-12 flex flex-wrap items-center justify-center gap-4">
          <Link
            href={runTestHref}
            onClick={handleRunTestClick}
            aria-busy={isLoading}
            id="cta-run-new-test"
            className="group inline-flex items-center gap-2 rounded-lg bg-[#00e599] hover:bg-[#00f5a0] px-6 py-3 text-sm font-semibold text-[#08090b] transition-all shadow-md hover:shadow-[#00e599]/20 active:scale-[0.98] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00e599]"
          >
            <span>Run New Test</span>
            <ArrowRight className="h-4 w-4 stroke-[2.5] transition-transform duration-150 group-hover:translate-x-1" />
          </Link>

          <Link
            href="/getting-started"
            id="cta-get-started"
            className="inline-flex items-center gap-2 rounded-lg border border-[#1b2026] bg-[#0d1013] hover:border-zinc-700 hover:bg-[#12161b] px-6 py-3 text-sm font-medium text-zinc-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-600"
          >
            <span>Documentation</span>
          </Link>
        </div>

        {/* Telemetry footnote */}
        <div className="mt-8 font-mono text-[11px] text-zinc-500">
          Chromium • Playwright Engine • 100% Deterministic Assertions
        </div>
      </div>
    </section>
  );
}
