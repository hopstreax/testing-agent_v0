"use client";

import React, { useState } from "react";
import {
  Link as LinkIcon,
  Sparkles,
  History,
  Play,
} from "lucide-react";
import { QuickPrompts } from "./quick-prompts";
import { AdvancedSettings } from "./advanced-settings";

export function TestLaunchForm() {
  const [url, setUrl] = useState("https://demo.vercel.store/products/archive");
  const [prompt, setPrompt] = useState(
    'Search for "Technical Shell Jacket", apply the sizing filter "XL", add product to cart, proceed to checkout page, and ensure the price calculation includes zero shipping fees.'
  );
  const [headless, setHeadless] = useState(true);
  const [maxSteps, setMaxSteps] = useState(15);

  const handleSelectPrompt = (promptText: string) => {
    setPrompt(promptText);
  };

  const handleClear = () => {
    setPrompt("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Milestone 5.1 constraint: No backend API calls or fake test execution yet.
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-[#22272b] bg-[#121518] p-5 sm:p-6 shadow-2xl relative"
    >
      <div className="flex flex-col gap-5">
        {/* Section 1: TARGET URL */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-emerald-400 uppercase select-none">
            <LinkIcon className="h-3.5 w-3.5" />
            <span>Target URL</span>
          </div>

          <div className="relative flex items-center">
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://your-app.com"
              className="h-10 w-full rounded-lg border border-[#22272b] bg-[#0c0e10] px-3.5 pr-10 font-mono text-xs sm:text-sm text-zinc-100 placeholder:text-zinc-600 transition-colors focus:border-emerald-500/60 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
            />
            <button
              type="button"
              className="absolute right-3 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
              title="Recent target URLs"
            >
              <History className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Section 2: OBJECTIVE PROMPT */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between select-none">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-emerald-400 uppercase">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Objective Prompt</span>
            </div>
            <span className="font-mono text-xs text-zinc-500">
              {prompt.length} chars
            </span>
          </div>

          <div className="rounded-lg border border-[#22272b] bg-[#0c0e10] p-3 transition-colors focus-within:border-emerald-500/60 focus-within:ring-1 focus-within:ring-emerald-500/30">
            <textarea
              required
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe what you want tested..."
              className="w-full resize-none bg-transparent text-xs sm:text-sm leading-relaxed text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
            />

            {/* Prompt Card Footer Controls */}
            <div className="mt-2 flex items-center justify-between border-t border-[#1a1e22] pt-2 text-[11px]">
              <div className="flex items-center gap-1.5 text-zinc-500 font-mono">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500/80 inline-block" />
                <span className="text-[10px] text-zinc-400">
                  Deterministic assertion engine active
                </span>
              </div>

              {prompt.length > 0 && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Section 3: QUICK PROMPTS CHIPS */}
        <QuickPrompts onSelectPrompt={handleSelectPrompt} />

        {/* Section 4: ADVANCED SETTINGS COLLAPSIBLE */}
        <AdvancedSettings
          browser="chromium"
          headless={headless}
          maxSteps={maxSteps}
          onHeadlessChange={setHeadless}
          onMaxStepsChange={setMaxSteps}
        />

        {/* Section 5: FORM FOOTER & RUN BUTTON */}
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-[#1f2428] pt-4">
          {/* Agent Status */}
          <div className="flex items-center gap-2 text-xs text-zinc-400 font-medium select-none">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>Local agent ready</span>
          </div>

          {/* Primary Action Button */}
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-400 hover:bg-emerald-300 px-5 py-2.5 text-sm font-semibold text-zinc-950 shadow-md hover:shadow-emerald-950/30 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Play className="h-4 w-4 fill-zinc-950" />
            <span>Run test</span>
            <kbd className="ml-1 rounded bg-emerald-500/40 px-1.5 py-0.5 font-mono text-[10px] font-bold text-zinc-900">
              ⌘⏎
            </kbd>
          </button>
        </div>
      </div>
    </form>
  );
}
