import { useEffect, useRef } from "react";
import { Link } from "wouter";
import { Eye, FileImage, FileText, Info, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGalleryThumbnail } from "@/hooks/use-gallery-thumbnail";
import { cn } from "@/lib/utils";
import type { GalleryItem } from "@/lib/gallery-media";
import { enableHorizontalScroll } from "@/lib/horizontal-scroll";

interface GalleryHeroProps {
  item: GalleryItem;
  items: GalleryItem[];
  onOpen: (item: GalleryItem) => void;
  onSelect: (item: GalleryItem) => void;
}

export function GalleryHero({ item, items, onOpen, onSelect }: GalleryHeroProps) {
  const heroRef = useRef<HTMLElement>(null);
  const filmstrip = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const strip = filmstrip.current;
    const active = strip?.querySelector<HTMLElement>("[data-active='true']");
    if (!strip || !active) return;
    strip.scrollTo({ left: active.offsetLeft - (strip.clientWidth - active.clientWidth) / 2, behavior: "smooth" });
  }, [item.product.id]);

  useEffect(() => {
    const strip = filmstrip.current;
    return strip ? enableHorizontalScroll(strip) : undefined;
  }, [items.length]);

  useEffect(() => {
    heroRef.current?.querySelector<HTMLVideoElement>("video[data-featured-video]")?.play().catch(() => undefined);
  }, [item]);

  return (
    <section ref={heroRef} className="relative order-first -mx-3 -mt-3 h-[calc(100svh-var(--header-h,6.5rem))] min-h-[320px] overflow-hidden bg-muted md:order-none md:mx-0 md:mt-0 md:h-[46vh] md:max-h-[520px] md:min-h-[280px] md:rounded-xl md:shadow-sm">
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

      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-4 sm:p-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70">Featured</p>
        <h1 className="max-w-2xl font-serif text-2xl leading-tight text-white sm:text-4xl">{item.product.name}</h1>
        {item.product.description && (
          <p className="line-clamp-2 max-w-xl text-sm text-white/80">{item.product.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => onOpen(item)}
            aria-label="View"
            title="View"
            className="h-10 w-10 rounded-full bg-white p-0 text-black hover:bg-white/90"
          >
            <Eye className="h-5 w-5" />
          </Button>
          <Link
            href={`/product/${item.product.id}`}
            aria-label="Item details"
            title="Details"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/40 bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <Info className="h-5 w-5" />
          </Link>
        </div>
        {items.length > 1 && (
          <div ref={filmstrip} className="scrollbar-hide relative flex gap-2 overflow-x-auto px-1 py-1">
            {items.map((candidate) => {
              const active = candidate.product.id === item.product.id;
              return (
                <button
                  key={candidate.product.id}
                  type="button"
                  data-active={active}
                  aria-label={`Feature ${candidate.product.name}`}
                  onClick={() => onSelect(candidate)}
                  className={cn(
                    "flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-black/40 ring-2 transition",
                    active ? "opacity-100 ring-white" : "opacity-60 ring-transparent hover:opacity-100"
                  )}
                >
                  {candidate.kind === "image" ? (
                    <FeaturedThumbnail item={candidate} />
                  ) : candidate.kind === "video" ? (
                    <Play className="h-5 w-5 fill-white text-white" />
                  ) : (
                    <FileText className="h-5 w-5 text-white" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function FeaturedThumbnail({ item }: { item: GalleryItem }) {
  const thumbnail = useGalleryThumbnail(item.thumbUrl, item.fullUrl);

  return (
    <span
      onMouseEnter={thumbnail.retry}
      className="relative flex h-full w-full items-center justify-center bg-gradient-to-br from-[#d6e0dc] to-[#354c46]"
    >
      {!thumbnail.failed && (
        <img
          src={thumbnail.src}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          onLoad={thumbnail.onLoad}
          onError={thumbnail.onError}
          className={cn("h-full w-full object-cover transition-opacity duration-300", thumbnail.loaded ? "opacity-100" : "opacity-0")}
        />
      )}
      {!thumbnail.loaded && (
        <span className={cn("absolute inset-0 flex items-center justify-center text-white/70", !thumbnail.failed && "animate-pulse")}>
          <FileImage className="h-5 w-5" />
        </span>
      )}
    </span>
  );
}
