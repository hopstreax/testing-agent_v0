"use client";

import React, { useState, Suspense } from "react";
import { Sidebar } from "@/components/shell/sidebar";
import { TopBar } from "@/components/shell/top-bar";
import { TestLaunchForm } from "@/components/test/test-launch-form";

export default function NewTestPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#090a0c] text-[#f4f4f6]">
      {/* Left Navigation Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top Bar */}
        <TopBar onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)} />

        {/* New Test Workspace */}
        <main className="flex-1 overflow-y-auto px-4 py-8 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-3xl">
            {/* Header Metadata Pill */}
            <div className="mb-4 flex items-center gap-2">
              <span className="inline-flex items-center rounded bg-emerald-950/70 border border-emerald-800/50 px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wider text-emerald-400 uppercase">
                Autonomous Agent
              </span>
              <span className="font-mono text-xs text-zinc-500">
                • Local Chromium
              </span>
            </div>

            {/* Main Title and Description */}
            <div className="mb-8">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white">
                Test your application
              </h1>
              <p className="mt-2 text-xs sm:text-sm leading-relaxed text-zinc-400 max-w-2xl">
                Describe an autonomous user journey in plain English. The agent inspects
                the DOM, reasons through interactions, and executes deterministic
                verifications.
              </p>
            </div>

            {/* Primary Test Launch Form */}
            <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-[#121518] border border-[#22272b]" />}>
              <TestLaunchForm />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}
