"use client";

import React, { useEffect } from "react";
import { X, ExternalLink } from "lucide-react";

interface LightboxModalProps {
  imageSrc: string | null;
  imageTitle?: string;
  onClose: () => void;
}

export function LightboxModal({
  imageSrc,
  imageTitle,
  onClose,
}: LightboxModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!imageSrc) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 sm:p-6 animate-in fade-in-50"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] max-w-5xl w-full rounded-xl border border-zinc-800 bg-[#101316] p-3 shadow-2xl flex flex-col gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5 px-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-zinc-300">
              {imageTitle || "Visual Evidence"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={imageSrc}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded p-1 text-zinc-400 hover:text-white transition-colors"
              title="Open full resolution in new tab"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
            <button
              onClick={onClose}
              className="rounded p-1 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              aria-label="Close lightbox"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Image Display */}
        <div className="relative flex-1 overflow-auto rounded bg-black/60 flex items-center justify-center p-2 min-h-[300px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageSrc}
            alt={imageTitle || "Screenshot preview"}
            className="max-h-[75vh] w-auto max-w-full rounded object-contain border border-zinc-800/60 shadow-lg"
          />
        </div>
      </div>
    </div>
  );
}
