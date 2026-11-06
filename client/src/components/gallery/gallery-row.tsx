import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { GalleryTile } from "@/components/gallery/gallery-tile";
import type { GalleryItem } from "@/lib/gallery-media";

interface GalleryRowProps {
  title: string;
  items: GalleryItem[];
  tileWidth: number;
  onOpen: (item: GalleryItem) => void;
  onHover?: (item: GalleryItem) => void;
  onSeeAll?: () => void;
}

export function GalleryRow({ title, items, tileWidth, onOpen, onHover, onSeeAll }: GalleryRowProps) {
  const scroller = useRef<HTMLDivElement>(null);

  const scrollByPage = (direction: 1 | -1) => {
    const el = scroller.current;
    if (el) el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: "smooth" });
  };

  return (
    <section className="group/row">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 className="font-serif text-lg text-foreground sm:text-xl">{title}</h2>
        {onSeeAll && (
          <button type="button" onClick={onSeeAll} className="text-xs font-medium text-primary hover:underline sm:text-sm">
            See all
          </button>
        )}
      </div>

      <div className="relative">
        <div ref={scroller} className="scrollbar-hide -my-3 flex snap-x gap-3 overflow-x-auto px-1 py-3">
          {items.map((item) => (
            <div key={item.product.id} className="shrink-0 snap-start" style={{ width: `min(${tileWidth}px, 44vw)` }}>
              <GalleryTile item={item} onOpen={() => onOpen(item)} onHover={onHover} />
            </div>
          ))}
        </div>

        {(["prev", "next"] as const).map((dir) => (
          <button
            key={dir}
            type="button"
            aria-label={dir === "prev" ? "Scroll left" : "Scroll right"}
            onClick={() => scrollByPage(dir === "prev" ? -1 : 1)}
            className={`absolute top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white opacity-0 backdrop-blur transition-opacity hover:bg-black/80 focus-visible:opacity-100 group-hover/row:opacity-100 md:flex ${
              dir === "prev" ? "-left-3" : "-right-3"
            }`}
          >
            {dir === "prev" ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
          </button>
        ))}
      </div>
    </section>
  );
}
