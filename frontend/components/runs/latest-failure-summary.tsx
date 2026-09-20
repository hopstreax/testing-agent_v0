"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Flag, ArrowRight, ShieldCheck, RotateCcw } from "lucide-react";
import { getRun, RunStatusResponse, RunSummary } from "@/lib/api";

interface LatestFailureSummaryProps {
  latestFailedRun?: RunSummary;
}

export function LatestFailureSummary({
  latestFailedRun,
}: LatestFailureSummaryProps) {
  const [detail, setDetail] = useState<RunStatusResponse | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const failedRunId = latestFailedRun?.run_id;

  useEffect(() => {
    if (!failedRunId) return;

    let isMounted = true;

    async function fetchFailedDetail() {
      setIsLoadingDetail(true);
      try {
        const data = await getRun(failedRunId!);
        if (isMounted) {
          setDetail(data);
          setIsLoadingDetail(false);
        }
      } catch {
        if (isMounted) {
          setIsLoadingDetail(false);
        }
      }
    }

    void fetchFailedDetail();

    return () => {
      isMounted = false;
    };
  }, [failedRunId]);

  // If there are zero failed runs in history
  if (!latestFailedRun) {
    return (
      <div className="rounded-lg border border-[#1b2026] bg-[#0d1013] p-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md border border-emerald-800/50 bg-emerald-950/60 text-emerald-400">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="font-mono text-xs font-semibold text-white">
              All Systems Operational
            </span>
            <span className="font-mono text-[10px] text-zinc-400">
              Zero failures recorded in recent autonomous test runs.
            </span>
          </div>
        </div>
        <span className="rounded bg-emerald-950/70 border border-emerald-800/60 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-400">
          HEALTHY
        </span>
      </div>
    );
  }

  // Find failed step from detail
  const failedStep =
    detail?.result?.steps?.find((s) => !s.result.success) ||
    detail?.result?.steps?.[(detail?.result?.steps?.length ?? 1) - 1];

  const failedStepNumber = failedStep?.step_number ?? detail?.result?.steps_executed ?? 1;
  const failureMessage =
    failedStep?.result?.error_message ||
    detail?.result?.message ||
    detail?.error ||
    "Execution terminated before reaching goal.";

  const diagnosis = detail?.result?.diagnosis;

  let targetHost = latestFailedRun.url;
  try {
    const parsed = new URL(
      latestFailedRun.url.startsWith("http")
        ? latestFailedRun.url
        : `https://${latestFailedRun.url}`
    );
    targetHost = parsed.hostname;
  } catch {
    // Keep raw url
  }

  return (
    <div className="rounded-lg border border-[#1b2026] bg-[#0d1013] p-4 sm:p-5 flex flex-col gap-3.5 shadow-xs">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1b2026] pb-3">
        <div className="flex items-center gap-2.5">
          <Flag className="h-4 w-4 text-red-400 shrink-0" />
          <h3 className="text-xs sm:text-sm font-semibold tracking-tight text-white font-sans">
            Latest Failure Summary
          </h3>
          <span className="rounded bg-red-950/70 border border-red-800/60 px-2 py-0.5 font-mono text-[10px] font-bold text-red-400">
            {latestFailedRun.run_id}
          </span>
        </div>

        <Link
          href={`/runs/${latestFailedRun.run_id}`}
          className="inline-flex items-center gap-1 font-mono text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          <span>Open Full Execution Trace</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* 3-Column Inspection Body */}
      {isLoadingDetail ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 animate-pulse">
          <div className="h-28 rounded bg-[#121518]" />
          <div className="h-28 rounded bg-[#121518]" />
          <div className="h-28 rounded bg-[#121518]" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
          {/* Column 1: Failed Step / Code context */}
          <div className="flex flex-col gap-2 rounded-md border border-[#1f2428] bg-[#0a0c0e] p-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase font-bold tracking-wider text-red-400">
                Failed Step #{failedStepNumber}
              </span>
              <span className="font-mono text-[10px] text-zinc-500">
                {failedStep?.action_type || "action"}
              </span>
            </div>

            <div className="font-mono text-[11px] text-zinc-300 bg-[#08090b] rounded p-2 border border-[#1b2026] overflow-x-auto leading-relaxed max-h-20">
              <code>
                {failedStep?.action_details && Object.keys(failedStep.action_details).length > 0
                  ? JSON.stringify(failedStep.action_details, null, 2)
                  : `${latestFailedRun.goal}`}
              </code>
            </div>

            <p className="font-mono text-[10px] text-red-400/90 truncate leading-snug" title={failureMessage}>
              {failureMessage}
            </p>
          </div>

          {/* Column 2: Autonomous Diagnosis */}
          <div className="flex flex-col gap-2 rounded-md border border-[#1f2428] bg-[#0a0c0e] p-3 justify-between">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                  Root Cause Diagnosis
                </span>
                {diagnosis && (
                  <span className="rounded bg-red-950/60 border border-red-800/50 px-1.5 py-0.2 font-mono text-[9px] font-bold text-red-400">
                    {diagnosis.cause}
                  </span>
                )}
              </div>

              <p className="text-[11px] text-zinc-300 leading-relaxed line-clamp-3">
                {diagnosis?.summary || failureMessage}
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1 border-t border-[#1f2428]">
              <Link
                href={`/test?clone=${encodeURIComponent(latestFailedRun.run_id)}`}
                className="inline-flex items-center gap-1 rounded bg-emerald-950/70 border border-emerald-800/60 px-2 py-1 font-mono text-[10px] font-bold text-emerald-400 hover:bg-emerald-900/60 transition-colors"
              >
                <RotateCcw className="h-2.5 w-2.5" />
                <span>CLONE &amp; RETEST</span>
              </Link>

              <Link
                href={`/runs/${latestFailedRun.run_id}`}
                className="inline-flex items-center gap-1 rounded border border-[#22272b] bg-[#121518] px-2 py-1 font-mono text-[10px] text-zinc-300 hover:bg-[#181c20] hover:text-white transition-colors"
              >
                <span>INSPECT</span>
              </Link>
            </div>
          </div>

          {/* Column 3: Environment & Telemetry Snapshot */}
          <div className="flex flex-col gap-2 rounded-md border border-[#1f2428] bg-[#0a0c0e] p-3 justify-between">
            <span className="font-mono text-[10px] uppercase font-bold tracking-wider text-zinc-400">
              Environment Snapshot
            </span>

            <div className="flex flex-col gap-1.5 font-mono text-[11px]">
              <div className="flex items-center justify-between text-zinc-400">
                <span>Target Host:</span>
                <span className="text-zinc-200 truncate max-w-[150px]">{targetHost}</span>
              </div>
              <div className="flex items-center justify-between text-zinc-400">
                <span>Engine:</span>
                <span className="text-zinc-200">
                  {detail?.browser ? `${detail.browser} (Headless)` : "Chromium"}
                </span>
              </div>
              <div className="flex items-center justify-between text-zinc-400">
                <span>LLM Provider:</span>
                <span className="text-emerald-400 truncate max-w-[140px]">
                  {detail?.provider || "auto"} {detail?.model ? `· ${detail.model}` : ""}
                </span>
              </div>
              <div className="flex items-center justify-between text-zinc-400">
                <span>Console / HTTP:</span>
                <span className="text-zinc-300">
                  {detail?.result?.diagnostics?.console_errors ?? 0} errors ·{" "}
                  {detail?.result?.diagnostics?.failed_requests ?? 0} failed req
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 pt-1 border-t border-[#1f2428]">
              <span>Steps Executed: {detail?.result?.steps_executed ?? "—"}</span>
              <span>
                Duration:{" "}
                {latestFailedRun.duration_ms
                  ? `${(latestFailedRun.duration_ms / 1000).toFixed(1)}s`
                  : "—"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
