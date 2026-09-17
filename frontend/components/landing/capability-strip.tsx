"use client";

import React, { useState, useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import { Eye, MousePointer2, ShieldCheck, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface PipelineNode {
  id: string;
  step: string;
  title: string;
  command: string;
  icon: React.ElementType;
  capabilities: string[];
}

const PIPELINE_NODES: PipelineNode[] = [
  {
    id: "observe",
    step: "01",
    title: "OBSERVE",
    command: "page.snapshot()",
    icon: Eye,
    capabilities: ["Accessibility tree parsing", "DOM state & coordinates", "Network & console logs"],
  },
  {
    id: "act",
    step: "02",
    title: "ACT",
    command: "action.dispatch()",
    icon: MousePointer2,
    capabilities: ["Autonomous browser actions", "Click, type, select, scroll", "Authenticated session storage"],
  },
  {
    id: "verify",
    step: "03",
    title: "VERIFY",
    command: "expect(state).toBe()",
    icon: ShieldCheck,
    capabilities: ["Deterministic assertions", "Visible, text, count checks", "Zero-hallucination validation"],
  },
  {
    id: "explain",
    step: "04",
    title: "EXPLAIN",
    command: "diagnosis.report()",
    icon: FileText,
    capabilities: ["Deterministic root cause", "Visual screenshot evidence", "Structured JSON & Markdown"],
  },
];

export function CapabilityStrip() {
  const [activeNode, setActiveNode] = useState(0);
  const [resetNonce, setResetNonce] = useState(0);
  const [isInView, setIsInView] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const prefersReducedMotion = Boolean(shouldReduceMotion);

  const handleSelectNode = (idx: number) => {
    setActiveNode(idx);
    setResetNonce((prev) => prev + 1);
  };

  // Pause auto-advance when section is outside viewport
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Subtle auto-progression through pipeline nodes; resets on manual selection
  useEffect(() => {
    if (prefersReducedMotion || !isInView) return;
    const timer = setTimeout(() => {
      setActiveNode((prev) => (prev + 1) % PIPELINE_NODES.length);
    }, 3200);
    return () => clearTimeout(timer);
  }, [activeNode, isInView, prefersReducedMotion, resetNonce]);

  return (
    <section
      ref={sectionRef}
      id="capabilities"
      className="relative border-y border-[#1b2026] bg-[#08090b] py-16 sm:py-24 overflow-hidden scroll-mt-16"
    >
      {/* Background subtle technical grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            "linear-gradient(#00e599 1px, transparent 1px), linear-gradient(to right, #00e599 1px, #08090b 1px)",
          backgroundSize: "40px 40px",
        }}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header with technical tagline */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-8 border-b border-[#1b2026]">
          <div>
            <div className="inline-flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-[#00e599]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#00e599]" />
              <span>AGENT PIPELINE ARCHITECTURE</span>
            </div>
            <h2 className="mt-2 font-display text-3xl sm:text-4xl font-semibold tracking-[-0.02em] text-white">
              What the agent actually does.
            </h2>
          </div>
          <p className="font-sans text-xs sm:text-sm text-zinc-400 font-normal leading-relaxed max-w-md sm:text-right">
            One continuous loop: observe page state, dispatch real browser actions,
            verify with deterministic assertions, and explain outcomes.
          </p>
        </div>

        {/* ── Desktop Pipeline Timeline (≥ lg) ── */}
        <div className="hidden lg:block pt-10">
          <div className="relative grid grid-cols-4 gap-6">
            {/* Connecting Baseline Wire */}
            <div
              className="absolute top-5 left-[12%] right-[12%] h-[1px] bg-[#1b2026] -z-0"
              aria-hidden="true"
            />

            {PIPELINE_NODES.map((node, idx) => {
              const Icon = node.icon;
              const isActive = activeNode === idx;

              return (
                <button
                  type="button"
                  key={node.id}
                  onClick={() => handleSelectNode(idx)}
                  className="group relative flex flex-col text-left cursor-pointer select-none rounded-lg focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00e599]"
                  aria-label={`Phase ${node.step}: ${node.title}`}
                >
                  {/* Top Node Indicator Pin */}
                  <div className="flex items-center gap-3 mb-5 relative z-10">
                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition-all duration-200",
                        isActive
                          ? "border-[#00e599] bg-[#00e599]/15 text-[#00e599] shadow-xs"
                          : "border-[#1b2026] bg-[#0d1013] text-zinc-400 group-hover:border-zinc-700 group-hover:text-zinc-200"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-mono text-[10px] text-zinc-500 font-semibold tracking-wider">
                        PHASE {node.step}
                      </div>
                      <div
                        className={cn(
                          "font-mono text-sm font-bold tracking-tight transition-colors",
                          isActive ? "text-white" : "text-zinc-300 group-hover:text-white"
                        )}
                      >
                        {node.title}
                      </div>
                    </div>
                  </div>

                  {/* Surface Content */}
                  <div
                    className={cn(
                      "rounded-lg border p-4 transition-all duration-200 min-h-[160px] flex flex-col justify-between",
                      isActive
                        ? "border-[#00e599]/50 bg-[#12161b] shadow-xs"
                        : "border-[#1b2026] bg-[#0d1013] hover:border-zinc-700/80 hover:bg-[#12161b]"
                    )}
                  >
                    <div>
                      <div className="font-mono text-[10px] text-[#00e599] pb-2 mb-2.5 border-b border-[#1b2026] truncate">
                        &gt; {node.command}
                      </div>
                      <ul className="space-y-1.5 text-xs text-zinc-400 font-sans leading-relaxed">
                        {node.capabilities.map((cap) => (
                          <li key={cap} className="flex items-start gap-2">
                            <span className="mt-1.5 h-1 w-1 rounded-full bg-[#00e599] shrink-0" />
                            <span className="group-hover:text-zinc-300 transition-colors">
                              {cap}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-3 mt-3 border-t border-[#1b2026] flex items-center justify-between text-[10px] font-mono text-zinc-500">
                      <span>status: ready</span>
                      <span className={cn(isActive ? "text-[#00e599] font-medium" : "text-zinc-600")}>
                        {isActive ? "active" : "idle"}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Mobile / Tablet Vertical Connected Timeline (< lg) ── */}
        <div className="block lg:hidden pt-8">
          <div className="relative pl-6 sm:pl-8 border-l border-[#1b2026] space-y-6 ml-2 sm:ml-4">
            {PIPELINE_NODES.map((node, idx) => {
              const Icon = node.icon;
              const isActive = activeNode === idx;

              return (
                <button
                  type="button"
                  key={node.id}
                  onClick={() => handleSelectNode(idx)}
                  className="relative group text-left cursor-pointer select-none w-full rounded-lg focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00e599]"
                  aria-label={`Phase ${node.step}: ${node.title}`}
                >
                  {/* Pin on vertical line */}
                  <div
                    className={cn(
                      "absolute -left-[31px] sm:-left-[39px] top-2 flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full border transition-all duration-200",
                      isActive
                        ? "border-[#00e599] bg-[#00e599] text-[#08090b] shadow-xs scale-105"
                        : "border-[#1b2026] bg-[#0d1013] text-zinc-400"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>

                  {/* Card Content */}
                  <div
                    className={cn(
                      "rounded-lg border p-4 transition-all duration-200",
                      isActive
                        ? "border-[#00e599]/50 bg-[#12161b] shadow-xs"
                        : "border-[#1b2026] bg-[#0d1013] hover:border-zinc-700"
                    )}
                  >
                    <div className="flex items-center justify-between font-mono text-[10px] text-zinc-500 mb-1">
                      <span>PHASE {node.step}</span>
                      <span className="text-[#00e599]">&gt; {node.command}</span>
                    </div>
                    <div className="font-mono text-sm font-bold text-white mb-2">
                      {node.title}
                    </div>
                    <ul className="space-y-1 text-xs text-zinc-400">
                      {node.capabilities.map((cap) => (
                        <li key={cap} className="flex items-center gap-2">
                          <span className="h-1 w-1 rounded-full bg-[#00e599] shrink-0" />
                          <span>{cap}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
