"use client";

import React from "react";
import {
  ShieldCheck,
  Timer,
  Activity,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  Monitor,
} from "lucide-react";
import { RunStatusResponse } from "@/lib/api";

interface RunKpiStripProps {
  run: RunStatusResponse;
  elapsedMs?: number;
}

export function RunKpiStrip({ run, elapsedMs }: RunKpiStripProps) {
  const isRunning = run.status === "running";
  const isPassed = run.status === "completed" && run.result?.success === true;
  const isFailed = run.status === "failed" || (run.result && !run.result.success);
  const isError = run.status === "error";

  // 1. Duration / Elapsed calculation
  const displayDurationMs =
    run.duration_ms ?? run.result?.duration_ms ?? elapsedMs ?? 0;
  const durationSecStr = (displayDurationMs / 1000).toFixed(1);

  // 2. Verifications / Assertions calculations
  const assertions = run.result?.assertions ?? [];
  const totalAssertions = assertions.length;
  const passedAssertions = assertions.filter((a) => a.success).length;

  // 3. Diagnostics calculation
  const diagnostics = run.result?.diagnostics;
  const hasDiagnostics = diagnostics !== undefined && diagnostics !== null;
  const consoleErrors =
    diagnostics?.console_errors ?? (diagnostics as Record<string, unknown> | undefined)?.console_error_count as number | undefined ?? 0;
  const httpErrors =
    diagnostics?.failed_requests ?? (diagnostics as Record<string, unknown> | undefined)?.http_error_count as number | undefined ?? 0;
  const totalAnomalies = consoleErrors + httpErrors;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* 1. EXECUTION VERDICT / STATUS */}
      <div className="flex items-center justify-between rounded-lg border border-[#1b2026] bg-[#0d1013] p-3.5 shadow-xs">
        <div className="flex flex-col gap-1 min-w-0">
          <span className="font-mono text-[10px] font-semibold tracking-wider text-zinc-500 uppercase truncate">
            Execution Verdict
          </span>
          <div className="flex items-baseline gap-2">
            {isRunning && (
              <span className="font-mono text-2xl font-bold tracking-tight text-emerald-400 leading-none">
                RUNNING
              </span>
            )}
            {isPassed && (
              <span className="font-mono text-2xl font-bold tracking-tight text-emerald-400 leading-none">
                PASSED
              </span>
            )}
            {isFailed && (
              <span className="font-mono text-2xl font-bold tracking-tight text-red-400 leading-none">
                FAILED
              </span>
            )}
            {isError && (
              <span className="font-mono text-2xl font-bold tracking-tight text-amber-400 leading-none">
                ERROR
              </span>
            )}
          </div>
          <span className="font-mono text-[11px] text-zinc-400 truncate">
            {isRunning
              ? "Autonomous runner active"
              : run.result?.termination_reason
              ? `Reason: ${run.result.termination_reason}`
              : "Execution finalized"}
          </span>
        </div>
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border ${
            isRunning
              ? "border-emerald-800/50 bg-emerald-950/60 text-emerald-400"
              : isPassed
              ? "border-emerald-800/50 bg-emerald-950/60 text-emerald-400"
              : isFailed
              ? "border-red-800/50 bg-red-950/60 text-red-400"
              : "border-amber-800/50 bg-amber-950/60 text-amber-400"
          }`}
        >
          {isRunning && <Loader2 className="h-4 w-4 animate-spin" />}
          {isPassed && <CheckCircle2 className="h-4 w-4" />}
          {isFailed && <XCircle className="h-4 w-4" />}
          {isError && <AlertTriangle className="h-4 w-4" />}
        </div>
      </div>

      {/* 2. DURATION / ELAPSED */}
      <div className="flex items-center justify-between rounded-lg border border-[#1b2026] bg-[#0d1013] p-3.5 shadow-xs">
        <div className="flex flex-col gap-1 min-w-0">
          <span className="font-mono text-[10px] font-semibold tracking-wider text-zinc-500 uppercase truncate">
            {isRunning ? "Elapsed Time" : "Total Duration"}
          </span>
          <div className="flex items-baseline gap-2">
            <span
              className={`font-mono text-2xl font-bold tracking-tight leading-none ${
                isRunning ? "text-emerald-400" : "text-white"
              }`}
            >
              {durationSecStr}s
            </span>
          </div>
          <span className="font-mono text-[11px] text-zinc-400 truncate">
            {isRunning
              ? "Live execution stopwatch"
              : `${run.result?.steps_executed ?? 0} steps executed`}
          </span>
        </div>
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border ${
            isRunning
              ? "border-emerald-800/50 bg-emerald-950/60 text-emerald-400"
              : "border-sky-800/40 bg-sky-950/40 text-sky-400"
          }`}
        >
          <Timer className="h-4 w-4" />
        </div>
      </div>

      {/* 3. VERIFICATIONS / BUDGET */}
      <div className="flex items-center justify-between rounded-lg border border-[#1b2026] bg-[#0d1013] p-3.5 shadow-xs">
        <div className="flex flex-col gap-1 min-w-0">
          <span className="font-mono text-[10px] font-semibold tracking-wider text-zinc-500 uppercase truncate">
            {isRunning ? "Execution Budget" : "Verifications"}
          </span>
          <div className="flex items-baseline gap-2">
            {isRunning ? (
              <span className="font-mono text-2xl font-bold tracking-tight text-white leading-none">
                {run.max_steps ?? 15}
              </span>
            ) : totalAssertions > 0 ? (
              <span
                className={`font-mono text-2xl font-bold tracking-tight leading-none ${
                  passedAssertions === totalAssertions
                    ? "text-emerald-400"
                    : "text-red-400"
                }`}
              >
                {passedAssertions} / {totalAssertions}
              </span>
            ) : (
              <span className="font-mono text-2xl font-bold tracking-tight text-zinc-400 leading-none">
                —
              </span>
            )}
          </div>
          <span className="font-mono text-[11px] text-zinc-400 truncate">
            {isRunning
              ? "Max steps safety limit"
              : totalAssertions > 0
              ? `${Math.round((passedAssertions / totalAssertions) * 100)}% assertions passed`
              : "No assertions evaluated"}
          </span>
        </div>
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border ${
            isRunning
              ? "border-zinc-800 bg-zinc-900 text-zinc-400"
              : totalAssertions > 0 && passedAssertions === totalAssertions
              ? "border-emerald-800/50 bg-emerald-950/60 text-emerald-400"
              : totalAssertions > 0
              ? "border-red-800/50 bg-red-950/60 text-red-400"
              : "border-zinc-800 bg-zinc-900 text-zinc-500"
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
        </div>
      </div>

      {/* 4. BROWSER HEALTH / ENGINE */}
      <div className="flex items-center justify-between rounded-lg border border-[#1b2026] bg-[#0d1013] p-3.5 shadow-xs">
        <div className="flex flex-col gap-1 min-w-0">
          <span className="font-mono text-[10px] font-semibold tracking-wider text-zinc-500 uppercase truncate">
            {hasDiagnostics ? "Browser Health" : "Browser Engine"}
          </span>
          <div className="flex items-baseline gap-2">
            {hasDiagnostics ? (
              <span
                className={`font-mono text-2xl font-bold tracking-tight leading-none ${
                  totalAnomalies === 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {totalAnomalies === 0 ? "0 Anomalies" : `${totalAnomalies} Errors`}
              </span>
            ) : (
              <span className="font-mono text-2xl font-bold tracking-tight text-white leading-none">
                Chromium
              </span>
            )}
          </div>
          <span className="font-mono text-[11px] text-zinc-400 truncate">
            {hasDiagnostics
              ? totalAnomalies === 0
                ? "Clean console & network"
                : `${consoleErrors} console · ${httpErrors} network`
              : run.headless
              ? "Headless background"
              : "Visible window session"}
          </span>
        </div>
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border ${
            hasDiagnostics && totalAnomalies === 0
              ? "border-emerald-800/50 bg-emerald-950/60 text-emerald-400"
              : hasDiagnostics && totalAnomalies > 0
              ? "border-red-800/50 bg-red-950/60 text-red-400"
              : "border-cyan-800/40 bg-cyan-950/40 text-cyan-400"
          }`}
        >
          {hasDiagnostics ? (
            totalAnomalies === 0 ? (
              <Activity className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )
          ) : (
            <Monitor className="h-4 w-4" />
          )}
        </div>
      </div>
    </div>
  );
}
