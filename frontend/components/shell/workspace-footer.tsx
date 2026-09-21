import React from "react";
import Link from "next/link";

export function WorkspaceFooter() {
  return (
    <footer className="w-full border-t border-[#1b2026] bg-[#090a0c] py-3.5 mt-auto text-xs text-zinc-500 select-none">
      <div className="mx-auto max-w-7xl px-4 sm:px-8 lg:px-12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Left: Brand & Technical Subtitle */}
        <div className="flex items-center gap-2.5 min-w-0">
          <Link
            href="/"
            className="flex items-center gap-1.5 font-semibold text-white hover:text-emerald-400 transition-colors shrink-0"
          >
            <span className="font-mono text-emerald-400 font-bold text-xs">⌘</span>
            <span className="font-sans text-xs tracking-tight">TraceKit</span>
          </Link>
          <span className="text-zinc-700 select-none" aria-hidden="true">/</span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500 truncate">
            Browser-native AI testing
          </span>
        </div>

        {/* Center: Neutral Platform Status Pill */}
        <div className="flex items-center gap-2 font-mono text-[11px] self-start sm:self-auto">
          <span className="inline-flex items-center gap-1.5 rounded bg-[#121518] border border-[#22272b] px-2 py-0.5 text-[10px] font-semibold text-zinc-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
            <span>WEB AGENT PLATFORM</span>
          </span>
          <span className="text-zinc-700 select-none hidden md:inline" aria-hidden="true">·</span>
          <span className="text-zinc-500 text-[10px] hidden md:inline">
            CHROMIUM CDP
          </span>
        </div>

        {/* Right: Navigation Links & Copyright */}
        <div className="flex flex-wrap items-center gap-2.5 font-mono text-[11px] text-zinc-400">
          <Link
            href="/documentation"
            className="hover:text-white transition-colors"
          >
            Documentation
          </Link>
          <span className="text-zinc-700 select-none" aria-hidden="true">·</span>
          <a
            href="https://github.com/hopstreax/testing-agent_v0"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors"
          >
            GitHub
          </a>
          <span className="text-zinc-700 select-none" aria-hidden="true">·</span>
          <span className="text-zinc-500 text-[10px]">
            © 2026 TraceKit
          </span>
        </div>
      </div>
    </footer>
  );
}
