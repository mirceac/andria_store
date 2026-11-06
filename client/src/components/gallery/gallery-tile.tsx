import { useState, type CSSProperties } from "react";
import { Link } from "wouter";
import { FileImage, FileText, Play } from "lucide-react";
import { PDFThumbnail } from "@/components/pdf-thumbnail";
import { cn } from "@/lib/utils";
import type { GalleryItem } from "@/lib/gallery-media";

interface GalleryTileProps {
  item: GalleryItem;
  onOpen: () => void;
  onHover?: (item: GalleryItem) => void;
  // Keep the image's own aspect ratio (masonry) instead of a fixed poster crop
  natural?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function GalleryTile({ item, onOpen, onHover, natural = false, className, style }: GalleryTileProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const { product } = item;
  const useNaturalRatio = natural && item.kind === "image" && loaded && !failed;

  return (
    <div
      style={style}
      onMouseEnter={() => onHover?.(item)}
      onFocus={() => onHover?.(item)}
      className={cn(
        "group relative w-full overflow-hidden rounded-lg bg-muted text-left shadow-sm ring-1 ring-black/5 transition duration-300",
        "hover:z-10 hover:scale-[1.03] hover:shadow-xl",
        className
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        onContextMenu={(e) => e.preventDefault()}
        aria-label={`View ${product.name}`}
        className={cn(
          "relative block w-full overflow-hidden bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary",
          !useNaturalRatio && "aspect-[4/5]"
        )}
      >
      {item.kind === "image" && !failed && (
        <img
          src={item.thumbUrl}
          alt={product.name}
          loading="lazy"
          decoding="async"
          draggable={false}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={cn(
            "block w-full select-none transition-opacity duration-300",
            useNaturalRatio ? "h-auto" : "h-full object-cover",
            loaded ? "opacity-100" : "opacity-0"
          )}
        />
      )}

      {item.kind === "image" && !loaded && !failed && <div className="absolute inset-0 animate-pulse bg-muted" />}

      {item.kind === "image" && failed && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-muted-foreground">
          <FileImage className="h-7 w-7 opacity-60" />
          <span className="text-xs">Preview unavailable</span>
        </div>
      )}

      {item.kind === "pdf" && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#f6f4ee] to-[#e9eee8]">
          <PDFThumbnail pdfUrl={item.thumbUrl} width={130} height={182} showTryDirect={false} />
          <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white">
            <FileText className="h-3 w-3" /> PDF
          </span>
        </div>
      )}

      {item.kind === "video" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#46665e] via-[#273d39] to-[#172724] text-white">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/40 bg-black/20 backdrop-blur transition-transform group-hover:scale-110">
            <Play className="ml-1 h-5 w-5 fill-current" />
          </div>
          <span className="rounded-full bg-black/30 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/80">Video</span>
        </div>
      )}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent p-3 pt-10 text-left opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 [@media(hover:none)]:opacity-100">
          <p className="line-clamp-2 text-sm font-medium leading-snug text-white">{product.name}</p>
        </div>
      </button>
      <Link
        href={`/product/${product.id}`}
        className="absolute bottom-2 right-2 z-10 rounded-md bg-white/95 px-2.5 py-1.5 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        Details
      </Link>
    </div>
  );
}
