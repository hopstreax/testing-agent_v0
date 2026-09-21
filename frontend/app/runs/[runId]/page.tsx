"use client";

import React, { use, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/shell/sidebar";
import { TopBar } from "@/components/shell/top-bar";
import { WorkspaceFooter } from "@/components/shell/workspace-footer";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { RunHeader } from "@/components/run/run-header";
import { RunKpiStrip } from "@/components/run/run-kpi-strip";
import { RunningCard } from "@/components/run/running-card";
import { FailureDiagnosisCard } from "@/components/run/failure-diagnosis-card";
import { AssertionsTable } from "@/components/run/assertions-table";
import { StepsTrace } from "@/components/run/steps-trace";
import { VisualEvidence } from "@/components/run/visual-evidence";
import { BrowserDiagnostics } from "@/components/run/browser-diagnostics";
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

          <main
            className="flex-1 overflow-y-auto px-4 py-8 sm:px-8 lg:px-12"
            style={{
              backgroundImage: "radial-gradient(#1f2428 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          >
            <div className="mx-auto max-w-7xl flex flex-col gap-6">
              {/* Transient Connection Warning Banner */}
              {connectionWarning && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-900/60 bg-amber-950/40 p-3 text-xs text-amber-300 font-mono shadow-xs">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-400 animate-pulse" />
                  <span>{connectionWarning}</span>
                </div>
              )}

              {/* Initial Loading State */}
              {isLoading && (
                <div className="rounded-lg border border-[#1b2026] bg-[#0d1013] p-16 text-center flex flex-col items-center justify-center gap-3 shadow-xs">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-xs text-white font-medium">
                      Synchronizing telemetry stream...
                    </span>
                    <span className="font-mono text-[10px] text-zinc-500">
                      Querying run record {runId}
                    </span>
                  </div>
                </div>
              )}

              {/* Initial Error State (e.g. 404 or backend down) */}
              {initialError && !isLoading && (
                <div className="rounded-lg border border-red-900/60 bg-[#0d1013] p-10 text-center flex flex-col items-center gap-4 shadow-xs">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-950/60 border border-red-800/50 text-red-400">
                    <AlertCircle className="h-6 w-6" />
                  </div>
                  <div className="flex flex-col gap-1 max-w-md">
                    <h2 className="text-base font-semibold text-white">
                      Unable to load execution record
                    </h2>
                    <p className="text-xs text-zinc-400 font-mono">{initialError}</p>
                  </div>
                  <div className="flex items-center gap-2.5 pt-2">
                    <Link
                      href="/runs"
                      className="inline-flex items-center gap-1.5 rounded-md border border-[#22272b] bg-[#121518] px-3.5 py-2 text-xs font-medium text-zinc-300 hover:border-zinc-700 hover:bg-[#161a1e] hover:text-white transition-colors"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      <span>Back to Runs</span>
                    </Link>
                    <Link
                      href="/test"
                      className="inline-flex items-center gap-1.5 rounded-md bg-emerald-400 hover:bg-emerald-300 px-3.5 py-2 text-xs font-bold text-zinc-950 transition-colors shadow-xs"
                    >
                      <span>New Test</span>
                    </Link>
                  </div>
                </div>
              )}

              {/* Main Run Content */}
              {run && (
                <>
                  {/* 1. Run Header with Objective, Status, & Actions */}
                  <RunHeader run={run} elapsedMs={elapsedMs} />

                  {/* 2. Compact 4-Card Telemetry KPI Strip */}
                  <RunKpiStrip run={run} elapsedMs={elapsedMs} />

                  {/* 3. Running State: First-Class Live Telemetry Centerpiece */}
                  {run.status === "running" && (
                    <RunningCard
                      run={run}
                      elapsedMs={elapsedMs}
                      connectionWarning={connectionWarning}
                    />
                  )}

                  {/* 4. Failure Diagnosis Panel (if failed) */}
                  {run.status === "failed" && run.result?.diagnosis && (
                    <FailureDiagnosisCard
                      diagnosis={run.result.diagnosis}
                      rawMessage={run.result.message}
                    />
                  )}

                  {/* 5. Fatal Execution Error Box */}
                  {run.status === "error" && (
                    <div className="rounded-lg border border-amber-900/60 bg-[#0e1012] p-5 flex flex-col gap-2 shadow-xs">
                      <div className="flex items-center gap-2 text-amber-300 font-mono text-xs uppercase font-bold tracking-wider">
                        <AlertCircle className="h-4 w-4 text-amber-400" />
                        <span>Execution Error</span>
                      </div>
                      <p className="text-xs text-zinc-300 font-mono leading-relaxed bg-[#090b0d] p-3 rounded border border-[#1f2428] overflow-x-auto">
                        {run.error || "An unhandled exception occurred during autonomous test execution."}
                      </p>
                    </div>
                  )}

                  {/* 6. Terminal Observability Sections */}
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

                      {/* Chronological Execution Steps Trace */}
                      <StepsTrace
                        steps={run.result.steps}
                        runId={run.run_id}
                        onSelectScreenshot={(url, title) =>
                          setActiveScreenshot({ url, title })
                        }
                      />

                      {/* Real Browser Runtime Diagnostics (Console / Network) */}
                      {run.result.diagnostics && (
                        <BrowserDiagnostics diagnostics={run.result.diagnostics} />
                      )}

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
