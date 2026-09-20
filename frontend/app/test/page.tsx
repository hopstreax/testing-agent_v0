"use client";

import React, { useState, Suspense } from "react";
import { Sidebar } from "@/components/shell/sidebar";
import { TopBar } from "@/components/shell/top-bar";
import { WorkspaceFooter } from "@/components/shell/workspace-footer";
import { TestLaunchForm } from "@/components/test/test-launch-form";
import { ProtectedRoute } from "@/components/auth/protected-route";

export default function NewTestPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-[#08090b] text-[#f4f4f6]">
        {/* Left Navigation Sidebar */}
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <div className="flex flex-1 flex-col min-w-0">
          {/* Top Bar */}
          <TopBar onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)} />

          {/* New Test Studio Workspace */}
          <main className="relative flex-1 overflow-y-auto px-4 py-8 sm:px-6 lg:px-8 xl:px-10">
            {/* Subtle background dot-grid texture matching TraceKit visual identity */}
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.025]"
              style={{
                backgroundImage:
                  "radial-gradient(#00e599 1px, transparent 1px), radial-gradient(#00e599 1px, #08090b 1px)",
                backgroundSize: "28px 28px",
                backgroundPosition: "0 0, 14px 14px",
              }}
              aria-hidden="true"
            />

            <div className="relative mx-auto max-w-7xl">
              {/* Primary Test Launch Studio */}
              <Suspense
                fallback={
                  <div className="h-96 animate-pulse rounded-xl bg-[#0d1013] border border-[#1b2026]" />
                }
              >
                <TestLaunchForm />
              </Suspense>
            </div>
          </main>

          {/* Compact Workspace Footer */}
          <WorkspaceFooter />
        </div>
      </div>
    </ProtectedRoute>
  );
}
