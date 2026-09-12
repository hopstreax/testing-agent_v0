"use client";

import React from "react";
import Link from "next/link";
import {
  ExternalLink,
  Clock,
  Layers,
  ArrowLeft,
  FileCode,
  FileText,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  Copy,
} from "lucide-react";
import { RunStatusResponse } from "@/lib/api";

interface RunHeaderProps {
  run: RunStatusResponse;
  elapsedMs?: number;
}

export function RunHeader({ run, elapsedMs }: RunHeaderProps) {
  const isRunning = run.status === "running";
  const isPassed = run.status === "completed" && run.result?.success === true;
  const isFailed = run.status === "failed" || (run.result && !run.result.success);
  const isError = run.status === "error";

  const displayDurationMs =
    run.duration_ms ?? run.result?.duration_ms ?? elapsedMs ?? 0;
  const durationSeconds = (displayDurationMs / 1000).toFixed(1);

  // Determine concise, scannable outcome message
  let displayOutcome = run.result?.message || "";
  if (isFailed && run.result?.diagnosis) {
    const raw = run.result.message || "";
    const summary = run.result.diagnosis.summary;

    if (raw.length > 100 && summary.includes(raw)) {
      let concise = summary.replace(raw, "").trim();
      if (concise.endsWith(":")) concise = concise.slice(0, -1).trim();
      if (!concise.endsWith(".")) concise += ".";
      displayOutcome = concise || "Automation failure encountered.";
    } else if (summary.length > 140 && summary.includes(": ")) {
      const firstColon = summary.indexOf(": ");
      const secondColon = summary.indexOf(": ", firstColon + 2);
      const splitIdx = secondColon !== -1 ? secondColon : firstColon;
      let concise = summary.substring(0, splitIdx).trim();
      if (!concise.endsWith(".")) concise += ".";
      displayOutcome = concise;
    } else if (summary) {
      displayOutcome = summary;
    }
  }

  return (
    <div className="flex flex-col gap-5 border-b border-[#1f2428] pb-6">
      {/* Top Navigation Row: Back Link & Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>New Test</span>
          </Link>

          <span className="text-zinc-700 select-none">•</span>

          <Link
            href={`/?clone=${run.run_id}`}
            id="clone-and-edit-btn"
            className="inline-flex items-center gap-1.5 rounded-md border border-[#22272b] bg-[#121518] px-2.5 py-1 text-xs font-medium text-zinc-200 hover:border-emerald-600/60 hover:bg-[#161a1e] hover:text-emerald-300 transition-colors shadow-xs"
            title="Clone this run configuration to create a new test"
          >
            <Copy className="h-3.5 w-3.5 text-emerald-400" />
            <span>Clone &amp; Edit</span>
          </Link>
        </div>

        {/* Artifact Links (Available when artifacts exist) */}
        {run.artifacts && (
          <div className="flex items-center gap-2">
            <a
              href={run.artifacts.report_json}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-[#22272b] bg-[#121518] px-2.5 py-1 text-[11px] font-mono text-zinc-300 hover:border-zinc-700 hover:bg-[#181c20] hover:text-white transition-colors"
            >
              <FileCode className="h-3.5 w-3.5 text-emerald-400" />
              <span>View JSON Report</span>
            </a>
            <a
              href={run.artifacts.report_md}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-[#22272b] bg-[#121518] px-2.5 py-1 text-[11px] font-mono text-zinc-300 hover:border-zinc-700 hover:bg-[#181c20] hover:text-white transition-colors"
            >
              <FileText className="h-3.5 w-3.5 text-emerald-400" />
              <span>View Markdown Report</span>
            </a>
          </div>
        )}
      </div>

      {/* Main Title & Status Row */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Badge */}
          {isRunning && (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-800/60 bg-emerald-950/60 px-2.5 py-1 text-xs font-mono font-semibold tracking-wider text-emerald-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>RUNNING</span>
            </span>
          )}
          {isPassed && (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-800/70 bg-emerald-950/80 px-2.5 py-1 text-xs font-mono font-semibold tracking-wider text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>PASSED</span>
            </span>
          )}
          {isFailed && (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-red-800/70 bg-red-950/80 px-2.5 py-1 text-xs font-mono font-semibold tracking-wider text-red-400">
              <XCircle className="h-3.5 w-3.5 text-red-400" />
              <span>FAILED</span>
            </span>
          )}
          {isError && (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-800/70 bg-amber-950/80 px-2.5 py-1 text-xs font-mono font-semibold tracking-wider text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
              <span>ERROR</span>
            </span>
          )}

          <span className="font-mono text-xs text-zinc-500">
            Run ID: <span className="text-zinc-300 font-medium">{run.run_id}</span>
          </span>
        </div>

        {/* Objective Goal as Primary Heading */}
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-snug">
          {run.goal}
        </h1>

        {/* Target URL with Link */}
        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          <span className="font-mono text-zinc-500">Target:</span>
          <a
            href={run.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-mono text-emerald-400 hover:underline"
          >
            <span>{run.url}</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* Execution Metrics Bar */}
      <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-2 font-mono text-xs text-zinc-400">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-zinc-500" />
          <span>
            {isRunning ? `Elapsed: ${durationSeconds}s` : `Duration: ${durationSeconds}s`}
          </span>
        </div>

        {run.result && (
          <div className="flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-zinc-500" />
            <span>Steps: {run.result.steps_executed}</span>
          </div>
        )}

        <div className="flex items-center gap-1.5 text-zinc-500">
          <span>Engine: Local Chromium</span>
          <span>•</span>
          <span>{run.headless ? "Headless" : "Headed"}</span>
        </div>

        {run.result?.termination_reason && (
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-500">Termination:</span>
            <span className="text-zinc-300">{run.result.termination_reason}</span>
          </div>
        )}
      </div>

      {/* Outcome message if available */}
      {displayOutcome && (
        <div className="rounded-lg border border-[#22272b] bg-[#101316] p-3 text-xs text-zinc-300 leading-relaxed">
          <span className="font-semibold text-zinc-200">Outcome: </span>
          <span>{displayOutcome}</span>
        </div>
      )}
    </div>
  );
}
