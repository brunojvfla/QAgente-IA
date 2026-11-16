import { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  size?: "default" | "small";
};

export function Button({
  className,
  variant = "primary",
  size = "default",
  ...props
}: Props) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-brand text-white hover:bg-brand-hover",
        variant === "secondary" && "border border-default bg-surface text-ink hover:bg-surface-hover",
        variant === "ghost" && "text-muted hover:bg-surface-hover hover:text-ink",
        size === "default" ? "px-4 py-2.5 text-sm" : "px-3 py-2 text-xs",
        className,
      )}
      {...props}
    />
  );
}
