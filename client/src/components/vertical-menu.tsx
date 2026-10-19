import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Package, LayoutGrid } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const itemClasses = (active: boolean) =>
  cn(
    "relative h-11 w-11 rounded-xl p-0 transition-colors",
    active
      ? "bg-primary/10 text-primary hover:bg-primary/15"
      : "text-muted-foreground hover:bg-black/5 hover:text-foreground"
  );

export default function VerticalMenu() {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { items } = useCart();
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const [location, setLocation] = useLocation();

  // Hide vertical menu on mobile
  if (isMobile === true) {
    return null;
  }

  // Opens the same category drawer used by the "Browse categories" button on the home page
  const handleBrowseCategories = () => {
    if (location !== "/") {
      setLocation("/");
      // Wait for the home page to mount and subscribe to the event
      setTimeout(() => window.dispatchEvent(new Event("toggleSidebar")), 100);
      return;
    }
    window.dispatchEvent(new Event("toggleSidebar"));
  };

  const menuItems = [
    {
      icon: Package,
      label: "My Orders",
      href: "/orders",
      show: !!user,
      badge: 0,
    },
    {
      icon: ShoppingCart,
      label: "Cart",
      href: "/cart",
      show: true,
      badge: itemCount,
    },
  ];

  return (
    <TooltipProvider delayDuration={150}>
      <div className="fixed left-0 top-16 bottom-0 z-40 flex w-16 flex-col items-center gap-2 border-r border-border bg-chrome py-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              aria-label="Browse categories"
              onClick={handleBrowseCategories}
              className={itemClasses(location === "/")}
            >
              <LayoutGrid className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Browse categories</p>
          </TooltipContent>
        </Tooltip>

        <div className="my-1 h-px w-7 bg-border" />

        {menuItems
          .filter((item) => item.show)
          .map((item) => {
            const Icon = item.icon;
            const isActive = location.startsWith(item.href);

            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Button
                    asChild
                    variant="ghost"
                    aria-label={item.label}
                    className={itemClasses(isActive)}
                  >
                    <Link href={item.href}>
                      <Icon className="h-5 w-5" />
                      {item.badge > 0 && (
                        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-medium leading-none text-primary-foreground">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{item.label}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
      </div>
    </TooltipProvider>
  );
}
