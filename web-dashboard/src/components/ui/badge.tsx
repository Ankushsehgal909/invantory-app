import * as React from "react";
import { cn } from "../../utils/cn";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?:
    | "default"
    | "secondary"
    | "destructive"
    | "outline"
    | "success"
    | "warning"
    | "info"
    | "purple";
}

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  const variantStyles = {
    default: "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20",
    secondary: "bg-secondary text-secondary-foreground border-border/40 hover:bg-secondary/80",
    destructive: "bg-rose-50 text-rose-700 border-rose-200/80 hover:bg-rose-100",
    outline: "border-border text-foreground bg-transparent",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200/80 hover:bg-emerald-100",
    warning: "bg-amber-50 text-amber-700 border-amber-200/80 hover:bg-amber-100",
    info: "bg-sky-50 text-sky-700 border-sky-200/80 hover:bg-sky-100",
    purple: "bg-purple-50 text-purple-700 border-purple-200/80 hover:bg-purple-100",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}
