"use client";

import React, { useState } from "react";
import { Sidebar } from "@/components/shell/sidebar";
import { TopBar } from "@/components/shell/top-bar";
import { WorkspaceFooter } from "@/components/shell/workspace-footer";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useAuth } from "@/context/auth-context";
import {
  Moon,
  LogOut,
  User,
  Loader2,
  ExternalLink,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";

export default function SettingsPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user, isLoading: isAuthLoading, logout } = useAuth();

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setLogoutError(null);
    try {
      await logout();
    } catch {
      setLogoutError("Failed to log out. Please try again.");
      setIsLoggingOut(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-[#090a0c] text-[#f4f4f6]">
        {/* Left Navigation Sidebar */}
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <div className="flex flex-1 flex-col min-w-0">
          <TopBar onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)} />

          <main className="flex-1 overflow-y-auto px-4 py-8 sm:px-8 lg:px-12">
            <div className="mx-auto max-w-3xl">
              {/* Header Pill */}
              <div className="mb-4 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded bg-emerald-950/70 border border-emerald-800/50 px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wider text-emerald-400 uppercase">
                  <SlidersHorizontal className="h-3 w-3" />
                  Preferences
                </span>
                <span className="font-mono text-xs text-zinc-500">
                  • Workspace Configuration
                </span>
              </div>

              {/* Page Title */}
              <div className="mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                  Settings
                </h1>
                <p className="mt-2 text-xs sm:text-sm leading-relaxed text-zinc-400 max-w-xl">
                  Manage your workspace settings, view authenticated profile details, and review system configuration.
                </p>
              </div>

              <div className="flex flex-col gap-8">
                {/* ------------------------------------------------------------- */}
                {/* A. APPEARANCE SECTION (DARK ONLY)                             */}
                {/* ------------------------------------------------------------- */}
                <section className="rounded-xl border border-[#1f2428] bg-[#0d1013] p-5 sm:p-6">
                  <div className="mb-4 border-b border-[#1b1f23] pb-3">
                    <h2 className="text-sm font-semibold text-white tracking-tight">
                      Appearance
                    </h2>
                    <p className="mt-1 text-xs text-zinc-400">
                      TraceKit is designed exclusively for high-contrast dark environments.
                    </p>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg border border-emerald-500/40 bg-[#161a1e] max-w-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md border border-emerald-500/50 bg-emerald-950/60 text-emerald-400">
                        <Moon className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-white">
                          Dark Mode
                        </span>
                        <p className="text-[11px] text-zinc-400">
                          Standard near-black developer interface
                        </p>
                      </div>
                    </div>
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-2 py-0.5 rounded">
                      Active
                    </span>
                  </div>
                </section>

                {/* ------------------------------------------------------------- */}
                {/* B. ACCOUNT SECTION                                            */}
                {/* ------------------------------------------------------------- */}
                <section className="rounded-xl border border-[#1f2428] bg-[#0d1013] p-5 sm:p-6">
                  <div className="mb-4 border-b border-[#1b1f23] pb-3">
                    <h2 className="text-sm font-semibold text-white tracking-tight">
                      Account
                    </h2>
                    <p className="mt-1 text-xs text-zinc-400">
                      Active session identity authenticated via Google OAuth.
                    </p>
                  </div>

                  {isAuthLoading ? (
                    <div className="flex items-center gap-3 py-3 animate-pulse">
                      <div className="h-10 w-10 rounded-full bg-zinc-800" />
                      <div className="space-y-2">
                        <div className="h-3 w-32 rounded bg-zinc-800" />
                        <div className="h-2.5 w-48 rounded bg-zinc-800/60" />
                      </div>
                    </div>
                  ) : user ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2">
                      <div className="flex items-center gap-3 min-w-0">
                        {user.picture ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={user.picture}
                            alt={user.name || "User avatar"}
                            referrerPolicy="no-referrer"
                            className="h-10 w-10 rounded-full border border-emerald-500/40 object-cover shrink-0"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-950/80 border border-emerald-700/60 text-emerald-400 font-semibold text-sm shrink-0">
                            {(user.name || user.email || "U")[0].toUpperCase()}
                          </div>
                        )}

                        <div className="flex flex-col min-w-0">
                          <span className="text-xs sm:text-sm font-semibold text-white truncate">
                            {user.name || "TraceKit User"}
                          </span>
                          <span className="text-xs text-zinc-400 truncate">
                            {user.email || "No email available"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={handleLogout}
                          disabled={isLoggingOut}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-900/50 bg-red-950/20 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-950/40 hover:text-red-300 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {isLoggingOut ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <LogOut className="h-3.5 w-3.5" />
                          )}
                          <span>{isLoggingOut ? "Logging out..." : "Log out"}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between py-2 text-xs text-zinc-400">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-zinc-500" />
                        <span>Not currently signed in with a Google account.</span>
                      </div>
                      <a
                        href="/login"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-800/60 bg-emerald-950/30 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-950/50 transition-colors"
                      >
                        Sign in
                      </a>
                    </div>
                  )}

                  {logoutError && (
                    <p className="mt-2 text-xs text-red-400">
                      {logoutError}
                    </p>
                  )}
                </section>

                {/* ------------------------------------------------------------- */}
                {/* C. ABOUT SECTION                                              */}
                {/* ------------------------------------------------------------- */}
                <section className="rounded-xl border border-[#1f2428] bg-[#0d1013] p-5 sm:p-6">
                  <div className="mb-4 border-b border-[#1b1f23] pb-3">
                    <h2 className="text-sm font-semibold text-white tracking-tight">
                      About TraceKit
                    </h2>
                    <p className="mt-1 text-xs text-zinc-400">
                      AI web testing that acts, verifies, and explains.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 text-xs text-zinc-400 leading-relaxed">
                    <div className="flex items-center justify-between py-1 border-b border-[#1a1e22]">
                      <span className="text-zinc-500 font-mono text-[11px]">Product</span>
                      <span className="font-semibold text-white flex items-center gap-1.5">
                        <span className="font-mono text-emerald-400">⌘</span> TraceKit Studio
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-[#1a1e22]">
                      <span className="text-zinc-500 font-mono text-[11px]">Execution Engine</span>
                      <span className="text-zinc-300 font-mono text-[11px] flex items-center gap-1">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                        Patchright Chromium
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-[#1a1e22]">
                      <span className="text-zinc-500 font-mono text-[11px]">Reasoning Framework</span>
                      <span className="text-zinc-300 font-mono text-[11px]">
                        Autonomous Observe-Reason-Act
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1 pt-2">
                      <span className="text-zinc-500 font-mono text-[11px]">Source Repository</span>
                      <a
                        href="https://github.com/hopstreax/testing-agent_v0"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
                      >
                        <span>hopstreax/testing-agent_v0</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </main>

          {/* Compact Workspace Footer */}
          <WorkspaceFooter />
        </div>
      </div>
    </ProtectedRoute>
  );
}
