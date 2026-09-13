"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/shell/sidebar";
import { TopBar } from "@/components/shell/top-bar";
import { listRuns, RunSummary } from "@/lib/api";
import {
  Clock,
  Plus,
  RotateCcw,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  AlertCircle,
  Layers,
} from "lucide-react";

/**
 * Robust date formatter handling both ISO strings and YYYYMMDD_HHMMSS run IDs.
 */
function formatRunDate(createdAt: string | undefined, runId: string): string {
  if (createdAt && createdAt.trim()) {
    const d = new Date(createdAt);
    if (!isNaN(d.getTime())) {
      return d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    }
  }

  // Fallback: parse YYYYMMDD_HHMMSS prefix from run_id
  const match = runId.match(/^(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})/);
  if (match) {
    const [, y, m, d, h, min, s] = match;
    const date = new Date(
      parseInt(y, 10),
      parseInt(m, 10) - 1,
      parseInt(d, 10),
      parseInt(h, 10),
      parseInt(min, 10),
      parseInt(s, 10)
    );
    if (!isNaN(date.getTime())) {
      return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    }
  }

  return runId;
}

/**
 * Format execution duration consistently with Run Detail.
 */
function formatDuration(durationMs: number | null | undefined, status: string): string {
  if (status === "running") return "Running";
  if (durationMs == null) return "—";
  return `${(durationMs / 1000).toFixed(1)}s`;
}

