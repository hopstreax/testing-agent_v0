"use client";

import React from "react";
import { Image as ImageIcon, ZoomIn } from "lucide-react";

interface VisualEvidenceProps {
  screenshots: string[];
  runId: string;
  onSelectScreenshot: (url: string, title: string) => void;
}

export function VisualEvidence({
  screenshots,
  runId,
  onSelectScreenshot,
}: VisualEvidenceProps) {
  if (!screenshots || screenshots.length === 0) {
    return (
      <div className="rounded-lg border border-[#1b2026] bg-[#0d1013] p-5 shadow-xs">
        <div className="flex items-center gap-2 border-b border-[#1b2026] pb-3 text-sm font-semibold text-white">
          <ImageIcon className="h-4 w-4 text-emerald-400" />
          <span>Visual Evidence Gallery</span>
        </div>
        <p className="pt-4 text-xs text-zinc-500 font-mono italic">
          No viewport screenshots were captured for this run.
        </p>
      </div>
    );
  }

  const formatScreenshotLabel = (path: string) => {
    const filename = path.split("/").pop() || path;
    return filename.replace(".png", "").replace(/_/g, " ");
  };

  return (
    <div className="rounded-lg border border-[#1b2026] bg-[#0d1013] p-5 shadow-xs flex flex-col gap-4">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1b2026] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md border border-emerald-800/50 bg-emerald-950/60 text-emerald-400">
            <ImageIcon className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sm text-white font-sans">
              Visual Evidence Gallery
            </span>
            <span className="font-mono text-[10px] text-zinc-400">
              High-resolution viewport snapshots captured across execution stages
            </span>
          </div>
        </div>

        <span className="rounded bg-[#121518] border border-[#22272b] px-2 py-0.5 font-mono text-[10px] font-semibold text-zinc-300">
          {screenshots.length} SCREENSHOTS
        </span>
      </div>

      {/* Grid of Screenshots */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
        {screenshots.map((shotPath, index) => {
          const shotUrl = `/api/runs/${encodeURIComponent(runId)}/artifacts/${shotPath}`;
          const label = formatScreenshotLabel(shotPath);

          return (
            <div
              key={index}
              onClick={() => onSelectScreenshot(shotUrl, label)}
              className="group relative rounded-md border border-[#1b2026] bg-[#090b0d] overflow-hidden cursor-pointer hover:border-emerald-500/50 transition-all shadow-xs"
            >
              {/* Image Preview Container */}
              <div className="relative aspect-video w-full overflow-hidden bg-black/60 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={shotUrl}
                  alt={label}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <span className="rounded bg-black/85 border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200 font-mono flex items-center gap-1.5 shadow-md">
                    <ZoomIn className="h-3 w-3 text-emerald-400" />
                    <span>View Full Size</span>
                  </span>
                </div>
              </div>

              {/* Caption Bar */}
              <div className="p-2.5 text-[11px] font-mono text-zinc-300 truncate border-t border-[#1b2026] bg-[#0c0e10] flex items-center justify-between gap-1">
                <span className="truncate">{label}</span>
                <span className="text-[10px] text-zinc-600 shrink-0 font-sans">
                  #{index + 1}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
