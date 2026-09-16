"use client";

import React, { use, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/shell/sidebar";
import { TopBar } from "@/components/shell/top-bar";
import { WorkspaceFooter } from "@/components/shell/workspace-footer";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { RunHeader } from "@/components/run/run-header";
import { RunningCard } from "@/components/run/running-card";
import { FailureDiagnosisCard } from "@/components/run/failure-diagnosis-card";
import { AssertionsTable } from "@/components/run/assertions-table";
import { StepsTrace } from "@/components/run/steps-trace";
import { VisualEvidence } from "@/components/run/visual-evidence";
import { LightboxModal } from "@/components/run/lightbox-modal";
import { getRun, RunStatusResponse, ApiError } from "@/lib/api";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";

interface PageProps {
  params: Promise<{ runId: string }>;
}

export default function RunDetailPage({ params }: PageProps) {
  const { runId } = use(params);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [run, setRun] = useState<RunStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initialError, setInitialError] = useState<string | null>(null);
  const [connectionWarning, setConnectionWarning] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  // Lightbox modal state
  const [activeScreenshot, setActiveScreenshot] = useState<{
    url: string;
    title: string;
  } | null>(null);

  const consecutiveErrorsRef = useRef(0);

  // Initial Fetch & Polling Loop
  useEffect(() => {
    let isMounted = true;
    let pollTimer: NodeJS.Timeout | null = null;

    async function fetchStatus() {
      try {
        const data = await getRun(runId);
        if (!isMounted) return;

        consecutiveErrorsRef.current = 0;
        setConnectionWarning(null);
        setRun(data);
        setIsLoading(false);

        // Continue polling only if status is still running
        if (data.status === "running") {
          pollTimer = setTimeout(fetchStatus, 1000);
        }
      } catch (err: unknown) {
        if (!isMounted) return;

        consecutiveErrorsRef.current += 1;
        setIsLoading(false);

        if (err instanceof ApiError && err.status === 404) {
          setInitialError(`Run '${runId}' not found on backend.`);
          return;
        }

        // If we haven't received initial run data yet, surface fatal error
        if (!run) {
          setInitialError(
            err instanceof Error
              ? err.message
              : "Failed to connect to backend server."
          );
          return;
        }

        // If polling fails consecutively during an active run
        if (consecutiveErrorsRef.current >= 3) {
          setConnectionWarning(
            "Connection interrupted. Re-attempting to reach backend..."
          );
        }

        // Retry polling even after transient failure
        pollTimer = setTimeout(fetchStatus, 2000);
      }
    }

    fetchStatus();

    return () => {
      isMounted = false;
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [runId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Elapsed stopwatch timer while running
  useEffect(() => {
    if (!run || run.status !== "running") return;

    const startTime = new Date(run.created_at).getTime();

    const updateTimer = () => {
      const now = Date.now();
      setElapsedMs(Math.max(0, now - startTime));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 200);

    return () => clearInterval(interval);
  }, [run]);

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-[#090a0c] text-[#f4f4f6]">
      {/* Left Navigation Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        <TopBar onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)} />

        <main className="flex-1 overflow-y-auto px-4 py-8 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-4xl flex flex-col gap-6">
            {/* Transient Connection Warning Banner */}
            {connectionWarning && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-900/60 bg-amber-950/40 p-3 text-xs text-amber-300">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
                <span>{connectionWarning}</span>
              </div>
            )}

            {/* Initial Loading State */}
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-24 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
                <span className="font-mono text-xs text-zinc-400">
                  Loading test run {runId}...
                </span>
              </div>
            )}

            {/* Initial Error State (e.g. 404 or backend down) */}
            {initialError && !isLoading && (
              <div className="rounded-xl border border-red-900/60 bg-red-950/30 p-8 text-center flex flex-col items-center gap-4">
                <AlertCircle className="h-10 w-10 text-red-400" />
                <div className="flex flex-col gap-1">
                  <h2 className="text-base font-semibold text-white">
                    Unable to load run
                  </h2>
                  <p className="text-xs text-zinc-400 font-mono">{initialError}</p>
                </div>
                <Link
                  href="/test"
                  className="inline-flex items-center gap-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 px-3.5 py-2 text-xs font-medium text-white transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Return to New Test</span>
                </Link>
              </div>
            )}

            {/* Main Run Content */}
            {run && (
              <>
                {/* Run Header with Status & Metrics */}
                <RunHeader run={run} elapsedMs={elapsedMs} />

                {/* 1. If currently Running */}
                {run.status === "running" && (
                  <RunningCard run={run} elapsedMs={elapsedMs} />
                )}

                {/* 2. If Failed: Deterministic Diagnosis */}
                {run.status === "failed" && run.result?.diagnosis && (
                  <FailureDiagnosisCard
                    diagnosis={run.result.diagnosis}
                    rawMessage={run.result.message}
                  />
                )}

                {/* 3. If Fatal Error */}
                {run.status === "error" && (
                  <div className="rounded-xl border border-amber-900/60 bg-amber-950/25 p-5 flex flex-col gap-2">
                    <span className="font-semibold text-amber-300 text-xs uppercase tracking-wider">
                      Execution Error
                    </span>
                    <p className="text-xs text-zinc-300 font-mono leading-relaxed">
                      {run.error || "An unhandled exception occurred during execution."}
                    </p>
                  </div>
                )}

                {/* 4. Terminal Result Sections */}
                {run.result && (
                  <>
                    {/* Deterministic Assertions Table */}
                    <AssertionsTable
                      assertions={run.result.assertions}
                      runId={run.run_id}
                      onSelectScreenshot={(url, title) =>
                        setActiveScreenshot({ url, title })
                      }
                    />

                    {/* Execution Steps Trace */}
                    <StepsTrace
                      steps={run.result.steps}
                      runId={run.run_id}
                      onSelectScreenshot={(url, title) =>
                        setActiveScreenshot({ url, title })
                      }
                    />

                    {/* Visual Evidence Gallery */}
                    <VisualEvidence
                      screenshots={run.result.screenshots}
                      runId={run.run_id}
                      onSelectScreenshot={(url, title) =>
                        setActiveScreenshot({ url, title })
                      }
                    />
                  </>
                )}
              </>
            )}
          </div>
        </main>

        {/* Compact Workspace Footer */}
        <WorkspaceFooter />
      </div>

      {/* Full-resolution Screenshot Lightbox Modal */}
      <LightboxModal
        imageSrc={activeScreenshot?.url || null}
        imageTitle={activeScreenshot?.title}
        onClose={() => setActiveScreenshot(null)}
      />
    </div>
    </ProtectedRoute>
  );
}
