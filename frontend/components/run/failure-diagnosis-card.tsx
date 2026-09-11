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
      className={`rounded-xl border p-5 shadow-lg flex flex-col gap-3.5 ${
        isBehaviorMismatch
          ? "border-amber-900/60 bg-amber-950/25"
          : "border-red-900/60 bg-red-950/25"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3">
        <div className="flex items-center gap-2">
          <AlertOctagon
            className={`h-4 w-4 ${
              isBehaviorMismatch ? "text-amber-400" : "text-red-400"
            }`}
          />
          <span className="font-semibold text-sm text-white">
            Deterministic Failure Diagnosis
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Classification Pill */}
          <span
            className={`font-mono text-[10px] font-semibold px-2 py-0.5 rounded border ${
              isBehaviorMismatch
                ? "bg-amber-950/80 text-amber-300 border-amber-800/60"
                : "bg-red-950/80 text-red-300 border-red-800/60"
            }`}
          >
            {diagnosis.classification}
          </span>

          {/* Cause Pill */}
          <span className="font-mono text-[10px] bg-zinc-900 text-zinc-300 border border-zinc-800 px-2 py-0.5 rounded">
            {diagnosis.cause}
          </span>
        </div>
      </div>

      {/* Concise Summary Explanation */}
      <div className="text-xs leading-relaxed text-zinc-200">
        <span className="font-semibold text-zinc-100">Root Cause Summary: </span>
        <span>{conciseSummary}</span>
      </div>

      {/* Distinction explanation */}
      <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
        <HelpCircle className="h-3.5 w-3.5 shrink-0" />
        <span>
          {isBehaviorMismatch
            ? "The target application responded differently than the deterministic assertion expected."
            : "The automation runner or browser environment encountered an unrecoverable failure."}
        </span>
      </div>

      {/* Subordinate Collapsible Technical / Error Details */}
      {technicalDetails && (
        <div className="pt-2 border-t border-zinc-800/60">
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
            <span>Technical error details</span>
          </button>

          {showTechnicalDetails && (
            <div className="mt-2.5 rounded-lg border border-zinc-800 bg-[#090b0d] p-3 animate-in fade-in-50">
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
