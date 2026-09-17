"use client";

import React, { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import {
  Layers,
  ShieldCheck,
  Camera,
  CheckCircle2,
  ZoomIn,
  FileCode,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkspaceStep {
  id: number;
  type: string;
  target: string;
  status: "PASSED";
  duration: string;
  assertion: string;
  screenshotLabel: string;
  domDetail: string;
}

const RUN_STEPS: WorkspaceStep[] = [
  {
    id: 1,
    type: "NAVIGATE",
    target: "https://saucedemo.com",
    status: "PASSED",
    duration: "410ms",
    assertion: "expect(page).toHaveURL('https://saucedemo.com')",
    screenshotLabel: "01_page_navigation_loaded.png",
    domDetail: "HTTP 200 OK • DOMContentLoaded fired in 120ms",
  },
  {
    id: 2,
    type: "OBSERVE",
    target: "Accessibility snapshot",
    status: "PASSED",
    duration: "280ms",
    assertion: "expect(productGrid).toBeVisible()",
    screenshotLabel: "02_inventory_grid_scanned.png",
    domDetail: "14 interactable nodes indexed with screen coordinates",
  },
  {
    id: 3,
    type: "CLICK",
    target: "button#add-to-cart-sauce-labs-backpack",
    status: "PASSED",
    duration: "340ms",
    assertion: "expect(button).toHaveText('Remove')",
    screenshotLabel: "03_item_added_to_cart.png",
    domDetail: "Action dispatched via Playwright CDP • state mutated",
  },
  {
    id: 4,
    type: "VERIFY",
    target: ".shopping_cart_badge",
    status: "PASSED",
    duration: "142ms",
    assertion: "expect(cartBadge).toHaveText('1')",
    screenshotLabel: "04_cart_badge_verified.png",
    domDetail: "Deterministic assertion passed: value matched invariant",
  },
];

export function EvidenceWorkspace() {
  const [selectedStepId, setSelectedStepId] = useState<number>(4);
  const shouldReduceMotion = useReducedMotion();
  const prefersReducedMotion = Boolean(shouldReduceMotion);

  const currentStep = RUN_STEPS.find((s) => s.id === selectedStepId) || RUN_STEPS[3];

  return (
    <section id="evidence" className="py-16 sm:py-24 bg-[#08090b] border-b border-[#1b2026] relative overflow-hidden scroll-mt-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
          <div>
            <div className="inline-flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-[#00e599] mb-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#00e599]" />
              <span>INSPECTABLE RUN ARTIFACTS</span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-[-0.02em] text-white">
              Every run produces evidence you can inspect.
            </h2>
          </div>
          <p className="font-sans text-xs sm:text-sm text-zinc-400 font-normal leading-relaxed max-w-md sm:text-right">
            Chronological traces, deterministic assertion results, and visual screenshot artifacts.
          </p>
        </div>

        {/* ── Developer Investigation Workspace Window ── */}
        <div className="rounded-xl border border-[#1b2026] bg-[#0d1013] shadow-xl overflow-hidden">
          {/* Workspace Titlebar */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1b2026] bg-[#101418] px-4 py-2.5 font-mono text-xs select-none">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5" aria-hidden="true">
                <span className="h-2 w-2 rounded-full bg-zinc-600" />
                <span className="h-2 w-2 rounded-full bg-zinc-600" />
                <span className="h-2 w-2 rounded-full bg-zinc-600" />
              </div>
              <span className="text-zinc-500 pl-1">RUN #7F82</span>
              <span className="text-zinc-600">•</span>
              <span className="text-zinc-300 font-semibold truncate">https://www.saucedemo.com</span>
            </div>

            <div className="flex items-center gap-2 font-mono text-[11px]">
              <span className="rounded bg-emerald-950/80 border border-emerald-800/60 px-2 py-0.5 text-emerald-400 font-semibold">
                4 / 4 PASSED
              </span>
              <span className="hidden sm:inline text-zinc-500">Gemini 3.6 Flash</span>
              <span className="hidden md:inline text-zinc-600">•</span>
              <span className="hidden md:inline text-zinc-400 text-[10px]">Total: 00:03.4s</span>
            </div>
          </div>

          {/* Workspace Body: Two-Column Investigation Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#1b2026]">
            {/* Left Column: Steps Trace (lg:col-span-5) */}
            <div className="lg:col-span-5 p-4 sm:p-5 flex flex-col justify-between space-y-3 font-mono">
              <div>
                <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-[#1b2026] text-xs">
                  <div className="flex items-center gap-1.5 text-zinc-300 font-semibold">
                    <Layers className="h-3.5 w-3.5 text-emerald-400" />
                    <span>EXECUTION STEPS TRACE</span>
                  </div>
                  <span className="text-[10.5px] text-zinc-500">4 Steps</span>
                </div>

                <div className="space-y-2">
                  {RUN_STEPS.map((step) => {
                    const isSelected = selectedStepId === step.id;
                    return (
                      <button
                        type="button"
                        key={step.id}
                        onClick={() => setSelectedStepId(step.id)}
                        className={cn(
                          "group relative flex items-center justify-between rounded-lg border p-2.5 transition-all duration-150 cursor-pointer text-xs text-left w-full focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00e599]",
                          isSelected
                            ? "border-[#00e599]/50 bg-[#12161b] shadow-xs"
                            : "border-[#1b2026] bg-[#0d1013] hover:border-zinc-700 hover:bg-[#12161b]"
                        )}
                        aria-label={`Step ${step.id}: ${step.type} ${step.target}`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-zinc-500 text-[11px] font-bold w-6">#{step.id}</span>
                          <span className="rounded bg-[#12161b] border border-[#222932] px-1.5 py-0.5 text-[9.5px] font-bold uppercase text-zinc-300">
                            {step.type}
                          </span>
                          <span className="text-zinc-300 truncate text-[11px]">{step.target}</span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-zinc-500">{step.duration}</span>
                          <CheckCircle2 className="h-3.5 w-3.5 text-[#00e599]" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step info tip */}
              <div className="pt-3 border-t border-[#1b2026] text-[10.5px] text-zinc-500">
                Click any step to inspect assertion state & screenshot evidence.
              </div>
            </div>

            {/* Right Column: Deterministic Assertions & Visual Evidence (lg:col-span-7) */}
            <div className="lg:col-span-7 p-4 sm:p-5 flex flex-col justify-between space-y-4 font-mono">
              {/* Assertions Table Snippet */}
              <div>
                <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-[#1b2026] text-xs">
                  <div className="flex items-center gap-1.5 text-zinc-300 font-semibold">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                    <span>DETERMINISTIC VERIFICATION</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-semibold">Invariant Validated</span>
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep.id}
                    initial={{ opacity: prefersReducedMotion ? 1 : 0, y: prefersReducedMotion ? 0 : 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.18 }}
                    className="rounded-lg border border-[#222932] bg-[#12161b] p-3 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-500">Active Step:</span>
                      <span className="text-white font-semibold">#{currentStep.id} {currentStep.type}</span>
                    </div>
                    <div className="rounded bg-[#08090b] border border-[#222932] p-2 text-[11px] text-[#00e599] break-all">
                      {currentStep.assertion}
                    </div>
                    <div className="text-[10.5px] text-zinc-400 pt-1 flex items-center justify-between">
                      <span>Telemetry: {currentStep.domDetail}</span>
                      <span className="text-emerald-400 font-bold">✓ PASSED</span>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Visual Evidence Screenshot Frame */}
              <div>
                <div className="flex items-center justify-between pb-2 mb-2 text-xs">
                  <div className="flex items-center gap-1.5 text-zinc-300 font-semibold">
                    <Camera className="h-3.5 w-3.5 text-[#00e599]" />
                    <span>VISUAL EVIDENCE ARTIFACT</span>
                  </div>
                  <span className="text-[10px] text-zinc-400 truncate max-w-[200px]">
                    {currentStep.screenshotLabel}
                  </span>
                </div>

                {/* Screenshot Visual Preview Simulation */}
                <div className="relative rounded-lg border border-[#1b2026] bg-[#08090b] p-3 overflow-hidden group">
                  <div className="aspect-video w-full rounded border border-[#222932] bg-[#101418] flex flex-col items-center justify-center relative overflow-hidden">
                    {/* Simulated page preview graphic */}
                    <div className="w-full h-full p-4 flex flex-col justify-between select-none">
                      <div className="flex items-center justify-between border-b border-[#1b2026] pb-2">
                        <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-mono">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          <span>saucedemo.com viewport snapshot</span>
                        </div>
                        <span className="text-[9px] text-zinc-500 font-mono">1280 × 800</span>
                      </div>

                      <div className="flex items-center justify-center gap-3 py-2">
                        <div className="h-10 w-10 rounded bg-[#12161b] border border-[#222932] flex items-center justify-center text-zinc-400">
                          <FileCode className="h-5 w-5 text-[#00e599]" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-white">Sauce Labs Backpack</div>
                          <div className="text-[10px] text-zinc-400 font-mono">Step #{currentStep.id} Invariant Confirmed</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[9.5px] font-mono text-zinc-500 border-t border-[#1b2026] pt-1.5">
                        <span>Hash: sha256:7f82b9a1</span>
                        <span className="text-[#00e599]">Evidence verified</span>
                      </div>
                    </div>

                    {/* Hover Zoom Overlay */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="rounded-md bg-[#08090b]/90 border border-zinc-700 px-3 py-1.5 text-xs text-zinc-200 font-mono flex items-center gap-1.5 shadow-lg">
                        <ZoomIn className="h-3.5 w-3.5 text-[#00e599]" />
                        <span>Inspect Full Screenshot</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
