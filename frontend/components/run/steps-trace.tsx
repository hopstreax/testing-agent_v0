"use client";

import React, { useState } from "react";
import {
  Layers,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  XCircle,
  Image as ImageIcon,
} from "lucide-react";
import { StepTraceRecord } from "@/lib/api";

interface StepsTraceProps {
  steps: StepTraceRecord[];
  runId: string;
  onSelectScreenshot: (url: string, title: string) => void;
}

export function StepsTrace({
  steps,
  runId,
  onSelectScreenshot,
}: StepsTraceProps) {
  const [expandedSteps, setExpandedSteps] = useState<Record<number, boolean>>({});

  if (!steps || steps.length === 0) {
    return (
      <div className="rounded-xl border border-[#22272b] bg-[#121518] p-5 shadow-sm">
        <div className="flex items-center gap-2 border-b border-[#1f2428] pb-3 text-sm font-semibold text-white">
          <Layers className="h-4 w-4 text-emerald-400" />
          <span>Execution Steps Trace</span>
        </div>
        <p className="pt-4 text-xs text-zinc-500 italic">No steps executed.</p>
      </div>
    );
  }

  const toggleStep = (stepNum: number) => {
    setExpandedSteps((prev) => ({
      ...prev,
      [stepNum]: !prev[stepNum],
    }));
  };

  const formatActionDetails = (details: Record<string, unknown>) => {
    if (!details) return "";
    const parts: string[] = [];
    if (details.name) parts.push(`name="${details.name}"`);
    if (details.role) parts.push(`role="${details.role}"`);
    if (details.selector) parts.push(`selector="${details.selector}"`);
    if (details.value !== undefined) parts.push(`value="${details.value}"`);
    if (details.url) parts.push(`url="${details.url}"`);
    if (details.key) parts.push(`key="${details.key}"`);
    if (details.direction) parts.push(`direction="${details.direction}"`);
    if (details.amount !== undefined) parts.push(`amount=${details.amount}px`);
    return parts.join(", ") || "";
  };

  return (
    <div className="rounded-xl border border-[#22272b] bg-[#121518] p-5 shadow-sm flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1f2428] pb-3">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-emerald-400" />
          <span className="font-semibold text-sm text-white">
            Execution Steps Trace
          </span>
        </div>
        <span className="font-mono text-xs text-zinc-500">
          {steps.length} Steps
        </span>
      </div>

      {/* Steps List */}
      <div className="flex flex-col gap-2">
        {steps.map((step) => {
          const isExpanded = !!expandedSteps[step.step_number];
          const shotUrl = step.screenshot_path
            ? `/api/runs/${encodeURIComponent(runId)}/artifacts/${step.screenshot_path}`
            : null;
          const actionDetailStr = formatActionDetails(step.action_details);

          return (
            <div
              key={step.step_number}
              className="rounded-lg border border-[#22272b] bg-[#0e1114] overflow-hidden transition-colors"
            >
              {/* Row Header */}
              <div
                onClick={() => toggleStep(step.step_number)}
                className="flex items-center justify-between px-3.5 py-2.5 hover:bg-[#15191d] cursor-pointer select-none text-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono text-[11px] text-zinc-500 w-8">
                    #{step.step_number}
                  </span>

                  <span className="font-mono text-[10px] uppercase font-semibold bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-300">
                    {step.action_type}
                  </span>

                  <span
                    className="font-mono text-[11px] text-zinc-300 truncate max-w-[200px] sm:max-w-xs"
                    title={actionDetailStr}
                  >
                    {actionDetailStr || "(action)"}
                  </span>
                </div>

                <div className="flex items-center gap-3 font-mono text-[11px] shrink-0">
                  {step.result.duration_ms !== undefined && (
                    <span className="text-zinc-500 hidden sm:inline">
                      {step.result.duration_ms}ms
                    </span>
                  )}

                  {step.result.resolved_by && (
                    <span className="text-[10px] text-zinc-500 bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded hidden md:inline">
                      {step.result.resolved_by}
                    </span>
                  )}

                  {step.result.success ? (
                    <span className="inline-flex items-center gap-1 text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" />
                      <span className="text-[10px] hidden sm:inline">OK</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-red-400">
                      <XCircle className="h-3 w-3" />
                      <span className="text-[10px] hidden sm:inline">FAIL</span>
                    </span>
                  )}

                  {shotUrl && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectScreenshot(shotUrl, `Step #${step.step_number}`);
                      }}
                      className="text-zinc-400 hover:text-emerald-400 p-1"
                      title="View step screenshot"
                    >
                      <ImageIcon className="h-3.5 w-3.5" />
                    </button>
                  )}

                  {isExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-zinc-500" />
                  )}
                </div>
              </div>

              {/* Collapsible Detail Panel */}
              {isExpanded && (
                <div className="border-t border-[#1f2428] bg-[#0a0c0e] p-3.5 text-xs flex flex-col gap-2.5 font-sans">
                  {step.decision && (
                    <div>
                      <span className="font-mono text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-0.5">
                        Decision Rationale
                      </span>
                      <p className="text-zinc-300 leading-relaxed">
                        {step.decision}
                      </p>
                    </div>
                  )}

                  {step.observation_summary && (
                    <div>
                      <span className="font-mono text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-0.5">
                        Observation Summary
                      </span>
                      <p className="text-zinc-400 text-[11px] leading-relaxed font-mono">
                        {step.observation_summary}
                      </p>
                    </div>
                  )}

                  {step.result.error_message && (
                    <div className="rounded border border-red-900/60 bg-red-950/30 p-2 text-red-300 font-mono text-[11px]">
                      <span className="font-semibold">Error: </span>
                      <span>{step.result.error_message}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
