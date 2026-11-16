import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type StatusVariant = "passed" | "failed" | "active" | "pending";

const variantClasses: Record<StatusVariant, string> = {
  passed: "bg-success-soft text-success",
  failed: "bg-danger-soft text-danger",
  active: "bg-active-soft text-active-status",
  pending: "bg-surface-hover text-muted",
};

type Props = HTMLAttributes<HTMLSpanElement> & {
  variant: StatusVariant;
};

export function StatusBadge({ className, variant, ...props }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
