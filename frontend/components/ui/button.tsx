import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "primary" | "secondary" | "outline" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const variantStyles = {
      default:
        "bg-zinc-800 text-zinc-100 hover:bg-zinc-700/80 border border-zinc-700/60 shadow-sm",
      primary:
        "bg-emerald-400 text-zinc-950 hover:bg-emerald-300 font-semibold shadow-sm hover:shadow-emerald-950/25 active:scale-[0.99]",
      secondary:
        "bg-[#181b1e] text-zinc-300 hover:bg-[#22272c] hover:text-zinc-100 border border-zinc-800/80",
      outline:
        "border border-zinc-800 bg-transparent text-zinc-300 hover:bg-zinc-800/50 hover:text-white",
      ghost:
        "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60",
      link:
        "text-emerald-400 underline-offset-4 hover:underline p-0 h-auto font-normal",
    };

    const sizeStyles = {
      default: "h-9 px-4 py-2 text-xs",
      sm: "h-7 px-2.5 py-1 text-[11px] rounded",
      lg: "h-10 px-5 py-2.5 text-sm rounded-lg",
      icon: "h-8 w-8 p-0 flex items-center justify-center rounded-md",
    };

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
