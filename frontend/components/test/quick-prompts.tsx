"use client";

import React from "react";

export interface QuickPrompt {
  id: string;
  label: string;
  prompt: string;
}

export const QUICK_PROMPTS: QuickPrompt[] = [
  {
    id: "auth-redirect",
    label: "Auth & session redirect",
    prompt:
      "Navigate to /dashboard without authentication, verify redirect to /login, fill in user credentials, submit the form, and verify successful redirect to the dashboard.",
  },
  {
    id: "cart-checkout",
    label: "Cart checkout flow",
    prompt:
      'Search for "Technical Shell Jacket", apply the sizing filter "XL", add product to cart, proceed to checkout page, and ensure the price calculation includes zero shipping fees.',
  },
  {
    id: "global-links",
    label: "Global links & 404s",
    prompt:
      "Inspect header navigation links, verify primary landing pages load with HTTP 200, and ensure no broken links or critical console errors are reported.",
  },
];

interface QuickPromptsProps {
  onSelectPrompt: (promptText: string) => void;
}

export function QuickPrompts({ onSelectPrompt }: QuickPromptsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
      <span className="font-mono text-[11px] font-semibold text-zinc-500 tracking-wide uppercase select-none">
        QUICK:
      </span>
      {QUICK_PROMPTS.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelectPrompt(item.prompt)}
          className="rounded-md border border-[#22272b] bg-[#161a1e] px-2.5 py-1 text-xs text-zinc-300 transition-colors hover:border-zinc-700 hover:bg-[#1f2429] hover:text-white cursor-pointer active:scale-[0.98]"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
