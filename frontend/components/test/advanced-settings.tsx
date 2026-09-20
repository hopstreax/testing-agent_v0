"use client";

import React, { useState, useEffect } from "react";
import {
  SlidersHorizontal,
  ChevronDown,
  Monitor,
  KeyRound,
  Cpu,
  Layers,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ProviderMetadata, getProviders } from "@/lib/api";

const FALLBACK_PROVIDERS: ProviderMetadata[] = [
  { id: "auto", label: "Auto (Fallback)", default_model: null, models: [] },
  {
    id: "gemini",
    label: "Google Gemini",
    default_model: "gemini-3.6-flash",
    models: ["gemini-3.6-flash", "gemini-2.5-flash", "gemini-2.5-pro"],
  },
  {
    id: "groq",
    label: "Groq",
    default_model: "openai/gpt-oss-120b",
    models: ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.6-27b"],
  },
  {
    id: "ollama",
    label: "Ollama",
    default_model: "qwen2.5-coder:3b",
    models: ["qwen2.5-coder:3b", "llama3.2:3b"],
  },
];

interface AdvancedSettingsProps {
  browser?: string;
  headless: boolean;
  maxSteps: number;
  storageStatePath?: string;
  provider: "auto" | "gemini" | "groq" | "ollama";
  model: string;
  targetUrl?: string;
  onBrowserChange?: (browser: string) => void;
  onHeadlessChange: (headless: boolean) => void;
  onMaxStepsChange: (maxSteps: number) => void;
  onStorageStatePathChange?: (path: string) => void;
  onProviderChange: (provider: "auto" | "gemini" | "groq" | "ollama") => void;
  onModelChange: (model: string) => void;
}

