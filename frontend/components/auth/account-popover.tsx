"use client";

import React, { useState, useRef, useEffect } from "react";
import { User, LogOut, Loader2 } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";

interface AccountPopoverProps {
  className?: string;
}

export function AccountPopover({ className }: AccountPopoverProps) {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Close popover on Escape key press and restore focus
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleToggle = () => {
    setLogoutError(null);
    setIsOpen((prev) => !prev);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setLogoutError(null);
    try {
      await logout();
      setIsOpen(false);
    } catch {
      setLogoutError("Failed to log out. Please try again.");
      setIsLoggingOut(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div ref={containerRef} className={cn("relative inline-block", className)}>
      {/* Account Icon Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        id="account-menu-trigger"
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Account menu"
        className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-950/80 border border-emerald-700/60 text-emerald-400 hover:border-emerald-500 hover:text-emerald-300 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#090a0c] overflow-hidden"
      >
        {user.picture ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={user.picture}
            alt={user.name || "User avatar"}
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
          />
        ) : (
          <User className="h-3.5 w-3.5" aria-hidden="true" />
        )}
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Account details"
          className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-[#1f2428] bg-[#0c0e11] p-3 shadow-2xl shadow-black/90 z-50 animate-in fade-in-0 zoom-in-95 duration-150 motion-reduce:animate-none"
        >
          {/* Header Label */}
          <div className="px-1.5 pb-2">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              TraceKit account
            </span>
          </div>

          {/* User Profile Card */}
          <div className="flex items-center gap-2.5 px-1.5 py-1">
            {user.picture ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={user.picture}
                alt={user.name || "User avatar"}
                referrerPolicy="no-referrer"
                className="h-8 w-8 rounded-full border border-emerald-500/40 object-cover shrink-0"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-950/80 border border-emerald-700/60 text-emerald-400 font-semibold text-xs shrink-0">
                {(user.name || user.email || "U")[0].toUpperCase()}
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span
                id="account-user-name"
                className="text-xs font-semibold text-white truncate"
                title={user.name || undefined}
              >
                {user.name || "TraceKit User"}
              </span>
              <span
                id="account-user-email"
                className="text-[11px] text-zinc-400 truncate"
                title={user.email || undefined}
              >
                {user.email || ""}
              </span>
            </div>
          </div>

          {/* Divider */}
          <div className="my-2 border-t border-[#1f2428]" />

          {/* Logout Action */}
          <div>
            <button
              type="button"
              id="btn-logout"
              onClick={handleLogout}
              disabled={isLoggingOut}
              aria-busy={isLoggingOut}
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium text-red-400 hover:bg-red-950/30 hover:text-red-300 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-400"
            >
              <span>{isLoggingOut ? "Logging out..." : "Log out"}</span>
              {isLoggingOut ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </button>

            {logoutError && (
              <p className="mt-1.5 px-2 text-[10px] text-red-400 leading-tight">
                {logoutError}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
