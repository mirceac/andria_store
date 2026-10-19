import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

export function buttonVariants({ variant, className }: { variant?: string, className?: string } = {}) {
  const hasCustomClass = className?.includes('btn-');
  
  return cn(
    "inline-flex items-center justify-center rounded-md text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 px-4 py-2",
    !hasCustomClass && variant === "outline"
      ? "border border-input bg-background text-foreground hover:bg-muted"
      : !hasCustomClass && variant === "ghost"
      ? "bg-transparent text-foreground hover:bg-muted"
      : !hasCustomClass && variant === "secondary"
      ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
      : !hasCustomClass && variant === "destructive"
      ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
      : !hasCustomClass && "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
    "disabled:opacity-50 disabled:pointer-events-none",
    className
  );
}

export const colors = {
  primary: {
    DEFAULT: "#197a68",
    foreground: "#ffffff",
  },
  secondary: {
    DEFAULT: "#fff0c2",
    foreground: "#5e3c1c",
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
