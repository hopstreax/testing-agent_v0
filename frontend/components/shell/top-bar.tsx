"use client";

import React from "react";
import Link from "next/link";
import {
  Search,
  ChevronDown,
  Plus,
  User,
  Menu,
} from "lucide-react";

interface TopBarProps {
  onToggleSidebar?: () => void;
}

export function TopBar({ onToggleSidebar }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-[#1f2428] bg-[#090a0c]/90 px-4 backdrop-blur-xs md:px-6">
      {/* Left: Mobile Menu Toggle + Environment / Project Context */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="rounded p-1 text-zinc-400 hover:text-white md:hidden"
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded bg-emerald-950/70 border border-emerald-800/50 px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider text-emerald-400">
            PRODUCTION
          </span>
          <span className="text-zinc-600 text-xs select-none">/</span>
          <button
            type="button"
            className="flex items-center gap-1 font-mono text-xs text-zinc-300 hover:text-white transition-colors cursor-pointer"
            title="Project Context (UI Scaffolding)"
          >
            <span className="truncate max-w-[120px] sm:max-w-[180px]">
              tracekit-web-client
            </span>
            <ChevronDown className="h-3 w-3 text-zinc-500" />
          </button>
        </div>
      </div>

      {/* Center: Search / Command Field (UI Scaffolding) */}
      <div className="hidden sm:flex items-center max-w-sm w-full mx-4">
        <div className="relative flex items-center w-full">
          <Search className="absolute left-2.5 h-3.5 w-3.5 text-zinc-500" />
          <input
            type="text"
            readOnly
            placeholder="Jump to test run..."
            className="h-8 w-full rounded-md border border-[#22272b] bg-[#121518] pl-8 pr-12 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none cursor-default"
          />
          <kbd className="absolute right-2 font-mono text-[10px] text-zinc-500 bg-[#1a1e22] border border-zinc-800 px-1 py-0.5 rounded">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right: + New Test CTA & User Profile Icon */}
      <div className="flex items-center gap-3">
        <Link
          href="/test"
          className="inline-flex items-center gap-1.5 rounded-md bg-emerald-400 hover:bg-emerald-300 px-3 py-1.5 text-xs font-semibold text-zinc-950 transition-colors cursor-pointer shadow-xs active:scale-[0.98]"
        >
          <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
          <span>New Test</span>
          <span className="ml-1 hidden font-mono text-[10px] opacity-75 sm:inline">
            ⌘N
          </span>
        </Link>

        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-950/80 border border-emerald-700/60 text-emerald-400">
          <User className="h-3.5 w-3.5" />
        </div>
      </div>
    </header>
  );
}
