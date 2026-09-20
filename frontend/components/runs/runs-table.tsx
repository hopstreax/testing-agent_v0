"use client";

import React from "react";
import Link from "next/link";
import {
  Loader2,
  Eye,
  RotateCcw,
  Globe,
  Layers,
  ArrowUpRight,
} from "lucide-react";
import { RunSummary } from "@/lib/api";

interface RunsTableProps {
  runs: RunSummary[];
  isLoading: boolean;
  onClearFilters?: () => void;
  hasActiveFilters?: boolean;
}
import {
  formatDuration,
  formatRunDate,
  formatRelativeTime,
  extractHostname,
} from "@/lib/formatters";

export function RunsTable({
  runs,
  isLoading,
  onClearFilters,
  hasActiveFilters,
}: RunsTableProps) {
  // Loading skeleton
  if (isLoading) {
    return (
      <div className="rounded-lg border border-[#1b2026] bg-[#0d1013] overflow-hidden shadow-xs">
        <div className="border-b border-[#1b2026] bg-[#121518] px-4 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          Loading telemetry streams...
        </div>
        <div className="divide-y divide-[#1b2026]/60">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3.5 animate-pulse gap-4"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="h-5 w-16 rounded bg-[#1f2428]" />
                <div className="h-4 w-24 rounded bg-[#1f2428]" />
                <div className="flex flex-col gap-1.5 flex-1">
                  <div className="h-4 w-4/5 rounded bg-[#1f2428]" />
                  <div className="h-3 w-1/3 rounded bg-[#161a1e]" />
                </div>
              </div>
              <div className="hidden md:flex flex-col items-end gap-1.5 w-24">
                <div className="h-3 w-16 rounded bg-[#1f2428]" />
                <div className="h-3 w-12 rounded bg-[#161a1e]" />
              </div>
              <div className="h-6 w-14 rounded bg-[#1f2428]" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Empty filtered state
  if (runs.length === 0 && hasActiveFilters) {
    return (
      <div className="rounded-lg border border-[#1b2026] bg-[#0d1013] p-10 text-center flex flex-col items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-500">
          <Layers className="h-5 w-5" />
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold text-white">
            No matching test runs found
          </h3>
          <p className="text-xs text-zinc-400 max-w-sm">
            No executions match your active filter criteria. Try adjusting search terms or clearing status filters.
          </p>
        </div>
        {onClearFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="mt-1 inline-flex items-center gap-1.5 rounded-md border border-[#22272b] bg-[#121518] px-3 py-1.5 text-xs font-medium text-zinc-300 hover:border-zinc-700 hover:bg-[#161a1e] hover:text-white transition-colors cursor-pointer"
          >
            Clear all filters
          </button>
        )}
      </div>
    );
  }

  // Empty initial state
  if (runs.length === 0) {
    return (
      <div className="rounded-lg border border-[#1b2026] bg-[#0d1013] p-12 text-center flex flex-col items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-500">
          <Layers className="h-6 w-6" />
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold text-white">
            No test runs recorded yet
          </h3>
          <p className="text-xs text-zinc-400 max-w-sm">
            Launch your first autonomous test execution to see historical telemetry stream here.
          </p>
        </div>
        <Link
          href="/test"
          className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-emerald-400 hover:bg-emerald-300 px-3.5 py-1.5 text-xs font-semibold text-zinc-950 transition-colors shadow-xs active:scale-[0.98]"
        >
          <span>Run New Test</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[#1b2026] bg-[#0d1013] overflow-hidden shadow-xs">
      {/* Table Desktop Header */}
      <div className="hidden lg:grid grid-cols-12 gap-3 border-b border-[#1b2026] bg-[#121518] px-4 py-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-400 select-none">
        <div className="col-span-1">Status</div>
        <div className="col-span-2">Run ID / Created</div>
        <div className="col-span-5">Objective &amp; Target URL</div>
        <div className="col-span-2">Target Host / Context</div>
        <div className="col-span-1 text-right">Duration</div>
        <div className="col-span-1 text-right">Actions</div>
      </div>

      {/* Runs Rows */}
      <div className="divide-y divide-[#1b2026]/60">
        {runs.map((run) => {
          const isRunning = run.status === "running";
          const isPassed = run.status === "completed" && run.success === true;
          const isFailed = run.status === "failed" || run.success === false;
          const isError = run.status === "error";

          const relativeTime = formatRelativeTime(run.created_at, run.run_id);
          const hostname = extractHostname(run.url);

          return (
            <div
              key={run.run_id}
              className="group flex flex-col lg:grid lg:grid-cols-12 gap-3 lg:gap-3 p-3 lg:px-4 lg:py-2.5 hover:bg-[#15191d] transition-colors items-start lg:items-center"
            >
              {/* Col 1: Status */}
              <div className="lg:col-span-1 flex items-center gap-2">
                {isPassed && (
                  <span className="inline-flex items-center gap-1 rounded bg-emerald-950/70 border border-emerald-800/60 px-1.5 py-0.5 text-[10px] font-mono font-bold tracking-wider text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span>PASS</span>
                  </span>
                )}
                {isFailed && (
                  <span className="inline-flex items-center gap-1 rounded bg-red-950/70 border border-red-800/60 px-1.5 py-0.5 text-[10px] font-mono font-bold tracking-wider text-red-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                    <span>FAIL</span>
                  </span>
                )}
                {isRunning && (
                  <span className="inline-flex items-center gap-1 rounded bg-emerald-950/70 border border-emerald-800/60 px-1.5 py-0.5 text-[10px] font-mono font-bold tracking-wider text-emerald-400">
                    <Loader2 className="h-2.5 w-2.5 animate-spin" />
                    <span>RUN</span>
                  </span>
                )}
                {isError && (
                  <span className="inline-flex items-center gap-1 rounded bg-amber-950/70 border border-amber-800/60 px-1.5 py-0.5 text-[10px] font-mono font-bold tracking-wider text-amber-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                    <span>ERR</span>
                  </span>
                )}

                {/* Mobile Duration tag (floated top right on mobile) */}
                <div className="lg:hidden ml-auto font-mono text-xs text-zinc-300">
                  {formatDuration(run.duration_ms, run.status)}
                </div>
              </div>

              {/* Col 2: Run ID & Timestamp */}
              <div className="lg:col-span-2 flex flex-col gap-0.5 min-w-0">
                <Link
                  href={`/runs/${run.run_id}`}
                  className="font-mono text-xs font-semibold text-zinc-200 hover:text-emerald-400 transition-colors truncate"
                  title={run.run_id}
                >
                  {run.run_id}
                </Link>
                <span
                  suppressHydrationWarning
                  className="font-mono text-[10px] text-zinc-500 truncate"
                  title={formatRunDate(run.created_at, run.run_id)}
                >
                  {relativeTime || formatRunDate(run.created_at, run.run_id)}
                </span>
              </div>

              {/* Col 3: Objective & Target URL */}
              <div className="lg:col-span-5 flex flex-col gap-0.5 min-w-0 w-full">
                <Link
                  href={`/runs/${run.run_id}`}
                  className="text-xs font-medium text-white group-hover:text-emerald-300 transition-colors truncate leading-snug"
                  title={run.goal}
                >
                  {run.goal}
                </Link>
                <div className="flex items-center gap-1.5 text-zinc-500 font-mono text-[10px] truncate">
                  <Globe className="h-2.5 w-2.5 shrink-0 text-zinc-600" />
                  <span className="truncate text-zinc-400 hover:text-zinc-200 transition-colors">
                    {run.url}
                  </span>
                </div>
              </div>

              {/* Col 4: Target Host / Context */}
              <div className="lg:col-span-2 hidden lg:flex flex-col gap-0.5 min-w-0">
                <span className="font-mono text-xs text-zinc-300 truncate" title={hostname}>
                  {hostname}
                </span>
                <span className="font-mono text-[10px] text-emerald-400/70 tracking-wider">
                  ● WEB AGENT
                </span>
              </div>

              {/* Col 5: Duration */}
              <div className="lg:col-span-1 hidden lg:flex flex-col justify-center text-right font-mono text-xs text-zinc-200">
                <span className="font-semibold">
                  {formatDuration(run.duration_ms, run.status)}
                </span>
                <span className="text-[10px] text-zinc-600">execution</span>
              </div>

              {/* Col 6: Actions */}
              <div className="lg:col-span-1 flex items-center justify-end gap-1.5 w-full lg:w-auto pt-2 lg:pt-0 border-t border-[#1b2026]/40 lg:border-t-0">
                {/* Clone & Edit Action */}
                <Link
                  href={`/test?clone=${encodeURIComponent(run.run_id)}`}
                  className="flex h-7 w-7 items-center justify-center rounded border border-[#22272b] bg-[#121518] text-zinc-400 hover:border-emerald-700/60 hover:bg-[#161a1e] hover:text-emerald-400 transition-colors"
                  title="Clone this test configuration"
                >
                  <RotateCcw className="h-3 w-3" />
                </Link>

                {/* View Details Action */}
                <Link
                  href={`/runs/${run.run_id}`}
                  className="flex h-7 w-7 items-center justify-center rounded border border-[#22272b] bg-[#121518] text-zinc-400 hover:border-zinc-700 hover:bg-[#161a1e] hover:text-white transition-colors"
                  title="Open execution trace"
                >
                  <Eye className="h-3 w-3" />
                </Link>

                {/* Mobile chevron link */}
                <Link
                  href={`/runs/${run.run_id}`}
                  className="lg:hidden ml-auto inline-flex items-center gap-1 font-mono text-[11px] text-emerald-400"
                >
                  <span>View Details</span>
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
