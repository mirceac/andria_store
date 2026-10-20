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

  if (isMobile === true) {
    const tabClasses = (active: boolean) =>
      cn(
        "relative flex h-full flex-1 flex-col items-center justify-center gap-0.5 text-[11px] transition-colors",
        active ? "text-primary" : "text-muted-foreground active:bg-black/5"
      );

    return (
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-50 flex h-14 border-t border-border bg-chrome pb-[env(safe-area-inset-bottom)] box-content"
      >
        <button
          type="button"
          aria-label="Browse categories"
          onClick={handleBrowseCategories}
          className={tabClasses(location === "/")}
        >
          <LayoutGrid className="h-5 w-5" />
          <span>Categories</span>
        </button>
        {menuItems
          .filter((item) => item.show)
          .map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                className={tabClasses(location.startsWith(item.href))}
              >
                <span className="relative">
                  <Icon className="h-5 w-5" />
                  {item.badge > 0 && (
                    <span className="absolute -right-2.5 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium leading-none text-primary-foreground">
                      {item.badge}
                    </span>
                  )}
                </span>
                <span>{item.label === "My Orders" ? "Orders" : item.label}</span>
              </Link>
            );
          })}
      </nav>
    );
  }

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
