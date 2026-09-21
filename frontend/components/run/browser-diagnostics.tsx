"use client";

import React, { useState } from "react";
import {
  Activity,
  Terminal,
  WifiOff,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { BrowserDiagnostics as BrowserDiagnosticsType } from "@/lib/api";

interface BrowserDiagnosticsProps {
  diagnostics?: BrowserDiagnosticsType | null;
}

export function BrowserDiagnostics({ diagnostics }: BrowserDiagnosticsProps) {
  const [showRawDetails, setShowRawDetails] = useState(false);

  if (!diagnostics) return null;

  const rawDiag = diagnostics as Record<string, unknown>;

  const consoleErrors =
    diagnostics.console_errors ?? (rawDiag.console_error_count as number | undefined) ?? 0;
  const pageErrors =
    diagnostics.page_errors ?? (rawDiag.page_error_count as number | undefined) ?? 0;
  const failedRequests =
    diagnostics.failed_requests ??
    (rawDiag.http_error_count as number | undefined) ??
    (rawDiag.failed_request_count as number | undefined) ??
    0;

  const totalAnomalies = consoleErrors + pageErrors + failedRequests;
  const isClean = totalAnomalies === 0;

  const recentConsole = diagnostics.recent_console_errors ?? [];
  const recentFailedRequests = diagnostics.recent_failed_requests ?? [];
  const hasDetailedLogs = recentConsole.length > 0 || recentFailedRequests.length > 0;

  return (
    <div className="rounded-lg border border-[#1b2026] bg-[#0d1013] p-5 shadow-xs flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1b2026] pb-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-md border ${
              isClean
                ? "border-emerald-800/50 bg-emerald-950/60 text-emerald-400"
                : "border-red-800/50 bg-red-950/60 text-red-400"
            }`}
          >
            {isClean ? (
              <ShieldCheck className="h-4 w-4" />
            ) : (
              <Activity className="h-4 w-4" />
            )}
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sm text-white font-sans">
              Browser Runtime Diagnostics
            </span>
            <span className="font-mono text-[10px] text-zinc-400">
              Real-time CDP event telemetry captured from Chromium session
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isClean ? (
            <span className="inline-flex items-center gap-1.5 rounded bg-emerald-950/70 border border-emerald-800/60 px-2 py-0.5 font-mono text-[10px] font-bold tracking-wider text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>CLEAN RUNTIME</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded bg-red-950/70 border border-red-800/60 px-2 py-0.5 font-mono text-[10px] font-bold tracking-wider text-red-400">
              <AlertTriangle className="h-3 w-3" />
              <span>{totalAnomalies} ANOMALIES RECORDED</span>
            </span>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
        <div className="flex items-center justify-between rounded-md border border-[#22272b] bg-[#121518] p-3">
          <span className="text-zinc-400 text-[11px]">Console Errors</span>
          <span
            className={`font-semibold ${
              consoleErrors > 0 ? "text-red-400" : "text-emerald-400"
            }`}
          >
            {consoleErrors}
          </span>
        </div>

        <div className="flex items-center justify-between rounded-md border border-[#22272b] bg-[#121518] p-3">
          <span className="text-zinc-400 text-[11px]">Page Exceptions</span>
          <span
            className={`font-semibold ${
              pageErrors > 0 ? "text-amber-400" : "text-emerald-400"
            }`}
          >
            {pageErrors}
          </span>
        </div>

        <div className="flex items-center justify-between rounded-md border border-[#22272b] bg-[#121518] p-3">
          <span className="text-zinc-400 text-[11px]">HTTP / Network Failures</span>
          <span
            className={`font-semibold ${
              failedRequests > 0 ? "text-red-400" : "text-emerald-400"
            }`}
          >
            {failedRequests}
          </span>
        </div>
      </div>

      {/* Clean state message */}
      {isClean && (
        <div className="rounded-md border border-[#1f2428] bg-[#0c0e10] p-3 text-xs text-zinc-400 font-mono flex items-center gap-2">
          <span className="text-emerald-400">✓</span>
          <span>Zero uncaught exceptions, console errors, or network HTTP errors were detected.</span>
        </div>
      )}

      {/* Detailed Anomalies Drawer */}
      {!isClean && hasDetailedLogs && (
        <div className="pt-2 border-t border-[#1f2428] flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setShowRawDetails((prev) => !prev)}
            className="flex items-center gap-1.5 font-mono text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer select-none self-start"
            aria-expanded={showRawDetails}
          >
            <ChevronRight
              className={`h-3 w-3 transition-transform duration-150 ${
                showRawDetails ? "rotate-90" : ""
              }`}
            />
            <Terminal className="h-3 w-3 text-zinc-500" />
            <span>
              {showRawDetails ? "Hide captured error events" : "Inspect captured error events"}
            </span>
          </button>

          {showRawDetails && (
            <div className="flex flex-col gap-3 animate-in fade-in-50">
              {recentConsole.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-red-400">
                    <Terminal className="h-3 w-3" />
                    <span>Recent Console Errors</span>
                  </div>
                  <div className="rounded-md border border-red-900/60 bg-red-950/20 p-3 font-mono text-[11px] text-red-300 space-y-1.5 overflow-x-auto">
                    {recentConsole.map((err, idx) => (
                      <div key={idx} className="whitespace-pre-wrap break-all leading-relaxed">
                        • {err}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {recentFailedRequests.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-amber-400">
                    <WifiOff className="h-3 w-3" />
                    <span>Failed Network Requests</span>
                  </div>
                  <div className="rounded-md border border-amber-900/60 bg-amber-950/20 p-3 font-mono text-[11px] text-amber-300 space-y-1.5 overflow-x-auto">
                    {recentFailedRequests.map((req, idx) => (
                      <div key={idx} className="whitespace-pre-wrap break-all leading-relaxed">
                        • {req}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
