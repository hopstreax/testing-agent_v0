"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  PlayCircle,
  Clock,
  SlidersHorizontal,
  BookOpen,
  GitBranch,
  X,
  LogOut,
  Loader2,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading: isAuthLoading, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const isNewTest = pathname === "/test" || pathname === "/new";
  const isRuns = pathname === "/runs" || pathname.startsWith("/runs/");
  const isSettings = pathname === "/settings";
  const isDocumentation = pathname === "/documentation";

  const newTestHref = isAuthLoading ? "#" : isAuthenticated ? "/test" : "/login";
  const runsHref = isAuthLoading ? "#" : isAuthenticated ? "/runs" : "/login";
  const settingsHref = isAuthLoading ? "#" : isAuthenticated ? "/settings" : "/login";

  const handleNavClick = () => {
    if (onClose) {
      onClose();
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      if (onClose) {
        onClose();
      }
    } catch {
      setIsLoggingOut(false);
    }
  };

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
            <Link
              href="/"
              onClick={handleNavClick}
              className="flex items-center gap-2.5 group"
            >
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

          {/* Active Workspace Static Badge */}
          <div className="flex items-center justify-between rounded-lg border border-[#22272b] bg-[#121518] px-3 py-2 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <GitBranch className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span className="truncate font-mono text-[11px] text-zinc-300">
                production-web <span className="text-zinc-600">/</span> main
              </span>
            </div>
            <span className="font-mono text-[9px] text-zinc-500 uppercase tracking-wider bg-zinc-900 border border-zinc-800 px-1 py-0.5 rounded">
              default
            </span>
          </div>

          {/* Navigation Items */}
          <div className="flex flex-col gap-5 mt-1">
            {/* Test Suite Section */}
            <div>
              <div className="px-2 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                Test Suite
              </div>
              <nav className="flex flex-col gap-1">
                {/* New Test */}
                <Link
                  href={newTestHref}
                  onClick={(e) => {
                    if (isAuthLoading) {
                      e.preventDefault();
                      return;
                    }
                    handleNavClick();
                  }}
                  aria-busy={isAuthLoading}
                  className={cn(
                    "flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                    isNewTest
                      ? "bg-[#161a1e] border border-zinc-800/80 text-white"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 border border-transparent"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <PlayCircle
                      className={cn(
                        "h-4 w-4",
                        isNewTest
                          ? "text-emerald-400 fill-emerald-950/40"
                          : "text-zinc-500"
                      )}
                    />
                    <span>New Test</span>
                  </div>
                  <kbd className="font-mono text-[10px] text-zinc-500 bg-zinc-800/60 px-1 py-0.5 rounded">
                    ⌘N
                  </kbd>
                </Link>

                {/* Runs */}
                <Link
                  href={runsHref}
                  onClick={(e) => {
                    if (isAuthLoading) {
                      e.preventDefault();
                      return;
                    }
                    handleNavClick();
                  }}
                  aria-busy={isAuthLoading}
                  className={cn(
                    "flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors w-full",
                    isRuns
                      ? "bg-[#161a1e] border border-zinc-800/80 text-white"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 border border-transparent"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Clock
                      className={cn(
                        "h-4 w-4",
                        isRuns ? "text-emerald-400" : "text-zinc-500"
                      )}
                    />
                    <span>Runs</span>
                  </div>
                </Link>
              </nav>
            </div>

            {/* Settings Section */}
            <div>
              <div className="px-2 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                Settings
              </div>
              <nav className="flex flex-col gap-1">
                <Link
                  href={settingsHref}
                  onClick={(e) => {
                    if (isAuthLoading) {
                      e.preventDefault();
                      return;
                    }
                    handleNavClick();
                  }}
                  aria-busy={isAuthLoading}
                  className={cn(
                    "flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors w-full",
                    isSettings
                      ? "bg-[#161a1e] border border-zinc-800/80 text-white"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 border border-transparent"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <SlidersHorizontal
                      className={cn(
                        "h-4 w-4",
                        isSettings ? "text-emerald-400" : "text-zinc-500"
                      )}
                    />
                    <span>Settings</span>
                  </div>
                </Link>
              </nav>
            </div>

            {/* Developer Section */}
            <div>
              <div className="px-2 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                Developer
              </div>
              <nav className="flex flex-col gap-1">
                <Link
                  href="/documentation"
                  onClick={handleNavClick}
                  className={cn(
                    "flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors w-full",
                    isDocumentation
                      ? "bg-[#161a1e] border border-zinc-800/80 text-white"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 border border-transparent"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <BookOpen
                      className={cn(
                        "h-4 w-4",
                        isDocumentation ? "text-emerald-400" : "text-zinc-500"
                      )}
                    />
                    <span>Documentation</span>
                  </div>
                </Link>
              </nav>
            </div>
          </div>
        </div>

        {/* Bottom Section: Engine Capability & Authenticated User Profile */}
        <div className="flex flex-col gap-3 pt-3 border-t border-[#1f2428]">
          {/* Autonomous Engine Status Indicator */}
          <div className="flex items-center justify-between rounded-md bg-[#101316] border border-[#1e2327] px-2.5 py-2">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-[11px] font-medium text-zinc-300">Autonomous Engine</span>
            </div>
            <span className="font-mono text-[10px] font-semibold tracking-wider text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-1.5 py-0.5 rounded">
              READY
            </span>
          </div>

          {/* Authenticated User Profile Area */}
          {isAuthLoading ? (
            <div className="flex items-center gap-2.5 px-1.5 py-1 animate-pulse">
              <div className="h-7 w-7 rounded-full bg-zinc-800 shrink-0" />
              <div className="flex flex-col gap-1 min-w-0 flex-1">
                <div className="h-3 w-20 bg-zinc-800 rounded" />
                <div className="h-2 w-28 bg-zinc-800/60 rounded" />
              </div>
            </div>
          ) : user ? (
            <div className="flex items-center justify-between px-1.5 py-1">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                {user.picture ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={user.picture}
                    alt={user.name || "User avatar"}
                    referrerPolicy="no-referrer"
                    className="h-7 w-7 rounded-full border border-emerald-500/40 object-cover shrink-0"
                  />
                ) : (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-950/80 border border-emerald-700/50 text-[10px] font-bold text-emerald-400">
                    {(user.name || user.email || "U")[0].toUpperCase()}
                  </div>
                )}
                <div className="flex flex-col min-w-0">
                  <span className="truncate text-xs font-medium text-zinc-200">
                    {user.name || "TraceKit User"}
                  </span>
                  <span className="truncate text-[10px] text-zinc-500 font-mono">
                    {user.email || ""}
                  </span>
                </div>
              </div>

              {/* Logout Action Button */}
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                aria-label="Log out"
                title="Log out"
                className="rounded p-1 text-zinc-500 hover:text-red-400 transition-colors cursor-pointer shrink-0 ml-1"
              >
                {isLoggingOut ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <LogOut className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between px-1.5 py-1 text-xs">
              <div className="flex items-center gap-2 text-zinc-400">
                <User className="h-3.5 w-3.5 text-zinc-500" />
                <span>Guest</span>
              </div>
              <Link
                href="/login"
                onClick={handleNavClick}
                className="font-medium text-emerald-400 hover:text-emerald-300 transition-colors text-[11px]"
              >
                Sign in
              </Link>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
