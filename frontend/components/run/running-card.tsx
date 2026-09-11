"use client";

import React from "react";
import { Loader2, Monitor, Compass, ShieldCheck } from "lucide-react";
import { RunStatusResponse } from "@/lib/api";

interface RunningCardProps {
  run: RunStatusResponse;
  elapsedMs: number;
}

export function RunningCard({ run, elapsedMs }: RunningCardProps) {
  const seconds = (elapsedMs / 1000).toFixed(1);

  return (
    <div className="rounded-xl border border-[#22272b] bg-[#121518] p-6 shadow-xl flex flex-col gap-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#1f2428] pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-950/70 border border-emerald-800/50 text-emerald-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white text-sm sm:text-base">
                Autonomous Test Executing
              </span>
              <span className="font-mono text-[10px] text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-1.5 py-0.5 rounded">
                LIVE
              </span>
            </div>
            <span className="text-xs text-zinc-400">
              Agent is driving browser interactions and evaluating assertions...
            </span>
          </div>
        </div>

        {/* Stopwatch */}
        <div className="flex items-center gap-2 rounded-md border border-[#22272b] bg-[#0c0e10] px-3.5 py-2 self-start sm:self-auto font-mono text-xs text-zinc-300">
          <span className="text-zinc-500">Elapsed:</span>
          <span className="font-semibold text-emerald-400">{seconds}s</span>
        </div>
      </div>

      {/* Target & Environment Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 font-mono text-xs">
        <div className="flex flex-col gap-1 rounded-lg border border-[#1f2428] bg-[#0c0e10] p-3.5">
          <div className="flex items-center gap-1.5 text-zinc-500">
            <Monitor className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-[11px] uppercase tracking-wider">Browser Engine</span>
          </div>
          <span className="text-zinc-200 font-medium">Local Chromium</span>
          <span className="text-[10px] text-zinc-500">
            {run.headless ? "Headless background session" : "Visible headed session"}
          </span>
        </div>

        <div className="flex flex-col gap-1 rounded-lg border border-[#1f2428] bg-[#0c0e10] p-3.5">
          <div className="flex items-center gap-1.5 text-zinc-500">
            <Compass className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-[11px] uppercase tracking-wider">Target Domain</span>
          </div>
          <span className="truncate text-zinc-200 font-medium">{run.url}</span>
          <span className="text-[10px] text-zinc-500">Initial navigation point</span>
        </div>

        <div className="flex flex-col gap-1 rounded-lg border border-[#1f2428] bg-[#0c0e10] p-3.5">
          <div className="flex items-center gap-1.5 text-zinc-500">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-[11px] uppercase tracking-wider">Verification</span>
          </div>
          <span className="text-zinc-200 font-medium">Deterministic Engine</span>
          <span className="text-[10px] text-zinc-500">DOM pass/fail authority</span>
        </div>
      </div>

      {/* Honest execution status notice */}
      <div className="rounded-lg border border-zinc-800/80 bg-[#161a1e] p-4 text-xs leading-relaxed text-zinc-400">
        <p>
          <span className="font-semibold text-zinc-200">Execution in progress: </span>
          The autonomous agent is inspecting the active DOM, executing interactions, and capturing visual evidence. Structured action traces, deterministic assertion outcomes, and full visual screenshots will automatically render here as soon as the run completes.
        </p>
      </div>
    </div>
  );
}
