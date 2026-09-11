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
      <div className="rounded-xl border border-[#22272b] bg-[#121518] p-5 shadow-sm">
        <div className="flex items-center gap-2 border-b border-[#1f2428] pb-3 text-sm font-semibold text-white">
          <ImageIcon className="h-4 w-4 text-emerald-400" />
          <span>Visual Evidence Gallery</span>
        </div>
        <p className="pt-4 text-xs text-zinc-500 italic">
          No screenshots captured for this run.
        </p>
      </div>
    );
  }

  const formatScreenshotLabel = (path: string) => {
    const filename = path.split("/").pop() || path;
    return filename.replace(".png", "").replace(/_/g, " ");
  };

  return (
    <div className="rounded-xl border border-[#22272b] bg-[#121518] p-5 shadow-sm flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1f2428] pb-3">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-emerald-400" />
          <span className="font-semibold text-sm text-white">
            Visual Evidence Gallery
          </span>
        </div>
        <span className="font-mono text-xs text-zinc-500">
          {screenshots.length} Screenshots
        </span>
      </div>

      {/* Grid of Screenshots */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {screenshots.map((shotPath, index) => {
          const shotUrl = `/api/runs/${encodeURIComponent(runId)}/artifacts/${shotPath}`;
          const label = formatScreenshotLabel(shotPath);

          return (
            <div
              key={index}
              onClick={() => onSelectScreenshot(shotUrl, label)}
              className="group relative rounded-lg border border-[#22272b] bg-[#0c0e10] overflow-hidden cursor-pointer hover:border-emerald-500/50 transition-all"
            >
              {/* Image Preview */}
              <div className="relative aspect-video w-full overflow-hidden bg-black/40 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={shotUrl}
                  alt={label}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <span className="rounded-md bg-black/75 px-2.5 py-1 text-xs text-zinc-200 font-mono flex items-center gap-1.5 shadow">
                    <ZoomIn className="h-3.5 w-3.5 text-emerald-400" />
                    <span>View Full Size</span>
                  </span>
                </div>
              </div>

              {/* Caption */}
              <div className="p-2.5 text-[11px] font-mono text-zinc-300 truncate border-t border-[#1f2428] bg-[#0e1114]">
                {label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
