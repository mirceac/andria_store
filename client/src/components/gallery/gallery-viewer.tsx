import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, Info, RotateCw, X, ZoomIn, ZoomOut } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import type { GalleryItem } from "@/lib/gallery-media";

interface GalleryViewerProps {
  items: GalleryItem[];
  // Index into `items`; null keeps the viewer closed
  index: number | null;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  showDetailsLink?: boolean;
}

const MAX_ZOOM = 5;
const SWIPE_PX = 60;

const watermarkBackground = (() => {
  const svg =
    "<svg xmlns='http://www.w3.org/2000/svg' width='260' height='160'>" +
    "<text x='130' y='80' text-anchor='middle' transform='rotate(-25 130 80)' fill='white' fill-opacity='0.18' " +
    "font-family='sans-serif' font-size='16' font-weight='900' letter-spacing='2'>© ANDRIA STORE</text></svg>";
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
})();

export function GalleryViewer({ items, index, onIndexChange, onClose, showDetailsLink = true }: GalleryViewerProps) {
  const item = index !== null ? items[index] : undefined;
  const open = item !== undefined;

  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const gesture = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);
  const filmstrip = useRef<HTMLDivElement>(null);

  const go = useCallback(
    (delta: number) => {
      if (index === null) return;
      const next = index + delta;
      if (next >= 0 && next < items.length) onIndexChange(next);
    },
    [index, items.length, onIndexChange]
  );

  const setZoomLevel = useCallback((next: number) => {
    const clamped = Math.min(MAX_ZOOM, Math.max(1, next));
    setZoom(clamped);
    if (clamped === 1) setPan({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
    setLoaded(false);
    setFailed(false);
  }, [item?.fullUrl]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, go]);

  // Warm the cache for the neighbours so next/prev feels instant
  useEffect(() => {
    if (index === null) return;
    [index - 1, index + 1].forEach((i) => {
      if (items[i]) new Image().src = items[i].fullUrl;
    });
  }, [index, items]);

  useEffect(() => {
    filmstrip.current
      ?.querySelector<HTMLElement>("[data-active='true']")
      ?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [index]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    e.currentTarget.setPointerCapture(e.pointerId);
    if (pointers.current.size === 2) {
      const [a, b] = Array.from(pointers.current.values());
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, zoom };
      gesture.current = null;
      setDragging(false);
      return;
    }
    gesture.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    setDragging(zoom > 1);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pinch.current && pointers.current.size >= 2) {
      const [a, b] = Array.from(pointers.current.values());
      setZoomLevel(pinch.current.zoom * (Math.hypot(a.x - b.x, a.y - b.y) / pinch.current.dist));
      return;
    }

    const start = gesture.current;
    if (!start || zoom === 1) return;
    setPan({ x: start.panX + e.clientX - start.x, y: start.panY + e.clientY - start.y });
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);

    if (pinch.current) {
      // Fingers lifting after a pinch must not count as a swipe; a remaining finger resumes panning
      if (pointers.current.size < 2) pinch.current = null;
      const [remaining] = Array.from(pointers.current.values());
      gesture.current = remaining && zoom > 1 ? { x: remaining.x, y: remaining.y, panX: pan.x, panY: pan.y } : null;
      setDragging(gesture.current !== null);
      return;
    }

    const start = gesture.current;
    gesture.current = null;
    setDragging(false);
    if (!start || zoom > 1) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
  };

  const filmstripItems = useMemo(() => (items.length > 1 ? items : []), [items]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[100] bg-black" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onContextMenu={(e) => e.preventDefault()}
          className="fixed inset-0 z-[100] flex select-none flex-col text-white outline-none"
        >
          <DialogPrimitive.Title className="sr-only">{item?.product.name ?? "Viewer"}</DialogPrimitive.Title>

          <header className="relative z-20 flex items-center gap-1 bg-gradient-to-b from-black/80 to-transparent px-3 py-3 sm:gap-3 sm:px-4">
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 break-words font-serif text-base leading-snug sm:truncate sm:text-lg">{item?.product.name}</p>
              {items.length > 1 && index !== null && (
                <p className="text-xs text-white/60">
                  {index + 1} / {items.length}
                </p>
              )}
            </div>
            {item?.kind === "image" && (
              <>
                <ViewerButton label="Zoom out" onClick={() => setZoomLevel(zoom - 0.5)} disabled={zoom <= 1}>
                  <ZoomOut className="h-5 w-5" />
                </ViewerButton>
                <ViewerButton label="Zoom in" onClick={() => setZoomLevel(zoom + 0.5)} disabled={zoom >= MAX_ZOOM}>
                  <ZoomIn className="h-5 w-5" />
                </ViewerButton>
                <ViewerButton label="Rotate image" onClick={() => setRotation((current) => (current + 90) % 360)}>
                  <RotateCw className="h-5 w-5" />
                </ViewerButton>
              </>
            )}
            {showDetailsLink && item && (
              <ViewerButton
                label={detailsOpen ? "Hide details" : "Show details"}
                aria-pressed={detailsOpen}
                onClick={() => setDetailsOpen((open) => !open)}
                className={cn("flex sm:w-auto sm:gap-2 sm:px-3", detailsOpen && "bg-white/15")}
              >
                <Info className="h-5 w-5" />
                <span className="hidden text-sm sm:inline">Details</span>
              </ViewerButton>
            )}
            <DialogPrimitive.Close
              aria-label="Close"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <X className="h-6 w-6" />
            </DialogPrimitive.Close>
          </header>

          <div className="relative flex min-h-0 flex-1">
          <div
            className={cn(
              "relative min-h-0 flex-1 overflow-hidden",
              item?.kind === "video" ? "flex items-center justify-center" : zoom > 1 ? (dragging ? "cursor-grabbing" : "cursor-grab") : "cursor-zoom-in"
            )}
            style={{ touchAction: item?.kind === "video" ? "auto" : "none" }}
            onPointerDown={item?.kind === "video" ? undefined : onPointerDown}
            onPointerMove={item?.kind === "video" ? undefined : onPointerMove}
            onPointerUp={item?.kind === "video" ? undefined : onPointerUp}
            onPointerCancel={item?.kind === "video" ? undefined : onPointerUp}
            onDoubleClick={item?.kind === "video" ? undefined : () => setZoomLevel(zoom > 1 ? 1 : 2.5)}
            onWheel={item?.kind === "video" ? undefined : (e) => setZoomLevel(zoom - e.deltaY * 0.002)}
          >
            {item?.kind === "image" && !failed && (
              <img
                key={item.fullUrl}
                src={item.fullUrl}
                alt={item.product.name}
                draggable={false}
                onLoad={() => setLoaded(true)}
                onError={() => setFailed(true)}
                className={cn("absolute inset-0 h-full w-full object-contain transition-opacity duration-300", loaded ? "opacity-100" : "opacity-0")}
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                  transition: dragging ? "none" : "transform 0.2s ease-out, opacity 0.3s",
                }}
              />
            )}

            {item?.kind === "video" && (
              <video
                key={item.fullUrl}
                src={item.fullUrl}
                autoPlay
                controls
                playsInline
                preload="auto"
                onLoadedData={() => setLoaded(true)}
                onError={() => setFailed(true)}
                className="max-h-full max-w-full object-contain"
              />
            )}

            {!loaded && !failed && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/20 border-t-white" />
              </div>
            )}
            {failed && <div className="absolute inset-0 flex items-center justify-center text-white/70">Failed to load media</div>}

            {item && !item.isPrivate && (
              <div className="pointer-events-none absolute inset-0 z-10" style={{ backgroundImage: watermarkBackground }} />
            )}

            {index !== null && index > 0 && <NavArrow direction="prev" onClick={() => go(-1)} />}
            {index !== null && index < items.length - 1 && <NavArrow direction="next" onClick={() => go(1)} />}
          </div>
          {detailsOpen && item && (
            <aside className="absolute inset-x-0 bottom-0 z-30 max-h-[45vh] overflow-y-auto border-t border-white/10 bg-black/95 p-4 pb-6 backdrop-blur sm:relative sm:inset-auto sm:max-h-none sm:w-80 sm:shrink-0 sm:border-l sm:border-t-0 sm:p-5">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">{item.kind}</p>
              <h2 className="font-serif text-lg leading-snug text-white">{item.product.name}</h2>
              {item.product.description && <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-white/70">{item.product.description}</p>}
              {item.product.is_public !== false && (
                <div className="mt-4 border-t border-white/10 pt-3 text-sm text-white/70">
                  <p>Digital: ${Number(item.product.price || 0).toFixed(2)}</p>
                  {Number(item.product.physical_price || 0) > 0 && (
                    <p className="mt-1">Physical: ${Number(item.product.physical_price).toFixed(2)} · {item.product.stock ?? 0} in stock</p>
                  )}
                </div>
              )}
              <Link
                href={`/product/${item.product.id}`}
                onClick={onClose}
                className="mt-5 inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-semibold text-black transition-colors hover:bg-white/90"
              >
                Open item page
              </Link>
            </aside>
          )}
          </div>

          {filmstripItems.length > 0 && (
            <div ref={filmstrip} className="scrollbar-hide z-20 hidden gap-2 overflow-x-auto bg-gradient-to-t from-black/80 to-transparent px-4 py-3 sm:flex">
              {filmstripItems.map((candidate, i) => (
                <button
                  key={candidate.product.id}
                  type="button"
                  data-active={i === index}
                  aria-label={`Show ${candidate.product.name}`}
                  onClick={() => onIndexChange(i)}
                  className={cn(
                    "h-14 w-14 shrink-0 overflow-hidden rounded-md ring-2 transition",
                    i === index ? "opacity-100 ring-white" : "opacity-50 ring-transparent hover:opacity-90"
                  )}
                >
                  {candidate.kind === "video" ? (
                    <video src={candidate.fullUrl} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                  ) : (
                    <img src={candidate.thumbUrl} alt="" loading="lazy" decoding="async" draggable={false} className="h-full w-full object-cover" />
                  )}
                </button>
              ))}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function ViewerButton({
  label,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/80 sm:h-10 sm:w-10 transition-colors hover:bg-white/15 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent",
        className ?? "flex"
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function NavArrow({ direction, onClick }: { direction: "prev" | "next"; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={direction === "prev" ? "Previous" : "Next"}
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onClick={onClick}
      className={cn(
        "absolute top-1/2 z-20 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur transition-colors hover:bg-black/80 sm:flex",
        direction === "prev" ? "left-4" : "right-4"
      )}
    >
      {direction === "prev" ? <ChevronLeft className="h-6 w-6" /> : <ChevronRight className="h-6 w-6" />}
    </button>
  );
}
