"use client";

import React from "react";
import { BarChart3, CheckCircle2, AlertCircle, Timer } from "lucide-react";
import { RunSummary } from "@/lib/api";

interface RunsStatsBarProps {
  runs: RunSummary[];
}

export function RunsStatsBar({ runs }: RunsStatsBarProps) {
  const totalRuns = runs.length;

  const passedRuns = runs.filter(
    (r) => r.status === "completed" && r.success === true
  ).length;

  const failedRuns = runs.filter(
    (r) => r.status === "failed" || r.status === "error" || (r.status === "completed" && r.success === false)
  ).length;

  const finishedRuns = passedRuns + failedRuns;

  const passRate =
    finishedRuns > 0 ? ((passedRuns / finishedRuns) * 100).toFixed(1) : "0.0";

  const failRate =
    finishedRuns > 0 ? ((failedRuns / finishedRuns) * 100).toFixed(1) : "0.0";

  const runsWithDuration = runs.filter(
    (r) => typeof r.duration_ms === "number" && r.duration_ms > 0
  );

  const avgDurationMs =
    runsWithDuration.length > 0
      ? runsWithDuration.reduce((acc, r) => acc + (r.duration_ms ?? 0), 0) /
        runsWithDuration.length
      : 0;

  const avgDurationSec =
    avgDurationMs > 0 ? (avgDurationMs / 1000).toFixed(1) : "—";

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* 1. TOTAL RUNS */}
      <div className="flex items-center justify-between rounded-lg border border-[#1b2026] bg-[#0d1013] p-3.5 shadow-xs">
        <div className="flex flex-col gap-1 min-w-0">
          <span className="font-mono text-[10px] font-semibold tracking-wider text-zinc-500 uppercase truncate">
            Total Runs
          </span>
          <span className="font-mono text-2xl font-bold tracking-tight text-white leading-none">
            {totalRuns}
          </span>
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-cyan-800/40 bg-cyan-950/40 text-cyan-400">
          <BarChart3 className="h-4 w-4" />
        </div>
      </div>

      {/* 2. PASS RATE */}
      <div className="flex items-center justify-between rounded-lg border border-[#1b2026] bg-[#0d1013] p-3.5 shadow-xs">
        <div className="flex flex-col gap-1 min-w-0">
          <span className="font-mono text-[10px] font-semibold tracking-wider text-zinc-500 uppercase truncate">
            Pass Rate
          </span>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold tracking-tight text-emerald-400 leading-none">
              {passRate}%
            </span>
            <span className="font-mono text-[11px] text-zinc-400 truncate">
              {passedRuns} passed
            </span>
          </div>
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-emerald-800/50 bg-emerald-950/60 text-emerald-400">
          <CheckCircle2 className="h-4 w-4" />
        </div>
      </div>

      {/* 3. FAILURES */}
      <div className="flex items-center justify-between rounded-lg border border-[#1b2026] bg-[#0d1013] p-3.5 shadow-xs">
        <div className="flex flex-col gap-1 min-w-0">
          <span className="font-mono text-[10px] font-semibold tracking-wider text-zinc-500 uppercase truncate">
            Failures
          </span>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold tracking-tight text-white leading-none">
              {failedRuns}
            </span>
            <span className="font-mono text-[11px] text-zinc-400 truncate">
              {failRate}%
            </span>
          </div>
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-red-800/50 bg-red-950/60 text-red-400">
          <AlertCircle className="h-4 w-4" />
        </div>
      </div>

      {/* 4. AVERAGE DURATION */}
      <div className="flex items-center justify-between rounded-lg border border-[#1b2026] bg-[#0d1013] p-3.5 shadow-xs">
        <div className="flex flex-col gap-1 min-w-0">
          <span className="font-mono text-[10px] font-semibold tracking-wider text-zinc-500 uppercase truncate">
            Average Duration
          </span>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold tracking-tight text-white leading-none">
              {avgDurationSec !== "—" ? `${avgDurationSec}s` : "—"}
            </span>
            <span className="font-mono text-[11px] text-zinc-400 truncate">
              {runsWithDuration.length} completed
            </span>
          </div>
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-sky-800/40 bg-sky-950/40 text-sky-400">
          <Timer className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}