export function AdvancedSettings({
  browser = "chromium",
  headless = true,
  maxSteps = 15,
  storageStatePath = "",
  provider = "auto",
  model = "",
  targetUrl = "",
  onHeadlessChange,
  onMaxStepsChange,
  onStorageStatePathChange,
  onProviderChange,
  onModelChange,
}: AdvancedSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [providersList, setProvidersList] = useState<ProviderMetadata[]>(FALLBACK_PROVIDERS);
  const [customModeSelected, setCustomModeSelected] = useState(false);

  useEffect(() => {
    let isMounted = true;
    void getProviders()
      .then((data) => {
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setProvidersList(data);
        }
      })
      .catch(() => {
        // Fallback already prefilled
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const currentProviderMeta = providersList.find((p) => p.id === provider);

  const isCustomModel =
    provider !== "auto" &&
    (customModeSelected ||
      (Boolean(model) &&
        Boolean(currentProviderMeta) &&
        !currentProviderMeta?.models.includes(model)));

  const handleProviderSelect = (newId: "auto" | "gemini" | "groq" | "ollama") => {
    onProviderChange(newId);
    setCustomModeSelected(false);
    if (newId === "auto") {
      onModelChange("");
    } else {
      const targetMeta = providersList.find((p) => p.id === newId);
      const defaultMod = targetMeta?.default_model || "";
      onModelChange(defaultMod);
    }
  };

  const handleModelDropdownChange = (val: string) => {
    if (val === "__custom__") {
      setCustomModeSelected(true);
      onModelChange("");
    } else {
      setCustomModeSelected(false);
      onModelChange(val);
    }
  };

  const browserDisplay = browser === "chromium" ? "Local Chromium" : browser;
  const providerLabel = currentProviderMeta?.label || "Auto";

  // Helper to extract clean hostname
  const getTargetDomain = (rawUrl: string): string => {
    const trimmed = rawUrl.trim();
    if (!trimmed) return "Pending target URL";
    try {
      const parsed = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
      return parsed.hostname;
    } catch {
      return trimmed.slice(0, 30);
    }
  };

  const domainDisplay = getTargetDomain(targetUrl);
  const stateFileName = storageStatePath.trim()
    ? storageStatePath.trim().split(/[\\/]/).pop()
    : null;

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-[#1b2026] bg-[#0d1013] p-4 sm:p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)]">
      {/* Control Panel Header */}
      <div className="flex items-center justify-between select-none">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-[#00e599]" />
          <h2 className="font-display text-sm font-semibold text-white tracking-tight">
            Pre-Flight Control
          </h2>
        </div>
        <span className="font-mono text-[10px] text-zinc-400 bg-[#121518] px-2 py-0.5 rounded border border-[#1b2026]">
          LOCAL RUNNER
        </span>
      </div>

      <p className="text-xs text-zinc-400 leading-normal">
        Execution specifications dispatched to the autonomous browser agent.
      </p>

      {/* Scannable Pre-Flight Specifications (Always visible) */}
      <div className="flex flex-col divide-y divide-[#1b2026] rounded-lg border border-[#1b2026] bg-[#121518]/60 overflow-hidden">
        {/* Row 1: Browser Engine */}
        <div className="flex items-center justify-between px-3 py-2.5 text-xs transition-colors hover:bg-[#161a1f]/50">
          <div className="flex items-center gap-2">
            <Monitor className="h-3.5 w-3.5 text-[#00e599]" />
            <span className="font-mono text-[11px] text-zinc-400">Engine</span>
          </div>
          <div className="flex items-center gap-1.5 font-mono">
            <span className="text-xs text-zinc-200">{browserDisplay}</span>
            <span className="rounded border border-[#00e599]/30 bg-[#00e599]/10 px-1.5 py-0.2 font-mono text-[9px] font-semibold text-[#00e599]">
              Default
            </span>
          </div>
        </div>

        {/* Row 2: Display Mode */}
        <div className="flex items-center justify-between px-3 py-2.5 text-xs transition-colors hover:bg-[#161a1f]/50">
          <div className="flex items-center gap-2">
            <Layers className="h-3.5 w-3.5 text-zinc-400" />
            <span className="font-mono text-[11px] text-zinc-400">Display</span>
          </div>
          <div className="flex items-center gap-1.5 font-mono">
            <span className="text-xs text-zinc-200">
              {headless ? "Headless" : "Headed"}
            </span>
            <span
              className={cn(
                "rounded px-1.5 py-0.2 font-mono text-[9px] font-medium border",
                headless
                  ? "border-zinc-800 bg-zinc-900 text-zinc-400"
                  : "border-amber-800/50 bg-amber-950/60 text-amber-300 font-semibold"
              )}
            >
              {headless ? "Background" : "Interactive"}
            </span>
          </div>
        </div>

        {/* Row 3: Step Budget */}
        <div className="flex items-center justify-between px-3 py-2.5 text-xs transition-colors hover:bg-[#161a1f]/50">
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-zinc-400" />
            <span className="font-mono text-[11px] text-zinc-400">Budget</span>
          </div>
          <div className="flex items-center gap-1.5 font-mono">
            <span className="text-xs text-zinc-200">{maxSteps} steps</span>
            <span className="rounded border border-zinc-800 bg-zinc-900 px-1.5 py-0.2 font-mono text-[9px] text-zinc-500">
              Safety limit
            </span>
          </div>
        </div>

        {/* Row 4: AI Reasoning */}
        <div className="flex items-center justify-between px-3 py-2.5 text-xs transition-colors hover:bg-[#161a1f]/50">
          <div className="flex items-center gap-2">
            <Cpu className="h-3.5 w-3.5 text-zinc-400" />
            <span className="font-mono text-[11px] text-zinc-400">Reasoning</span>
          </div>
          <div className="flex flex-col items-end gap-0.5 font-mono">
            <span className="text-xs text-zinc-200">{providerLabel}</span>
            <span className="text-[10px] text-zinc-500 truncate max-w-[150px]">
              {provider === "auto" ? "Automatic failover" : model || "Default model"}
            </span>
          </div>
        </div>

        {/* Row 5: Authentication Session */}
        <div className="flex items-center justify-between px-3 py-2.5 text-xs transition-colors hover:bg-[#161a1f]/50">
          <div className="flex items-center gap-2">
            <KeyRound className="h-3.5 w-3.5 text-zinc-400" />
            <span className="font-mono text-[11px] text-zinc-400">Session</span>
          </div>
          <div className="flex items-center gap-1.5 font-mono">
            <span
              className="text-[11px] text-zinc-300 truncate max-w-[120px]"
              title={storageStatePath || undefined}
            >
              {stateFileName || "Clean session"}
            </span>
            <span
              className={cn(
                "rounded px-1.5 py-0.2 font-mono text-[9px] font-medium border",
                stateFileName
                  ? "border-amber-800/50 bg-amber-950/60 text-amber-300"
                  : "border-zinc-800 bg-zinc-900 text-zinc-500"
              )}
            >
              {stateFileName ? "Custom Auth" : "Ephemeral"}
            </span>
          </div>
        </div>
      </div>

      {/* Accordion Toggle for Detailed Settings */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between rounded-lg border border-[#1b2026] bg-[#121518] px-3.5 py-2.5 text-left text-xs text-zinc-300 hover:bg-[#161a1e] hover:text-white hover:border-[#272f38] transition-all cursor-pointer select-none"
        aria-expanded={isOpen}
      >
        <span className="font-mono text-[11px] font-medium">
          {isOpen ? "Hide Parameter Controls" : "Customize Parameters"}
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-zinc-400 transition-transform duration-200",
            isOpen && "rotate-180 text-[#00e599]"
          )}
        />
      </button>

      {/* Collapsible Detailed Configuration Controls */}
      {isOpen && (
        <div className="flex flex-col gap-4 rounded-lg border border-[#1b2026] bg-[#121518]/50 p-3.5 animate-in fade-in-50 duration-150">
          {/* Control 1: Headless Mode */}
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
              Display Mode
            </label>
            <div className="grid grid-cols-2 gap-1 rounded-md border border-[#1b2026] bg-[#0c0e10] p-1">
              <button
                type="button"
                onClick={() => onHeadlessChange(true)}
                className={cn(
                  "rounded py-1 font-mono text-xs transition-colors cursor-pointer text-center",
                  headless
                    ? "bg-zinc-800 text-white font-medium shadow-xs"
                    : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                Headless
              </button>
              <button
                type="button"
                onClick={() => onHeadlessChange(false)}
                className={cn(
                  "rounded py-1 font-mono text-xs transition-colors cursor-pointer text-center",
                  !headless
                    ? "bg-zinc-800 text-white font-medium shadow-xs"
                    : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                Headed
              </button>
            </div>
            <span className="font-mono text-[10px] text-zinc-500">
              {headless
                ? "Fast background execution (default)"
                : "Spawns visible Chromium window"}
            </span>
          </div>

          {/* Control 2: Execution Budget (Steps) */}
          <div className="flex flex-col gap-1.5 border-t border-[#1b2026] pt-3">
            <label className="font-mono text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
              Execution Budget
            </label>
            <div className="flex h-9 items-center justify-between rounded-md border border-[#1b2026] bg-[#0c0e10] px-3">
              <span className="font-mono text-xs text-zinc-200">
                {maxSteps} steps
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onMaxStepsChange(Math.max(5, maxSteps - 5))}
                  disabled={maxSteps <= 5}
                  className="flex h-6 w-6 items-center justify-center rounded bg-zinc-800/90 text-zinc-300 hover:bg-zinc-700 disabled:opacity-30 cursor-pointer text-xs font-mono"
                  aria-label="Decrease max steps by 5"
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={() => onMaxStepsChange(Math.min(50, maxSteps + 5))}
                  disabled={maxSteps >= 50}
                  className="flex h-6 w-6 items-center justify-center rounded bg-zinc-800/90 text-zinc-300 hover:bg-zinc-700 disabled:opacity-30 cursor-pointer text-xs font-mono"
                  aria-label="Increase max steps by 5"
                >
                  +
                </button>
              </div>
            </div>
            <span className="font-mono text-[10px] text-zinc-500">
              Clamped between 5 and 50 reasoning iterations
            </span>
          </div>

          {/* Control 3: AI Provider & Model Selection */}
          <div className="flex flex-col gap-3 border-t border-[#1b2026] pt-3">
            <label className="font-mono text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
              AI Reasoning Provider &amp; Model
            </label>

            <div className="flex flex-col gap-2">
              <select
                id="ai-provider-select"
                value={provider}
                onChange={(e) =>
                  handleProviderSelect(
                    e.target.value as "auto" | "gemini" | "groq" | "ollama"
                  )
                }
                className="h-9 w-full rounded-md border border-[#1b2026] bg-[#0c0e10] px-2.5 font-mono text-xs text-zinc-200 focus:border-[#00e599]/60 focus:outline-none cursor-pointer"
              >
                {providersList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>

              {provider === "auto" ? (
                <div className="flex h-9 items-center rounded-md border border-[#1b2026] bg-[#0c0e10]/60 px-2.5 font-mono text-xs text-zinc-500 select-none">
                  Automatic failover (Server default)
                </div>
              ) : (
                <select
                  id="ai-model-select"
                  value={isCustomModel ? "__custom__" : model}
                  onChange={(e) => handleModelDropdownChange(e.target.value)}
                  className="h-9 w-full rounded-md border border-[#1b2026] bg-[#0c0e10] px-2.5 font-mono text-xs text-zinc-200 focus:border-[#00e599]/60 focus:outline-none cursor-pointer"
                >
                  {currentProviderMeta?.models.map((m) => (
                    <option key={m} value={m}>
                      {m} {m === currentProviderMeta.default_model ? "(Default)" : ""}
                    </option>
                  ))}
                  <option value="__custom__">Custom model override...</option>
                </select>
              )}
            </div>

            {/* Custom Model Input */}
            {provider !== "auto" && isCustomModel && (
              <div className="flex flex-col gap-1 animate-in fade-in-50 duration-150">
                <input
                  id="custom-model-input"
                  type="text"
                  value={model}
                  onChange={(e) => onModelChange(e.target.value)}
                  placeholder={`Custom ${currentProviderMeta?.label} model ID`}
                  className="h-9 w-full rounded-md border border-[#1b2026] bg-[#0c0e10] px-2.5 font-mono text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-[#00e599]/60 focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Control 4: Storage State / Auth Session */}
          <div className="flex flex-col gap-1.5 border-t border-[#1b2026] pt-3">
            <div className="flex items-center justify-between">
              <label
                htmlFor="storage-state-input"
                className="font-mono text-[10px] font-semibold text-zinc-400 uppercase tracking-wider"
              >
                Session State File
              </label>
              <span className="font-mono text-[9px] text-zinc-500">Optional</span>
            </div>
            <input
              id="storage-state-input"
              type="text"
              value={storageStatePath}
              onChange={(e) => onStorageStatePathChange?.(e.target.value)}
              placeholder="Local storage_state.json path"
              className="h-9 w-full rounded-md border border-[#1b2026] bg-[#0c0e10] px-2.5 font-mono text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-amber-500/50 focus:outline-none"
            />
            <span className="font-mono text-[10px] text-zinc-500">
              Playwright JSON cookies &amp; origins state. TraceKit never logs credentials.
            </span>
          </div>
        </div>
      )}

      {/* Launch Readiness Summary Box */}
      <div className="rounded-lg border border-[#1b2026] bg-[#121518]/40 p-3 flex flex-col gap-2.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)]">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] text-zinc-500 uppercase tracking-wider">
            Target Host
          </span>
          <span className="font-mono text-xs text-[#00e599] font-medium truncate max-w-[160px]">
            {domainDisplay}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] text-zinc-500 uppercase tracking-wider">
            Worker State
          </span>
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-zinc-300">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00e599] animate-pulse-mint" />
            <span>Ready for dispatch</span>
          </div>
        </div>
      </div>
    </div>
  );
}
