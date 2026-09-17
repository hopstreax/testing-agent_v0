"use client";

import React from "react";
import Link from "next/link";

export function LandingFooter() {
  return (
    <footer className="border-t border-[#1b2026] bg-[#08090b] py-12 text-xs">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Main Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-10 border-b border-[#1b2026]">
          {/* Brand Column */}
          <div className="md:col-span-6 flex flex-col items-start gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 text-white font-semibold hover:text-[#00e599] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00e599] rounded"
            >
              <span className="font-mono text-[#00e599] font-bold text-sm">⌘</span>
              <span className="tracking-tight text-sm font-semibold text-white">TraceKit</span>
            </Link>
            <p className="text-zinc-400 text-xs leading-relaxed max-w-sm">
              AI web testing that acts, verifies, and explains.
            </p>
          </div>

          {/* Navigation Columns */}
          <div className="md:col-span-6 grid grid-cols-2 sm:grid-cols-3 gap-6">
            {/* PRODUCT */}
            <div className="flex flex-col gap-2.5">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                Product
              </span>
              <Link
                href="/test"
                className="text-zinc-400 hover:text-white transition-colors"
              >
                New Test
              </Link>
              <Link
                href="/runs"
                className="text-zinc-400 hover:text-white transition-colors"
              >
                Runs
              </Link>
            </div>

            {/* RESOURCES */}
            <div className="flex flex-col gap-2.5">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                Resources
              </span>
              <Link
                href="/getting-started"
                className="text-zinc-400 hover:text-white transition-colors"
              >
                Getting Started
              </Link>
            </div>

            {/* CONNECT */}
            <div className="flex flex-col gap-2.5">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                Connect
              </span>
              <a
                href="https://github.com/hopstreax/testing-agent_v0"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-400 hover:text-white transition-colors inline-flex items-center gap-1.5"
              >
                <span>GitHub</span>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-zinc-500 text-[11px]">
          <div>© 2026 TraceKit</div>
          <div>Built for developers</div>
        </div>
      </div>
    </footer>
  );
}
