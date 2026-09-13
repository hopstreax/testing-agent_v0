"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Lock,
  Play,
  Zap,
  ShieldCheck,
  Eye,
  Check,
  Pause,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";

const STEPS_DATA = [
  {
    id: "goal",
    name: "Goal",
    subtext: "Verify that a user can add a product to the cart",
    log: "Objective defined",
  },
  {
    id: "observe",
    name: "Observe",
    subtext: "Inspecting page state & DOM elements...",
    log: "[1] Navigated to saucedemo.com",
  },
  {
    id: "reason",
    name: "Reason",
    subtext: "Choosing next action: locate product & add to cart...",
    log: "[2] Found \"Sauce Labs Backpack\"",
  },
  {
    id: "act",
    name: "Act",
    subtext: "Clicking \"Add to cart\" button...",
    log: "[3] Clicked button#add-to-cart-sauce-labs-backpack",
  },
  {
    id: "verify",
    name: "Verify",
    subtext: "Checking cart contents with deterministic assertion...",
    log: "[4] Verified cart contains item",
  },
];

export function HeroSection() {
  const { isAuthenticated, isLoading } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const runTestHref = isLoading ? "#" : isAuthenticated ? "/test" : "/login";

  const handleRunTestClick = (e: React.MouseEvent) => {
    if (isLoading) {
      e.preventDefault();
    }
  };

  // Subscribe to reduced motion preference changes safely after mount
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => {
      setPrefersReducedMotion(mediaQuery.matches);
    };
    const timer = setTimeout(updateMotion, 0);

    mediaQuery.addEventListener("change", updateMotion);
    return () => {
      clearTimeout(timer);
      mediaQuery.removeEventListener("change", updateMotion);
    };
  }, []);

  // Looping sequence timer (auto advances every 3.2s when not paused and not reduced motion)
  useEffect(() => {
    if (isPaused || prefersReducedMotion) return;

    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % STEPS_DATA.length);
    }, 3200);

    return () => clearInterval(interval);
  }, [isPaused, prefersReducedMotion]);

  // Pause when window is out of view
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsPaused(true);
      } else {
        setIsPaused(false);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  return (
    <section className="relative overflow-hidden pt-12 pb-16 lg:pt-20 lg:pb-24">
      {/* Subtle background grid texture */}
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

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-8 items-center">
          {/* Left Column: Copy & Actions */}
          <div className="lg:col-span-6 flex flex-col items-start">
            {/* Pill Tag */}
            <div className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-[#00e599]/30 bg-[#00e599]/10 px-3 py-1 text-[11px] font-mono font-medium tracking-wider text-[#00e599] uppercase">
              AI WEB TESTING
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-[52px] font-bold tracking-tight text-white leading-[1.12]">
              AI web testing that{" "}
              <span className="text-[#00e599] block sm:inline">
                acts, verifies, and explains.
              </span>
            </h1>

            {/* Subhead / Supporting Copy */}
            <p className="mt-5 text-sm sm:text-base leading-relaxed text-zinc-400 max-w-xl">
              TraceKit turns a plain-language testing goal into real browser actions,
              deterministic verification, and evidence you can inspect.
            </p>

            {/* Action Buttons with Micro-interactions */}
            <div className="mt-8 flex flex-wrap items-center gap-3.5">
              <Link
                href={runTestHref}
                onClick={handleRunTestClick}
                aria-busy={isLoading}
                id="hero-primary-cta"
                className="group inline-flex items-center gap-2 rounded-lg bg-[#00e599] hover:bg-[#00f5a0] px-5 py-2.5 text-xs sm:text-sm font-semibold text-[#08090b] transition-all shadow-md hover:shadow-[#00e599]/25 active:scale-[0.98] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00e599]"
              >
                <span>Run New Test</span>
                <ArrowRight className="h-4 w-4 stroke-[2.5] transition-transform duration-150 group-hover:translate-x-1" />
              </Link>

              <a
                href="#how-it-works"
                id="hero-secondary-cta"
                className="inline-flex items-center gap-2 rounded-lg border border-[#22272b] bg-[#121518] hover:border-zinc-700 hover:bg-[#161a1e] px-5 py-2.5 text-xs sm:text-sm font-medium text-zinc-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-600"
              >
                How it works
              </a>
            </div>
          </div>

          {/* Right Column: Interactive Execution Visualization Window */}
          <div className="lg:col-span-6" ref={containerRef}>
            <div
              className="rounded-xl border border-[#22272b] bg-[#0d1013] shadow-2xl shadow-black/80 overflow-hidden relative transition-all duration-300 hover:border-zinc-700/80"
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
            >
              {/* Window Header */}
              <div className="flex items-center justify-between border-b border-[#1f2428] bg-[#111418] px-4 py-2.5 select-none">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-[#ef4444]/80" />
                  <div className="h-2.5 w-2.5 rounded-full bg-[#eab308]/80" />
                  <div className="h-2.5 w-2.5 rounded-full bg-[#22c55e]/80" />
                </div>

                <div className="flex items-center gap-2 font-mono text-[10px] text-zinc-400">
                  {prefersReducedMotion ? (
                    <span id="hero-reduced-motion-indicator" className="text-zinc-400 font-medium">Reduced motion enabled: animations paused</span>
                  ) : (
                    <>
                      <span className="hidden sm:inline text-zinc-500">Representative preview •</span>
                      <span className="text-[#00e599]">Observe the workflow</span>
                    </>
                  )}
                  {!prefersReducedMotion && (
                    <button
                      type="button"
                      onClick={() => setIsPaused((prev) => !prev)}
                      className="ml-1.5 p-0.5 text-zinc-500 hover:text-zinc-300 cursor-pointer"
                      title={isPaused ? "Resume animation" : "Pause animation"}
                      aria-label={isPaused ? "Resume animation" : "Pause animation"}
                    >
                      {isPaused ? <RotateCcw className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                    </button>
                  )}
                </div>
              </div>

              {/* Window Body: Two Column Layout */}
              <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-5">
                {/* Left: Interactive Stepper */}
                <div className="md:col-span-5 flex flex-col justify-between space-y-2.5 font-sans">
                  {/* Step 0: Goal */}
                  <button
                    id="hero-step-0"
                    data-active={activeStep === 0 ? "true" : "false"}
                    type="button"
                    onClick={() => setActiveStep(0)}
                    className={cn(
                      "flex items-start gap-2.5 text-left p-1.5 rounded-md transition-all cursor-pointer w-full focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00e599]",
                      activeStep === 0
                        ? "bg-[#14181c] border border-[#00e599]/30 shadow-xs"
                        : "border border-transparent hover:bg-[#12161a]"
                    )}
                  >
                    <div
                      className={cn(
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors",
                        activeStep >= 0
                          ? "bg-[#00e599]/15 border border-[#00e599]/50 text-[#00e599]"
                          : "bg-zinc-900 border border-zinc-700 text-zinc-500"
                      )}
                    >
                      <Check className="h-3 w-3 stroke-[2.5]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-semibold text-white uppercase tracking-wider flex items-center justify-between">
                        <span>Goal</span>
                        {activeStep === 0 && (
                          <span className="text-[9px] font-mono text-[#00e599] lowercase">active</span>
                        )}
                      </div>
                      <div className="mt-1 rounded border border-[#22272b] bg-[#0e1114] p-1.5 font-mono text-[10px] leading-tight text-zinc-300">
                        Verify that a user can add a product to the cart
                      </div>
                    </div>
                  </button>

                  {/* Step 1: Observe */}
                  <button
                    id="hero-step-1"
                    data-active={activeStep === 1 ? "true" : "false"}
                    type="button"
                    onClick={() => setActiveStep(1)}
                    className={cn(
                      "flex items-start gap-2.5 text-left p-1.5 rounded-md transition-all cursor-pointer w-full focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00e599]",
                      activeStep === 1
                        ? "bg-[#14181c] border border-[#00e599]/30 shadow-xs"
                        : "border border-transparent hover:bg-[#12161a]"
                    )}
                  >
                    <div
                      className={cn(
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors",
                        activeStep >= 1
                          ? "bg-[#00e599]/15 border border-[#00e599]/50 text-[#00e599]"
                          : "bg-zinc-900 border border-zinc-700 text-zinc-500"
                      )}
                    >
                      <Eye className="h-3 w-3" />
                    </div>
                    <div>
                      <div className="text-[11px] font-medium text-white flex items-center gap-1.5">
                        <span>Observe</span>
                        {activeStep === 1 && (
                          <span className="text-[9px] font-mono text-[#00e599] lowercase">active</span>
                        )}
                      </div>
                      <div className="text-[10px] text-zinc-400">Inspecting page state...</div>
                    </div>
                  </button>

                  {/* Step 2: Reason */}
                  <button
                    id="hero-step-2"
                    data-active={activeStep === 2 ? "true" : "false"}
                    type="button"
                    onClick={() => setActiveStep(2)}
                    className={cn(
                      "flex items-start gap-2.5 text-left p-1.5 rounded-md transition-all cursor-pointer w-full focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00e599]",
                      activeStep === 2
                        ? "bg-[#14181c] border border-[#00e599]/30 shadow-xs"
                        : "border border-transparent hover:bg-[#12161a]"
                    )}
                  >
                    <div
                      className={cn(
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors",
                        activeStep >= 2
                          ? "bg-[#00e599]/15 border border-[#00e599]/50 text-[#00e599]"
                          : "bg-zinc-900 border border-zinc-700 text-zinc-500"
                      )}
                    >
                      <Zap className="h-3 w-3" />
                    </div>
                    <div>
                      <div className="text-[11px] font-medium text-white flex items-center gap-1.5">
                        <span>Reason</span>
                        {activeStep === 2 && (
                          <span className="text-[9px] font-mono text-[#00e599] lowercase">active</span>
                        )}
                      </div>
                      <div className="text-[10px] text-zinc-400">Choosing next action...</div>
                    </div>
                  </button>

                  {/* Step 3: Act */}
                  <button
                    id="hero-step-3"
                    data-active={activeStep === 3 ? "true" : "false"}
                    type="button"
                    onClick={() => setActiveStep(3)}
                    className={cn(
                      "flex items-start gap-2.5 text-left p-1.5 rounded-md transition-all cursor-pointer w-full focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00e599]",
                      activeStep === 3
                        ? "bg-[#14181c] border border-[#00e599]/30 shadow-xs"
                        : "border border-transparent hover:bg-[#12161a]"
                    )}
                  >
                    <div
                      className={cn(
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors",
                        activeStep >= 3
                          ? "bg-[#00e599]/15 border border-[#00e599]/50 text-[#00e599]"
                          : "bg-zinc-900 border border-zinc-700 text-zinc-500"
                      )}
                    >
                      <Play className="h-3 w-3" />
                    </div>
                    <div>
                      <div className="text-[11px] font-medium text-white flex items-center gap-1.5">
                        <span>Act</span>
                        {activeStep === 3 && (
                          <span className="text-[9px] font-mono text-[#00e599] lowercase">active</span>
                        )}
                      </div>
                      <div className="text-[10px] text-zinc-400">Clicking &quot;Add to cart&quot;...</div>
                    </div>
                  </button>

                  {/* Step 4: Verify */}
                  <button
                    id="hero-step-4"
                    data-active={activeStep === 4 ? "true" : "false"}
                    type="button"
                    onClick={() => setActiveStep(4)}
                    className={cn(
                      "flex items-start gap-2.5 text-left p-1.5 rounded-md transition-all cursor-pointer w-full focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00e599]",
                      activeStep === 4
                        ? "bg-[#14181c] border border-[#00e599]/30 shadow-xs"
                        : "border border-transparent hover:bg-[#12161a]"
                    )}
                  >
                    <div
                      className={cn(
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors",
                        activeStep >= 4
                          ? "bg-[#00e599]/20 border border-[#00e599] text-[#00e599] shadow-xs shadow-[#00e599]/30"
                          : "bg-zinc-900 border border-zinc-700 text-zinc-500"
                      )}
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <div className="text-[11px] font-medium text-white flex items-center gap-1.5">
                        <span>Verify</span>
                        {activeStep === 4 && (
                          <span className="text-[9px] font-mono text-[#00e599] lowercase">verified</span>
                        )}
                      </div>
                      <div className="text-[10px] text-zinc-400">Checking cart contents...</div>
                    </div>
                  </button>
                </div>

                {/* Right: Mock Browser View & Synchronized Trace */}
                <div className="md:col-span-7 flex flex-col gap-3">
                  {/* Browser Window View */}
                  <div
                    className={cn(
                      "rounded-lg border bg-[#14181c] p-2.5 transition-all duration-300",
                      activeStep === 1
                        ? "border-[#00e599]/50 shadow-md shadow-[#00e599]/10"
                        : "border-[#22272b]"
                    )}
                  >
                    {/* Browser Address Bar */}
                    <div className="flex items-center justify-between rounded border border-[#22272b] bg-[#0c0e10] px-2.5 py-1 mb-2.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Lock className="h-2.5 w-2.5 text-zinc-500 shrink-0" />
                        <span className="truncate font-mono text-[10px] text-zinc-400">
                          https://www.saucedemo.com
                        </span>
                      </div>
                      <span className="font-mono text-[9px] text-zinc-500">
                        {activeStep >= 3 ? "Cart (1)" : "Cart (0)"}
                      </span>
                    </div>

                    {/* Product Card Inside Browser with synchronized states */}
                    <div
                      className={cn(
                        "rounded-md border p-3 flex items-center justify-between gap-3 transition-all duration-300",
                        activeStep === 1 || activeStep === 2
                          ? "border-[#00e599]/60 bg-[#12171b] ring-1 ring-[#00e599]/20"
                          : "border-[#22272b] bg-[#0e1114]"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {/* Backpack visual */}
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-[#191e23] border border-zinc-800 text-zinc-400">
                          <svg
                            className="h-7 w-7 text-zinc-300"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                            />
                          </svg>
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-white">
                            Sauce Labs Backpack
                          </div>
                          <div className="font-mono text-xs text-zinc-400">$29.99</div>
                        </div>
                      </div>

                      {/* Action Button: shows action effect */}
                      <button
                        type="button"
                        onClick={() => setActiveStep(3)}
                        className={cn(
                          "rounded px-2.5 py-1 text-[10px] font-semibold transition-all cursor-pointer",
                          activeStep >= 3
                            ? "bg-[#18221f] text-[#00e599] border border-[#00e599]/40"
                            : activeStep === 2
                            ? "bg-[#00e599] text-[#08090b] ring-2 ring-[#00e599]/40 scale-105"
                            : "bg-[#00e599] text-[#08090b] hover:bg-[#00f5a0]"
                        )}
                      >
                        {activeStep >= 3 ? "Remove" : "Add to cart"}
                      </button>
                    </div>
                  </div>

                  {/* Below Browser: Step Log & Evidence Badges */}
                  <div className="rounded-lg border border-[#22272b] bg-[#121518] p-2.5 grid grid-cols-1 sm:grid-cols-12 gap-2 text-[10px]">
                    <div className="sm:col-span-7 font-mono text-zinc-400 space-y-0.5 leading-snug">
                      <div className={cn(activeStep >= 1 ? "text-zinc-200" : "text-zinc-500")}>
                        [1] Navigated to saucedemo.com
                      </div>
                      <div className={cn(activeStep >= 2 ? "text-zinc-200" : "text-zinc-500")}>
                        [2] Found &quot;Sauce Labs Backpack&quot;
                      </div>
                      <div className={cn(activeStep >= 3 ? "text-zinc-200" : "text-zinc-500")}>
                        [3] Clicked &quot;Add to cart&quot;
                      </div>
                      <div className={cn(activeStep >= 4 ? "text-[#00e599] font-medium" : "text-zinc-500")}>
                        [4] Verified cart contains item
                      </div>
                    </div>

                    <div className="sm:col-span-5 flex flex-col justify-center space-y-1 sm:border-l sm:border-zinc-800 sm:pl-2.5">
                      <div className="flex items-center gap-1.5 text-zinc-300">
                        <CheckCircle2
                          className={cn(
                            "h-3 w-3 shrink-0 transition-colors",
                            activeStep >= 4 ? "text-[#00e599]" : "text-zinc-600"
                          )}
                        />
                        <span className={activeStep >= 4 ? "text-white" : "text-zinc-400"}>
                          Deterministic assertion
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-zinc-300">
                        <CheckCircle2
                          className={cn(
                            "h-3 w-3 shrink-0 transition-colors",
                            activeStep >= 3 ? "text-[#00e599]" : "text-zinc-600"
                          )}
                        />
                        <span className={activeStep >= 3 ? "text-white" : "text-zinc-400"}>
                          Screenshot captured
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-zinc-300">
                        <CheckCircle2
                          className={cn(
                            "h-3 w-3 shrink-0 transition-colors",
                            activeStep >= 1 ? "text-[#00e599]" : "text-zinc-600"
                          )}
                        />
                        <span className={activeStep >= 1 ? "text-white" : "text-zinc-400"}>
                          Execution trace
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Representative note */}
            <div className="mt-2.5 text-center">
              <span className="text-[11px] font-mono text-zinc-500">
                Representative product visualization • Observe the workflow
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
