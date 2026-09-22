import React from "react";
import {
  Eye,
  MousePointer,
  ShieldCheck,
  FileSearch,
  ArrowRight,
  LucideIcon,
} from "lucide-react";

interface PipelineStage {
  step: string;
  name: string;
  tagline: string;
  icon: LucideIcon;
  primaryItems: string[];
  technicalDetails: string[];
}

const PIPELINE_STAGES: PipelineStage[] = [
  {
    step: "01",
    name: "OBSERVE",
    tagline: "DOM & Accessibility Context",
    icon: Eye,
    primaryItems: [
      "Accessibility tree extraction",
      "Interactive element positioning",
    ],
    technicalDetails: [
      "Captures interactive DOM node coordinates",
      "0-based disambiguation for duplicate locators",
    ],
  },
  {
    step: "02",
    name: "ACT",
    tagline: "Typed Browser Actions",
    icon: MousePointer,
    primaryItems: [
      "Click / Fill / Select / Navigate",
      "Adaptive failure recovery",
    ],
    technicalDetails: [
      "Executes typed actions via Patchright/Chromium",
      "Keyboard shortcuts, options, and scroll offsets",
    ],
  },
  {
    step: "03",
    name: "VERIFY",
    tagline: "Deterministic Assertions",
    icon: ShieldCheck,
    primaryItems: [
      "Visible / Text / Count / URL / Title",
      "Native Playwright assertion engine",
    ],
    technicalDetails: [
      "Validates state directly against page APIs",
      "Checkbox states, disabled buttons, and values",
    ],
  },
  {
    step: "04",
    name: "EXPLAIN",
    tagline: "Failure Diagnosis & Evidence",
    icon: FileSearch,
    primaryItems: [
      "Root-cause failure classification",
      "Step screenshots & CDP diagnostics",
    ],
    technicalDetails: [
      "Isolates App Bug vs Automation Failure",
      "Console errors, HTTP 4xx/5xx, and trace exports",
    ],
  },
];

export function PipelineOverview() {
  return (
    <section aria-labelledby="pipeline-overview-title" className="flex flex-col gap-3">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2
            id="pipeline-overview-title"
            className="font-mono text-[11px] font-semibold uppercase tracking-wider text-zinc-400"
          >
            Autonomous Execution Loop
          </h2>
          <span className="font-mono text-[10px] text-zinc-600 select-none" aria-hidden="true">
            /
          </span>
          <span className="font-mono text-[10px] text-zinc-500">
            4-STAGE VERIFICATION PIPELINE
          </span>
        </div>
      </div>

      {/* 4-Stage Grid with Directional Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {PIPELINE_STAGES.map((stage, idx) => {
          const Icon = stage.icon;
          const isLast = idx === PIPELINE_STAGES.length - 1;

          return (
            <div
              key={stage.step}
              className="h-full rounded-lg border border-[#1b2026] bg-[#0d1013] p-4 flex flex-col justify-between gap-3 shadow-xs hover:border-[#2a323c] transition-colors"
            >
              {/* Stage Top Bar: Badge, Name, Icon & Connector */}
              <div className="flex items-center justify-between gap-2 border-b border-[#1b2026] pb-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-emerald-950/80 border border-emerald-800/60 font-mono text-[10px] font-bold text-emerald-400">
                    {stage.step}
                  </span>
                  <h3 className="font-mono text-xs font-bold tracking-wider text-white truncate">
                    {stage.name}
                  </h3>
                </div>

                <div className="flex items-center gap-1.5 text-zinc-500 shrink-0">
                  <Icon className="h-3.5 w-3.5 text-emerald-400/80" aria-hidden="true" />
                  {!isLast && (
                    <ArrowRight
                      className="hidden lg:block h-3 w-3 text-zinc-600"
                      aria-hidden="true"
                    />
                  )}
                </div>
              </div>

              {/* Tagline & Core Capabilities */}
              <div className="flex flex-col gap-2.5 flex-1">
                <span className="font-mono text-[11px] font-medium text-emerald-400/90 leading-tight">
                  {stage.tagline}
                </span>

                {/* Primary Capability List */}
                <div className="rounded border border-[#1f2428] bg-[#121518] p-2 flex flex-col gap-1.5">
                  <span className="font-mono text-[9px] uppercase font-semibold text-zinc-400 tracking-wider">
                    Core Capabilities
                  </span>
                  <ul className="space-y-1 text-xs text-zinc-300">
                    {stage.primaryItems.map((item, pIdx) => (
                      <li key={pIdx} className="flex items-start gap-1.5 leading-snug">
                        <span
                          className="mt-1.5 h-1 w-1 rounded-full bg-emerald-400 shrink-0"
                          aria-hidden="true"
                        />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Technical Implementation Details */}
                <ul className="space-y-1 text-[11px] text-zinc-400 leading-relaxed px-0.5 mt-auto">
                  {stage.technicalDetails.map((detail, dIdx) => (
                    <li key={dIdx} className="flex items-start gap-1.5">
                      <span className="text-zinc-600 select-none" aria-hidden="true">
                        ›
                      </span>
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
