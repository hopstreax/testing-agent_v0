"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * M8 Auth-Aware Navigation Architecture Specification:
 *
 * Current Milestone (Pre-M8 / Public Preview):
 * - Authentication is not yet implemented (no fake user or simulated session storage).
 * - Navigation entry points route directly to public / intended paths:
 *     - "Login / Sign Up" -> "/login"
 *     - "Dashboard"       -> "/runs"
 *     - "Run New Test"    -> "/test"
 *     - "Get Started"     -> "/getting-started"
 *
 * Future Milestone (M8 - Real Authentication State):
 * - IF NOT LOGGED IN:
 *     - "Login / Sign Up" -> "/login"
 *     - "Run New Test"    -> "/login"
 *     - "Dashboard"       -> "/login"
 *     - "Get Started"     -> "/getting-started"
 * - IF LOGGED IN:
 *     - "Login / Sign Up" -> Replaced by user/account control menu (e.g. profile avatar, settings, sign out)
 *     - "Run New Test"    -> "/test" (existing New Test studio route)
 *     - "Dashboard"       -> "/runs"
 *     - "Get Started"     -> "/getting-started"
 */

import { useAuth } from "@/context/auth-context";
import { AccountPopover } from "@/components/auth/account-popover";

export function LandingNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  const runTestHref = isLoading ? "#" : isAuthenticated ? "/test" : "/login";
  const dashboardHref = isLoading ? "#" : isAuthenticated ? "/runs" : "/login";

  const handleAuthNavClick = (e: React.MouseEvent) => {
    if (isLoading) {
      e.preventDefault();
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300 backdrop-blur-md",
        scrolled
          ? "border-b border-[#1f2428] bg-[#08090b]/90 shadow-md shadow-black/40"
          : "border-b border-transparent bg-[#08090b]/60"
      )}
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Brand + Nav Links */}
        <div className="flex items-center gap-6 lg:gap-8">
          <Link
            href="/"
            className="flex items-center gap-2 group cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00e599] rounded"
          >
            <span className="font-mono text-base font-bold text-[#00e599] transition-transform group-hover:scale-105">
              &gt;_
            </span>
            <span className="text-base font-semibold tracking-tight text-white group-hover:text-zinc-200 transition-colors">
              TraceKit
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-5 lg:gap-6 text-xs font-medium text-zinc-400">
            <a
              href="#how-it-works"
              id="nav-how-it-works"
              className="hover:text-white transition-colors"
            >
              How it works
            </a>
            <Link
              href="/getting-started"
              id="nav-documentation"
              className="hover:text-white transition-colors"
            >
              Documentation
            </Link>
            <Link
              href={dashboardHref}
              onClick={handleAuthNavClick}
              aria-busy={isLoading}
              id="nav-dashboard"
              className="hover:text-white transition-colors"
            >
              Dashboard
            </Link>
          </nav>
        </div>

        {/* Right: Desktop Actions (Login / Sign Up + Run New Test) */}
        <div className="hidden sm:flex items-center gap-3.5">
          {isLoading ? (
            <div className="h-6 w-20 bg-zinc-900/60 rounded animate-pulse" />
          ) : isAuthenticated && user ? (
            <AccountPopover />
          ) : (
            <Link
              href="/login"
              id="nav-login"
              className="text-xs font-medium text-zinc-300 hover:text-white px-2.5 py-1.5 rounded transition-colors focus-visible:outline-none focus-visible:text-[#00e599]"
            >
              Login / Sign Up
            </Link>
          )}
          <Link
            href={runTestHref}
            onClick={handleAuthNavClick}
            aria-busy={isLoading}
            id="nav-run-new-test"
            className="group inline-flex items-center gap-1.5 rounded-md bg-[#00e599] hover:bg-[#00f5a0] px-3.5 py-1.5 text-xs font-semibold text-[#08090b] transition-all shadow-xs hover:shadow-[#00e599]/20 active:scale-[0.98] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00e599]"
          >
            <span>Run New Test</span>
            <ArrowRight className="h-3.5 w-3.5 stroke-[2.5] transition-transform duration-150 group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* Mobile top-bar buttons */}
        <div className="flex sm:hidden items-center gap-2">
          {isLoading ? null : isAuthenticated && user ? (
            <AccountPopover />
          ) : (
            <Link
              href="/login"
              id="nav-mobile-top-login"
              className="text-xs font-medium text-zinc-300 hover:text-white px-2 py-1 transition-colors"
            >
              Login
            </Link>
          )}
          <Link
            href={runTestHref}
            onClick={handleAuthNavClick}
            aria-busy={isLoading}
            id="nav-mobile-top-run-test"
            className="inline-flex items-center rounded-md bg-[#00e599] px-2.5 py-1 text-xs font-semibold text-[#08090b]"
          >
            Run Test
          </Link>

          <button
            type="button"
            id="nav-mobile-menu-toggle"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="rounded p-1.5 text-zinc-400 hover:text-white cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00e599]"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="border-b border-[#1f2428] bg-[#0d1013] px-4 py-3 sm:hidden animate-in fade-in-50 duration-150">
          <nav className="flex flex-col gap-2 text-xs font-medium text-zinc-300">
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-[#00e599]"
            >
              How it works
            </a>
            <Link
              href="/getting-started"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-[#00e599]"
            >
              Documentation
            </Link>
            <Link
              href={dashboardHref}
              id="nav-mobile-menu-dashboard"
              onClick={(e) => {
                if (isLoading) {
                  e.preventDefault();
                  return;
                }
                setMobileMenuOpen(false);
              }}
              aria-busy={isLoading}
              className="py-1 hover:text-[#00e599]"
            >
              Dashboard
            </Link>
            <div className="my-1 border-t border-[#1f2428]" />
            {isAuthenticated && user ? (
              <div className="flex flex-col gap-2 py-1">
                <div className="flex items-center gap-2 px-1">
                  {user.picture ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={user.picture}
                      alt={user.name || "User"}
                      referrerPolicy="no-referrer"
                      className="h-6 w-6 rounded-full border border-emerald-500/40 object-cover shrink-0"
                    />
                  ) : (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-950/80 border border-emerald-700/60 text-emerald-400 font-semibold text-[10px] shrink-0">
                      {(user.name || user.email || "U")[0].toUpperCase()}
                    </div>
                  )}
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-medium text-white truncate">
                      {user.name || "TraceKit User"}
                    </span>
                    <span className="text-[10px] text-zinc-400 truncate">
                      {user.email || ""}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  id="nav-mobile-menu-logout"
                  onClick={async () => {
                    setMobileMenuOpen(false);
                    await logout();
                  }}
                  className="text-left text-xs font-medium text-red-400 hover:text-red-300 py-1 px-1 cursor-pointer"
                >
                  Log out
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                id="nav-mobile-menu-login"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 text-zinc-200 hover:text-[#00e599] font-medium"
              >
                Login / Sign Up
              </Link>
            )}
            <Link
              href={runTestHref}
              id="nav-mobile-menu-run-new-test"
              onClick={(e) => {
                if (isLoading) {
                  e.preventDefault();
                  return;
                }
                setMobileMenuOpen(false);
              }}
              aria-busy={isLoading}
              className="mt-1 inline-flex items-center justify-center gap-1.5 rounded-md bg-[#00e599] py-2 text-xs font-semibold text-[#08090b]"
            >
              <span>Run New Test</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
