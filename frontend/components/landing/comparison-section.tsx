import React from "react";
import { MinusCircle, CheckCircle2, Code2 } from "lucide-react";

export function ComparisonSection() {
  return (
    <div className="flex flex-col justify-between">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          A different approach to web testing.
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-zinc-400">
          TraceKit combines the flexibility of AI-driven browser interaction with
          the reliability of deterministic verification.
        </p>
      </div>

      {/* Comparison Cards Grid */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Card 1: Traditional Scripted Tests */}
        <div className="rounded-lg border border-[#22272b] bg-[#0d1013] p-4.5 flex flex-col justify-between transition-all duration-200 hover:border-zinc-700/80 hover:bg-[#0f1216]">
          <div>
            <div className="flex items-center gap-2 font-mono text-xs font-semibold text-zinc-300 mb-4">
              <Code2 className="h-4 w-4 text-zinc-500" />
              <span>Traditional scripted tests</span>
            </div>

            <ul className="space-y-2.5 text-xs text-zinc-400">
              <li className="flex items-center gap-2">
                <MinusCircle className="h-3.5 w-3.5 text-zinc-600 shrink-0" />
                <span>Predefined flows</span>
              </li>
              <li className="flex items-center gap-2">
                <MinusCircle className="h-3.5 w-3.5 text-zinc-600 shrink-0" />
                <span>Brittle selectors</span>
              </li>
              <li className="flex items-center gap-2">
                <MinusCircle className="h-3.5 w-3.5 text-zinc-600 shrink-0" />
                <span>High maintenance</span>
              </li>
              <li className="flex items-center gap-2">
                <MinusCircle className="h-3.5 w-3.5 text-zinc-600 shrink-0" />
                <span>Hard to adapt to changes</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Card 2: TraceKit */}
        <div className="rounded-lg border border-[#00e599]/40 bg-[#00e599]/[0.03] p-4.5 shadow-sm shadow-[#00e599]/10 flex flex-col justify-between transition-all duration-200 hover:border-[#00e599]/70 hover:shadow-md hover:shadow-[#00e599]/20 hover:-translate-y-0.5">
          <div>
            <div className="flex items-center gap-2 font-mono text-xs font-semibold text-white mb-4">
              <span className="font-bold text-[#00e599]">&gt;_</span>
              <span>TraceKit</span>
            </div>

            <ul className="space-y-2.5 text-xs text-zinc-200">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#00e599] shrink-0" />
                <span>Natural-language test goals</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#00e599] shrink-0" />
                <span>Browser-aware actions</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#00e599] shrink-0" />
                <span>Deterministic verification</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#00e599] shrink-0" />
                <span>Inspectable evidence</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#00e599] shrink-0" />
                <span>Deterministic failure diagnosis</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
