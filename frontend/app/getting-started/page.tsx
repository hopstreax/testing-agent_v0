"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Compass,
  SlidersHorizontal,
  Play,
  ShieldCheck,
  FileSearch,
  Terminal,
} from "lucide-react";
import { Sidebar } from "@/components/shell/sidebar";
import { TopBar } from "@/components/shell/top-bar";
import { WorkspaceFooter } from "@/components/shell/workspace-footer";
import { Reveal } from "@/components/landing/reveal";
import { GettingStartedHeader } from "@/components/getting-started/getting-started-header";
import { PipelineOverview } from "@/components/getting-started/pipeline-overview";
import { BlueprintLaunchCards } from "@/components/getting-started/blueprint-launch-cards";
import { ArchitectureInspector } from "@/components/getting-started/architecture-inspector";

const GUIDE_STEPS = [
  {
    number: "01",
    icon: Compass,
    title: "Define your test",
    summary: "Give TraceKit a URL and describe what you want verified.",
    details: [
      "Enter any web URL reachable from your environment (local or production).",
      "Write your test goal in plain English (e.g. \"Log in as standard_user, add the backpack to the cart, and verify the checkout button is enabled\").",
      "TraceKit translates your objective into an autonomous Observe → Reason → Act loop.",
    ],
  },
  {
    number: "02",
    icon: SlidersHorizontal,
    title: "Configure your environment",
    summary: "Choose browser settings, authentication state, AI provider, and model.",
    details: [
      "Select Headless or Headed browser execution with Chromium.",
      "Inject authenticated session state (storage_state JSON) to test post-login user flows without re-authenticating every run.",
      "Pick your reasoning provider: Auto (Fallback), Google Gemini, Groq Cloud, or local Ollama.",
      "Optionally specify custom model overrides or set maximum execution step budgets.",
    ],
  },
  {
    number: "03",
    icon: Play,
    title: "Run",
    summary: "TraceKit observes the website and performs browser actions.",
    details: [
      "The agent captures DOM accessibility snapshots and interactive element positions.",
      "Actions executed include click, type, keypress, option select, scroll, and hover.",
      "Multi-element disambiguation with 0-based indices prevents accidental clicks on duplicate locators.",
      "Resilient failure recovery keeps tests moving forward if initial interactions require adjustment.",
    ],
  },
  {
    number: "04",
    icon: ShieldCheck,
    title: "Verify",
    summary: "Deterministic assertions confirm whether the expected state was reached.",
    details: [
      "Deterministic assertions verify conditions directly against Playwright / Chromium APIs.",
      "Supported checks include element visible, hidden, text content, input value, page URL, and page title.",
      "Rich state assertions check whether checkboxes/toggles are checked or unchecked, buttons are enabled or disabled, and match element counts.",
    ],
  },
  {
    number: "05",
    icon: FileSearch,
    title: "Review",
    summary: "Inspect actions, screenshots, diagnosis, and the generated report.",
    details: [
      "Examine the complete chronological step-by-step decision trace.",
      "View visual screenshot evidence captured at each interaction point.",
      "If a run fails, deterministic failure diagnosis isolates the root cause (e.g. ASSERTION_FAILED, LOCATOR_NOT_FOUND, BUDGET_EXCEEDED, PROVIDER_ERROR).",
      "Download or export complete structured JSON and Markdown test reports.",
    ],
  },
];

