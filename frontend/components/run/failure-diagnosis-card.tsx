"use client";

import React, { useState } from "react";
import { AlertOctagon, HelpCircle, ChevronRight, Terminal } from "lucide-react";
import { FailureDiagnosis } from "@/lib/api";

interface FailureDiagnosisCardProps {
  diagnosis: FailureDiagnosis | null;
  rawMessage?: string | null;
}

export function FailureDiagnosisCard({
  diagnosis,
  rawMessage,
}: FailureDiagnosisCardProps) {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  if (!diagnosis) return null;

  const isBehaviorMismatch =
    diagnosis.classification === "APPLICATION_BEHAVIOR_MISMATCH";

  // Separate concise deterministic explanation from verbose technical exception traces
  let conciseSummary = diagnosis.summary;
  let technicalDetails: string | null = null;

  const raw = rawMessage || "";
  if (raw.length > 100 && diagnosis.summary.includes(raw)) {
    let headline = diagnosis.summary.replace(raw, "").trim();
    if (headline.endsWith(":")) headline = headline.slice(0, -1).trim();
    if (!headline.endsWith(".")) headline += ".";
    conciseSummary = headline || "Automation failure encountered.";
    technicalDetails = raw;
  } else if (diagnosis.summary.length > 140 && diagnosis.summary.includes(": ")) {
    const firstColon = diagnosis.summary.indexOf(": ");
    const secondColon = diagnosis.summary.indexOf(": ", firstColon + 2);
    const splitIdx = secondColon !== -1 ? secondColon : firstColon;
    let headline = diagnosis.summary.substring(0, splitIdx).trim();
    if (!headline.endsWith(".")) headline += ".";
    conciseSummary = headline;
    technicalDetails = diagnosis.summary.substring(splitIdx + 2).trim();
  } else if (raw && raw.length > 120 && raw !== diagnosis.summary) {
    technicalDetails = raw;
  }

  return (
    <div
      className={`rounded-lg border p-5 shadow-xs flex flex-col gap-4 ${
        isBehaviorMismatch
          ? "border-amber-900/60 bg-[#0e1012]"
          : "border-red-900/60 bg-[#0e1012]"
      }`}
    >
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1f2428] pb-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-md border ${
              isBehaviorMismatch
                ? "border-amber-800/50 bg-amber-950/60 text-amber-400"
                : "border-red-800/50 bg-red-950/60 text-red-400"
            }`}
          >
            <AlertOctagon className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sm text-white font-sans">
              Deterministic Failure Diagnosis
            </span>
            <span className="font-mono text-[10px] text-zinc-400">
              Root cause classified by deterministic evaluation engine
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 font-mono text-[10px]">
          {/* Classification Pill */}
          <span
            className={`font-semibold px-2 py-0.5 rounded border ${
              isBehaviorMismatch
                ? "bg-amber-950/80 text-amber-300 border-amber-800/60"
                : "bg-red-950/80 text-red-300 border-red-800/60"
            }`}
          >
            {diagnosis.classification}
          </span>

          {/* Cause Pill */}
          <span className="bg-zinc-900 text-zinc-300 border border-zinc-800 px-2 py-0.5 rounded font-medium">
            {diagnosis.cause}
          </span>
        </div>
      </div>

      {/* Concise Summary Explanation */}
      <div className="text-xs leading-relaxed text-zinc-200 font-sans">
        <span className="font-semibold text-white font-mono text-[11px] uppercase tracking-wider block mb-1">
          Root Cause Summary
        </span>
        <p className="text-zinc-300">{conciseSummary}</p>
      </div>

      {/* Distinction explanation caption */}
      <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-mono">
        <HelpCircle className="h-3.5 w-3.5 shrink-0 text-zinc-600" />
        <span>
          {isBehaviorMismatch
            ? "The target application responded differently than the deterministic assertion expected."
            : "The automation runner or browser environment encountered an unrecoverable failure."}
        </span>
      </div>

      {/* Subordinate Collapsible Technical / Error Details */}
      {technicalDetails && (
        <div className="pt-2 border-t border-[#1f2428]">
          <button
            type="button"
            onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
            className="flex items-center gap-1.5 font-mono text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer select-none"
            aria-expanded={showTechnicalDetails}
          >
            <ChevronRight
              className={`h-3 w-3 transition-transform duration-150 ${
                showTechnicalDetails ? "rotate-90" : ""
              }`}
            />
            <Terminal className="h-3 w-3 text-zinc-500" />
            <span>
              {showTechnicalDetails ? "Hide technical exception details" : "Inspect technical exception details"}
            </span>
          </button>

          {showTechnicalDetails && (
            <div className="mt-2.5 rounded-md border border-[#1f2428] bg-[#090b0d] p-3 animate-in fade-in-50 overflow-x-auto">
              <pre className="font-mono text-[11px] leading-relaxed text-zinc-400 whitespace-pre-wrap break-all select-text">
                {technicalDetails}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
