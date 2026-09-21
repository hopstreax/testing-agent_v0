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
      <div className="rounded-lg border border-[#1b2026] bg-[#0d1013] p-5 shadow-xs">
        <div className="flex items-center gap-2 border-b border-[#1b2026] pb-3 text-sm font-semibold text-white">
          <Layers className="h-4 w-4 text-emerald-400" />
          <span>Execution Steps Trace</span>
        </div>
        <p className="pt-4 text-xs text-zinc-500 font-mono italic">
          No execution steps were recorded for this run.
        </p>
      </div>
    );
  }

  const toggleStep = (stepNum: number) => {
    setExpandedSteps((prev) => ({
      ...prev,
      [stepNum]: !prev[stepNum],
    }));
  };

  const toggleAll = () => {
    const allExpanded = steps.every((s) => !!expandedSteps[s.step_number]);
    if (allExpanded) {
      setExpandedSteps({});
    } else {
      const next: Record<number, boolean> = {};
      steps.forEach((s) => {
        next[s.step_number] = true;
      });
      setExpandedSteps(next);
    }
  };

  const formatActionDetails = (details: Record<string, unknown>) => {
    if (!details) return "";
    const parts: string[] = [];
    if (details.name) parts.push(`name="${details.name}"`);
    if (details.role) parts.push(`role="${details.role}"`);
    if (details.selector) parts.push(`selector="${details.selector}"`);
    if (details.index !== undefined) parts.push(`index=${details.index}`);
    if (details.value !== undefined) parts.push(`value="${details.value}"`);
    if (details.url) parts.push(`url="${details.url}"`);
    if (details.key) parts.push(`key="${details.key}"`);
    if (details.direction) parts.push(`direction="${details.direction}"`);
    if (details.amount !== undefined) parts.push(`amount=${details.amount}px`);
    return parts.join(", ") || "";
  };

  const allExpanded = steps.every((s) => !!expandedSteps[s.step_number]);

  return (
    <div className="rounded-lg border border-[#1b2026] bg-[#0d1013] p-5 shadow-xs flex flex-col gap-4">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1b2026] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md border border-emerald-800/50 bg-emerald-950/60 text-emerald-400">
            <Layers className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sm text-white font-sans">
              Execution Steps Trace
            </span>
            <span className="font-mono text-[10px] text-zinc-400">
              Chronological agent actions, locator resolutions, and DOM observations
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <button
            type="button"
            onClick={toggleAll}
            className="text-[11px] text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            {allExpanded ? "Collapse All" : "Expand All"}
          </button>
          <span className="text-zinc-700 select-none">•</span>
          <span className="rounded bg-[#121518] border border-[#22272b] px-2 py-0.5 font-mono text-[10px] font-semibold text-zinc-300">
            {steps.length} STEPS
          </span>
        </div>
      </div>

      {/* Steps List */}
      <div className="flex flex-col gap-1.5">
        {steps.map((step) => {
          const isExpanded = !!expandedSteps[step.step_number];
          const shotUrl = step.screenshot_path
            ? `/api/runs/${encodeURIComponent(runId)}/artifacts/${step.screenshot_path}`
            : null;
          const actionDetailStr = formatActionDetails(step.action_details);
          const stepNumStr = step.step_number.toString().padStart(2, "0");

          return (
            <div
              key={step.step_number}
              className="rounded-md border border-[#1b2026] bg-[#090b0d] overflow-hidden transition-colors"
            >
              {/* Row Header */}
              <div
                onClick={() => toggleStep(step.step_number)}
                className="flex items-center justify-between px-3 py-2.5 hover:bg-[#121518] cursor-pointer select-none text-xs gap-3"
              >
                {/* Left: Step #, Action verb pill, Target details */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span className="font-mono text-[11px] font-bold text-zinc-500 w-7 shrink-0">
                    #{stepNumStr}
                  </span>

                  <span className="font-mono text-[10px] uppercase font-bold bg-[#121518] border border-[#22272b] px-1.5 py-0.5 rounded text-zinc-300 shrink-0">
                    {step.action_type}
                  </span>

                  <span
                    className="font-mono text-[11px] text-zinc-300 truncate"
                    title={actionDetailStr || "(action)"}
                  >
                    {actionDetailStr || "(action)"}
                  </span>
                </div>

                {/* Right: Latency, Resolution Method, Status, Screenshot, Expand Caret */}
                <div className="flex items-center gap-2.5 font-mono text-[11px] shrink-0">
                  {step.result.duration_ms !== undefined && (
                    <span className="text-zinc-500 text-[10px] hidden sm:inline">
                      {step.result.duration_ms}ms
                    </span>
                  )}

                  {step.result.resolved_by && (
                    <span className="text-[10px] text-zinc-400 bg-[#121518] border border-[#1f2428] px-1.5 py-0.5 rounded hidden md:inline">
                      {step.result.resolved_by}
                    </span>
                  )}

                  {step.result.success ? (
                    <span className="inline-flex items-center gap-1 rounded bg-emerald-950/60 border border-emerald-800/50 px-1.5 py-0.5 text-[10px] text-emerald-400 font-bold">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>OK</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded bg-red-950/60 border border-red-800/50 px-1.5 py-0.5 text-[10px] text-red-400 font-bold">
                      <XCircle className="h-3 w-3" />
                      <span>FAIL</span>
                    </span>
                  )}

                  {shotUrl && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectScreenshot(shotUrl, `Step #${step.step_number} Snapshot`);
                      }}
                      className="text-zinc-400 hover:text-emerald-400 p-1 cursor-pointer transition-colors"
                      title="View step screenshot"
                      aria-label="View step screenshot"
                    >
                      <ImageIcon className="h-3.5 w-3.5" />
                    </button>
                  )}

                  <div className="text-zinc-500 p-0.5">
                    {isExpanded ? (
                      <ChevronDown className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5" />
                    )}
                  </div>
                </div>
              </div>

              {/* Collapsible Detail Drawer */}
              {isExpanded && (
                <div className="border-t border-[#1b2026] bg-[#0d1013] p-3.5 text-xs flex flex-col gap-3 font-sans animate-in fade-in-50">
                  {/* Decision Rationale */}
                  {step.decision && (
                    <div className="flex flex-col gap-1">
                      <span className="font-mono text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                        Agent Decision Rationale
                      </span>
                      <p className="text-zinc-300 leading-relaxed text-xs">
                        {step.decision}
                      </p>
                    </div>
                  )}

                  {/* Observation Summary */}
                  {step.observation_summary && (
                    <div className="flex flex-col gap-1">
                      <span className="font-mono text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                        DOM Observation Summary
                      </span>
                      <div className="rounded border border-[#1f2428] bg-[#090b0d] p-2.5 font-mono text-[11px] text-zinc-400 leading-relaxed overflow-x-auto">
                        {step.observation_summary}
                      </div>
                    </div>
                  )}

                  {/* Error Callout */}
                  {step.result.error_message && (
                    <div className="rounded border border-red-900/60 bg-red-950/20 p-2.5 text-red-300 font-mono text-[11px] flex flex-col gap-1 overflow-x-auto">
                      <span className="font-bold uppercase tracking-wider text-[10px] text-red-400">
                        Execution Error
                      </span>
                      <span className="whitespace-pre-wrap break-all leading-relaxed">
                        {step.result.error_message}
                      </span>
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
