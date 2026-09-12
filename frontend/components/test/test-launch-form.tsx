"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Link as LinkIcon,
  Sparkles,
  History,
  Play,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { QuickPrompts } from "./quick-prompts";
import { AdvancedSettings } from "./advanced-settings";
import { launchRun } from "@/lib/api";

export function TestLaunchForm() {
  const router = useRouter();
  const [url, setUrl] = useState("https://demo.vercel.store/products/archive");
  const [prompt, setPrompt] = useState(
    'Search for "Technical Shell Jacket", apply the sizing filter "XL", add product to cart, proceed to checkout page, and ensure the price calculation includes zero shipping fees.'
  );
  const [headless, setHeadless] = useState(true);
  const [maxSteps, setMaxSteps] = useState(15);
  const [storageStatePath, setStorageStatePath] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectPrompt = (promptText: string) => {
    setPrompt(promptText);
    setError(null);
  };

  const handleClear = () => {
    setPrompt("");
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError(null);

    const trimmedUrl = url.trim();
    const trimmedGoal = prompt.trim();

    if (!trimmedUrl) {
      setError("Target URL is required.");
      return;
    }

    if (!trimmedUrl.startsWith("http://") && !trimmedUrl.startsWith("https://")) {
      setError("Target URL must start with http:// or https://");
      return;
    }

    if (!trimmedGoal) {
      setError("Objective prompt is required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await launchRun({
        url: trimmedUrl,
        goal: trimmedGoal,
        browser: "local",
        headless,
        max_steps: maxSteps,
        storage_state_path: storageStatePath.trim() || undefined,
      });

      // Immediate transition to the real run detail page
      router.push(`/runs/${res.run_id}`);
    } catch (err: unknown) {
      setIsSubmitting(false);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to launch test run. Check that the backend server is running.");
      }
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-[#22272b] bg-[#121518] p-5 sm:p-6 shadow-2xl relative"
    >
      <div className="flex flex-col gap-5">
        {/* Error Alert if Submission Fails */}
        {error && (
          <div className="flex items-start gap-2.5 rounded-lg border border-red-900/60 bg-red-950/40 p-3 text-xs text-red-300 animate-in fade-in-50">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold text-red-200">Launch Error: </span>
              <span>{error}</span>
            </div>
          </div>
        )}

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
              disabled={isSubmitting}
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (error) setError(null);
              }}
              placeholder="https://your-app.com"
              className="h-10 w-full rounded-lg border border-[#22272b] bg-[#0c0e10] px-3.5 pr-10 font-mono text-xs sm:text-sm text-zinc-100 placeholder:text-zinc-600 transition-colors focus:border-emerald-500/60 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 disabled:opacity-60"
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
              disabled={isSubmitting}
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Describe what you want tested..."
              className="w-full resize-none bg-transparent text-xs sm:text-sm leading-relaxed text-zinc-100 placeholder:text-zinc-600 focus:outline-none disabled:opacity-60"
            />

            {/* Prompt Card Footer Controls */}
            <div className="mt-2 flex items-center justify-between border-t border-[#1a1e22] pt-2 text-[11px]">
              <div className="flex items-center gap-1.5 text-zinc-500 font-mono">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500/80 inline-block" />
                <span className="text-[10px] text-zinc-400">
                  Deterministic assertion engine active
                </span>
              </div>

              {prompt.length > 0 && !isSubmitting && (
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
          storageStatePath={storageStatePath}
          onHeadlessChange={setHeadless}
          onMaxStepsChange={setMaxSteps}
          onStorageStatePathChange={setStorageStatePath}
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
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-400 hover:bg-emerald-300 disabled:bg-emerald-800 disabled:opacity-60 px-5 py-2.5 text-sm font-semibold text-zinc-950 shadow-md hover:shadow-emerald-950/30 active:scale-[0.98] transition-all cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-zinc-950" />
                <span>Launching...</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-zinc-950" />
                <span>Run test</span>
                <kbd className="ml-1 rounded bg-emerald-500/40 px-1.5 py-0.5 font-mono text-[10px] font-bold text-zinc-900">
                  ⌘⏎
                </kbd>
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
