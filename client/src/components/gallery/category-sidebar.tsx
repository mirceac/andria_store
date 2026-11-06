import { useState } from "react";
import { ChevronDown, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { buildCategoryTree, type Category, type CategoryNode } from "@/lib/category-tree";

interface CategorySidebarProps {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  selectedCategoryId: number | null;
  onSelect: (categoryId: number | null) => void;
}

export function CategorySidebar({ open, onClose, categories, selectedCategoryId, onSelect }: CategorySidebarProps) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const toggle = (id: number) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const renderNode = (category: CategoryNode, level = 0) => {
    const isExpanded = expanded.has(category.id);
    const hasChildren = category.children.length > 0;
    const isSelected = selectedCategoryId === category.id;

    return (
      <div key={category.id} className="select-none">
        <div
          className={cn(
            "flex min-h-9 cursor-pointer items-center rounded-md border px-2 py-1.5 transition-all duration-200 hover:bg-muted active:bg-muted/80",
            isSelected ? "border-primary/20 bg-accent shadow-sm" : "border-transparent"
          )}
          style={{ paddingLeft: `${0.5 + level * 1.5}rem`, marginLeft: level > 0 ? "0.25rem" : 0 }}
          onClick={() => onSelect(category.id)}
        >
          {hasChildren ? (
            <button
              type="button"
              aria-label={isExpanded ? "Collapse" : "Expand"}
              className="mr-2 flex h-5 w-5 shrink-0 items-center justify-center rounded-sm hover:bg-muted"
              onClick={(e) => {
                e.stopPropagation();
                toggle(category.id);
              }}
            >
              {isExpanded ? (
                <ChevronDown className={cn("h-3.5 w-3.5", isSelected ? "text-primary" : "text-muted-foreground")} />
              ) : (
                <ChevronRight className={cn("h-3.5 w-3.5", isSelected ? "text-primary" : "text-muted-foreground")} />
              )}
            </button>
          ) : (
            <div className="mr-2 flex w-5 shrink-0 justify-center">
              <div className={cn("h-1.5 w-1.5 rounded-full", isSelected ? "bg-primary" : "bg-muted-foreground/60")} />
            </div>
          )}
          <span className={cn("min-w-0 break-words text-sm font-medium leading-snug", isSelected ? "text-foreground" : "text-muted-foreground")}>
            {category.name}
          </span>
        </div>
        {hasChildren && isExpanded && (
          <div className="relative ml-1">
            <div className="absolute bottom-0 left-2 top-0 w-px bg-border" />
            <div className="ml-1">{category.children.map((child) => renderNode(child, level + 1))}</div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {open && (
        <div
          className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] top-16 z-[55] bg-foreground/30 backdrop-blur-[1px] md:bottom-0 md:left-16"
          onClick={onClose}
        />
      )}

      <div
        className={cn(
          "fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom))] left-0 top-16 z-[60] w-80 max-w-[88vw] overflow-y-auto overflow-x-hidden border-r border-border bg-chrome shadow-xl transition-transform duration-300 md:bottom-0 md:left-16",
          open ? "translate-x-0" : "-translate-x-full md:-translate-x-[calc(100%+4rem)]"
        )}
      >
        <div className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/80">Browse</p>
              <h2 className="font-serif text-xl text-foreground">Categories</h2>
            </div>
            <Button variant="ghost" onClick={onClose} className="h-8 w-8 flex-shrink-0 p-0" title="Close sidebar">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-1">
            <div
              className={cn(
                "flex h-9 cursor-pointer items-center rounded-md border px-2 transition-all duration-200 hover:bg-muted active:bg-muted/80",
                selectedCategoryId === null ? "border-primary/20 bg-accent shadow-sm" : "border-transparent"
              )}
              onClick={() => onSelect(null)}
            >
              <span className={cn("text-sm font-medium", selectedCategoryId === null ? "text-foreground" : "text-muted-foreground")}>
                All Items
              </span>
            </div>
            <div className="my-3 h-px bg-border" />
            <div className="space-y-0.5">{buildCategoryTree(categories).map((category) => renderNode(category))}</div>
          </div>
        </div>
      </div>
    </>
  );
}
