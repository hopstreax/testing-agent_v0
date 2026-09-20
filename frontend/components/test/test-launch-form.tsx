"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Link as LinkIcon,
  Sparkles,
  Play,
  Loader2,
  AlertCircle,
  Copy,
  Terminal,
} from "lucide-react";
import { QuickPrompts } from "./quick-prompts";
import { AdvancedSettings } from "./advanced-settings";
import { launchRun, getRun } from "@/lib/api";

const DEFAULT_URL = "";
const DEFAULT_PROMPT = "";
const DEFAULT_HEADLESS = true;
const DEFAULT_MAX_STEPS = 15;
const DEFAULT_STORAGE_STATE = "";
const DEFAULT_PROVIDER: "auto" | "gemini" | "groq" | "ollama" = "auto";
const DEFAULT_MODEL = "";

export function TestLaunchForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cloneRunId = searchParams.get("clone");

  const formRef = useRef<HTMLFormElement>(null);

  const [url, setUrl] = useState(DEFAULT_URL);
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [headless, setHeadless] = useState(DEFAULT_HEADLESS);
  const [maxSteps, setMaxSteps] = useState(DEFAULT_MAX_STEPS);
  const [storageStatePath, setStorageStatePath] = useState(DEFAULT_STORAGE_STATE);
  const [provider, setProvider] = useState<"auto" | "gemini" | "groq" | "ollama">(DEFAULT_PROVIDER);
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clonedRunId, setClonedRunId] = useState<string | null>(null);
  const [isLoadingClone, setIsLoadingClone] = useState(false);

  // Global keyboard shortcut: Cmd+Enter on macOS, Ctrl+Enter on Windows/Linux
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        if (isSubmitting) return;
        e.preventDefault();
        if (formRef.current) {
          formRef.current.requestSubmit();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSubmitting]);

  // Handle clone prefill if ?clone=<run_id> is in query
  useEffect(() => {
    if (!cloneRunId) return;

    let isMounted = true;

    async function loadClone(id: string) {
      setIsLoadingClone(true);
      try {
        const run = await getRun(id);
        if (!isMounted) return;

        if (run.url) setUrl(run.url);
        if (run.goal) setPrompt(run.goal);
        if (typeof run.headless === "boolean") setHeadless(run.headless);
        if (typeof run.max_steps === "number") setMaxSteps(run.max_steps);
        if (run.storage_state_path) setStorageStatePath(run.storage_state_path);
        else setStorageStatePath("");

        if (run.provider && ["auto", "gemini", "groq", "ollama"].includes(run.provider)) {
          setProvider(run.provider as "auto" | "gemini" | "groq" | "ollama");
        } else if (run.result?.llm_provider && ["auto", "gemini", "groq", "ollama"].includes(run.result.llm_provider)) {
          setProvider(run.result.llm_provider as "auto" | "gemini" | "groq" | "ollama");
        } else {
          setProvider(DEFAULT_PROVIDER);
        }

        if (typeof run.model === "string") {
          setModel(run.model);
        } else if (typeof run.result?.llm_model === "string") {
          setModel(run.result.llm_model);
        } else {
          setModel(DEFAULT_MODEL);
        }

        setClonedRunId(run.run_id);
        setError(null);
      } catch (err: unknown) {
        if (!isMounted) return;
        console.warn("Could not prefill from clone ID:", err);
      } finally {
        if (isMounted) setIsLoadingClone(false);
      }
    }

    void loadClone(cloneRunId);

    return () => {
      isMounted = false;
    };
  }, [cloneRunId]);

  // Fix: Reset keeps user inside the New Test workspace instead of landing page
  const handleReset = () => {
    setUrl(DEFAULT_URL);
    setPrompt(DEFAULT_PROMPT);
    setHeadless(DEFAULT_HEADLESS);
    setMaxSteps(DEFAULT_MAX_STEPS);
    setStorageStatePath(DEFAULT_STORAGE_STATE);
    setProvider(DEFAULT_PROVIDER);
    setModel(DEFAULT_MODEL);
    setClonedRunId(null);
    setError(null);
    router.replace("/test");
  };

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
        provider,
        model: model.trim() || undefined,
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
      ref={formRef}
      onSubmit={handleSubmit}
      className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-8 xl:gap-10 items-start"
    >
      {/* ================================================================= */}
      {/* LEFT / PRIMARY COLUMN: Test Configuration & Studio Editor         */}
      {/* ================================================================= */}
      <div className="flex flex-col gap-6 lg:col-span-7 xl:col-span-8">
        {/* Page Eyebrow Metadata */}
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-md border border-[#1b2026] bg-[#0d1013] px-2.5 py-1 font-mono text-[11px] text-zinc-400">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00e599] animate-pulse-mint" />
            <span className="text-[#00e599] font-medium uppercase tracking-wider">
              Autonomous Agent
            </span>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-400">Isolated Browser Studio</span>
          </div>
        </div>

        {/* Studio Heading & Description */}
        <div>
          <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-[-0.03em] text-white">
            Test your application
          </h1>
          <p className="mt-2 text-xs sm:text-sm leading-relaxed text-zinc-400 max-w-2xl">
            Describe an autonomous user journey in plain English. The agent inspects
            the DOM, reasons through interactions, and executes deterministic
            verifications.
          </p>
        </div>

        {/* Feedback: Submission Error Alert */}
        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-lg border border-red-900/60 bg-red-950/40 p-3.5 text-xs text-red-300 animate-in fade-in-50"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
            <div className="flex-1 leading-relaxed">
              <span className="font-semibold text-red-200">Launch Error: </span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Feedback: Clone Loading Indicator */}
        {isLoadingClone && (
          <div className="flex items-center gap-2 rounded-lg border border-[#1b2026] bg-[#0d1013] px-3.5 py-2.5 text-xs text-zinc-400 animate-in fade-in-50">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#00e599]" />
            <span>Loading cloned run configuration...</span>
          </div>
        )}

        {/* Feedback: Cloned Run Context Banner */}
        {clonedRunId && !isLoadingClone && (
          <div className="flex items-center justify-between rounded-lg border border-[#00e599]/30 bg-[#00e599]/5 px-3.5 py-2.5 text-xs text-zinc-300 animate-in fade-in-50">
            <div className="flex items-center gap-2 min-w-0">
              <Copy className="h-3.5 w-3.5 text-[#00e599] shrink-0" />
              <span className="truncate">
                Cloned from run{" "}
                <span className="font-mono text-[#00e599] font-medium">
                  {clonedRunId}
                </span>
              </span>
            </div>
            <button
              type="button"
              onClick={handleReset}
              id="reset-clone-btn"
              className="ml-3 shrink-0 font-mono text-[11px] font-medium text-zinc-400 hover:text-white underline cursor-pointer transition-colors"
            >
              Reset
            </button>
          </div>
        )}

        {/* SECTION 1: TARGET URL */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between select-none">
            <label
              htmlFor="target-url-input"
              className="flex items-center gap-1.5 font-mono text-[11px] font-semibold tracking-wider text-[#00e599] uppercase"
            >
              <LinkIcon className="h-3.5 w-3.5" />
              <span>Target URL</span>
            </label>
            <span className="font-mono text-[10px] text-zinc-500">
              HTTP or HTTPS required
            </span>
          </div>

          <div className="relative flex items-center rounded-lg border border-[#1b2026] bg-[#0d1013] focus-within:border-[#00e599]/60 focus-within:ring-1 focus-within:ring-[#00e599]/30 transition-all">
            <div className="flex h-11 items-center px-3.5 border-r border-[#1b2026] bg-[#121518]/50 text-zinc-500 font-mono text-xs select-none">
              URL
            </div>
            <input
              id="target-url-input"
              type="url"
              required
              disabled={isSubmitting}
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (error) setError(null);
              }}
              placeholder="https://your-app.com/path"
              className="h-11 w-full bg-transparent px-3.5 font-mono text-xs sm:text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none disabled:opacity-60"
            />
          </div>
        </div>

        {/* SECTION 2: OBJECTIVE STUDIO (MAIN VISUAL FOCUS) */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between select-none">
            <label
              htmlFor="objective-prompt-input"
              className="flex items-center gap-1.5 font-mono text-[11px] font-semibold tracking-wider text-[#00e599] uppercase"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Objective Studio</span>
            </label>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-zinc-500">
                {prompt.length} chars
              </span>
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

          <div className="rounded-xl border border-[#1b2026] bg-[#0d1013] p-3.5 sm:p-4 transition-all focus-within:border-[#00e599]/60 focus-within:ring-1 focus-within:ring-[#00e599]/30">
            <textarea
              id="objective-prompt-input"
              required
              rows={7}
              disabled={isSubmitting}
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                if (error) setError(null);
              }}
              placeholder='Describe what you want tested in natural language. (e.g. "Navigate to /store, filter by category Outerwear, add product in size XL to cart, proceed to checkout, and verify zero shipping fee is calculated.")'
              className="w-full min-h-[160px] sm:min-h-[200px] resize-y bg-transparent text-xs sm:text-sm leading-relaxed text-zinc-100 placeholder:text-zinc-600 focus:outline-none disabled:opacity-60"
            />

            {/* Objective Card Footer */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#1b2026] pt-2.5 text-[11px]">
              <div className="flex items-center gap-2 text-zinc-400 font-mono">
                <span className="h-1.5 w-1.5 rounded-full bg-[#00e599]" />
                <span className="text-[11px] text-zinc-400">
                  Deterministic assertion engine active
                </span>
              </div>
              <span className="font-mono text-[10px] text-zinc-500 hidden sm:inline">
                Supports natural language or bulleted steps
              </span>
            </div>
          </div>
        </div>

        {/* SECTION 3: STARTER TEMPLATES */}
        <QuickPrompts onSelectPrompt={handleSelectPrompt} disabled={isSubmitting} />

        {/* SECTION 4: PRIMARY SUBMIT & RUN BAR */}
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-t border-[#1b2026] pt-5">
          {/* Agent Readiness Status */}
          <div className="flex items-center gap-2.5 select-none">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00e599] opacity-40" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#00e599]" />
            </span>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-zinc-200">Local agent ready</span>
              <span className="font-mono text-[10px] text-zinc-500">Autonomous single-journey runner</span>
            </div>
          </div>

          {/* Primary Submit Action */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-2.5 rounded-lg bg-[#00e599] hover:bg-[#00f5a0] disabled:opacity-60 px-6 py-2.5 text-sm font-semibold text-[#08090b] shadow-md hover:shadow-[#00e599]/20 active:scale-[0.98] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00e599]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-[#08090b]" />
                <span>Launching Run...</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-[#08090b] text-[#08090b]" />
                <span>Run test</span>
                <kbd className="ml-1 rounded bg-[#08090b]/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#08090b]">
                  ⌘⏎
                </kbd>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ================================================================= */}
      {/* RIGHT / SIDECAR COLUMN: Pre-Flight Control Panel & Parameters      */}
      {/* ================================================================= */}
      <div className="lg:col-span-5 xl:col-span-4 sticky top-20">
        <AdvancedSettings
          browser="chromium"
          headless={headless}
          maxSteps={maxSteps}
          storageStatePath={storageStatePath}
          provider={provider}
          model={model}
          targetUrl={url}
          onHeadlessChange={setHeadless}
          onMaxStepsChange={setMaxSteps}
          onStorageStatePathChange={setStorageStatePath}
          onProviderChange={setProvider}
          onModelChange={setModel}
        />
      </div>
    </form>
  );
}
