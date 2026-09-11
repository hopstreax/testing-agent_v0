"use client";

import React from "react";
import Link from "next/link";
import {
  PlayCircle,
  Clock,
  SlidersHorizontal,
  BookOpen,
  Terminal,
  GitBranch,
  ChevronsUpDown,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed md:static inset-y-0 left-0 z-50 flex w-64 flex-col justify-between border-r border-[#1f2428] bg-[#090a0c] px-3.5 py-4 transition-transform duration-200 ease-in-out md:translate-x-0 select-none",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Top Section */}
        <div className="flex flex-col gap-5">
          {/* Brand Header */}
          <div className="flex items-center justify-between px-2 pt-1">
            <Link href="/" className="flex items-center gap-2.5 group">
              {/* Minimal geometric trace mark */}
              <div className="flex h-6 w-6 items-center justify-center rounded-sm bg-emerald-950/80 border border-emerald-500/30 group-hover:border-emerald-500/60 transition-colors">
                <div className="flex flex-col gap-1 w-3">
                  <div className="h-0.5 w-full bg-emerald-400 rounded-full" />
                  <div className="h-0.5 w-2 bg-emerald-400/80 rounded-full" />
                  <div className="h-0.5 w-2.5 bg-emerald-400/60 rounded-full" />
                </div>
              </div>
              <span className="font-semibold tracking-tight text-white text-base">
                TraceKit
              </span>
            </Link>

            {/* Mobile close button */}
            <button
              onClick={onClose}
              className="rounded p-1 text-zinc-400 hover:text-white md:hidden"
              aria-label="Close sidebar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Workspace / Project Selector (UI Scaffolding) */}
          <button
            type="button"
            className="flex items-center justify-between rounded-lg border border-[#22272b] bg-[#121518] px-3 py-2 text-xs transition-colors hover:border-zinc-700/60 hover:bg-[#161a1e] text-left w-full cursor-pointer"
            title="Active Workspace (UI Scaffolding)"
          >
            <div className="flex items-center gap-2 min-w-0">
              <GitBranch className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span className="truncate font-mono text-[11px] text-zinc-200">
                production-web <span className="text-zinc-500">/</span> main
              </span>
            </div>
            <ChevronsUpDown className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
          </button>

          {/* Navigation Items */}
          <div className="flex flex-col gap-5 mt-1">
            {/* Test Suite Section */}
            <div>
              <div className="px-2 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                Test Suite
              </div>
              <nav className="flex flex-col gap-1">
                {/* Active: New Test */}
                <Link
                  href="/"
                  className="flex items-center justify-between rounded-md bg-[#161a1e] border border-zinc-800/80 px-2.5 py-1.5 text-xs font-medium text-white transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <PlayCircle className="h-4 w-4 text-emerald-400 fill-emerald-950/40" />
                    <span>New Test</span>
                  </div>
                  <kbd className="font-mono text-[10px] text-zinc-500 bg-zinc-800/60 px-1 py-0.5 rounded">
                    ⌘N
                  </kbd>
                </Link>

                {/* Runs */}
                <button
                  type="button"
                  className="flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 transition-colors w-full cursor-pointer"
                  title="Runs history (Coming soon in M5.2)"
                >
                  <div className="flex items-center gap-2.5">
                    <Clock className="h-4 w-4 text-zinc-500" />
                    <span>Runs</span>
                  </div>
                </button>

                {/* Settings */}
                <button
                  type="button"
                  className="flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 transition-colors w-full cursor-pointer"
                  title="Settings (Coming soon)"
                >
                  <div className="flex items-center gap-2.5">
                    <SlidersHorizontal className="h-4 w-4 text-zinc-500" />
                    <span>Settings</span>
                  </div>
                </button>
              </nav>
            </div>

            {/* Developer Section */}
            <div>
              <div className="px-2 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                Developer
              </div>
              <nav className="flex flex-col gap-1">
                <button
                  type="button"
                  className="flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 transition-colors w-full cursor-pointer"
                  title="Documentation (Coming soon)"
                >
                  <div className="flex items-center gap-2.5">
                    <BookOpen className="h-4 w-4 text-zinc-500" />
                    <span>Documentation</span>
                  </div>
                </button>

                <button
                  type="button"
                  className="flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 transition-colors w-full cursor-pointer"
                  title="CLI & API Keys (Coming soon)"
                >
                  <div className="flex items-center gap-2.5">
                    <Terminal className="h-4 w-4 text-zinc-500" />
                    <span>CLI & API Keys</span>
                  </div>
                </button>
              </nav>
            </div>
          </div>
        </div>

        {/* Bottom Section: Agent Status & User Profile */}
        <div className="flex flex-col gap-3 pt-3 border-t border-[#1f2428]">
          {/* Static Agent Capability Indicator */}
          <div className="flex items-center justify-between rounded-md bg-[#101316] border border-[#1e2327] px-2.5 py-2">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              <span className="text-[11px] font-medium text-zinc-300">Local Agent</span>
            </div>
            <span className="font-mono text-[10px] font-semibold tracking-wider text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-1.5 py-0.5 rounded">
              READY
            </span>
          </div>

          {/* User Profile Card (Scaffolding) */}
          <div className="flex items-center justify-between px-1.5 py-1">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-emerald-950/80 border border-emerald-700/50 text-[10px] font-bold text-emerald-400">
                DK
              </div>
              <div className="flex flex-col min-w-0">
                <span className="truncate text-xs font-medium text-zinc-200">
                  DevKit Labs
                </span>
                <span className="truncate text-[10px] text-zinc-500 font-mono">
                  Pro Workspace
                </span>
              </div>
            </div>
            <kbd className="font-mono text-[10px] text-zinc-600 bg-zinc-900 px-1 py-0.5 rounded border border-zinc-800">
              ⌘K
            </kbd>
          </div>
        </div>
      </aside>
    </>
  );
}
