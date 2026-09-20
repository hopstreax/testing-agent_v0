"use client";

import React from "react";

/**
 * AmbientBackground provides the signature TraceKit developer-tool atmosphere:
 * - Ultra-deep base (#08090b)
 * - 3 soft, low-opacity mint (#00e599) atmospheric energy regions around the perimeter
 * - Center vignette ensuring content legibility and high contrast
 * - Subtle technical dot-grid texture
 * - Barely-perceptible, slow ambient drift with zero rapid movement or distraction
 * - Fully respects prefers-reduced-motion
 */
export function AmbientBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden select-none"
      aria-hidden="true"
    >
      {/* Base Dark Fill */}
      <div className="absolute inset-0 bg-[#08090b]" />

      {/* Atmospheric Region 1: Upper-Right Mint Energy */}
      <div
        className="absolute -top-[15%] -right-[10%] h-[600px] w-[600px] rounded-full opacity-[0.035] blur-[110px] animate-ambient-drift motion-reduce:animate-none"
        style={{
          background: "radial-gradient(circle, #00e599 0%, transparent 70%)",
        }}
      />

      {/* Atmospheric Region 2: Lower-Left Soft Ambient Aura */}
      <div
        className="absolute -bottom-[15%] -left-[10%] h-[550px] w-[550px] rounded-full opacity-[0.03] blur-[100px] animate-ambient-drift-reverse motion-reduce:animate-none"
        style={{
          background: "radial-gradient(circle, #00e599 0%, transparent 70%)",
        }}
      />

      {/* Atmospheric Region 3: Top-Left Subtle Filament */}
      <div
        className="absolute top-[10%] left-[20%] h-[380px] w-[380px] rounded-full opacity-[0.015] blur-[90px] motion-reduce:animate-none"
        style={{
          background: "radial-gradient(circle, #00e599 0%, transparent 70%)",
        }}
      />

      {/* Technical Dot-Grid Matrix Texture */}
      <div
        className="absolute inset-0 opacity-[0.022]"
        style={{
          backgroundImage:
            "radial-gradient(#00e599 1px, transparent 1px), radial-gradient(#00e599 1px, #08090b 1px)",
          backgroundSize: "32px 32px",
          backgroundPosition: "0 0, 16px 16px",
        }}
      />

      {/* Center Vignette: Keeps center stage completely dark and contrast-pure */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 35%, rgba(8, 9, 11, 0.75) 100%)",
        }}
      />
    </div>
  );
}
