import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import type { SelectProduct } from "@db/schema";
import { PDFViewerDialogProtected } from "@/components/pdf-viewer-dialog-protected";
import { CategorySidebar } from "@/components/gallery/category-sidebar";
import { GalleryHero } from "@/components/gallery/gallery-hero";
import { GalleryRow } from "@/components/gallery/gallery-row";
import { GalleryTile } from "@/components/gallery/gallery-tile";
import { GalleryToolbar } from "@/components/gallery/gallery-toolbar";
import { GalleryViewer } from "@/components/gallery/gallery-viewer";
import { useAuth } from "@/hooks/use-auth";
import { GALLERY_SIZE_PX, useGalleryPrefs } from "@/hooks/use-gallery-prefs";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSearch } from "@/contexts/search-context";
import { useSort } from "@/contexts/sort-context";
import { buildCategoryTree, getDescendantCategoryIds, type Category } from "@/lib/category-tree";
import { canViewInGallery, getGalleryItem, type GalleryItem } from "@/lib/gallery-media";

type Section = { key: string; title: string; items: GalleryItem[]; categoryId?: number };

const createdAt = (item: GalleryItem) => (item.product.created_at ? new Date(item.product.created_at).getTime() : 0);

const startingPrice = (p: SelectProduct, pick: typeof Math.min | typeof Math.max) => {
  const prices = [Number(p.price || 0), p.physical_price ? Number(p.physical_price) : 0].filter((price) => price > 0);
  return prices.length ? pick(...prices) : 0;
};

