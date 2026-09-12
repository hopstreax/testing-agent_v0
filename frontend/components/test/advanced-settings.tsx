"use client";

import React, { useState } from "react";
import { SlidersHorizontal, ChevronDown, Monitor, KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdvancedSettingsProps {
  browser?: string;
  headless: boolean;
  maxSteps: number;
  storageStatePath?: string;
  onBrowserChange?: (browser: string) => void;
  onHeadlessChange: (headless: boolean) => void;
  onMaxStepsChange: (maxSteps: number) => void;
  onStorageStatePathChange?: (path: string) => void;
}

export function AdvancedSettings({
  browser = "chromium",
  headless = true,
  maxSteps = 15,
  storageStatePath = "",
  onHeadlessChange,
  onMaxStepsChange,
  onStorageStatePathChange,
}: AdvancedSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const browserDisplay =
    browser === "chromium" ? "Local Chromium" : browser;

  return (
    <div className="rounded-lg border border-[#22272b] bg-[#0c0e10] overflow-hidden transition-all duration-200">
      {/* Collapsible Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-3.5 py-2.5 text-left text-xs transition-colors hover:bg-[#121518] cursor-pointer select-none"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 font-medium text-zinc-200">
          <SlidersHorizontal className="h-3.5 w-3.5 text-zinc-400" />
          <span>Advanced settings</span>
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px] text-zinc-500">
          <span>Local Chromium</span>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 text-zinc-500 transition-transform duration-200",
              isOpen && "rotate-180"
            )}
          />
        </div>
      </button>

      {/* Collapsible Body */}
      {isOpen && (
        <div className="border-t border-[#1f2428] bg-[#0e1114] p-4 animate-in fade-in-50 duration-150">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Control 1: Browser */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium text-zinc-400">
                Browser Engine
              </label>
              <div className="flex h-9 items-center justify-between rounded-md border border-[#22272b] bg-[#0c0e10] px-3 py-1.5 text-xs text-zinc-200 font-mono">
                <div className="flex items-center gap-2">
                  <Monitor className="h-3.5 w-3.5 text-emerald-400" />
                  <span>{browserDisplay}</span>
                </div>
                <span className="text-[10px] text-emerald-500 font-semibold bg-emerald-950/60 border border-emerald-800/40 px-1 py-0.5 rounded">
                  Default
                </span>
              </div>
              <span className="text-[10px] text-zinc-600 font-mono">
                Patchright Chromium v128
              </span>
            </div>

            {/* Control 2: Headless Mode */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium text-zinc-400">
                Headless Mode
              </label>
              <div className="flex h-9 items-center justify-between rounded-md border border-[#22272b] bg-[#0c0e10] px-2 py-1">
                <button
                  type="button"
                  onClick={() => onHeadlessChange(true)}
                  className={cn(
                    "flex-1 rounded py-1 text-center font-mono text-xs transition-colors cursor-pointer",
                    headless
                      ? "bg-zinc-800 text-white font-medium shadow-xs"
                      : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  Enabled
                </button>
                <button
                  type="button"
                  onClick={() => onHeadlessChange(false)}
                  className={cn(
                    "flex-1 rounded py-1 text-center font-mono text-xs transition-colors cursor-pointer",
                    !headless
                      ? "bg-zinc-800 text-white font-medium shadow-xs"
                      : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  Headed
                </button>
              </div>
              <span className="text-[10px] text-zinc-600 font-mono">
                {headless ? "Run browser in background" : "Spawn visible browser window"}
              </span>
            </div>

            {/* Control 3: Max Steps */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium text-zinc-400">
                Execution Budget
              </label>
              <div className="flex h-9 items-center justify-between rounded-md border border-[#22272b] bg-[#0c0e10] px-3 py-1.5">
                <span className="text-xs font-mono text-zinc-200">
                  {maxSteps} steps
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onMaxStepsChange(Math.max(5, maxSteps - 5))}
                    disabled={maxSteps <= 5}
                    className="flex h-6 w-6 items-center justify-center rounded bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700 disabled:opacity-30 cursor-pointer text-xs font-mono"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={() => onMaxStepsChange(Math.min(50, maxSteps + 5))}
                    disabled={maxSteps >= 50}
                    className="flex h-6 w-6 items-center justify-center rounded bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700 disabled:opacity-30 cursor-pointer text-xs font-mono"
                  >
                    +
                  </button>
                </div>
              </div>
              <span className="text-[10px] text-zinc-600 font-mono">
                Safety limit (5 – 50 steps)
              </span>
            </div>
          </div>

          {/* Control 4: Storage State / Authentication Precondition */}
          <div className="mt-4 pt-3.5 border-t border-[#1f2428] flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="storage-state-input" className="text-[11px] font-medium text-zinc-300 flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5 text-amber-400" />
                <span>Authentication &amp; Session State</span>
              </label>
              <span className="text-[10px] text-zinc-500 font-mono">Optional</span>
            </div>
            <input
              id="storage-state-input"
              type="text"
              value={storageStatePath}
              onChange={(e) => onStorageStatePathChange?.(e.target.value)}
              placeholder="Local path to storage_state.json (e.g. auth.json)"
              className="h-9 w-full rounded-md border border-[#22272b] bg-[#0c0e10] px-3 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:border-amber-500/50 focus:outline-none"
            />
            <span className="text-[10px] text-zinc-500">
              Reference a local Playwright storage state file for authenticated testing. TraceKit never displays, logs, or persists credential contents.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
