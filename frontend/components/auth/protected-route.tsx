"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Reusable client-side route guard component.
 *
 * Requirements:
 * - Waits while auth is loading;
 * - Never redirects while auth is still loading (initial state);
 * - Redirects to /login once loading completes and user is unauthenticated;
 * - Prevents protected page content from flashing before redirect completes;
 * - Uses existing dark developer tool visual styling.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#090a0c]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 rounded-full border-2 border-emerald-500/20 border-t-emerald-400 animate-spin" />
          <span className="font-mono text-xs text-zinc-500">Verifying session...</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
