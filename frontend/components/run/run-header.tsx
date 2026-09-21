"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ExternalLink,
  ArrowLeft,
  FileCode,
  FileText,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  Copy,
  Check,
  Monitor,
  Cpu,
  Clock,
} from "lucide-react";
import { RunStatusResponse } from "@/lib/api";
import { formatRunDate } from "@/lib/formatters";

interface RunHeaderProps {
  run: RunStatusResponse;
  elapsedMs?: number;
}

export function RunHeader({ run, elapsedMs }: RunHeaderProps) {
  const [copied, setCopied] = useState(false);

  const isRunning = run.status === "running";
  const isPassed = run.status === "completed" && run.result?.success === true;
  const isFailed = run.status === "failed" || (run.result && !run.result.success);
  const isError = run.status === "error";

  const displayDurationMs =
    run.duration_ms ?? run.result?.duration_ms ?? elapsedMs ?? 0;
  const durationSeconds = (displayDurationMs / 1000).toFixed(1);

  // Copy Run ID to clipboard with temporary feedback
  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(run.run_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard write failures
    }
  };

  // Determine concise scannable outcome message
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

  const providerName = run.result?.llm_provider || run.provider;
  const modelName = run.result?.llm_model || run.model;

  return (
    <div className="flex flex-col gap-4">
      {/* 1. Top Navigation & Global Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Back Link & Run ID with Copy Action */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Link
            href="/runs"
            className="inline-flex items-center gap-1.5 rounded-md border border-[#22272b] bg-[#121518] px-2.5 py-1 text-xs font-medium text-zinc-300 hover:border-zinc-700 hover:bg-[#161a1e] hover:text-white transition-colors shadow-xs"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Runs</span>
          </Link>

          <span className="hidden sm:inline text-zinc-700 select-none">•</span>

          {/* Run ID with Copy Pill */}
          <div className="flex items-center gap-1.5 rounded-md border border-[#1f2428] bg-[#0c0e10] px-2.5 py-1 font-mono text-xs">
            <span className="text-zinc-500">RUN:</span>
            <span className="text-zinc-200 font-medium truncate max-w-[180px] sm:max-w-none">
              {run.run_id}
            </span>
            <button
              type="button"
              onClick={handleCopyId}
              className="ml-1 text-zinc-400 hover:text-emerald-400 transition-colors cursor-pointer p-0.5"
              title="Copy Run ID"
              aria-label="Copy Run ID"
            >
              {copied ? (
                <Check className="h-3 w-3 text-emerald-400" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </button>
            {copied && (
              <span className="font-mono text-[10px] text-emerald-400 font-semibold animate-in fade-in">
                Copied
              </span>
            )}
          </div>
        </div>

        {/* Right: Clone & Edit + Report Artifact Links */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/test?clone=${run.run_id}`}
            id="clone-and-edit-btn"
            className="inline-flex items-center gap-1.5 rounded-md border border-[#22272b] bg-[#121518] px-2.5 py-1 text-xs font-medium text-zinc-200 hover:border-emerald-600/60 hover:bg-[#161a1e] hover:text-emerald-300 transition-colors shadow-xs"
            title="Clone this run configuration to create a new test"
          >
            <Copy className="h-3.5 w-3.5 text-emerald-400" />
            <span>Clone &amp; Edit</span>
          </Link>

          {run.artifacts && (
            <>
              <a
                href={run.artifacts.report_json}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-[#22272b] bg-[#121518] px-2.5 py-1 font-mono text-[11px] text-zinc-300 hover:border-zinc-700 hover:bg-[#181c20] hover:text-white transition-colors"
                title="Open raw machine-readable JSON report in new tab"
              >
                <FileCode className="h-3.5 w-3.5 text-emerald-400" />
                <span>JSON</span>
              </a>
              <a
                href={run.artifacts.report_md}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-[#22272b] bg-[#121518] px-2.5 py-1 font-mono text-[11px] text-zinc-300 hover:border-zinc-700 hover:bg-[#181c20] hover:text-white transition-colors"
                title="Open formatted Markdown report in new tab"
              >
                <FileText className="h-3.5 w-3.5 text-emerald-400" />
                <span>Markdown</span>
              </a>
            </>
          )}
        </div>
      </div>

      {/* 2. Primary Hero Context Card */}
      <div className="rounded-lg border border-[#1b2026] bg-[#0d1013] p-5 shadow-xs flex flex-col gap-4">
        {/* Status Pill & Started Timestamp Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1b2026] pb-3.5">
          <div className="flex items-center gap-2.5">
            {isRunning && (
              <span className="inline-flex items-center gap-1.5 rounded bg-emerald-950/70 border border-emerald-800/60 px-2.5 py-1 font-mono text-xs font-bold tracking-wider text-emerald-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>● LIVE EXECUTION IN PROGRESS</span>
              </span>
            )}
            {isPassed && (
              <span className="inline-flex items-center gap-1.5 rounded bg-emerald-950/70 border border-emerald-800/60 px-2.5 py-1 font-mono text-xs font-bold tracking-wider text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>● PASSED</span>
              </span>
            )}
            {isFailed && (
              <span className="inline-flex items-center gap-1.5 rounded bg-red-950/70 border border-red-800/60 px-2.5 py-1 font-mono text-xs font-bold tracking-wider text-red-400">
                <XCircle className="h-3.5 w-3.5" />
                <span>● FAILED</span>
              </span>
            )}
            {isError && (
              <span className="inline-flex items-center gap-1.5 rounded bg-amber-950/70 border border-amber-800/60 px-2.5 py-1 font-mono text-xs font-bold tracking-wider text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>● ERROR</span>
              </span>
            )}

            {run.result?.termination_reason && !isRunning && (
              <span className="font-mono text-[11px] text-zinc-500 bg-[#121518] border border-[#1f2428] px-2 py-0.5 rounded hidden sm:inline">
                {run.result.termination_reason}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px] text-zinc-500">
            <Clock className="h-3.5 w-3.5 text-zinc-600" />
            <span>Started: {formatRunDate(run.created_at, run.run_id)}</span>
          </div>
        </div>

        {/* Natural Language Objective Headline */}
        <div className="flex flex-col gap-1.5">
          <span className="font-mono text-[10px] uppercase font-bold tracking-wider text-zinc-500">
            Test Objective
          </span>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white leading-relaxed font-sans">
            {run.goal}
          </h1>
        </div>

        {/* Target URL link & Technical Environment Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-[#1b2026] text-xs font-mono">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-zinc-500 uppercase tracking-wider text-[10px]">
              Target:
            </span>
            <a
              href={run.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 hover:underline truncate max-w-md"
            >
              <span className="truncate">{run.url}</span>
              <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-400">
            <div className="flex items-center gap-1 text-zinc-500">
              <Monitor className="h-3.5 w-3.5 text-zinc-500" />
              <span>Local Chromium ({run.headless ? "Headless" : "Headed"})</span>
            </div>

            {providerName && (
              <>
                <span className="text-zinc-700 select-none">•</span>
                <div className="flex items-center gap-1 text-zinc-400">
                  <Cpu className="h-3.5 w-3.5 text-zinc-500" />
                  <span>
                    {providerName}
                    {modelName ? ` (${modelName})` : ""}
                  </span>
                </div>
              </>
            )}

            {!isRunning && (
              <>
                <span className="text-zinc-700 select-none">•</span>
                <span className="text-zinc-400">
                  Duration: <strong className="text-zinc-200">{durationSeconds}s</strong>
                </span>
              </>
            )}
          </div>
        </div>

        {/* Outcome Summary for Completed Runs */}
        {displayOutcome && !isRunning && (
          <div className="rounded-md border border-[#22272b] bg-[#121518] p-3 text-xs text-zinc-300 leading-relaxed font-sans">
            <span className="font-semibold text-zinc-200 font-mono text-[11px] uppercase tracking-wider block mb-0.5">
              Synthesis Outcome
            </span>
            <span>{displayOutcome}</span>
          </div>
        )}
      </div>
    </div>
  );
}
