import React from "react";
import Link from "next/link";
import { Play, Clock, BookOpen } from "lucide-react";

export function GettingStartedHeader() {
  return (
    <div className="flex flex-col gap-4">
      {/* Top Row: Eyebrow + Neutral Platform Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] font-semibold tracking-wider text-emerald-400 uppercase">
            GETTING STARTED / DEVELOPER ONBOARDING
          </span>
        </div>

        <div className="flex items-center gap-2 font-mono text-[10px] text-zinc-400">
          <span className="inline-flex items-center gap-1.5 rounded bg-[#121518] border border-[#22272b] px-2 py-0.5 font-semibold text-zinc-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
            <span>BROWSER-NATIVE TESTING</span>
          </span>
          <span className="text-zinc-700 select-none hidden sm:inline" aria-hidden="true">·</span>
          <span className="text-zinc-500 hidden sm:inline">ENGINE V0.1</span>
        </div>
      </div>

      {/* Center Row: Title, Description & Quick Action Row */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-[#1b2026] pb-6">
        <div className="flex flex-col gap-2 max-w-3xl">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-sans">
            Autonomous Web Testing in TraceKit
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed font-sans">
            TraceKit translates natural-language test objectives into typed browser actions,
            validates application state through deterministic assertions, and produces
            inspectable step-by-step evidence with automated failure diagnosis.
          </p>
        </div>

        {/* Action CTAs */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Link
            href="/test"
            id="getting-started-launch-btn"
            className="inline-flex items-center gap-2 rounded-md bg-emerald-400 hover:bg-emerald-300 px-3.5 py-1.5 text-xs font-bold text-zinc-950 transition-colors shadow-xs active:scale-[0.98] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#090a0c]"
          >
            <Play className="h-3 w-3 fill-current stroke-[2.5]" aria-hidden="true" />
            <span>Launch Test Studio</span>
          </Link>

          <Link
            href="/runs"
            className="inline-flex items-center gap-1.5 rounded-md border border-[#22272b] bg-[#121518] px-3 py-1.5 text-xs font-medium text-zinc-300 hover:border-zinc-700 hover:bg-[#161a1e] hover:text-white transition-colors cursor-pointer shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#090a0c]"
          >
            <Clock className="h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
            <span>View Runs</span>
          </Link>

          <Link
            href="/documentation"
            className="inline-flex items-center gap-1.5 rounded-md border border-[#22272b] bg-[#121518] px-3 py-1.5 text-xs font-medium text-zinc-300 hover:border-zinc-700 hover:bg-[#161a1e] hover:text-white transition-colors cursor-pointer shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#090a0c]"
          >
            <BookOpen className="h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
            <span>Documentation</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
