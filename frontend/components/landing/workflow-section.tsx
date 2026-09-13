"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    number: "01",
    title: "Define your test",
    description: "Enter the website URL and describe what you want to verify.",
    detail: "Natural-language goal specification with optional authenticated storage state.",
  },
  {
    number: "02",
    title: "Observe",
    description: "TraceKit inspects the current browser state.",
    detail: "Captures accessibility snapshots, visible DOM text, and element coordinates.",
  },
  {
    number: "03",
    title: "Reason & Act",
    description: "The agent chooses and performs browser actions.",
    detail: "Generates typed actions: click, type, press key, select, hover, and scroll.",
  },
  {
    number: "04",
    title: "Verify",
    description: "Deterministic assertions confirm the expected state was reached.",
    detail: "Executes visible, text, value, checked, enabled, and count assertions.",
  },
  {
    number: "05",
    title: "Review",
    description: "Inspect the execution trace, screenshots, diagnosis, and report.",
    detail: "Examine chronological traces, visual evidence, and structured JSON/Markdown reports.",
  },
];

export function WorkflowSection() {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <div id="how-it-works" className="flex flex-col justify-between">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          From intent to verified result.
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-zinc-400">
          Give TraceKit a goal. It handles the rest. Select a phase to explore.
        </p>
      </div>

      {/* Interactive Numbered Workflow Stepper */}
      <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-3.5">
        {STEPS.map((step, idx) => {
          const isActive = activeStep === idx;
          return (
            <button
              type="button"
              id={`workflow-step-${idx}`}
              data-active={isActive ? "true" : "false"}
              key={step.number}
              onClick={() => setActiveStep(idx)}
              className={cn(
                "group relative flex flex-col text-left rounded-lg border p-3.5 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00e599]",
                isActive
                  ? "border-[#00e599]/60 bg-[#101518] shadow-md shadow-[#00e599]/10 -translate-y-0.5"
                  : "border-[#1f2428] bg-[#0d1013] hover:border-zinc-700 hover:bg-[#111519]"
              )}
            >
              {/* Number circle badge */}
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full font-mono text-xs font-semibold mb-3 transition-all duration-200",
                  isActive
                    ? "border border-[#00e599] bg-[#00e599] text-[#08090b] shadow-xs shadow-[#00e599]/40 scale-105"
                    : "border border-[#00e599]/40 bg-[#00e599]/10 text-[#00e599] group-hover:border-[#00e599]/70"
                )}
              >
                {step.number}
              </div>

              <div className="text-xs font-semibold text-white tracking-tight flex items-center justify-between">
                <span>{step.title}</span>
                {isActive && (
                  <span className="h-1.5 w-1.5 rounded-full bg-[#00e599]" />
                )}
              </div>

              <div className="mt-1 text-[11px] text-zinc-400 leading-relaxed">
                {step.description}
              </div>

              {isActive && (
                <div className="mt-2.5 pt-2 border-t border-[#1f2428] text-[10px] font-mono text-[#00e599] leading-tight animate-in fade-in-50 duration-150">
                  {step.detail}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
