import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "outline" | "mint" | "muted";
}

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  const variantStyles = {
    default: "bg-zinc-800 text-zinc-200 border-zinc-700/60",
    secondary: "bg-zinc-900 text-zinc-300 border-zinc-800",
    outline: "border-zinc-700/80 text-zinc-400 bg-transparent",
    mint: "bg-emerald-950/70 text-emerald-400 border-emerald-800/50",
    muted: "bg-zinc-800/50 text-zinc-500 border-zinc-800/60",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium border transition-colors",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}
