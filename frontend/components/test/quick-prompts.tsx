"use client";

import React from "react";
import { Terminal, ArrowUpRight } from "lucide-react";

export interface QuickPrompt {
  id: string;
  label: string;
  category: string;
  prompt: string;
}

export const QUICK_PROMPTS: QuickPrompt[] = [
  {
    id: "auth-redirect",
    label: "Auth & session redirect",
    category: "Auth Flow",
    prompt:
      "Navigate to /dashboard without authentication, verify redirect to /login, fill in user credentials, submit the form, and verify successful redirect to the dashboard.",
  },
  {
    id: "cart-checkout",
    label: "Cart checkout flow",
    category: "E-Commerce",
    prompt:
      'Search for "Technical Shell Jacket", apply the sizing filter "XL", add product to cart, proceed to checkout page, and ensure the price calculation includes zero shipping fees.',
  },
  {
    id: "global-links",
    label: "Global links & 404s",
    category: "Site Audit",
    prompt:
      "Inspect header navigation links, verify primary landing pages load with HTTP 200, and ensure no broken links or critical console errors are reported.",
  },
];

interface QuickPromptsProps {
  onSelectPrompt: (promptText: string) => void;
  disabled?: boolean;
}

export function QuickPrompts({ onSelectPrompt, disabled = false }: QuickPromptsProps) {
  return (
    <div className="flex flex-col gap-2 pt-1">
      <div className="flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1.5 font-mono font-semibold tracking-wider text-zinc-400 uppercase select-none">
          <Terminal className="h-3 w-3 text-[#00e599]" />
          <span>Starter Templates</span>
        </div>
        <span className="font-mono text-[10px] text-zinc-500">
          Load verified journey blueprint
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {QUICK_PROMPTS.map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelectPrompt(item.prompt)}
            className="group flex flex-col items-start gap-1 rounded-lg border border-[#1b2026] bg-[#0d1013] p-2.5 text-left transition-all hover:border-[#00e599]/40 hover:bg-[#121518] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00e599] disabled:opacity-50 cursor-pointer"
          >
            <div className="flex w-full items-center justify-between">
              <span className="font-mono text-[9px] font-semibold text-[#00e599] uppercase tracking-wider bg-[#00e599]/10 px-1.5 py-0.5 rounded border border-[#00e599]/20">
                {item.category}
              </span>
              <span className="flex items-center gap-0.5 font-mono text-[10px] text-zinc-600 group-hover:text-zinc-300 transition-colors">
                <span>Load</span>
                <ArrowUpRight className="h-2.5 w-2.5" />
              </span>
            </div>
            <span className="text-xs font-medium text-zinc-200 group-hover:text-white transition-colors line-clamp-1">
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
