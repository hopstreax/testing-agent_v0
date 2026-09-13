import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Compass,
  SlidersHorizontal,
  Play,
  ShieldCheck,
  FileSearch,
} from "lucide-react";
import { LandingNav } from "@/components/landing/landing-nav";
import { LandingFooter } from "@/components/landing/landing-footer";
import { Reveal } from "@/components/landing/reveal";

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

export const metadata = {
  title: "Getting Started — TraceKit",
  description: "Learn how TraceKit turns plain-language testing goals into browser actions, deterministic verification, and inspectable evidence.",
};

export default function GettingStartedPage() {
  return (
    <div className="min-h-screen bg-[#08090b] text-[#f4f4f6] flex flex-col font-sans selection:bg-[#00e599]/30 selection:text-white">
      <LandingNav />

      <main className="flex-1">
        {/* Header Section */}
        <section className="relative overflow-hidden pt-12 pb-10 sm:pt-16 sm:pb-14 border-b border-[#1f2428]">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.035]"
            style={{
              backgroundImage:
                "radial-gradient(#00e599 1px, transparent 1px), radial-gradient(#00e599 1px, #08090b 1px)",
              backgroundSize: "32px 32px",
              backgroundPosition: "0 0, 16px 16px",
            }}
            aria-hidden="true"
          />

          <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#00e599]/30 bg-[#00e599]/10 px-3 py-1 text-[11px] font-mono font-medium tracking-wider text-[#00e599] uppercase mb-4">
              Documentation &amp; Guide
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white">
              How to use TraceKit
            </h1>

            <p className="mt-4 text-sm sm:text-base leading-relaxed text-zinc-400 max-w-2xl">
              TraceKit replaces brittle selector maintenance with autonomous browser
              reasoning and deterministic verification. Follow this 5-step workflow to
              launch, inspect, and evaluate tests.
            </p>
          </div>
        </section>

        {/* 5-Step Workflow Cards */}
        <section className="py-12 sm:py-16">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-6">
            {GUIDE_STEPS.map((step, idx) => {
              const Icon = step.icon;
              return (
                <Reveal key={step.number} delayMs={idx * 60}>
                  <div className="rounded-xl border border-[#1f2428] bg-[#0d1013] p-5 sm:p-7 hover:border-zinc-700 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1b1f23] pb-4 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#00e599]/40 bg-[#00e599]/10 font-mono text-xs font-bold text-[#00e599]">
                          {step.number}
                        </div>
                        <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                          {step.title}
                        </h2>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-mono">
                        <Icon className="h-3.5 w-3.5 text-[#00e599]" />
                        <span>Phase {step.number}</span>
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm font-medium text-zinc-300 mb-3">
                      {step.summary}
                    </p>

                    <ul className="space-y-2 text-xs text-zinc-400 leading-relaxed">
                      {step.details.map((point, pIdx) => (
                        <li key={pIdx} className="flex items-start gap-2">
                          <span className="mt-1.5 h-1 w-1 rounded-full bg-[#00e599] shrink-0" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
              );
            })}

            {/* Bottom CTA Box */}
            <Reveal delayMs={100}>
              <div className="rounded-xl border border-[#00e599]/30 bg-[#00e599]/[0.03] p-6 sm:p-8 text-center mt-12 flex flex-col items-center">
                <h3 className="text-xl sm:text-2xl font-bold text-white">
                  Ready to run your first test?
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-zinc-400 max-w-md">
                  Launch an autonomous Chromium session and verify your application in seconds.
                </p>

                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  {/*
                    M8 Specification:
                    - In M8, this CTA will follow auth-aware behavior:
                        logged out -> /login
                        logged in  -> /test
                    - For current pre-M8 milestone, routes directly to existing New Test page (/test).
                  */}
                  <Link
                    href="/test"
                    id="getting-started-launch-btn"
                    className="inline-flex items-center gap-2 rounded-lg bg-[#00e599] hover:bg-[#00f5a0] px-5 py-2.5 text-xs sm:text-sm font-semibold text-[#08090b] transition-all shadow-md hover:shadow-[#00e599]/20 cursor-pointer"
                  >
                    <span>Run Your First Test</span>
                    <ArrowRight className="h-4 w-4 stroke-[2.5]" />
                  </Link>

                  <Link
                    href="/runs"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#22272b] bg-[#121518] hover:border-zinc-700 px-4 py-2.5 text-xs sm:text-sm font-medium text-zinc-300 hover:text-white transition-colors"
                  >
                    <span>View Dashboard</span>
                  </Link>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
