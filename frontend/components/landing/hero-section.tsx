"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { TextEffect } from "@/components/core/text-effect";
import { HeroAgentConsole } from "./hero-agent-console";

export function HeroSection() {
  const { isAuthenticated, isLoading } = useAuth();
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [headingAnimationKey, setHeadingAnimationKey] = useState(0);

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

  // Automatically replay the hero heading TextEffect animation every 8 seconds while page is open
  useEffect(() => {
    if (prefersReducedMotion) return;

    const interval = setInterval(() => {
      setHeadingAnimationKey((prev) => prev + 1);
    }, 8000);

    return () => clearInterval(interval);
  }, [prefersReducedMotion]);

  return (
    <section className="relative overflow-hidden pt-12 pb-16 lg:pt-20 lg:pb-24">
      {/* Subtle background grid texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
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
            {/* Restrained Technical Tag */}
            <div className="mb-5 inline-flex items-center gap-2 rounded-md border border-[#1b2026] bg-[#0d1013] px-3 py-1 text-[11px] font-mono text-zinc-400">
              <span className="h-1.5 w-1.5 rounded-full bg-[#00e599]" />
              <span className="text-[#00e599] font-medium">TRACEKIT RUNNER</span>
              <span className="text-zinc-600">/</span>
              <span>AUTONOMOUS AGENT</span>
            </div>

            {/* Main Headline with preserved 8-second replaying TextEffect */}
            <h1 className="font-display text-[32px] sm:text-[46px] lg:text-[54px] font-bold tracking-[-0.03em] text-white leading-[1.08]">
              <TextEffect
                key={`hero-line1-${headingAnimationKey}`}
                as="span"
                per="char"
                preset="fade"
              >
                AI web testing that
              </TextEffect>{" "}
              <TextEffect
                key={`hero-line2-${headingAnimationKey}`}
                as="span"
                per="char"
                preset="fade"
                delay={0.5}
                className="text-[#00e599] block"
              >
                acts, verifies, and explains.
              </TextEffect>
            </h1>

            {/* Subhead / Supporting Copy */}
            <p className="mt-5 text-sm sm:text-base leading-relaxed text-zinc-400 max-w-xl font-normal">
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
                className="group inline-flex items-center gap-2 rounded-lg bg-[#00e599] hover:bg-[#00f5a0] px-5 py-2.5 text-xs sm:text-sm font-semibold text-[#08090b] transition-all shadow-md hover:shadow-[#00e599]/20 active:scale-[0.98] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00e599]"
              >
                <span>Run New Test</span>
                <ArrowRight className="h-4 w-4 stroke-[2.5] transition-transform duration-150 group-hover:translate-x-1" />
              </Link>

              <a
                href="#how-it-works"
                id="hero-secondary-cta"
                className="inline-flex items-center gap-2 rounded-lg border border-[#1b2026] bg-[#0d1013] hover:border-zinc-700 hover:bg-[#12161b] px-5 py-2.5 text-xs sm:text-sm font-medium text-zinc-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-600"
              >
                How it works
              </a>
            </div>
          </div>

          {/* Right Column: Autonomous Agent DevTools Console */}
          <div className="lg:col-span-6 w-full flex flex-col items-center">
            <HeroAgentConsole />
          </div>
        </div>
      </div>
    </section>
  );
}
