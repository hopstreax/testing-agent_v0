"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/shell/sidebar";
import { TopBar } from "@/components/shell/top-bar";
import { WorkspaceFooter } from "@/components/shell/workspace-footer";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { listRuns, RunSummary } from "@/lib/api";
import { AlertCircle, RotateCcw } from "lucide-react";

import { RunsHeader } from "@/components/runs/runs-header";
import { RunsStatsBar } from "@/components/runs/runs-stats-bar";
import { RunsToolbar, StatusFilter, DateFilter } from "@/components/runs/runs-toolbar";
import { RunsTable } from "@/components/runs/runs-table";
import { RunsPagination } from "@/components/runs/runs-pagination";
import { LatestFailureSummary } from "@/components/runs/latest-failure-summary";
import { getRunTimestamp } from "@/lib/formatters";

export default function RunsPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Client-side search & filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [dateFilter, setDateFilter] = useState<DateFilter>("ALL");

  // Client-side pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [referenceTime, setReferenceTime] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadRuns() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await listRuns();
        if (!isMounted) return;
        setRuns(data);
        setReferenceTime(Date.now());
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

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (status: StatusFilter) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const handleDateFilterChange = (date: DateFilter) => {
    setDateFilter(date);
    setCurrentPage(1);
  };

  // Client-side filtered runs
  const filteredRuns = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return runs.filter((run) => {
      // 1. Text search across goal, url, and run_id
      if (query) {
        const matchesGoal = run.goal?.toLowerCase().includes(query);
        const matchesUrl = run.url?.toLowerCase().includes(query);
        const matchesId = run.run_id?.toLowerCase().includes(query);
        if (!matchesGoal && !matchesUrl && !matchesId) {
          return false;
        }
      }

      // 2. Status filter
      if (statusFilter === "PASSED") {
        if (!(run.status === "completed" && run.success === true)) return false;
      } else if (statusFilter === "FAILED") {
        if (!(run.status === "failed" || run.success === false)) return false;
      } else if (statusFilter === "RUNNING") {
        if (run.status !== "running") return false;
      } else if (statusFilter === "ERROR") {
        if (run.status !== "error") return false;
      }

      // 3. Date range filter
      if (dateFilter !== "ALL" && referenceTime > 0) {
        const runTime = getRunTimestamp(run.created_at, run.run_id);
        if (runTime > 0) {
          const diffMs = referenceTime - runTime;
          if (dateFilter === "24H" && diffMs > 24 * 60 * 60 * 1000) return false;
          if (dateFilter === "7D" && diffMs > 7 * 24 * 60 * 60 * 1000) return false;
          if (dateFilter === "30D" && diffMs > 30 * 24 * 60 * 60 * 1000) return false;
        }
      }

      return true;
    });
  }, [runs, searchQuery, statusFilter, dateFilter, referenceTime]);

  // Paginated slice
  const paginatedRuns = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRuns.slice(start, start + pageSize);
  }, [filteredRuns, currentPage, pageSize]);

  // Identify latest failed run across loaded dataset for failure summary
  const latestFailedRun = useMemo(() => {
    return runs.find(
      (r) =>
        r.status === "failed" ||
        r.status === "error" ||
        (r.status === "completed" && r.success === false)
    );
  }, [runs]);

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    statusFilter !== "ALL" ||
    dateFilter !== "ALL";

  const handleClearFilters = () => {
    setSearchQuery("");
    setStatusFilter("ALL");
    setDateFilter("ALL");
    setCurrentPage(1);
  };

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-[#08090b] text-[#f4f4f6]">
        {/* Left Navigation Sidebar */}
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <div className="flex flex-1 flex-col min-w-0">
          {/* Top Bar */}
          <TopBar onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)} />

          {/* New Test Studio / Observatory Content */}
          <main className="relative flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 xl:px-10">
            {/* Subtle background dot-grid texture matching TraceKit visual identity */}
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.025]"
              style={{
                backgroundImage:
                  "radial-gradient(#00e599 1px, transparent 1px), radial-gradient(#00e599 1px, #08090b 1px)",
                backgroundSize: "28px 28px",
                backgroundPosition: "0 0, 14px 14px",
              }}
              aria-hidden="true"
            />

            <div className="relative mx-auto max-w-7xl flex flex-col gap-4 sm:gap-5">
              {/* 1. Compact Page Header */}
              <RunsHeader />

              {/* Error State Banner */}
              {error && !isLoading && (
                <div className="rounded-lg border border-red-900/60 bg-red-950/25 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
                    <div className="flex flex-col">
                      <span className="font-semibold text-white text-xs">
                        Unable to synchronize telemetry streams
                      </span>
                      <span className="font-mono text-[11px] text-zinc-400">
                        {error}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleRefresh}
                      className="inline-flex items-center gap-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 text-xs font-medium text-white transition-colors cursor-pointer"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Retry</span>
                    </button>
                    <Link
                      href="/test"
                      className="text-xs text-zinc-400 hover:text-white transition-colors px-2 py-1"
                    >
                      Return to New Test
                    </Link>
                  </div>
                </div>
              )}

              {/* 2. Compact 4-Column KPI Strip */}
              <RunsStatsBar runs={runs} />

              {/* 3. Filter / Search Toolbar */}
              <RunsToolbar
                searchQuery={searchQuery}
                onSearchChange={handleSearchChange}
                statusFilter={statusFilter}
                onStatusFilterChange={handleStatusFilterChange}
                dateFilter={dateFilter}
                onDateFilterChange={handleDateFilterChange}
                onRefresh={handleRefresh}
                isLoading={isLoading}
              />

              {/* 4. Runs Table (The Visual Centerpiece) */}
              <RunsTable
                runs={paginatedRuns}
                isLoading={isLoading}
                onClearFilters={handleClearFilters}
                hasActiveFilters={hasActiveFilters}
              />

              {/* 5. Pagination Bar & CSV Export */}
              {!isLoading && runs.length > 0 && (
                <RunsPagination
                  totalItems={filteredRuns.length}
                  currentPage={currentPage}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  filteredRuns={filteredRuns}
                />
              )}

              {/* 6. Latest Failure Summary Panel */}
              {!isLoading && runs.length > 0 && (
                <LatestFailureSummary latestFailedRun={latestFailedRun} />
              )}
            </div>
          </main>

          {/* Compact Workspace Footer */}
          <WorkspaceFooter />
        </div>
      </div>
    </ProtectedRoute>
  );
}
