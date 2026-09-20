"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { SlidersHorizontal, Play, ExternalLink } from "lucide-react";

const PRESET_TESTS = [
  {
    title: "E-Commerce Checkout Flow",
    url: "https://demo.vercel.store",
    goal: "Verify full checkout flow: add item to cart, proceed to checkout, and verify payment forms render.",
  },
  {
    title: "Auth & Protected Routes",
    url: "https://app.tracekit.dev/login",
    goal: "Verify login screen validation, invalid credentials handling, and navigation to forgot password.",
  },
  {
    title: "Product Search & Filter",
    url: "https://demo.vercel.store/search",
    goal: "Search for 'shoes', apply sorting by price, and verify filtered results update dynamically.",
  },
];

export function RunsHeader() {
  const [showPresets, setShowPresets] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowPresets(false);
      }
    }
    if (showPresets) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showPresets]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      {/* Left: Title, Live Telemetry Pill & Subtitle */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans">
            Test Runs
          </h1>
          <span className="inline-flex items-center rounded bg-emerald-950/70 border border-emerald-800/60 px-2 py-0.5 font-mono text-[10px] font-bold tracking-wider text-emerald-400">
            LIVE TELEMETRY
          </span>
        </div>
        <p className="text-xs text-zinc-400 leading-normal">
          Historical autonomous test executions across preview, staging, and production environments.
        </p>
      </div>

      {/* Right: Presets Popover & Run New Test CTA */}
      <div className="flex items-center gap-2.5">
        {/* Presets Button & Popover */}
        <div className="relative" ref={popoverRef}>
          <button
            type="button"
            onClick={() => setShowPresets((prev) => !prev)}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#22272b] bg-[#121518] px-3 py-1.5 text-xs font-medium text-zinc-300 hover:border-zinc-700 hover:bg-[#161a1e] hover:text-white transition-colors cursor-pointer shadow-xs"
            title="Browse pre-configured test scenarios"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-zinc-400" />
            <span>Presets</span>
          </button>

          {showPresets && (
            <div className="absolute right-0 top-full mt-2 w-80 rounded-lg border border-[#1f2428] bg-[#0e1114] p-2.5 shadow-xl z-50">
              <div className="px-2 py-1 border-b border-[#1f2428] mb-1.5">
                <span className="font-mono text-[10px] uppercase font-bold tracking-wider text-zinc-500">
                  Quick Test Scenarios
                </span>
              </div>
              <div className="flex flex-col gap-1">
                {PRESET_TESTS.map((preset) => (
                  <Link
                    key={preset.title}
                    href={`/test?url=${encodeURIComponent(preset.url)}&goal=${encodeURIComponent(preset.goal)}`}
                    onClick={() => setShowPresets(false)}
                    className="flex flex-col gap-0.5 rounded-md p-2 hover:bg-[#161a1e] transition-colors group text-left"
                  >
                    <div className="flex items-center justify-between text-xs font-medium text-white group-hover:text-emerald-400">
                      <span>{preset.title}</span>
                      <ExternalLink className="h-3 w-3 text-zinc-500 group-hover:text-emerald-400" />
                    </div>
                    <span className="font-mono text-[10px] text-zinc-500 truncate">
                      {preset.url}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Primary Run New Test CTA */}
        <Link
          href="/test"
          className="inline-flex items-center gap-2 rounded-md bg-emerald-400 hover:bg-emerald-300 px-3.5 py-1.5 text-xs font-bold text-zinc-950 transition-colors shadow-xs active:scale-[0.98] cursor-pointer"
        >
          <Play className="h-3 w-3 fill-current stroke-[2.5]" />
          <span>Run New Test</span>
          <span className="hidden font-mono text-[10px] opacity-75 sm:inline">
            ⌘N
          </span>
        </Link>
      </div>
    </div>
  );
}