export default function GettingStartedPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#090a0c] text-[#f4f4f6]">
      {/* Left Navigation Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top Bar */}
        <TopBar onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)} />

        {/* Getting Started Main Workspace */}
        <main
          className="flex-1 overflow-y-auto px-4 py-8 sm:px-8 lg:px-12"
          style={{
            backgroundImage: "radial-gradient(#1f2428 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        >
          <div className="mx-auto max-w-7xl flex flex-col gap-8 sm:gap-9">
            {/* 1. Developer Onboarding Console Header */}
            <GettingStartedHeader />

            {/* 2. Four-Stage Horizontal Execution Pipeline */}
            <PipelineOverview />

            {/* 3. First Run / Execution Lifecycle Primer */}
            <section aria-labelledby="first-run-title" className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <h2
                  id="first-run-title"
                  className="font-mono text-[11px] font-semibold uppercase tracking-wider text-zinc-400"
                >
                  First Run
                </h2>
                <span className="font-mono text-[10px] text-zinc-600 select-none" aria-hidden="true">
                  /
                </span>
                <span className="font-mono text-[10px] text-zinc-500">
                  DEVELOPER ONBOARDING FLOW
                </span>
              </div>

              <div className="rounded-lg border border-[#1b2026] bg-[#0d1013] p-4 sm:p-5 shadow-xs">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1.5 border-b md:border-b-0 md:border-r border-[#1b2026] pb-3 md:pb-0 md:pr-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-1.5 py-0.5 rounded">
                        STEP 1
                      </span>
                      <span className="text-xs font-semibold text-white">
                        Choose Goal &amp; Target
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                      Provide a target URL and plain-English objective. Pick an action blueprint below or author a custom flow in Test Studio.
                    </p>
                  </div>

                  <div className="flex flex-col gap-1.5 border-b md:border-b-0 md:border-r border-[#1b2026] pb-3 md:pb-0 md:pr-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold text-sky-400 bg-sky-950/80 border border-sky-800/60 px-1.5 py-0.5 rounded">
                        STEP 2
                      </span>
                      <span className="text-xs font-semibold text-white">
                        Autonomous Execution
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                      Chromium runs in headed or headless mode, explores the live DOM tree, dispatches typed interactions, and evaluates deterministic checks.
                    </p>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold text-amber-400 bg-amber-950/80 border border-amber-800/60 px-1.5 py-0.5 rounded">
                        STEP 3
                      </span>
                      <span className="text-xs font-semibold text-white">
                        Inspect Evidence
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                      Open Run Details to review chronological step screenshots, CDP console diagnostics, and automated root-cause failure classifications.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* 4. Quick Launch Blueprints */}
            <BlueprintLaunchCards />

            {/* 5. What TraceKit Trusts (Architecture Inspector) */}
            <ArchitectureInspector />

            {/* 6. Detailed Step-by-Step Workflow Walkthrough */}
            <section aria-labelledby="workflow-walkthrough-title" className="flex flex-col gap-4">
              <div className="flex items-center gap-2 border-t border-[#1b2026] pt-6">
                <h2
                  id="workflow-walkthrough-title"
                  className="font-mono text-[11px] font-semibold uppercase tracking-wider text-zinc-400"
                >
                  Workflow Deep-Dive
                </h2>
                <span className="font-mono text-[10px] text-zinc-600 select-none" aria-hidden="true">
                  /
                </span>
                <span className="font-mono text-[10px] text-zinc-500">
                  5-PHASE RUNBOOK
                </span>
              </div>

              <div className="space-y-3.5">
                {GUIDE_STEPS.map((step, idx) => {
                  const Icon = step.icon;
                  return (
                    <Reveal key={step.number} delayMs={idx * 50}>
                      <div className="rounded-lg border border-[#1b2026] bg-[#0d1013] p-4 sm:p-5 hover:border-[#2a323c] transition-colors">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1b1f23] pb-3 mb-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-6 w-6 items-center justify-center rounded bg-emerald-950/80 border border-emerald-800/60 font-mono text-xs font-bold text-emerald-400">
                              {step.number}
                            </div>
                            <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                              {step.title}
                            </h3>
                          </div>

                          <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-mono">
                            <Icon className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                            <span>Phase {step.number}</span>
                          </div>
                        </div>

                        <p className="text-xs font-medium text-zinc-300 mb-2.5">
                          {step.summary}
                        </p>

                        <ul className="space-y-1 text-xs text-zinc-400 leading-relaxed">
                          {step.details.map((point, pIdx) => (
                            <li key={pIdx} className="flex items-start gap-2">
                              <span
                                className="mt-1.5 h-1 w-1 rounded-full bg-emerald-400 shrink-0"
                                aria-hidden="true"
                              />
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </Reveal>
                  );
                })}

                {/* 7. Final Action Console CTA */}
                <Reveal delayMs={100}>
                  <div className="rounded-lg border border-[#1b2026] bg-[#0d1013] p-6 sm:p-8 text-center mt-6 flex flex-col items-center">
                    <div className="inline-flex items-center gap-1.5 rounded bg-[#121518] border border-[#22272b] px-2 py-0.5 font-mono text-[10px] font-semibold text-zinc-300 mb-3">
                      <Terminal className="h-3 w-3 text-emerald-400" aria-hidden="true" />
                      <span>START TESTING</span>
                    </div>

                    <h3 className="text-lg sm:text-xl font-bold text-white font-sans">
                      Ready to execute your first autonomous test?
                    </h3>
                    <p className="mt-1.5 text-xs sm:text-sm text-zinc-400 max-w-md font-sans">
                      Launch an autonomous Chromium session and verify your application state in seconds.
                    </p>

                    <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                      <Link
                        href="/test"
                        id="getting-started-bottom-launch-btn"
                        className="inline-flex items-center gap-2 rounded-md bg-emerald-400 hover:bg-emerald-300 px-4 py-2 text-xs sm:text-sm font-bold text-zinc-950 transition-colors shadow-xs active:scale-[0.98] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#090a0c]"
                      >
                        <span>Open Test Studio</span>
                        <ArrowRight className="h-3.5 w-3.5 stroke-[2.5]" aria-hidden="true" />
                      </Link>

                      <Link
                        href="/runs"
                        className="inline-flex items-center gap-1.5 rounded-md border border-[#22272b] bg-[#121518] hover:border-zinc-700 hover:bg-[#161a1e] px-3.5 py-2 text-xs sm:text-sm font-medium text-zinc-300 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#090a0c]"
                      >
                        <span>View Execution Runs</span>
                      </Link>
                    </div>
                  </div>
                </Reveal>
              </div>
            </section>
          </div>
        </main>

        {/* Compact Workspace Footer */}
        <WorkspaceFooter />
      </div>
    </div>
  );
}
