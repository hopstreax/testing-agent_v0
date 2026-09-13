"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, ShieldCheck } from "lucide-react";

/**
 * Google brand multi-color 'G' icon for authentic visual identification.
 */
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      className={className}
      aria-hidden="true"
    >
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

export default function LoginPage() {
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleGoogleLogin = () => {
    setIsRedirecting(true);
    // Direct browser navigation to backend Google OAuth initiation endpoint
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/api/auth/google/login";
  };

  return (
    <div className="min-h-screen bg-[#08090b] text-[#f4f4f6] flex flex-col justify-between selection:bg-[#00e599]/30 selection:text-white">
      {/* Top Navigation */}
      <header className="w-full border-b border-[#1f2428]/60 bg-[#08090b]/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
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

          <Link
            href="/"
            id="login-back-to-home"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00e599] rounded px-2 py-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Back to home</span>
          </Link>
        </div>
      </header>

      {/* Main Authentication Card */}
      <main className="flex-1 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8 relative">
        {/* Subtle grid background */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "radial-gradient(#00e599 1px, transparent 1px), radial-gradient(#00e599 1px, #08090b 1px)",
            backgroundSize: "28px 28px",
            backgroundPosition: "0 0, 14px 14px",
          }}
          aria-hidden="true"
        />

        <div className="relative z-10 w-full max-w-md mx-auto">
          <div className="rounded-2xl border border-[#1f2428] bg-[#0c0e11] p-6 sm:p-8 shadow-2xl shadow-black/80 transition-all">
            {/* Centered Brand Mark */}
            <div className="flex justify-center mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#1f2428] bg-[#121518]">
                <span className="font-mono text-sm font-bold text-[#00e599]">
                  &gt;_
                </span>
                <span className="text-xs font-semibold tracking-wider uppercase text-zinc-300">
                  TraceKit Auth
                </span>
              </div>
            </div>

            {/* Header & Copy */}
            <div className="text-center mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Welcome to TraceKit
              </h1>
              <p className="mt-2.5 text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-sm mx-auto">
                Sign in to run tests, inspect results, and keep your test history.
              </p>
            </div>

            {/* Google OAuth Action */}
            <div className="space-y-4">
              <button
                type="button"
                id="btn-google-login"
                onClick={handleGoogleLogin}
                disabled={isRedirecting}
                aria-busy={isRedirecting}
                className="w-full inline-flex items-center justify-center gap-3 rounded-lg border border-[#2a3036] bg-[#14171b] hover:bg-[#1a1f24] hover:border-zinc-600 px-4 py-3 text-sm font-medium text-white transition-all active:scale-[0.99] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00e599] shadow-sm"
              >
                {isRedirecting ? (
                  <>
                    <Loader2
                      className="h-4 w-4 animate-spin text-[#00e599]"
                      aria-hidden="true"
                    />
                    <span>Redirecting to Google...</span>
                  </>
                ) : (
                  <>
                    <GoogleIcon />
                    <span>Continue with Google</span>
                  </>
                )}
              </button>
            </div>

            {/* Privacy & Security Note */}
            <div className="mt-6 pt-6 border-t border-[#1f2428]/80 flex items-start gap-2.5 text-left">
              <ShieldCheck
                className="h-4 w-4 text-[#00e599] shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <p className="text-[11px] leading-relaxed text-zinc-500">
                TraceKit requests standard Google profile access to establish
                your secure session. We never store or access your Google password.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-4 px-4 text-center border-t border-[#1f2428]/40">
        <p className="text-[11px] text-zinc-600">
          Autonomous Website Testing • TraceKit Secure Session Engine
        </p>
      </footer>
    </div>
  );
}
