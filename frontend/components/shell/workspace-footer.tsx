import React from "react";
import Link from "next/link";

export function WorkspaceFooter() {
  return (
    <footer className="w-full border-t border-[#1f2428] bg-[#08090b]/80 py-6 text-xs text-zinc-500 mt-auto">
      <div className="mx-auto max-w-5xl px-4 sm:px-8 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {/* Left: Brand + Tagline */}
          <div className="flex flex-wrap items-center gap-2 text-zinc-400">
            <Link
              href="/"
              className="flex items-center gap-1.5 font-semibold text-white hover:text-[#00e599] transition-colors"
            >
              <span className="font-mono text-[#00e599] font-bold text-xs">⌘</span>
              <span>TraceKit</span>
            </Link>
            <span className="hidden sm:inline text-zinc-700">•</span>
            <span className="text-[11px] text-zinc-500">
              AI web testing that acts, verifies, and explains.
            </span>
          </div>

          {/* Right: GitHub Link */}
          <div>
            <a
              href="https://github.com/hopstreax/testing-agent_v0"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-zinc-400 hover:text-white transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>

        {/* Bottom Centered: Copyright */}
        <div className="text-center text-[10px] text-zinc-600 border-t border-[#1a1e22] pt-3">
          © 2026 TraceKit
        </div>
      </div>
    </footer>
  );
}