export default function RunsPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadRuns() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await listRuns();
        if (!isMounted) return;
        setRuns(data);
        setIsLoading(false);
      } catch (err: unknown) {
        if (!isMounted) return;
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load test runs from backend server."
        );
        setIsLoading(false);
      }
    }

    loadRuns();

    return () => {
      isMounted = false;
    };
  }, [refreshTrigger]);

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="flex min-h-screen bg-[#090a0c] text-[#f4f4f6]">
      {/* Left Navigation Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top Bar */}
        <TopBar onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)} />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto px-4 py-8 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-5xl flex flex-col gap-6">
            {/* Header: Title, Real Count Pill, Description & CTA */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1f2428] pb-6">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold tracking-tight text-white">
                    Test Runs
                  </h1>
                  {!isLoading && !error && (
                    <span className="inline-flex items-center rounded-md border border-[#22272b] bg-[#121518] px-2 py-0.5 font-mono text-xs text-zinc-400">
                      {runs.length} {runs.length === 1 ? "run" : "runs"}
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-zinc-400">
                  History of autonomous test executions.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={isLoading}
                  className="inline-flex items-center gap-1.5 rounded-md border border-[#22272b] bg-[#121518] px-3 py-1.5 text-xs font-medium text-zinc-300 hover:border-zinc-700 hover:bg-[#161a1e] hover:text-white transition-colors disabled:opacity-50 cursor-pointer"
                  title="Refresh runs"
                >
                  <RotateCcw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin text-emerald-400" : "text-zinc-500"}`} />
                  <span>Refresh</span>
                </button>

                <Link
                  href="/test"
                  className="inline-flex items-center gap-1.5 rounded-md bg-emerald-400 hover:bg-emerald-300 px-3 py-1.5 text-xs font-semibold text-zinc-950 transition-colors cursor-pointer shadow-xs active:scale-[0.98]"
                >
                  <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                  <span>New Test</span>
                </Link>
              </div>
            </div>

            {/* Loading State: Clean Skeleton Table */}
            {isLoading && (
              <div className="rounded-xl border border-[#1f2428] bg-[#0e1114] overflow-hidden">
                <div className="border-b border-[#1f2428] bg-[#121518] px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-zinc-500">
                  Loading test runs...
                </div>
                <div className="divide-y divide-[#1f2428]/60">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-4 animate-pulse gap-4"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="h-6 w-20 rounded bg-[#1f2428]" />
                        <div className="flex flex-col gap-2 flex-1">
                          <div className="h-4 w-3/4 rounded bg-[#1f2428]" />
                          <div className="h-3 w-1/3 rounded bg-[#161a1e]" />
                        </div>
                      </div>
                      <div className="hidden sm:flex flex-col items-end gap-1.5 w-32">
                        <div className="h-3 w-20 rounded bg-[#1f2428]" />
                        <div className="h-3 w-12 rounded bg-[#161a1e]" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error State */}
            {error && !isLoading && (
              <div className="rounded-xl border border-red-900/60 bg-red-950/25 p-6 flex flex-col items-center text-center gap-3">
                <AlertCircle className="h-8 w-8 text-red-400" />
                <div className="flex flex-col gap-1">
                  <h3 className="text-sm font-semibold text-white">
                    Unable to load run history
                  </h3>
                  <p className="text-xs text-zinc-400 font-mono max-w-md">
                    {error}
                  </p>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <button
                    type="button"
                    onClick={handleRefresh}
                    className="inline-flex items-center gap-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 px-3.5 py-1.5 text-xs font-medium text-white transition-colors cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Try again</span>
                  </button>
                  <Link
                    href="/test"
                    className="text-xs text-zinc-400 hover:text-white transition-colors"
                  >
                    Return to New Test
                  </Link>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && !error && runs.length === 0 && (
              <div className="rounded-xl border border-[#1f2428] bg-[#0e1114] p-12 text-center flex flex-col items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-500">
                  <Layers className="h-6 w-6" />
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="text-sm font-semibold text-white">
                    No test runs yet
                  </h3>
                  <p className="text-xs text-zinc-400 max-w-sm">
                    Launch your first autonomous test to see execution history here.
                  </p>
                </div>
                <Link
                  href="/test"
                  className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-emerald-400 hover:bg-emerald-300 px-3.5 py-1.5 text-xs font-semibold text-zinc-950 transition-colors shadow-xs active:scale-[0.98]"
                >
                  <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                  <span>New Test</span>
                </Link>
              </div>
            )}

            {/* Run List / Table */}
            {!isLoading && !error && runs.length > 0 && (
              <div className="rounded-xl border border-[#1f2428] bg-[#0e1114] overflow-hidden shadow-xs">
                {/* Desktop Table Header */}
                <div className="hidden md:grid grid-cols-12 gap-4 border-b border-[#1f2428] bg-[#121518] px-4 py-2.5 font-mono text-[11px] uppercase tracking-wider text-zinc-500">
                  <div className="col-span-2">Status</div>
                  <div className="col-span-6">Objective & Target</div>
                  <div className="col-span-2 text-right">Started</div>
                  <div className="col-span-2 text-right">Duration</div>
                </div>

                {/* Runs Rows */}
                <div className="divide-y divide-[#1f2428]/60">
                  {runs.map((run) => {
                    const isRunning = run.status === "running";
                    const isPassed =
                      run.status === "completed" && run.success === true;
                    const isFailed =
                      run.status === "failed" || run.success === false;
                    const isError = run.status === "error";

                    return (
                      <Link
                        key={run.run_id}
                        href={`/runs/${run.run_id}`}
                        className="group flex flex-col md:grid md:grid-cols-12 gap-3 md:gap-4 p-4 hover:bg-[#15191d] transition-colors cursor-pointer outline-hidden focus-visible:bg-[#15191d] focus-visible:ring-1 focus-visible:ring-emerald-500"
                      >
                        {/* Column 1: Status Badge & Run ID */}
                        <div className="md:col-span-2 flex items-center md:items-start gap-2 flex-wrap">
                          {isRunning && (
                            <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-800/60 bg-emerald-950/60 px-2 py-0.5 text-[11px] font-mono font-semibold tracking-wider text-emerald-400">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              <span>RUNNING</span>
                            </span>
                          )}
                          {isPassed && (
                            <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-800/70 bg-emerald-950/80 px-2 py-0.5 text-[11px] font-mono font-semibold tracking-wider text-emerald-400">
                              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                              <span>PASSED</span>
                            </span>
                          )}
                          {isFailed && (
                            <span className="inline-flex items-center gap-1.5 rounded-md border border-red-800/70 bg-red-950/80 px-2 py-0.5 text-[11px] font-mono font-semibold tracking-wider text-red-400">
                              <XCircle className="h-3 w-3 text-red-400" />
                              <span>FAILED</span>
                            </span>
                          )}
                          {isError && (
                            <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-800/70 bg-amber-950/80 px-2 py-0.5 text-[11px] font-mono font-semibold tracking-wider text-amber-400">
                              <AlertTriangle className="h-3 w-3 text-amber-400" />
                              <span>ERROR</span>
                            </span>
                          )}

                          {/* Mobile-only duration tag */}
                          <div className="md:hidden ml-auto flex items-center gap-2 font-mono text-xs text-zinc-400">
                            <Clock className="h-3 w-3 text-zinc-500" />
                            <span>{formatDuration(run.duration_ms, run.status)}</span>
                          </div>
                        </div>

                        {/* Column 2: Objective & Target URL */}
                        <div className="md:col-span-6 flex flex-col gap-1 min-w-0">
                          <span className="text-xs sm:text-sm font-medium text-white group-hover:text-emerald-300 transition-colors line-clamp-2 md:line-clamp-1 leading-snug">
                            {run.goal}
                          </span>

                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-mono text-[11px] text-zinc-400 truncate max-w-[260px] sm:max-w-md">
                              {run.url}
                            </span>
                            <span className="text-zinc-600 select-none">•</span>
                            <span className="font-mono text-[11px] text-zinc-500 shrink-0">
                              {run.run_id}
                            </span>
                          </div>
                        </div>

                        {/* Column 3: Started Timestamp */}
                        <div className="md:col-span-2 hidden md:flex flex-col justify-center text-right font-mono text-[11px] text-zinc-400">
                          <span suppressHydrationWarning>
                            {formatRunDate(run.created_at, run.run_id)}
                          </span>
                        </div>

                        {/* Column 4: Duration & Hover Chevron */}
                        <div className="md:col-span-2 flex items-center justify-between md:justify-end gap-3 font-mono text-xs text-zinc-300">
                          {/* Mobile-only timestamp */}
                          <span suppressHydrationWarning className="md:hidden text-[11px] text-zinc-500">
                            {formatRunDate(run.created_at, run.run_id)}
                          </span>

                          <div className="hidden md:flex items-center gap-1.5">
                            <span>{formatDuration(run.duration_ms, run.status)}</span>
                          </div>

                          <ChevronRight className="h-4 w-4 text-zinc-500 group-hover:text-zinc-300 group-hover:translate-x-0.5 transition-all shrink-0" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
