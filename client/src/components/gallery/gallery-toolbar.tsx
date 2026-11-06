import { Columns3, LayoutGrid, Rows3 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GalleryLayout, GallerySize } from "@/hooks/use-gallery-prefs";

interface GalleryToolbarProps {
  layout: GalleryLayout;
  onLayoutChange: (layout: GalleryLayout) => void;
  size: GallerySize;
  onSizeChange: (size: GallerySize) => void;
}

const LAYOUTS = [
  { value: "rows", label: "Rows", icon: Rows3 },
  { value: "grid", label: "Grid", icon: LayoutGrid },
  { value: "masonry", label: "Masonry", icon: Columns3 },
] as const;

const SIZES = [
  { value: "sm", label: "Small", text: "S" },
  { value: "md", label: "Medium", text: "M" },
  { value: "lg", label: "Large", text: "L" },
] as const;

const segment = (active: boolean) =>
  cn(
    "flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
    active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
  );

export function GalleryToolbar({ layout, onLayoutChange, size, onSizeChange }: GalleryToolbarProps) {
  return (
    <div className="flex items-center gap-3">
      <div role="radiogroup" aria-label="Layout" className="flex gap-0.5 rounded-lg border border-border bg-white p-0.5">
        {LAYOUTS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={layout === value}
            aria-label={label}
            title={label}
            onClick={() => onLayoutChange(value)}
            className={segment(layout === value)}
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}
      </div>
      <div role="radiogroup" aria-label="Tile size" className="flex gap-0.5 rounded-lg border border-border bg-white p-0.5">
        {SIZES.map(({ value, label, text }) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={size === value}
            aria-label={label}
            title={label}
            onClick={() => onSizeChange(value)}
            className={segment(size === value)}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}
