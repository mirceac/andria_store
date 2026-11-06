import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useRoute } from "wouter";
import type { SelectProduct } from "@db/schema";
import { ArrowLeft, Expand, FileText, Loader2, Play, ShoppingCart, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GalleryRow } from "@/components/gallery/gallery-row";
import { GalleryViewer } from "@/components/gallery/gallery-viewer";
import { PDFThumbnail } from "@/components/pdf-thumbnail";
import { PDFViewerDialogProtected } from "@/components/pdf-viewer-dialog-protected";
import { VariantSelectionDialog } from "@/components/variant-selection-dialog";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import type { Category } from "@/lib/category-tree";
import { canViewInGallery, getGalleryItem, type GalleryItem } from "@/lib/gallery-media";

export default function ProductPage() {
  const [, params] = useRoute("/product/:id");
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { addToCart, items: cartItems } = useCart();
  const [viewerOpen, setViewerOpen] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [variantOpen, setVariantOpen] = useState(false);

  const { data: product, isLoading } = useQuery<SelectProduct>({
    queryKey: [`/api/products/${params?.id}`],
  });
  const { data: allProducts } = useQuery<SelectProduct[]>({ queryKey: ["/api/products"] });
  const { data: categories } = useQuery<Category[]>({ queryKey: ["/api/categories/tree"] });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [params?.id]);

  const item = useMemo(() => (product ? getGalleryItem(product) : null), [product]);

  const related = useMemo(() => {
    if (!product || product.category_id === null) return [];
    return (allProducts ?? [])
      .filter((p) => p.id !== product.id && p.category_id === product.category_id && canViewInGallery(p, user))
      .map(getGalleryItem)
      .filter((i): i is GalleryItem => i !== null);
  }, [allProducts, product, user]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!product) return null;

  const categoryName = categories?.find((c) => c.id === product.category_id)?.name;
  const isForSale = product.is_public !== false;
  const hasDigital = Number(product.price || 0) > 0;
  const hasPhysical = Number(product.physical_price || 0) > 0;
  const physicalAvailable = hasPhysical && (product.stock ?? 0) > 0;
  const prices = [hasDigital ? Number(product.price) : 0, hasPhysical ? Number(product.physical_price) : 0].filter((p) => p > 0);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;

  const existingPhysical = cartItems.find((c) => c.product.id === product.id && c.variant_type === "physical");
  const atStockLimit = hasPhysical && !!existingPhysical && existingPhysical.quantity >= (product.stock ?? 0);
  const addDisabled = (!hasDigital && !physicalAvailable) || atStockLimit || (hasDigital && !hasPhysical && !!existingPhysical);

  const handleAdd = () => {
    if (hasDigital && !hasPhysical) addToCart(product, 1, "digital");
    else setVariantOpen(true);
  };

  const openMedia = () => (item?.kind === "pdf" ? setPdfOpen(true) : setViewerOpen(true));

  return (
    <div className="pb-10">
      <div className="relative overflow-hidden">
        {item?.kind === "image" && (
          <img
            src={item.thumbUrl}
            alt=""
            aria-hidden
            draggable={false}
            className="absolute inset-0 h-full w-full scale-125 object-cover opacity-30 blur-3xl"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background" />

        <div className="relative mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6">
          <Link href="/" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to gallery
          </Link>

          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-10">
            <div
              role={item?.kind === "video" ? undefined : "button"}
              tabIndex={item?.kind === "video" ? undefined : 0}
              onClick={item?.kind === "video" ? undefined : openMedia}
              onKeyDown={item?.kind === "video" ? undefined : (e) => {
                if (e.key === "Enter" || e.key === " ") openMedia();
              }}
              onContextMenu={(e) => e.preventDefault()}
              aria-label={item?.kind === "video" ? undefined : `View ${product.name}`}
              className="group relative flex min-h-[260px] w-full items-center justify-center overflow-hidden rounded-xl bg-black/5 shadow-lg ring-1 ring-black/5"
            >
              {item?.kind === "image" && (
                <img
                  src={item.fullUrl}
                  alt={product.name}
                  draggable={false}
                  className="max-h-[75vh] w-full select-none object-contain"
                />
              )}
              {item?.kind === "video" && (
                <video
                  src={item.fullUrl}
                  muted
                  playsInline
                  controls
                  preload="metadata"
                  className="max-h-[75vh] w-full object-contain"
                />
              )}
              {item?.kind === "pdf" && (
                <div className="pointer-events-none flex items-center justify-center p-6">
                  <PDFThumbnail pdfUrl={item.thumbUrl} width={300} height={400} showTryDirect={false} />
                </div>
              )}
              {!item && <XCircle className="h-16 w-16 text-muted-foreground/40" />}
              {item && item.kind !== "video" && (
                <span className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs font-medium text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 [@media(hover:none)]:opacity-100">
                  {item.kind === "pdf" ? <FileText className="h-3.5 w-3.5" /> : <Expand className="h-3.5 w-3.5" />}
                  {item.kind === "pdf" ? "Open document" : "Full screen"}
                </span>
              )}
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                {categoryName && (
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/80">{categoryName}</p>
                )}
                <h1 className="font-serif text-3xl leading-tight text-foreground sm:text-4xl">{product.name}</h1>
              </div>

              {product.description && (
                <p className="whitespace-pre-line leading-relaxed text-muted-foreground">{product.description}</p>
              )}

              {isForSale && (
                <div className="space-y-4 rounded-xl border border-border bg-white/80 p-4 backdrop-blur">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-2xl font-semibold text-foreground">
                      ${minPrice.toFixed(2)}
                      {maxPrice !== minPrice && ` – $${maxPrice.toFixed(2)}`}
                    </p>
                    {hasDigital && <Badge variant="secondary">Digital</Badge>}
                    {hasPhysical && (
                      <Badge variant={physicalAvailable ? "secondary" : "destructive"}>
                        {physicalAvailable ? `Physical (${product.stock} left)` : "Physical out of stock"}
                      </Badge>
                    )}
                  </div>
                  <Button className="w-full gap-2 sm:w-auto" onClick={handleAdd} disabled={addDisabled}>
                    <ShoppingCart className="h-4 w-4" />
                    {atStockLimit ? "Max stock in cart" : "Add to Cart"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <div className="mx-auto mt-6 max-w-7xl px-3 sm:px-6">
          <GalleryRow
            title={categoryName ? `More in ${categoryName}` : "More like this"}
            items={related}
            tileWidth={190}
            onOpen={(i) => setLocation(`/product/${i.product.id}`)}
          />
        </div>
      )}

      {(item?.kind === "image" || item?.kind === "video") && (
        <GalleryViewer
          items={[item]}
          index={viewerOpen ? 0 : null}
          onIndexChange={() => {}}
          onClose={() => setViewerOpen(false)}
          showDetailsLink={false}
        />
      )}

      {item?.kind === "pdf" && (
        <PDFViewerDialogProtected
          open={pdfOpen}
          onOpenChange={setPdfOpen}
          pdfUrl={item.fullUrl}
          isPrivateProduct={item.isPrivate}
        />
      )}

      <VariantSelectionDialog open={variantOpen} onOpenChange={setVariantOpen} product={product} />
    </div>
  );
}
