import { type CSSProperties, useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { Eye, FileImage, FileText, Info } from "lucide-react";
import { PDFThumbnail } from "@/components/pdf-thumbnail";
import { VideoThumbnail } from "@/components/gallery/video-thumbnail";
import { useGalleryThumbnail } from "@/hooks/use-gallery-thumbnail";
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
  const [touchActive, setTouchActive] = useState(false);
  const tileRef = useRef<HTMLDivElement>(null);
  const thumbnail = useGalleryThumbnail(item.thumbUrl, item.fullUrl);
  const { product } = item;
  const useNaturalRatio = natural && item.kind === "image" && thumbnail.loaded && !thumbnail.failed;

  useEffect(() => {
    if (!touchActive) return;
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !tileRef.current?.contains(event.target)) setTouchActive(false);
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [touchActive]);

  return (
    <div
      ref={tileRef}
      style={style}
      onMouseEnter={() => {
        if (item.kind === "image") thumbnail.retry();
        onHover?.(item);
      }}
      onFocus={() => onHover?.(item)}
      className={cn(
        "group relative w-full overflow-hidden rounded-lg bg-muted text-left shadow-sm ring-1 ring-black/5 transition duration-300",
        "[@media(hover:hover)]:hover:z-10 [@media(hover:hover)]:hover:scale-[1.03] [@media(hover:hover)]:hover:shadow-xl",
        className
      )}
    >
      <button
        type="button"
        onClick={(event) => {
          if (event.detail !== 0 && window.matchMedia("(hover: none)").matches && !touchActive) {
            setTouchActive(true);
          } else {
            onOpen();
          }
        }}
        onContextMenu={(e) => e.preventDefault()}
        aria-label={`View ${product.name}${item.kind === "video" ? " video" : ""}`}
        className={cn(
          "relative block w-full overflow-hidden bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary",
          !useNaturalRatio && "aspect-[4/5]"
        )}
      >
      {item.kind === "image" && !thumbnail.failed && (
        <img
          src={thumbnail.src}
          alt={product.name}
          loading="lazy"
          decoding="async"
          draggable={false}
          onLoad={thumbnail.onLoad}
          onError={thumbnail.onError}
          className={cn(
            "block w-full select-none transition-opacity duration-300",
            useNaturalRatio ? "h-auto" : "h-full object-cover",
            thumbnail.loaded ? "opacity-100" : "opacity-0"
          )}
        />
      )}

      {item.kind === "image" && !thumbnail.loaded && !thumbnail.failed && <div className="absolute inset-0 animate-pulse bg-muted" />}

      {item.kind === "image" && thumbnail.failed && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#f6f4ee] to-[#e9eee8] p-3 text-muted-foreground">
          <FileImage className="h-8 w-8 opacity-50" />
          <span className="line-clamp-2 text-center text-xs font-medium opacity-70">{product.name}</span>
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
        <VideoThumbnail key={item.fullUrl} src={item.fullUrl} />
      )}

        <div className={cn("pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent p-3 pb-12 pt-10 text-left opacity-0 transition-opacity duration-200 [@media(hover:hover)]:group-hover:opacity-100", touchActive && "opacity-100")}>
          <p className="line-clamp-2 text-sm font-medium leading-snug text-white">{product.name}</p>
        </div>
      </button>
      <button
        type="button"
        onClick={onOpen}
        aria-label={`View ${product.name}`}
        title="View"
        className={cn("absolute bottom-2 left-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-foreground opacity-0 pointer-events-none shadow-sm transition-opacity duration-200 hover:bg-white focus-visible:pointer-events-auto focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary [@media(hover:hover)]:group-hover:pointer-events-auto [@media(hover:hover)]:group-hover:opacity-100", touchActive && "pointer-events-auto opacity-100")}
      >
        <Eye className="h-4 w-4" />
      </button>
      <Link
        href={`/product/${product.id}`}
        aria-label={`Details for ${product.name}`}
        title="Details"
        className={cn("absolute bottom-2 right-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-foreground opacity-0 pointer-events-none shadow-sm transition-opacity duration-200 hover:bg-white focus-visible:pointer-events-auto focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary [@media(hover:hover)]:group-hover:pointer-events-auto [@media(hover:hover)]:group-hover:opacity-100", touchActive && "pointer-events-auto opacity-100")}
      >
        <Info className="h-4 w-4" />
      </Link>
    </div>
  );
}
