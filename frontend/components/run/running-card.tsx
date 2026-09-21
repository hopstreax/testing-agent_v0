"use client";

import React from "react";
import {
  Loader2,
  Monitor,
  Globe,
  Layers,
  Cpu,
  Radio,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { RunStatusResponse } from "@/lib/api";
import { extractHostname } from "@/lib/formatters";

interface RunningCardProps {
  run: RunStatusResponse;
  elapsedMs: number;
  connectionWarning?: string | null;
}

export function RunningCard({
  run,
  elapsedMs,
  connectionWarning,
}: RunningCardProps) {
  // Format MM:SS.s
  const totalSeconds = Math.max(0, elapsedMs / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = (totalSeconds % 60).toFixed(1);
  const formattedTime = `${mins.toString().padStart(2, "0")}:${secs.padStart(4, "0")}`;

  const hostname = extractHostname(run.url);
  const providerName = run.provider || "auto";
  const modelName = run.model || "default";

  const isInterrupted = !!connectionWarning;

  return (
    <div className="rounded-lg border border-[#1b2026] bg-[#0d1013] p-5 sm:p-6 shadow-md flex flex-col gap-6 relative overflow-hidden">
      {/* Background ambient pulse bar */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500/10 via-emerald-400/80 to-emerald-500/10 animate-pulse" />

      {/* Top Banner: Status Header & Connection Telemetry */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1b2026] pb-4">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 rounded bg-emerald-950/80 border border-emerald-800/60 px-2.5 py-1 font-mono text-xs font-bold tracking-wider text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <span>LIVE TELEMETRY</span>
          </span>

          <span className="font-mono text-xs text-zinc-400 font-medium">
            EXECUTION IN PROGRESS
          </span>
        </div>

        {/* Polling & Backend Health Pill */}
        <div className="flex items-center gap-2 font-mono text-[11px]">
          {isInterrupted ? (
            <div className="inline-flex items-center gap-1.5 rounded-md border border-amber-800/60 bg-amber-950/50 px-2.5 py-1 text-amber-300">
              <AlertCircle className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
              <span>RECONNECTING... (BACKOFF 2s)</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-md border border-[#22272b] bg-[#121518] px-2.5 py-1 text-zinc-400">
              <span className="flex items-center gap-1 text-emerald-400">
                <CheckCircle2 className="h-3 w-3" />
                <span>CONNECTED</span>
              </span>
              <span className="text-zinc-700 select-none">•</span>
              <span className="flex items-center gap-1 text-zinc-500">
                <Radio className="h-3 w-3 text-zinc-400" />
                <span>POLLING · 1s</span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Central Hero: Live Stopwatch Display */}
      <div className="flex flex-col items-center justify-center py-4 sm:py-6 gap-2 bg-[#090b0d] rounded-lg border border-[#1b2026]/70">
        <span className="font-mono text-[11px] uppercase tracking-widest text-zinc-500 font-semibold flex items-center gap-1.5">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
          <span>Active Execution Elapsed</span>
        </span>
        <div className="font-mono text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white select-all">
          <span className="text-emerald-400">{formattedTime}</span>
        </div>
        <span className="font-mono text-[10px] text-zinc-500">
          Continuous client-side stopwatch synchronized from run initialization
        </span>
      </div>

      {/* Target & Execution Parameters Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-xs">
        {/* 1. Target Domain */}
        <div className="flex flex-col gap-1 rounded-md border border-[#1f2428] bg-[#121518] p-3">
          <div className="flex items-center gap-1.5 text-zinc-500">
            <Globe className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-[10px] uppercase tracking-wider font-semibold">Target Domain</span>
          </div>
          <span className="text-zinc-200 font-medium truncate">{hostname}</span>
          <span className="text-[10px] text-zinc-500 truncate">{run.url}</span>
        </div>

        {/* 2. Browser Engine */}
        <div className="flex flex-col gap-1 rounded-md border border-[#1f2428] bg-[#121518] p-3">
          <div className="flex items-center gap-1.5 text-zinc-500">
            <Monitor className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-[10px] uppercase tracking-wider font-semibold">Browser Engine</span>
          </div>
          <span className="text-zinc-200 font-medium">Local Chromium</span>
          <span className="text-[10px] text-zinc-500">
            {run.headless ? "Headless background runner" : "Visible headed session"}
          </span>
        </div>

        {/* 3. Execution Budget */}
        <div className="flex flex-col gap-1 rounded-md border border-[#1f2428] bg-[#121518] p-3">
          <div className="flex items-center gap-1.5 text-zinc-500">
            <Layers className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-[10px] uppercase tracking-wider font-semibold">Max Step Budget</span>
          </div>
          <span className="text-zinc-200 font-medium">{run.max_steps ?? 15} Steps Max</span>
          <span className="text-[10px] text-zinc-500">Safety loop exhaustion limit</span>
        </div>

        {/* 4. AI Provider & Model */}
        <div className="flex flex-col gap-1 rounded-md border border-[#1f2428] bg-[#121518] p-3">
          <div className="flex items-center gap-1.5 text-zinc-500">
            <Cpu className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-[10px] uppercase tracking-wider font-semibold">AI Reasoning</span>
          </div>
          <span className="text-zinc-200 font-medium capitalize truncate">
            {providerName}
          </span>
          <span className="text-[10px] text-zinc-500 truncate">{modelName}</span>
        </div>
      </div>

      {/* Honest Telemetry Transparency Caption */}
      <div className="rounded-md border border-[#1f2428] bg-[#090b0d] p-3.5 text-xs font-mono text-zinc-400 leading-relaxed flex flex-col gap-1">
        <div className="flex items-center gap-1.5 text-zinc-300 font-semibold text-[11px]">
          <span className="text-emerald-400">●</span>
          <span>Live status synchronized from execution backend</span>
        </div>
        <p className="text-[11px] text-zinc-500">
          The autonomous agent is currently inspecting the live DOM, taking actions, and evaluating deterministic assertions in Chromium. Structured action traces, assertion verdicts, and full visual evidence will render here immediately when execution completes.
        </p>
      </div>
    </div>
  );
}
