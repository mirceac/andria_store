import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

export function buttonVariants({ variant, className }: { variant?: string, className?: string } = {}) {
  const hasCustomClass = className?.includes('btn-');
  
  return cn(
    "inline-flex items-center justify-center rounded-lg text-base font-semibold transition-colors focus:outline-none focus:ring-4 focus:ring-offset-2 px-4 py-2",
    !hasCustomClass && variant === "outline"
      ? "border border-slate-300 text-slate-600 hover:bg-blue-50 hover:text-slate-700"
      : !hasCustomClass && variant === "ghost"
      ? "bg-blue-50 text-slate-600 hover:bg-blue-100 hover:text-slate-700"
      : !hasCustomClass && "bg-blue-50 text-slate-600 hover:bg-blue-100 hover:text-slate-700",
    "disabled:opacity-50 disabled:pointer-events-none",
    className
  );
}

export const colors = {
  primary: {
    DEFAULT: "#eff6ff", // Light blue (blue-50)
    foreground: "#475569", // Slate-600 text
  },
  secondary: {
    DEFAULT: "#dbeafe", // Light blue (blue-100)
    foreground: "#334155", // Slate-700 text
  },
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, className }), className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
