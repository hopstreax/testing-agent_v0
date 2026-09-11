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
      <div className="rounded-xl border border-[#22272b] bg-[#121518] p-5 shadow-sm">
        <div className="flex items-center gap-2 border-b border-[#1f2428] pb-3 text-sm font-semibold text-white">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <span>Deterministic Verification</span>
        </div>
        <p className="pt-4 text-xs text-zinc-500 italic">
          No deterministic assertions were executed during this run.
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

  return (
    <div className="rounded-xl border border-[#22272b] bg-[#121518] p-5 shadow-sm flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1f2428] pb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <span className="font-semibold text-sm text-white">
            Deterministic Verification
          </span>
        </div>
        <span className="font-mono text-xs text-zinc-500">
          {assertions.filter((a) => a.success).length}/{assertions.length} Passed
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-zinc-800 text-[11px] font-mono text-zinc-500 uppercase">
              <th className="pb-2.5 font-medium w-14">Step</th>
              <th className="pb-2.5 font-medium">Type</th>
              <th className="pb-2.5 font-medium">Target / Locator</th>
              <th className="pb-2.5 font-medium">Expected Value</th>
              <th className="pb-2.5 font-medium w-24">Status</th>
              <th className="pb-2.5 font-medium">Details / Error</th>
              <th className="pb-2.5 font-medium text-right w-20">Evidence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60 font-mono text-[11px]">
            {assertions.map((item, idx) => {
              const shotUrl = item.screenshot_path
                ? `/api/runs/${encodeURIComponent(runId)}/artifacts/${item.screenshot_path}`
                : null;

              return (
                <tr key={idx} className="hover:bg-zinc-800/20 transition-colors">
                  <td className="py-3 text-zinc-400">#{item.step_number}</td>

                  <td className="py-3">
                    <span className="rounded bg-zinc-800/80 px-1.5 py-0.5 text-zinc-300">
                      {item.assertion_type}
                    </span>
                  </td>

                  <td className="py-3 text-zinc-300 font-mono max-w-[200px] truncate" title={formatLocator(item.locator)}>
                    {formatLocator(item.locator)}
                  </td>

                  <td className="py-3 text-zinc-400 max-w-[160px] truncate" title={item.expected_value || "-"}>
                    {item.expected_value || "-"}
                  </td>

                  <td className="py-3">
                    {item.success ? (
                      <span className="inline-flex items-center gap-1 rounded bg-emerald-950/70 border border-emerald-800/50 px-1.5 py-0.5 text-[10px] text-emerald-400 font-semibold">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>PASSED</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded bg-red-950/70 border border-red-800/50 px-1.5 py-0.5 text-[10px] text-red-400 font-semibold">
                        <XCircle className="h-3 w-3" />
                        <span>FAILED</span>
                      </span>
                    )}
                  </td>

                  <td className="py-3 text-zinc-400 max-w-[240px]">
                    {item.error_message ? (
                      <span className="text-red-400 line-clamp-2" title={item.error_message}>
                        {item.error_message}
                      </span>
                    ) : (
                      <span className="text-zinc-600">-</span>
                    )}
                  </td>

                  <td className="py-3 text-right">
                    {shotUrl ? (
                      <button
                        type="button"
                        onClick={() =>
                          onSelectScreenshot(shotUrl, `Step #${item.step_number} Assertion`)
                        }
                        className="inline-flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 font-medium cursor-pointer"
                      >
                        <ImageIcon className="h-3 w-3" />
                        <span>View</span>
                      </button>
                    ) : (
                      <span className="text-zinc-600">-</span>
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
