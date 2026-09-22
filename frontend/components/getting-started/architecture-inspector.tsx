import React from "react";
import { Cpu, ShieldCheck, CheckCircle2 } from "lucide-react";

export function ArchitectureInspector() {
  return (
    <section aria-labelledby="architecture-inspector-title" className="flex flex-col gap-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2
            id="architecture-inspector-title"
            className="font-mono text-[11px] font-semibold uppercase tracking-wider text-zinc-400"
          >
            What TraceKit Trusts
          </h2>
          <span className="font-mono text-[10px] text-zinc-600 select-none" aria-hidden="true">
            /
          </span>
          <span className="font-mono text-[10px] text-zinc-500">
            ENGINE TRUST BOUNDARY
          </span>
        </div>

        <span className="font-mono text-[10px] text-zinc-400">
          The agent interacts; deterministic assertions determine the test verdict.
        </span>
      </div>

      {/* Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* Left: Agent Reasoning */}
        <div className="h-full rounded-lg border border-[#1b2026] bg-[#0d1013] p-4 flex flex-col justify-between gap-3 shadow-xs">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-[#1b2026] pb-2.5">
              <div className="flex items-center gap-2">
                <span className="flex h-5 items-center justify-center rounded bg-sky-950/80 border border-sky-800/60 px-1.5 font-mono text-[10px] font-bold text-sky-400">
                  REASONING
                </span>
                <h3 className="font-mono text-xs font-bold text-white tracking-wider">
                  AGENT DECISION LOOP
                </h3>
              </div>
              <Cpu className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed font-sans">
              The reasoning provider plans step-by-step navigation and resolves dynamic locators,
              but is <strong className="text-zinc-200 font-semibold">never trusted</strong> to evaluate test success or failure.
            </p>
          </div>

          <div className="rounded border border-[#1f2428] bg-[#121518] p-3 flex flex-col gap-2 mt-auto">
            <span className="font-mono text-[9px] uppercase font-semibold text-zinc-400 tracking-wider">
              Reasoning Responsibilities
            </span>
            <ul className="space-y-1.5 text-xs text-zinc-300">
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-400 shrink-0" aria-hidden="true" />
                <span>Determines what action to attempt next (click, fill, select, scroll)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-400 shrink-0" aria-hidden="true" />
                <span>Extracts interactive DOM &amp; accessibility tree structure</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-400 shrink-0" aria-hidden="true" />
                <span>Resolves locator ambiguity with 0-based index disambiguation</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-400 shrink-0" aria-hidden="true" />
                <span>Produces decision rationale and adapts to transient element states</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Right: Deterministic Verification */}
        <div className="h-full rounded-lg border border-[#1b2026] bg-[#0d1013] p-4 flex flex-col justify-between gap-3 shadow-xs">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-[#1b2026] pb-2.5">
              <div className="flex items-center gap-2">
                <span className="flex h-5 items-center justify-center rounded bg-emerald-950/80 border border-emerald-800/60 px-1.5 font-mono text-[10px] font-bold text-emerald-400">
                  VERIFICATION
                </span>
                <h3 className="font-mono text-xs font-bold text-white tracking-wider">
                  DETERMINISTIC PLAYWRIGHT CHECKS
                </h3>
              </div>
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed font-sans">
              Assertions are executed directly in browser engine context. A test passes{" "}
              <strong className="text-zinc-200 font-semibold">only if all deterministic checks succeed</strong>,
              eliminating hallucinated passes.
            </p>
          </div>

          <div className="rounded border border-[#1f2428] bg-[#121518] p-3 flex flex-col gap-2 mt-auto">
            <span className="font-mono text-[9px] uppercase font-semibold text-zinc-400 tracking-wider">
              Native Assertion Protocols
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="flex items-center gap-1.5 text-zinc-300">
                <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" aria-hidden="true" />
                <span>visible</span>
              </div>
              <div className="flex items-center gap-1.5 text-zinc-300">
                <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" aria-hidden="true" />
                <span>has_text</span>
              </div>
              <div className="flex items-center gap-1.5 text-zinc-300">
                <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" aria-hidden="true" />
                <span>not_visible</span>
              </div>
              <div className="flex items-center gap-1.5 text-zinc-300">
                <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" aria-hidden="true" />
                <span>has_count</span>
              </div>
              <div className="flex items-center gap-1.5 text-zinc-300">
                <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" aria-hidden="true" />
                <span>url_contains</span>
              </div>
              <div className="flex items-center gap-1.5 text-zinc-300">
                <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" aria-hidden="true" />
                <span>title_contains</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trust Invariant Summary Strip */}
      <div className="rounded-lg border border-[#1b2026] bg-[#0d1013] px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-zinc-400">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" aria-hidden="true" />
          <span className="font-mono text-[11px] text-zinc-300 shrink-0">
            Core Trust Invariant:
          </span>
          <span className="text-zinc-400 text-xs">
            LLMs choose the interaction path; native browser assertions prove the verdict.
          </span>
        </div>
        <span className="font-mono text-[10px] text-zinc-500 uppercase self-start sm:self-auto shrink-0">
          Zero Hallucinated Passes
        </span>
      </div>
    </section>
  );
}
