import { useEffect, useRef } from "react";
import { GalleryTile } from "@/components/gallery/gallery-tile";
import type { GalleryItem } from "@/lib/gallery-media";
import { enableHorizontalScroll } from "@/lib/horizontal-scroll";

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

  useEffect(() => {
    const el = scroller.current;
    return el ? enableHorizontalScroll(el) : undefined;
  }, []);

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
        <div
          ref={scroller}
          className="scrollbar-hide -my-3 flex snap-x gap-3 overflow-x-auto px-1 py-3"
        >
          {items.map((item) => (
            <div key={item.product.id} className="shrink-0 snap-start" style={{ width: `min(${tileWidth}px, 44vw)` }}>
              <GalleryTile item={item} onOpen={() => onOpen(item)} onHover={onHover} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