export default function HomePage() {
  const { search } = useSearch();
  const { sort } = useSort();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { layout, size, setLayout, setSize } = useGalleryPrefs();

  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [viewer, setViewer] = useState<{ items: GalleryItem[]; index: number } | null>(null);
  const [pdfItem, setPdfItem] = useState<GalleryItem | null>(null);
  const [featuredItemId, setFeaturedItemId] = useState<number | null>(null);

  useEffect(() => {
    const categoryId = parseInt(new URLSearchParams(window.location.search).get("category") ?? "", 10);
    if (!isNaN(categoryId)) setSelectedCategoryId(categoryId);
  }, []);

  // The navbar and vertical menu talk to this page through window events
  useEffect(() => {
    const toggle = () => setSidebarOpen((open) => !open);
    const select = (e: Event) => setSelectedCategoryId((e as CustomEvent).detail.categoryId);
    window.addEventListener("toggleSidebar", toggle);
    window.addEventListener("selectCategory", select);
    return () => {
      window.removeEventListener("toggleSidebar", toggle);
      window.removeEventListener("selectCategory", select);
    };
  }, []);

  // Keep the navbar category strip in sync with the current selection
  useEffect(() => {
    const broadcast = () =>
      window.dispatchEvent(new CustomEvent("categorySelected", { detail: { categoryId: selectedCategoryId } }));
    broadcast();
    window.addEventListener("requestCategorySelection", broadcast);
    return () => window.removeEventListener("requestCategorySelection", broadcast);
  }, [selectedCategoryId]);

  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [isMobile]);

  const { data: products, isLoading } = useQuery<SelectProduct[]>({
    queryKey: ["/api/products"],
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  // The tree endpoint hides hidden categories from everyone
  const { data: categoryData } = useQuery<Category[]>({
    queryKey: ["/api/categories/tree"],
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
  const categories = categoryData ?? [];

  const handleCategorySelect = (categoryId: number | null) => {
    setSelectedCategoryId(categoryId);
    setSidebarOpen(false);
  };

  useEffect(() => {
    setFeaturedItemId(null);
  }, [selectedCategoryId, search, sort]);

  const items = useMemo(() => {
    const query = search.trim().toLowerCase();
    const allowed = new Set(selectedCategoryId ? getDescendantCategoryIds(selectedCategoryId, categories) : []);

    return (products ?? [])
      .filter((p) => canViewInGallery(p, user))
      .filter((p) => !query || p.name.toLowerCase().includes(query) || p.description?.toLowerCase().includes(query))
      .filter((p) => !selectedCategoryId || (p.category_id !== null && allowed.has(p.category_id)))
      .sort((a, b) => {
        switch (sort) {
          case "price_asc":
            return startingPrice(a, Math.min) - startingPrice(b, Math.min);
          case "price_desc":
            return startingPrice(b, Math.max) - startingPrice(a, Math.max);
          case "newest":
            return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
          default:
            return a.name.localeCompare(b.name);
        }
      })
      .map(getGalleryItem)
      .filter((item): item is GalleryItem => item !== null);
  }, [products, categories, selectedCategoryId, search, sort, user]);

  const sections = useMemo<Section[]>(() => {
    const within = (categoryId: number) => {
      const ids = new Set(getDescendantCategoryIds(categoryId, categories));
      return items.filter((i) => i.product.category_id !== null && ids.has(i.product.category_id));
    };
    const result: Section[] = [];

    if (selectedCategoryId === null) {
      const recent = [...items].sort((a, b) => createdAt(b) - createdAt(a)).slice(0, 15);
      if (recent.length) result.push({ key: "recent", title: "Recently added", items: recent });

      const roots = buildCategoryTree(categories);
      roots.forEach((root) => {
        const list = within(root.id);
        if (list.length) result.push({ key: `c${root.id}`, title: root.name, items: list, categoryId: root.id });
      });

      const categorised = new Set(roots.flatMap((root) => within(root.id).map((i) => i.product.id)));
      const rest = items.filter((i) => !categorised.has(i.product.id));
      if (rest.length) result.push({ key: "rest", title: "More", items: rest });
      return result;
    }

    const direct = items.filter((i) => i.product.category_id === selectedCategoryId);
    const current = categories.find((c) => c.id === selectedCategoryId);
    if (direct.length && current) result.push({ key: `c${current.id}`, title: current.name, items: direct });
    categories
      .filter((c) => c.parent_id === selectedCategoryId)
      .forEach((child) => {
        const list = within(child.id);
        if (list.length) result.push({ key: `c${child.id}`, title: child.name, items: list, categoryId: child.id });
      });
    return result;
  }, [items, categories, selectedCategoryId]);

  const bannerItems = useMemo(() => {
    const seen = new Set<number>();
    return sections.flatMap((section) => section.items).filter((item) => {
      if (seen.has(item.product.id)) return false;
      seen.add(item.product.id);
      return true;
    });
  }, [sections]);
  const featuredItem = bannerItems.find((item) => item.product.id === featuredItemId) ?? bannerItems[0] ?? items[0] ?? null;

  const navigateBanner = (direction: -1 | 1) => {
    if (bannerItems.length < 2 || !featuredItem) return;
    const currentIndex = bannerItems.findIndex((item) => item.product.id === featuredItem.product.id);
    const nextIndex = (currentIndex + direction + bannerItems.length) % bannerItems.length;
    setFeaturedItemId(bannerItems[nextIndex].product.id);
  };

  const breadcrumbs = useMemo(() => {
    const trail: Category[] = [];
    let current: Category | undefined = categories.find((c) => c.id === selectedCategoryId);
    while (current) {
      trail.unshift(current);
      const parentId: number | null = current.parent_id;
      current = categories.find((c) => c.id === parentId);
    }
    return trail;
  }, [categories, selectedCategoryId]);

  const openItem = (item: GalleryItem, list: GalleryItem[]) => {
    if (item.kind === "pdf") {
      setPdfItem(item);
      return;
    }
    const media = list.filter((i) => i.kind === "image" || i.kind === "video");
    setViewer({ items: media, index: media.findIndex((i) => i.product.id === item.product.id) });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const tileWidth = GALLERY_SIZE_PX[size];
  const showRows = layout === "rows" && !search.trim() && sections.length > 1;
  const columnWidth = `min(${tileWidth}px, 44vw)`;

  return (
    <div className="relative overflow-x-clip">
      <CategorySidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        onSelect={handleCategorySelect}
      />

      <div className="flex flex-col gap-5 px-3 py-3 md:p-4" onContextMenu={(e) => e.preventDefault()}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav aria-label="Breadcrumb" className="flex min-w-0 flex-wrap items-center gap-x-2 text-sm">
            <button type="button" className="text-primary hover:underline" onClick={() => handleCategorySelect(null)}>
              All Items
            </button>
            {breadcrumbs.map((category, index) => (
              <span key={category.id} className="flex items-center gap-2">
                <span className="text-muted-foreground">/</span>
                {index === breadcrumbs.length - 1 ? (
                  <span className="font-medium text-foreground">{category.name}</span>
                ) : (
                  <button type="button" className="text-primary hover:underline" onClick={() => handleCategorySelect(category.id)}>
                    {category.name}
                  </button>
                )}
              </span>
            ))}
            <span className="text-xs text-muted-foreground">
              · {items.length} {items.length === 1 ? "item" : "items"}
            </span>
          </nav>
          <GalleryToolbar layout={layout} onLayoutChange={setLayout} size={size} onSizeChange={setSize} />
        </div>

        {featuredItem && (
          <GalleryHero
            item={featuredItem}
            onOpen={(item) => openItem(item, items)}
            onNavigate={navigateBanner}
            canNavigate={bannerItems.length > 1}
          />
        )}

        {items.length === 0 && (
          <p className="py-16 text-center text-muted-foreground">Nothing to show here yet.</p>
        )}

        {items.length > 0 && showRows && (
          <div className="space-y-7">
            {sections.map((section) => (
              <GalleryRow
                key={section.key}
                title={section.title}
                items={section.items}
                tileWidth={tileWidth}
                onOpen={(item) => openItem(item, section.items)}
                onHover={(item) => setFeaturedItemId(item.product.id)}
                onSeeAll={section.categoryId ? () => handleCategorySelect(section.categoryId!) : undefined}
              />
            ))}
          </div>
        )}

        {items.length > 0 && !showRows && layout === "masonry" && (
          <div style={{ columnWidth, columnGap: "0.75rem" }}>
            {items.map((item) => (
              <div key={item.product.id} className="mb-3 break-inside-avoid">
                <GalleryTile item={item} natural onOpen={() => openItem(item, items)} onHover={(hovered) => setFeaturedItemId(hovered.product.id)} />
              </div>
            ))}
          </div>
        )}

        {items.length > 0 && !showRows && layout !== "masonry" && (
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${columnWidth}, 1fr))` }}>
            {items.map((item) => (
              <GalleryTile
                key={item.product.id}
                item={item}
                onOpen={() => openItem(item, items)}
                onHover={(hovered) => setFeaturedItemId(hovered.product.id)}
              />
            ))}
          </div>
        )}
      </div>

      <GalleryViewer
        items={viewer?.items ?? []}
        index={viewer?.index ?? null}
        onIndexChange={(index) => setViewer((current) => current && { ...current, index })}
        onClose={() => setViewer(null)}
      />

      <PDFViewerDialogProtected
        open={pdfItem !== null}
        onOpenChange={(open) => !open && setPdfItem(null)}
        pdfUrl={pdfItem?.fullUrl ?? null}
        isPrivateProduct={pdfItem?.isPrivate ?? false}
      />
    </div>
  );
}
