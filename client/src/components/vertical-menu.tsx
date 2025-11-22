import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  ShoppingCart,
  Package,
  Box,
  LayoutGrid,
  ClipboardList,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

type Category = {
  id: number;
  name: string;
  parent_id: number | null;
};

type CategoryWithChildren = Category & {
  children: CategoryWithChildren[];
};

export default function VerticalMenu() {
  const { user } = useAuth();
  const { items } = useCart();
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const [location, setLocation] = useLocation();
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  // Build category tree
  const buildCategoryTree = (cats: Category[]): CategoryWithChildren[] => {
    const categoryMap = new Map<number, CategoryWithChildren>();
    cats.forEach((cat) => {
      categoryMap.set(cat.id, { ...cat, children: [] });
    });

    const rootCategories: CategoryWithChildren[] = [];
    cats.forEach((cat) => {
      const categoryWithChildren = categoryMap.get(cat.id);
      if (!categoryWithChildren) return;

      if (cat.parent_id === null) {
        rootCategories.push(categoryWithChildren);
      } else {
        const parent = categoryMap.get(cat.parent_id);
        if (parent) {
          parent.children.push(categoryWithChildren);
        }
      }
    });

    return rootCategories;
  };

  const toggleCategory = (categoryId: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const handleCategoryClick = (categoryId: number | null) => {
    // Navigate to home page and dispatch event to filter by category
    if (location !== "/") {
      setLocation("/");
    }
    // Small delay to ensure we're on the home page before dispatching
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('selectCategory', { 
        detail: { categoryId } 
      }));
    }, 100);
  };

  const renderCategoryTree = (cats: CategoryWithChildren[], level = 0): React.ReactNode => {
    return cats.map((category) => {
      const isExpanded = expandedCategories.has(category.id);
      const hasChildren = category.children.length > 0;

      return (
        <div key={category.id}>
          <DropdownMenuItem
            className="flex items-center justify-between cursor-pointer py-2"
            style={{ paddingLeft: `${8 + level * 12}px` }}
            onSelect={(e) => {
              e.preventDefault();
              handleCategoryClick(category.id);
            }}
          >
            <span className="flex-1 text-sm">{category.name}</span>
            {hasChildren && (
              <button
                onClick={(e) => toggleCategory(category.id, e)}
                className="p-1 hover:bg-slate-100 rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </button>
            )}
          </DropdownMenuItem>
          {hasChildren && isExpanded && renderCategoryTree(category.children, level + 1)}
        </div>
      );
    });
  };

  const menuItems = [
    {
      icon: Package,
      label: "My Orders",
      href: "/orders",
      show: !!user,
      type: "link" as const,
    },
    {
      icon: ShoppingCart,
      label: "Cart",
      href: "/cart",
      show: true,
      badge: itemCount,
      type: "link" as const,
    },
  ];

  const categoryTree = buildCategoryTree(categories);

  return (
    <TooltipProvider>
      <div className="fixed left-0 top-16 bottom-0 w-16 bg-gray-50 border-r border-slate-200 shadow-sm z-40 flex flex-col items-center py-4 gap-2">
        {/* Gallery/Categories Button with Dropdown */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    "h-12 w-12 p-0 relative",
                    location === "/"
                      ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                      : "bg-blue-50 text-slate-600 hover:bg-blue-100 hover:text-slate-700"
                  )}
                >
                  <LayoutGrid className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Gallery / Categories</p>
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent side="right" align="start" className="w-64 max-h-96 overflow-y-auto">
            <DropdownMenuItem
              className="font-medium cursor-pointer"
              onSelect={(e) => {
                e.preventDefault();
                handleCategoryClick(null);
              }}
            >
              All Products
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {renderCategoryTree(categoryTree)}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Other Menu Items */}
        {menuItems
          .filter((item) => item.show)
          .map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href || 
              (item.href !== "/" && location.startsWith(item.href));
            
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link href={item.href}>
                    <Button
                      variant="ghost"
                      className={cn(
                        "h-12 w-12 p-0 relative",
                        isActive
                          ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                          : "bg-blue-50 text-slate-600 hover:bg-blue-100 hover:text-slate-700"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      {item.badge && item.badge > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center leading-none font-medium">
                          {item.badge}
                        </span>
                      )}
                    </Button>
                  </Link>
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
