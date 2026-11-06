import { useEffect, useRef } from "react";
import { Link } from "wouter";
import { ChevronLeft, ChevronRight, Expand, FileText, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GalleryItem } from "@/lib/gallery-media";

interface GalleryHeroProps {
  item: GalleryItem;
  onOpen: (item: GalleryItem) => void;
  onNavigate: (direction: -1 | 1) => void;
  canNavigate: boolean;
}

export function GalleryHero({ item, onOpen, onNavigate, canNavigate }: GalleryHeroProps) {
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    heroRef.current?.querySelector<HTMLVideoElement>("video[data-featured-video]")?.play().catch(() => undefined);
  }, [item]);

  return (
    <section ref={heroRef} className="sticky top-[var(--header-h,4rem)] z-40 h-[46vh] max-h-[520px] min-h-[280px] w-full overflow-hidden rounded-xl bg-muted shadow-sm">
      {item.kind === "image" && (
        <img
          key={item.product.id}
          src={item.fullUrl}
          alt=""
          decoding="async"
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
          className="absolute inset-0 h-full w-full select-none object-cover"
        />
      )}
      {item.kind === "video" && (
        <video
          key={item.product.id}
          src={item.fullUrl}
          muted
          loop
          autoPlay
          playsInline
          preload="auto"
          data-featured-video
          onContextMenu={(e) => e.preventDefault()}
          className="absolute inset-0 h-full w-full select-none object-cover"
        />
      )}
      {item.kind === "pdf" && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#d6e0dc] via-[#80968e] to-[#354c46] text-white">
          <FileText className="h-24 w-24 opacity-30" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent" />

      <button
        type="button"
        aria-label="Previous featured item"
        onClick={() => onNavigate(-1)}
        disabled={!canNavigate}
        className="absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white shadow-sm backdrop-blur transition-colors hover:bg-black/75 disabled:cursor-not-allowed disabled:opacity-40 sm:left-5 sm:h-12 sm:w-12"
      >
        <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
      </button>
      <button
        type="button"
        aria-label="Next featured item"
        onClick={() => onNavigate(1)}
        disabled={!canNavigate}
        className="absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white shadow-sm backdrop-blur transition-colors hover:bg-black/75 disabled:cursor-not-allowed disabled:opacity-40 sm:right-5 sm:h-12 sm:w-12"
      >
        <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
      </button>

      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-4 sm:p-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70">Featured</p>
        <h1 className="max-w-2xl font-serif text-2xl leading-tight text-white sm:text-4xl">{item.product.name}</h1>
        {item.product.description && (
          <p className="line-clamp-2 max-w-xl text-sm text-white/80">{item.product.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => onOpen(item)} className="gap-2 bg-white text-black hover:bg-white/90">
            {item.kind === "video" ? <Play className="h-4 w-4 fill-current" /> : item.kind === "pdf" ? <FileText className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
            View
          </Button>
          <Link href={`/product/${item.product.id}`}>
            <Button variant="outline" className="border-white/40 bg-white/10 text-white backdrop-blur hover:bg-white/20 hover:text-white">
              Details
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
