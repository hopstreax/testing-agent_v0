"use client";

import React from "react";
import { CheckCircle2, XCircle, Image as ImageIcon, ShieldCheck } from "lucide-react";
import { AssertionRecord } from "@/lib/api";

interface AssertionsTableProps {
  assertions: AssertionRecord[];
  runId: string;
  onSelectScreenshot: (url: string, title: string) => void;
}

export function AssertionsTable({
  assertions,
  runId,
  onSelectScreenshot,
}: AssertionsTableProps) {
  if (!assertions || assertions.length === 0) {
    return (
      <div className="rounded-lg border border-[#1b2026] bg-[#0d1013] p-5 shadow-xs">
        <div className="flex items-center gap-2 border-b border-[#1b2026] pb-3 text-sm font-semibold text-white">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <span>Deterministic Verification</span>
        </div>
        <p className="pt-4 text-xs text-zinc-500 font-mono italic">
          No deterministic assertions were configured or executed during this run.
        </p>
      </div>
    );
  }

  const formatLocator = (locator: Record<string, string>) => {
    if (!locator || Object.keys(locator).length === 0) return "(page)";
    return Object.entries(locator)
      .map(([k, v]) => `${k}="${v}"`)
      .join(", ");
  };

  const passedCount = assertions.filter((a) => a.success).length;
  const totalCount = assertions.length;
  const allPassed = passedCount === totalCount;

  return (
    <div className="rounded-lg border border-[#1b2026] bg-[#0d1013] p-5 shadow-xs flex flex-col gap-4">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1b2026] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md border border-emerald-800/50 bg-emerald-950/60 text-emerald-400">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sm text-white font-sans">
              Deterministic Verification
            </span>
            <span className="font-mono text-[10px] text-zinc-400">
              Evaluated invariants with deterministic pass/fail authority
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span
            className={`rounded px-2 py-0.5 font-bold border ${
              allPassed
                ? "bg-emerald-950/70 border-emerald-800/60 text-emerald-400"
                : "bg-red-950/70 border-red-800/60 text-red-400"
            }`}
          >
            {passedCount} / {totalCount} PASSED
          </span>
        </div>
      </div>

      {/* Table Container with Horizontal Scroll Protection */}
      <div className="overflow-x-auto rounded-md border border-[#1b2026] bg-[#090b0d]">
        <table className="w-full text-left text-xs min-w-[650px]">
          <thead>
            <tr className="border-b border-[#1b2026] bg-[#121518] text-[10px] font-mono uppercase tracking-wider text-zinc-400">
              <th className="py-2.5 px-3 font-semibold w-16">Step</th>
              <th className="py-2.5 px-3 font-semibold w-28">Type</th>
              <th className="py-2.5 px-3 font-semibold">Target / Locator</th>
              <th className="py-2.5 px-3 font-semibold">Expected Value</th>
              <th className="py-2.5 px-3 font-semibold w-24">Status</th>
              <th className="py-2.5 px-3 font-semibold">Details / Error</th>
              <th className="py-2.5 px-3 font-semibold text-right w-20">Evidence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1b2026]/60 font-mono text-[11px]">
            {assertions.map((item, idx) => {
              const shotUrl = item.screenshot_path
                ? `/api/runs/${encodeURIComponent(runId)}/artifacts/${item.screenshot_path}`
                : null;
              const locatorStr = formatLocator(item.locator);

              return (
                <tr key={idx} className="hover:bg-[#15191d] transition-colors">
                  {/* Step */}
                  <td className="py-2.5 px-3 text-zinc-400 font-medium">
                    #{item.step_number}
                  </td>

                  {/* Type */}
                  <td className="py-2.5 px-3">
                    <span className="rounded bg-[#121518] border border-[#22272b] px-1.5 py-0.5 text-zinc-300 text-[10px]">
                      {item.assertion_type}
                    </span>
                  </td>

                  {/* Target / Locator */}
                  <td className="py-2.5 px-3 text-zinc-300 max-w-[200px] truncate" title={locatorStr}>
                    {locatorStr}
                  </td>

                  {/* Expected Value */}
                  <td className="py-2.5 px-3 text-zinc-400 max-w-[150px] truncate" title={item.expected_value || "—"}>
                    {item.expected_value || "—"}
                  </td>

                  {/* Status Badge */}
                  <td className="py-2.5 px-3">
                    {item.success ? (
                      <span className="inline-flex items-center gap-1 rounded bg-emerald-950/70 border border-emerald-800/60 px-1.5 py-0.5 text-[10px] text-emerald-400 font-bold">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>PASS</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded bg-red-950/70 border border-red-800/60 px-1.5 py-0.5 text-[10px] text-red-400 font-bold">
                        <XCircle className="h-3 w-3" />
                        <span>FAIL</span>
                      </span>
                    )}
                  </td>

                  {/* Details / Error */}
                  <td className="py-2.5 px-3 text-zinc-400 max-w-[220px]">
                    {item.error_message ? (
                      <span className="text-red-400 line-clamp-2" title={item.error_message}>
                        {item.error_message}
                      </span>
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </td>

                  {/* Evidence Trigger */}
                  <td className="py-2.5 px-3 text-right">
                    {shotUrl ? (
                      <button
                        type="button"
                        onClick={() =>
                          onSelectScreenshot(shotUrl, `Step #${item.step_number} Invariant Assertion`)
                        }
                        className="inline-flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer p-0.5 transition-colors"
                      >
                        <ImageIcon className="h-3 w-3" />
                        <span>View</span>
                      </button>
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
