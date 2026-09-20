"use client";

import React from "react";

/**
 * AmbientBackground provides the signature TraceKit developer-tool atmosphere:
 * - Ultra-deep base (#08090b)
 * - Restrained, low-opacity mint (#00e599) atmospheric energy regions around the perimeter
 * - Technical dot-grid matrix texture matching TraceKit landing page fidelity
 * - Barely-perceptible, ultra-slow ambient drift with zero rapid movement or distraction
 * - Fully respects prefers-reduced-motion
 * - Positioned on z-0 inside an isolated stacking context, sitting above the base black canvas
 *   but behind the z-10 interactive workspace
 */
export function AmbientBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none"
      aria-hidden="true"
    >
      {/* Base Canvas Fill */}
      <div className="absolute inset-0 bg-[#08090b]" />

      {/* Atmospheric Region 1: Upper-Right Mint Energy Node (Extended inward to integrate with Pre-Flight panel) */}
      <div
        className="absolute -top-[10%] right-[0%] h-[640px] w-[640px] rounded-full opacity-[0.095] blur-[120px] animate-ambient-drift motion-reduce:animate-none"
        style={{
          background: "radial-gradient(circle, #00e599 0%, transparent 70%)",
        }}
      />

      {/* Atmospheric Region 2: Lower-Right / Bottom Ambient Glow */}
      <div
        className="absolute -bottom-[10%] right-[18%] h-[540px] w-[540px] rounded-full opacity-[0.065] blur-[110px] animate-ambient-drift-reverse motion-reduce:animate-none"
        style={{
          background: "radial-gradient(circle, #00e599 0%, transparent 70%)",
        }}
      />

      {/* Atmospheric Region 3: Upper-Left / Header Ambient Aura (Balanced temperature behind title & description) */}
      <div
        className="absolute top-[4%] left-[16%] h-[480px] w-[480px] rounded-full opacity-[0.06] blur-[105px] motion-reduce:animate-none"
        style={{
          background: "radial-gradient(circle, #00e599 0%, transparent 70%)",
        }}
      />

      {/* Technical Dot-Grid Matrix Texture */}
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "radial-gradient(#00e599 1px, transparent 1px), radial-gradient(#00e599 1px, #08090b 1px)",
          backgroundSize: "28px 28px",
          backgroundPosition: "0 0, 14px 14px",
        }}
      />
    </div>
  );
}
