"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  Copy,
  Check,
  ShieldCheck,
  Compass,
  ShoppingCart,
  Globe,
} from "lucide-react";
import { QUICK_PROMPTS } from "@/components/test/quick-prompts";

interface BlueprintItem {
  id: string;
  blueprintNumber: string;
  category: string;
  name: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
  targetDescription: string;
  prompt: string;
  verificationStyle: string;
}

const BLUEPRINTS: BlueprintItem[] = [
  {
    id: QUICK_PROMPTS[0].id,
    blueprintNumber: "BP-01",
    category: QUICK_PROMPTS[0].category,
    name: QUICK_PROMPTS[0].label,
    icon: Compass,
    targetDescription: "Any web application with login forms and authenticated routes",
    prompt: QUICK_PROMPTS[0].prompt,
    verificationStyle: "Playwright url_contains + DOM visibility assertions",
  },
  {
    id: QUICK_PROMPTS[1].id,
    blueprintNumber: "BP-02",
    category: QUICK_PROMPTS[1].category,
    name: QUICK_PROMPTS[1].label,
    icon: ShoppingCart,
    targetDescription: "E-commerce storefront catalog with search, filter, and cart",
    prompt: QUICK_PROMPTS[1].prompt,
    verificationStyle: "Element has_text, input has_value, and checkout button enabled",
  },
  {
    id: QUICK_PROMPTS[2].id,
    blueprintNumber: "BP-03",
    category: QUICK_PROMPTS[2].category,
    name: QUICK_PROMPTS[2].label,
    icon: Globe,
    targetDescription: "Production, staging, or preview documentation and landing pages",
    prompt: QUICK_PROMPTS[2].prompt,
    verificationStyle: "HTTP 200 status assertions + CDP console & page error diagnostics",
  },
];

export function BlueprintLaunchCards() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyPrompt = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Ignore clipboard write failures gracefully
    }
  };

  return (
    <section aria-labelledby="blueprint-launch-title" className="flex flex-col gap-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2
            id="blueprint-launch-title"
            className="font-mono text-[11px] font-semibold uppercase tracking-wider text-zinc-400"
          >
            Quick Launch Blueprints
          </h2>
          <span className="font-mono text-[10px] text-zinc-600 select-none" aria-hidden="true">
            /
          </span>
          <span className="font-mono text-[10px] text-zinc-500">
            3 STARTER JOURNEYS
          </span>
        </div>

        <span className="font-mono text-[10px] text-zinc-400">
          Also selectable via 1-click &ldquo;Starter Templates&rdquo; inside Test Studio
        </span>
      </div>

      {/* 3 Blueprint Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {BLUEPRINTS.map((bp) => {
          const Icon = bp.icon;
          const isCopied = copiedId === bp.id;

          return (
            <div
              key={bp.id}
              className="h-full rounded-lg border border-[#1b2026] bg-[#0d1013] p-4 flex flex-col justify-between gap-3.5 shadow-xs hover:border-[#2a323c] transition-colors"
            >
              {/* Card Top: Number, Category Pill & Icon */}
              <div className="flex items-center justify-between gap-2 border-b border-[#1b2026] pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 items-center justify-center rounded bg-emerald-950/80 border border-emerald-800/60 px-1.5 font-mono text-[10px] font-bold text-emerald-400">
                    {bp.blueprintNumber}
                  </span>
                  <span className="font-mono text-[9px] font-semibold text-zinc-400 uppercase tracking-wider bg-[#121518] px-1.5 py-0.5 rounded border border-[#22272b]">
                    {bp.category}
                  </span>
                </div>

                <Icon className="h-3.5 w-3.5 text-zinc-500" aria-hidden="true" />
              </div>

              {/* Title & Target Description */}
              <div className="flex flex-col gap-1.5">
                <h3 className="text-sm font-bold text-white tracking-tight">
                  {bp.name}
                </h3>
                <div className="flex items-start gap-1.5 font-mono text-[10px] text-zinc-400">
                  <span className="text-zinc-600 select-none shrink-0" aria-hidden="true">
                    Target:
                  </span>
                  <span className="line-clamp-2">{bp.targetDescription}</span>
                </div>
              </div>

              {/* What the Agent Will Attempt (Objective Box) */}
              <div className="rounded border border-[#1f2428] bg-[#121518] p-2.5 flex flex-col gap-1.5 flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[9px] uppercase font-semibold text-zinc-400 tracking-wider">
                    Agent Objective
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyPrompt(bp.id, bp.prompt)}
                    aria-label={`Copy ${bp.name} prompt text to clipboard`}
                    className="inline-flex items-center gap-1 font-mono text-[9px] text-zinc-500 hover:text-emerald-400 transition-colors cursor-pointer rounded px-1 py-0.5 focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400"
                    title="Copy prompt text to clipboard"
                  >
                    {isCopied ? (
                      <>
                        <Check className="h-2.5 w-2.5 text-emerald-400" aria-hidden="true" />
                        <span className="text-emerald-400 font-semibold" aria-live="polite">
                          Copied
                        </span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-2.5 w-2.5" aria-hidden="true" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-zinc-300 leading-relaxed font-sans line-clamp-3">
                  &ldquo;{bp.prompt}&rdquo;
                </p>
              </div>

              {/* Verification Style */}
              <div className="flex items-start gap-1.5 font-mono text-[10px] text-zinc-400 border-t border-[#1b2026] pt-2">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
                <span className="leading-snug text-zinc-400">
                  <strong className="text-zinc-300 font-semibold">Verification:</strong>{" "}
                  {bp.verificationStyle}
                </span>
              </div>

              {/* Action Button: Link to Test Studio */}
              <div className="pt-1">
                <Link
                  href="/test"
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-md border border-[#22272b] bg-[#121518] hover:border-emerald-600/60 hover:bg-[#161a1e] hover:text-emerald-300 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition-colors cursor-pointer shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#090a0c]"
                >
                  <Sparkles className="h-3 w-3 text-emerald-400" aria-hidden="true" />
                  <span>Launch in Test Studio</span>
                  <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
