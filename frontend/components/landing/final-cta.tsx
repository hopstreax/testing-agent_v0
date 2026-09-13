"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "./reveal";
import { useAuth } from "@/context/auth-context";

export function FinalCTA() {
  const { isAuthenticated, isLoading } = useAuth();
  const runTestHref = isLoading ? "#" : isAuthenticated ? "/test" : "/login";

  const handleRunTestClick = (e: React.MouseEvent) => {
    if (isLoading) {
      e.preventDefault();
    }
  };
  return (
    <section id="final-cta-section" className="py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-2xl border border-[#22272b] bg-[#0c0e11] px-6 py-12 sm:px-12 sm:py-16 text-center transition-all duration-300 hover:border-zinc-700/80">
            {/* Subtle grid background */}
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.035]"
              style={{
                backgroundImage:
                  "radial-gradient(#00e599 1px, transparent 1px), radial-gradient(#00e599 1px, #0c0e11 1px)",
                backgroundSize: "28px 28px",
                backgroundPosition: "0 0, 14px 14px",
              }}
              aria-hidden="true"
            />

            <div className="relative z-10 max-w-xl mx-auto flex flex-col items-center">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Ready to see how TraceKit works?
              </h2>
              <p className="mt-3 text-xs sm:text-sm text-zinc-400">
                Start exploring or jump straight into a test.
              </p>

              <div className="mt-7 flex flex-wrap items-center justify-center gap-3.5">
                <Link
                  href="/getting-started"
                  id="cta-get-started"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#00e599] hover:bg-[#00f5a0] px-5 py-2.5 text-xs sm:text-sm font-semibold text-[#08090b] transition-all shadow-md hover:shadow-[#00e599]/25 active:scale-[0.98] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00e599]"
                >
                  <span>Get Started</span>
                </Link>

                <Link
                  href={runTestHref}
                  onClick={handleRunTestClick}
                  aria-busy={isLoading}
                  id="cta-run-new-test"
                  className="group inline-flex items-center gap-1.5 rounded-lg border border-[#22272b] bg-[#121518] hover:border-zinc-700 hover:bg-[#161a1e] px-5 py-2.5 text-xs sm:text-sm font-medium text-white transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-600"
                >
                  <span>Run New Test</span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
