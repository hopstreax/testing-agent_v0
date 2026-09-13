import React from "react";
import {
  MousePointer2,
  ShieldCheck,
  RefreshCw,
  KeyRound,
  Camera,
  FileText,
  Cpu,
} from "lucide-react";
import { Reveal } from "./reveal";

const CAPABILITIES = [
  {
    icon: MousePointer2,
    title: "Autonomous Actions",
    description: "Navigate and interact with real websites.",
  },
  {
    icon: ShieldCheck,
    title: "Deterministic Verification",
    description: "Verify outcomes with explicit assertions.",
  },
  {
    icon: RefreshCw,
    title: "Failure Recovery",
    description: "Recover from failures and keep going.",
  },
  {
    icon: KeyRound,
    title: "Authenticated Sessions",
    description: "Use saved browser state for logged-in flows.",
  },
  {
    icon: Camera,
    title: "Visual Evidence",
    description: "Screenshots and execution traces.",
  },
  {
    icon: FileText,
    title: "Structured Reports",
    description: "Review steps, assertions and diagnostics.",
  },
  {
    icon: Cpu,
    title: "Multiple LLM Providers",
    description: "Gemini, Groq, or Ollama.",
  },
];

export function CapabilityStrip() {
  return (
    <section className="border-y border-[#1f2428] bg-[#090b0d]/70 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {CAPABILITIES.map((cap) => {
              const Icon = cap.icon;
              return (
                <div
                  key={cap.title}
                  className="group relative flex flex-col justify-start rounded-lg border border-[#1f2428] bg-[#0e1114]/80 p-3.5 transition-all duration-200 hover:border-[#00e599]/50 hover:bg-[#12161a] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/60 cursor-default select-none"
                >
                  <div className="mb-2.5 flex h-7 w-7 items-center justify-center rounded-md bg-[#161a1e] border border-zinc-800 text-[#00e599] transition-all duration-200 group-hover:border-[#00e599]/40 group-hover:scale-110 group-hover:bg-[#1a221f]">
                    <Icon className="h-4 w-4 transition-transform duration-200" />
                  </div>
                  <div className="text-xs font-semibold text-white tracking-tight leading-snug group-hover:text-white transition-colors">
                    {cap.title}
                  </div>
                  <div className="mt-1 text-[11px] text-zinc-400 leading-normal group-hover:text-zinc-300 transition-colors">
                    {cap.description}
                  </div>
                </div>
              );
            })}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
