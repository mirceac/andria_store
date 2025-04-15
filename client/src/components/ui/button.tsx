import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

export function buttonVariants({ variant, className }: { variant?: string, className?: string } = {}) {
  const hasCustomClass = className?.includes('btn-');
  
  return cn(
    "inline-flex items-center justify-center rounded-lg text-base font-semibold transition-colors focus:outline-none focus:ring-4 focus:ring-offset-2 px-4 py-2",
    !hasCustomClass && variant === "outline"
      ? "border border-primary text-primary hover:bg-primary hover:text-white"
      : !hasCustomClass && "bg-primary text-white hover:bg-secondary",
    "disabled:opacity-50 disabled:pointer-events-none",
    className
  );
}

export const colors = {
  primary: {
    DEFAULT: "#1d4ed8", // Production-ready blue
    foreground: "#ffffff", // White text
  },
  secondary: {
    DEFAULT: "#8bc34a", // Vibrant green
    foreground: "#ffffff", // White text
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
