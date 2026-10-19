import { useQuery } from "@tanstack/react-query";
import { SelectProduct } from "@db/schema";
import { FileText, FileImage, Loader2, XCircle, ShoppingCart, Filter, ChevronRight, ChevronDown, Menu, X, User, Package, LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import { PDFThumbnail } from "@/components/pdf-thumbnail";
import { ImageThumbnail } from "@/components/image-thumbnail";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getPdfUrl } from "@/lib/pdf-worker";
import { useSearch } from "@/contexts/search-context";
import { useSort } from "@/contexts/sort-context";
import { cn } from "@/lib/utils";
import { ExternalUrlThumbnail } from "@/components/external-url-thumbnail";
import { VariantSelectionDialog } from "@/components/variant-selection-dialog";
import { ImageViewerDialogProtected } from "@/components/image-viewer-dialog-protected";
import { PDFViewerDialogProtected } from "@/components/pdf-viewer-dialog-protected";
import { useCart } from "@/hooks/use-cart";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";

// Overrides the thumbnails' fixed pixel size so images fill the card instead of leaving side gutters
const THUMB_FILL_CLASS =
  "!h-full !w-full !rounded-none !border-0 !bg-transparent [&>img]:h-full [&>img]:w-full select-none hover:opacity-80 transition-opacity";

type Category = {
  id: number;
  name: string;
  description: string | null;
  parent_id: number | null;
  user_id?: number | null;
  username?: string | null;
  is_public?: boolean;
  hidden?: boolean;
  created_at: string;
};

export default function HomePage() {
  const { search } = useSearch();
  const { sort } = useSort();
  const { addToCart, items: cartItems } = useCart();
  const { user, logoutMutation } = useAuth();
  const isMobile = useIsMobile();
  const [, setLocation] = useLocation();
  const [timestamp, setTimestamp] = useState(Date.now());
  const [selectedProduct, setSelectedProduct] = useState<SelectProduct | null>(null);
  const [isVariantDialogOpen, setIsVariantDialogOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false); // Default closed
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [isPdfViewerOpen, setIsPdfViewerOpen] = useState(false);
  const [selectedPdfUrl, setSelectedPdfUrl] = useState<string | null>(null);
  const [selectedImageIsPrivate, setSelectedImageIsPrivate] = useState(false);
  const [selectedPdfIsPrivate, setSelectedPdfIsPrivate] = useState(false);

  // Read category from URL query parameter on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const categoryParam = params.get('category');
    if (categoryParam) {
      const categoryId = parseInt(categoryParam, 10);
      if (!isNaN(categoryId)) {
        setSelectedCategoryId(categoryId);
      }
    }
  }, []);

  // Close sidebar when category is selected on mobile
  const handleCategorySelect = (categoryId: number | null) => {
    setSelectedCategoryId(categoryId);
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  // Initialize timestamp once, but don't refresh it periodically
  useEffect(() => {
    // Set timestamp only once when the component mounts
    setTimestamp(Date.now());
    // No interval to prevent reloading icons
  }, []);

  // Listen for sidebar toggle event from navbar
  useEffect(() => {
    const handleToggleSidebar = () => {
      setSidebarOpen(prev => !prev);
    };
    
    window.addEventListener('toggleSidebar', handleToggleSidebar);
    return () => window.removeEventListener('toggleSidebar', handleToggleSidebar);
  }, []);

  // Listen for category selection from vertical menu
  useEffect(() => {
    const handleSelectCategory = (e: CustomEvent) => {
      const { categoryId } = e.detail;
      setSelectedCategoryId(categoryId);
    };
    
    window.addEventListener('selectCategory', handleSelectCategory as EventListener);
    return () => window.removeEventListener('selectCategory', handleSelectCategory as EventListener);
  }, []);

  // Close sidebar on mobile when screen size changes
  useEffect(() => {
    if (isMobile && sidebarOpen) {
      setSidebarOpen(false);
    }
  }, [isMobile]);

  // Home page always shows the public gallery (public products + user's own if logged in)
  const { data: products, isLoading } = useQuery<SelectProduct[]>({
    queryKey: ["/api/products"],
    refetchOnWindowFocus: true, // Refetch when user returns to the tab
    staleTime: 0, // Consider data stale immediately to ensure fresh data
  });

  // Use /api/categories/tree for the public sidebar menu (hides hidden categories from everyone)
  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/categories/tree"],
    refetchOnWindowFocus: true, // Refetch when user returns to the tab
    staleTime: 0, // Consider data stale immediately to ensure fresh data
  });

  // Helper functions for hierarchical categories
  type CategoryWithChildren = Category & { children: CategoryWithChildren[] };
  type CategoryWithLevel = Category & { level: number };

  const buildCategoryTree = (categories: Category[]): CategoryWithChildren[] => {
    const categoryMap = new Map<number, CategoryWithChildren>();
    const rootCategories: CategoryWithChildren[] = [];
    
    // First pass: create map of all categories with children array
    categories.forEach(category => {
      categoryMap.set(category.id, { ...category, children: [] });
    });
    
    // Second pass: build hierarchy
    categories.forEach(category => {
      const categoryWithChildren = categoryMap.get(category.id)!;
      if (category.parent_id) {
        const parent = categoryMap.get(category.parent_id);
        if (parent) {
          parent.children.push(categoryWithChildren);
        }
      } else {
        rootCategories.push(categoryWithChildren);
      }
    });
    
    return rootCategories;
  };

  const flattenCategories = (categories: CategoryWithChildren[], level = 0): CategoryWithLevel[] => {
    const result: CategoryWithLevel[] = [];
    
    categories.forEach(category => {
      result.push({ ...category, level });
      if (category.children.length > 0) {
        result.push(...flattenCategories(category.children, level + 1));
      }
    });
    
    return result;
  };

  const hierarchicalCategories = categories ? flattenCategories(buildCategoryTree(categories)) : [];

  // Function to toggle category expansion
  const toggleCategoryExpansion = (categoryId: number) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  // Function to check if category has children
  const hasChildren = (categoryId: number): boolean => {
    return categories ? categories.some(cat => cat.parent_id === categoryId) : false;
  };

  // Recursive tree component
  const CategoryTreeNode = ({ category, level = 0 }: { category: CategoryWithChildren; level?: number }) => {
    const isExpanded = expandedCategories.has(category.id);
    const categoryHasChildren = category.children.length > 0;
    const isSelected = selectedCategoryId === category.id;
    
    return (
      <div key={category.id} className="select-none">
        <div className="flex items-center group">
          <div
            className={cn(
              "flex-1 flex items-center h-9 px-2 rounded-md cursor-pointer transition-all duration-200",
              "hover:bg-muted active:bg-muted/80",
              isSelected && "bg-accent border border-primary/20 shadow-sm",
              !isSelected && "border border-transparent"
            )}
            style={{ 
              paddingLeft: `${0.5 + level * 1.5}rem`,
              marginLeft: level > 0 ? '0.25rem' : '0'
            }}
            onClick={() => handleCategorySelect(category.id)}
          >
            <div className="flex items-center w-full">
              {categoryHasChildren && (
                <button
                  className={cn(
                    "p-1 mr-2 rounded-sm flex items-center justify-center w-5 h-5 transition-all duration-200",
                    "hover:bg-muted active:bg-muted/80",
                    isSelected && "hover:bg-accent active:bg-accent/80"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCategoryExpansion(category.id);
                  }}
                >
                  {isExpanded ? (
                    <ChevronDown className={cn(
                      "h-3.5 w-3.5 transition-colors duration-200",
                      isSelected ? "text-primary" : "text-muted-foreground"
                    )} />
                  ) : (
                    <ChevronRight className={cn(
                      "h-3.5 w-3.5 transition-colors duration-200",
                      isSelected ? "text-primary" : "text-muted-foreground"
                    )} />
                  )}
                </button>
              )}
              {!categoryHasChildren && (
                <div className="w-5 mr-2 flex justify-center">
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full transition-colors duration-200",
                    isSelected ? "bg-primary" : "bg-muted-foreground/60"
                  )}></div>
                </div>
              )}
              <span className={cn(
                "truncate text-sm font-medium transition-colors duration-200",
                isSelected ? "text-foreground" : "text-muted-foreground",
                "group-hover:text-foreground"
              )}>
                {category.name}
              </span>
            </div>
          </div>
        </div>
        {categoryHasChildren && isExpanded && (
          <div className="ml-1 relative">
            <div className="absolute left-2 top-0 bottom-0 w-px bg-border"></div>
            <div className="ml-1">
              {category.children.map((child) => (
                <CategoryTreeNode key={child.id} category={child} level={level + 1} />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Function to get all descendant category IDs for filtering
  const getDescendantCategoryIds = (categoryId: number, categories: Category[]): number[] => {
    const descendants: number[] = [categoryId];
    const children = categories.filter(cat => cat.parent_id === categoryId);
    
    children.forEach(child => {
      descendants.push(...getDescendantCategoryIds(child.id, categories));
    });
    
    return descendants;
  };

  const handleAddToCartClick = (product: SelectProduct) => {
    const hasDigital = Number(product.price || 0) > 0; // price field is digital price
    const hasPhysical = product.physical_price && Number(product.physical_price) > 0;
    
    // Check if product is already in cart
    const existingPhysicalItem = cartItems.find(item => 
      item.product.id === product.id && item.variant_type === 'physical'
    );
    const existingDigitalItem = cartItems.find(item => 
      item.product.id === product.id && item.variant_type === 'digital'
    );
    
    // If only digital is available (no physical variant exists at all), add directly to cart
    if (hasDigital && !hasPhysical) {
      // Don't add if physical version is already in cart (physical includes digital)
      if (existingPhysicalItem) {
        return;
      }
      addToCart(product, 1, 'digital');
      return;
    }
    
    // If physical variant exists, check stock limits before showing dialog
    if (hasPhysical && existingPhysicalItem) {
      const currentQuantity = existingPhysicalItem.quantity;
      const maxStock = product.stock || 0;
      if (currentQuantity >= maxStock) {
        // Already at max stock, don't show dialog
        return;
      }
    }
    
    // Show the variant selection dialog
    setSelectedProduct(product);
    setIsVariantDialogOpen(true);
  };

  // Helper function to determine if watermark should be hidden for a product
  const shouldHideWatermark = (product: SelectProduct): boolean => {
    // Hide watermark for all private products (is_public === false)
    // Private products are portfolio items, not for sale, so no watermark needed
    const result = product.is_public === false;
    console.log('shouldHideWatermark check:', {
      productId: product.id,
      productName: product.name,
      is_public: product.is_public,
      result: result
    });
    return result;
  };

  const handleImageClick = (imageUrl: string, hideWatermark: boolean = false) => {
    console.log('handleImageClick called:', { imageUrl, hideWatermark });
    setSelectedImageUrl(imageUrl);
    setSelectedImageIsPrivate(hideWatermark);
    setIsImageViewerOpen(true);
  };

    const handlePdfClick = (pdfUrl: string, hideWatermark: boolean = false) => {
    console.log('handlePdfClick called:', { pdfUrl, hideWatermark });
    setSelectedPdfUrl(pdfUrl);
    setSelectedPdfIsPrivate(hideWatermark);
    setIsPdfViewerOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const filteredProducts = products?.filter((product) => {
    const matchesSearch = search
      ? product.name.toLowerCase().includes(search.toLowerCase()) ||
        product.description?.toLowerCase().includes(search.toLowerCase())
      : true;
    
    const matchesCategory = selectedCategoryId 
      ? getDescendantCategoryIds(selectedCategoryId, categories || []).includes(product.category_id!)
      : true;
    
    // Visibility logic:
    // 1. If hidden=true -> not visible in gallery (only in admin/profile panels)
    // 2. If is_public=false -> visible only to the owner (admin/creator) in gallery
    // 3. If is_public=true -> visible to everyone including guests
    
    const isOwner = user && product.user_id === user.id;
    const isSystemProduct = product.user_id === null;
    const isAdminViewingSystemProduct = user?.is_admin && isSystemProduct;
    
    // Debug logging when a category is selected
    if (selectedCategoryId && matchesCategory) {
      console.log('Product in selected category:', {
        name: product.name,
        id: product.id,
        category_id: product.category_id,
        user_id: product.user_id,
        is_public: product.is_public,
        hidden: product.hidden,
        isOwner,
        isSystemProduct,
        isAdminViewingSystemProduct,
        currentUserId: user?.id,
        currentUserIdType: typeof user?.id,
        productUserIdType: typeof product.user_id,
        strictEquality: product.user_id === user?.id,
        looseEquality: product.user_id == user?.id,
        isAdmin: user?.is_admin
      });
    }
    
    // If the product is hidden, don't show it in the gallery at all
    if (product.hidden) {
      return false;
    }
    
    // If the product is public, show it to everyone
    if (product.is_public !== false) { // Default to true if undefined/null
      return matchesSearch && matchesCategory;
    }
    
    // If the product is not public (private), show it to:
    // - The owner (with explicit type conversion to handle any mismatches)
    // - Admin viewing system products (user_id is null)
    const userIdMatch = user && (product.user_id === user.id || Number(product.user_id) === Number(user.id));
    if (userIdMatch || isAdminViewingSystemProduct) {
      return matchesSearch && matchesCategory;
    }
    
    // Don't show private products to other users
    console.log('Filtering out private product:', product.name, 'userIdMatch:', userIdMatch, 'user.id:', user?.id, 'product.user_id:', product.user_id);
    return false;
  }).sort((a, b) => {
    switch (sort) {
      case "price_asc":
        const priceA = Math.min(
          ...[Number(a.price || 0), a.physical_price ? Number(a.physical_price) : Infinity].filter(p => p > 0)
        );
        const priceB = Math.min(
          ...[Number(b.price || 0), b.physical_price ? Number(b.physical_price) : Infinity].filter(p => p > 0)
        );
        return priceA - priceB;
      case "price_desc":
        const priceDescA = Math.max(
          ...[Number(a.price || 0), a.physical_price ? Number(a.physical_price) : 0].filter(p => p > 0)
        );
        const priceDescB = Math.max(
          ...[Number(b.price || 0), b.physical_price ? Number(b.physical_price) : 0].filter(p => p > 0)
        );
        return priceDescB - priceDescA;
      case "name":
        return a.name.localeCompare(b.name);
      default:
        return 0;
    }
  });

  // Helper function to get content based on priority
  const getContentByPriority = (product: SelectProduct) => {
    if (product.image_file) {
      // 1. Image File (highest priority)
      return (
        <div 
          className="w-full h-full flex items-center justify-center cursor-pointer"
          onClick={() => handleImageClick(`${product.image_file}?v=${timestamp}`, shouldHideWatermark(product))}
          title="Click to view full size image"
        >
          <ImageThumbnail
            productId={product.id}
            imageUrl={`${product.image_file}?v=${timestamp}`}
            imageData={null}
            alt={product.name}
            width={180}
            height={180}
            className={THUMB_FILL_CLASS}
            showTryDirect={false}
            onClick={() => handleImageClick(`${product.image_file}?v=${timestamp}`, shouldHideWatermark(product))}
          />
        </div>
      );
    } else if (product.image_data) {
      // 2. Image DB
      return (
        <div 
          className="w-full h-full flex items-center justify-center cursor-pointer"
          onClick={() => handleImageClick(`/api/products/${product.id}/img?v=${timestamp}`, shouldHideWatermark(product))}
          title="Click to view full size image"
        >
          <ImageThumbnail
            productId={product.id}
            imageUrl={`/api/products/${product.id}/img?v=${timestamp}`}
            imageData={product.image_data}
            alt={product.name}
            width={180}
            height={180}
            className={THUMB_FILL_CLASS}
            showTryDirect={false}
            onClick={() => handleImageClick(`/api/products/${product.id}/img?v=${timestamp}`, shouldHideWatermark(product))}
          />
        </div>
      );
    } else if (product.pdf_file) {
      // 3. PDF File
      return (
        <div 
          className="w-full h-full flex items-center justify-center cursor-pointer"
          onClick={() => handlePdfClick(`${product.pdf_file}?v=${timestamp}`, shouldHideWatermark(product))}
          title="Click to view full size PDF"
        >
          <PDFThumbnail
            pdfUrl={`${product.pdf_file}?v=${timestamp}`}
            width={130}
            height={182}
            showTryDirect={false}
          />
        </div>
      );
    } else if (product.pdf_data) {
      // 4. PDF DB
      return (
        <div 
          className="w-full h-full flex items-center justify-center cursor-pointer"
          onClick={() => handlePdfClick(`${getPdfUrl(product.id)}?v=${timestamp}`, shouldHideWatermark(product))}
          title="Click to view full size PDF"
        >
          <PDFThumbnail
            pdfUrl={`${getPdfUrl(product.id)}?v=${timestamp}`}
            width={130}
            height={182}
            showTryDirect={false}
          />
        </div>
      );
    } else if (product.storage_url) {
      // 5. External Storage URL
      // Check for PDF first (more specific)
      const isPdfUrl = product.storage_url.match(/\.(pdf)(\?|$)/i) ||
                      product.storage_url.includes('pdf') ||
                      product.storage_url.includes('document');
      
      // Check for image only if it's not a PDF
      const isImageUrl = !isPdfUrl && (
                        product.storage_url.match(/\.(jpeg|jpg|gif|png|webp|bmp|svg)(\?|$)/i) || 
                        (product.storage_url.includes('image') || 
                         product.storage_url.includes('img') || 
                         product.storage_url.includes('photo') ||
                         product.storage_url.includes('picture') ||
                         product.storage_url.includes('imgur') ||
                         product.storage_url.includes('cloudinary') ||
                         product.storage_url.includes('unsplash')));
      
      if (isImageUrl) {
        // External Image URL
        return (
          <div 
            className="w-full h-full flex items-center justify-center cursor-pointer"
            onClick={() => handleImageClick(product.storage_url!, shouldHideWatermark(product))}
            title="Click to view full size image"
          >
            <ExternalUrlThumbnail
              url={product.storage_url}
              width={130}
              height={182}
              className={THUMB_FILL_CLASS}
              showTryDirect={false}
            />
          </div>
        );
      } else if (isPdfUrl) {
        // External PDF URL
        return (
          <div 
            className="w-full h-full flex items-center justify-center cursor-pointer"
            onClick={() => handlePdfClick(product.storage_url!, shouldHideWatermark(product))}
            title="Click to view full size PDF"
          >
            <PDFThumbnail
              pdfUrl={product.storage_url}
              width={130}
              height={182}
              showTryDirect={false}
            />
          </div>
        );
      } else {
        // External URL that doesn't match image or PDF patterns - treat as generic external content
        return (
          <div 
            className="w-full h-full flex items-center justify-center cursor-pointer"
            onClick={() => {
              // Try to determine if it should be treated as image or PDF based on content
              if (product.storage_url) {
                if (product.storage_url.includes('pdf') || product.storage_url.toLowerCase().includes('document')) {
                  handlePdfClick(product.storage_url, shouldHideWatermark(product));
                } else {
                  handleImageClick(product.storage_url, shouldHideWatermark(product));
                }
              }
            }}
            title="Click to view external content"
          >
            <ExternalUrlThumbnail
              url={product.storage_url}
              width={130}
              height={182}
              showTryDirect={false}
            />
          </div>
        );
      }
    }
    
    // 6. No content available - show X icon
    return (
      <div className="w-full h-full flex items-center justify-center">
        <XCircle className="h-8 w-8 text-gray-300" />
      </div>
    );
  };

  return (
    <div className={`flex relative overflow-x-hidden ${isMobile ? '' : 'ml-16'}`} style={{ width: isMobile ? '100vw' : 'calc(100vw - 64px)' }}>

      {/* Sidebar Overlay - Shows when sidebar is open */}
      {sidebarOpen && (
        <div 
          className="fixed inset-x-0 bottom-0 top-16 z-40 bg-foreground/30 backdrop-blur-[1px] md:left-16"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - slides out from the left rail on desktop, from the screen edge on mobile */}
      <div className={cn(
        "fixed bottom-0 left-0 top-16 z-40 w-72 max-w-[85vw] overflow-y-auto border-r border-border bg-chrome shadow-xl transition-transform duration-300 md:left-16",
        sidebarOpen ? "translate-x-0" : "-translate-x-full md:-translate-x-[calc(100%+4rem)]"
      )}>
        <div className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/80">Browse</p>
              <h2 className="font-serif text-xl text-foreground">Categories</h2>
            </div>
            <Button
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                setSidebarOpen(false);
              }}
              className="h-8 w-8 p-0 flex-shrink-0"
              title="Close sidebar"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="space-y-1">
            <div
              className={cn(
                "flex items-center h-9 px-2 rounded-md cursor-pointer transition-all duration-200",
                "hover:bg-muted active:bg-muted/80",
                selectedCategoryId === null && "bg-accent border border-primary/20 shadow-sm",
                selectedCategoryId !== null && "border border-transparent"
              )}
              onClick={() => handleCategorySelect(null)}
            >
              <span className={cn(
                "text-sm font-medium transition-colors duration-200",
                selectedCategoryId === null ? "text-foreground" : "text-muted-foreground",
                "hover:text-foreground"
              )}>
                All Products
              </span>
            </div>
            <div className="my-3 h-px bg-border"></div>
            <div className="space-y-0.5">
              {buildCategoryTree(categories || []).map((category) => (
                <CategoryTreeNode key={category.id} category={category} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Full width since sidebar is fixed overlay */}
      <div className={cn(
        "flex-1 max-w-full",
        isMobile ? "pt-20 px-2 pb-4" : "p-4"
      )}>
        <div>
          <section className="relative mb-6 flex min-h-[160px] items-center overflow-hidden rounded-2xl border border-primary/15 bg-chrome px-5 py-5 sm:px-8 sm:py-6">
            <div className="pointer-events-none absolute -right-12 -top-20 hidden h-80 w-80 rounded-full border border-primary/10 md:block" />
            <div className="pointer-events-none absolute -right-3 -top-11 hidden h-64 w-64 rounded-full border border-primary/10 md:block" />
            <svg
              aria-hidden="true"
              className="pointer-events-none absolute bottom-0 right-0 hidden h-full w-[44%] text-primary/25 md:block"
              viewBox="0 0 360 260"
              fill="none"
              preserveAspectRatio="xMidYMax meet"
            >
              <path d="M44 260V128a136 136 0 0 1 272 0v132" stroke="currentColor" strokeWidth="1.5" />
              <path d="M81 260V130a99 99 0 0 1 198 0v130" stroke="currentColor" strokeWidth="1.5" />
              <path d="M118 260V132a62 62 0 0 1 124 0v128" stroke="currentColor" strokeWidth="1.5" />
              <path d="M22 259.5h316M99 219h162M99 237h162" stroke="currentColor" strokeWidth="1" />
              <path d="M180 65v195M144 260v-83h72v83" stroke="currentColor" strokeWidth="1" />
            </svg>
            <div className="relative z-10 w-full">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-primary sm:text-xs">
                A considered collection
              </p>
              <p className="max-w-lg font-serif text-xl leading-snug text-foreground sm:text-2xl">
                Browse by category to narrow the collection
              </p>

              {(() => {
                const roots = buildCategoryTree(categories || []);
                if (roots.length === 0) return null;

                // Path from the top-level category down to the selected one
                const path: CategoryWithChildren[] = [];
                const findPath = (nodes: CategoryWithChildren[]): boolean =>
                  nodes.some((node) => {
                    path.push(node);
                    if (node.id === selectedCategoryId || findPath(node.children)) return true;
                    path.pop();
                    return false;
                  });
                if (selectedCategoryId) findPath(roots);

                const activeRoot = path[0];
                const chip = (active: boolean) =>
                  cn(
                    "shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-primary/20 bg-white/70 text-foreground hover:border-primary/50 hover:bg-white"
                  );
                const rowClass =
                  "-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-hide sm:flex-wrap sm:overflow-visible md:max-w-[75%]";

                return (
                  <div className="mt-4 space-y-2">
                    <div className={rowClass} role="tablist" aria-label="Categories">
                      <button type="button" className={chip(selectedCategoryId === null)} onClick={() => handleCategorySelect(null)}>
                        All
                      </button>
                      {roots.map((root) => (
                        <button
                          key={root.id}
                          type="button"
                          className={chip(activeRoot?.id === root.id)}
                          onClick={() => handleCategorySelect(root.id)}
                        >
                          {root.name}
                        </button>
                      ))}
                    </div>
                    {activeRoot && activeRoot.children.length > 0 && (
                      <div className={cn(rowClass, "border-t border-primary/10 pt-2")}>
                        <button
                          type="button"
                          className={chip(selectedCategoryId === activeRoot.id)}
                          onClick={() => handleCategorySelect(activeRoot.id)}
                        >
                          All {activeRoot.name}
                        </button>
                        {activeRoot.children.map((child) => (
                          <button
                            key={child.id}
                            type="button"
                            className={chip(path.some((p) => p.id === child.id))}
                            onClick={() => handleCategorySelect(child.id)}
                          >
                            {child.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </section>

          {/* Breadcrumb Navigation */}
          {selectedCategoryId && categories && (
            <div className="mb-6 border-b border-gray-200 pb-3">
              <nav className="flex items-center space-x-1 text-sm">
                <button
                  className="text-primary hover:text-primary/80 hover:underline transition-colors"
                  onClick={() => handleCategorySelect(null)}
                >
                  All Products
                </button>
                {(() => {
                  const selectedCategory = categories.find(c => c.id === selectedCategoryId);
                  if (!selectedCategory) return null;
                  
                  const breadcrumbs: Category[] = [];
                  let current: Category | null = selectedCategory;
                  
                  while (current) {
                    breadcrumbs.unshift(current);
                    current = categories.find(c => c.id === current?.parent_id) || null;
                  }
                  
                  return breadcrumbs.map((category, index) => (
                    <div key={category.id} className="flex items-center">
                      <span className="text-gray-400 mx-2">/</span>
                      {index === breadcrumbs.length - 1 ? (
                        <span className="font-medium text-gray-900">{category.name}</span>
                      ) : (
                        <button
                          className="text-primary hover:text-primary/80 hover:underline transition-colors"
                          onClick={() => handleCategorySelect(category.id)}
                        >
                          {category.name}
                        </button>
                      )}
                    </div>
                  ));
                })()}
              </nav>
            </div>
          )}

        <section>
          <div className="mb-3 flex justify-end">
            <p className="text-xs text-muted-foreground sm:text-sm">
              {filteredProducts?.length ?? 0} {filteredProducts?.length === 1 ? "piece" : "pieces"}
            </p>
          </div>

        <div 
          className={cn(
            "grid w-full gap-2.5 sm:gap-4",
            // Mobile-first responsive grid
            "grid-cols-2", // 2 columns on mobile
            "sm:grid-cols-3", // 3 columns on small screens
            "md:grid-cols-4", // 4 columns on medium screens
            "lg:grid-cols-5", // 5 columns on large screens
            "xl:grid-cols-6", // 6 columns on extra large screens
            "2xl:grid-cols-7" // 7 columns on 2xl screens
          )}
          style={{maxWidth: '100%', overflow: 'hidden'}}
          onContextMenu={(e) => e.preventDefault()} // Prevent right-click context menu
        >
        {filteredProducts?.map((product) => (
          <div 
            key={`${product.id}-${timestamp}`}
            className={cn(
              "flex flex-col self-start rounded-xl border border-border/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg w-full overflow-hidden",
              product.stock > 0 
                ? "border-border"
                : "border-red-200 hover:border-red-300"
            )}
            style={{maxWidth: '100%', minWidth: 0}}
            onContextMenu={(e) => e.preventDefault()} // Prevent right-click on individual products
          >
            {/* Content based on priority */}
            <div 
              className={cn(
                "relative w-full flex items-center justify-center overflow-hidden border-b border-border/60 bg-gradient-to-br from-[#f6f4ee] to-[#e9eee8] p-2",
                // Mobile-optimized image heights
                isMobile ? "h-[165px]" : "h-[195px]"
              )}
              onContextMenu={(e) => e.preventDefault()} // Prevent right-click on thumbnails
            >
              {getContentByPriority(product)}
            </div>
            
            {/* Product info section - sizes to its content so public and private cards stay compact */}
            <div className={cn(
              "flex w-full min-w-0 flex-col gap-1 px-3 py-2.5 overflow-hidden",
              product.is_public === false && "items-center justify-center py-3" // Center for private products
            )}>
              <h3 className={cn(
                "font-medium text-foreground line-clamp-1 truncate w-full",
                isMobile ? "text-xs" : "text-sm", // Smaller text on mobile
                product.is_public === false && "text-center font-serif italic text-base" // Elegant styling for private products
              )} style={{maxWidth: '100%'}}>{product.name}</h3>
              
              {/* Price display - hidden for private products */}
              {product.is_public !== false && (
                <div>
                  {(() => {
                    const digitalPrice = Number(product.price || 0); // price field is digital price
                    const physicalPrice = product.physical_price ? Number(product.physical_price) : null;
                    
                    if (digitalPrice > 0 && physicalPrice && physicalPrice > 0) {
                      const minPrice = Math.min(digitalPrice, physicalPrice);
                      const maxPrice = Math.max(digitalPrice, physicalPrice);
                      if (minPrice === maxPrice) {
                        return <span className={cn("font-semibold text-slate-900", isMobile ? "text-xs" : "text-sm")}>${minPrice.toFixed(2)}</span>;
                      }
                      return <span className={cn("font-semibold text-slate-900", isMobile ? "text-xs" : "text-sm")}>${minPrice.toFixed(2)} - ${maxPrice.toFixed(2)}</span>;
                    } else if (digitalPrice > 0) {
                      return <span className={cn("font-semibold text-slate-900", isMobile ? "text-xs" : "text-sm")}>${digitalPrice.toFixed(2)}</span>;
                    } else if (physicalPrice && physicalPrice > 0) {
                      return <span className={cn("font-semibold text-slate-900", isMobile ? "text-xs" : "text-sm")}>${physicalPrice.toFixed(2)}</span>;
                    } else {
                      return <span className={cn("font-semibold text-slate-900", isMobile ? "text-xs" : "text-sm")}>$0.00</span>;
                    }
                  })()}
                </div>
              )}
              
              {/* Availability status - hidden for private products */}
              {product.is_public !== false && (
                <div className="flex">
                  {(() => {
                    const hasDigital = Number(product.price || 0) > 0; // price field is digital price
                    const hasPhysical = product.physical_price && Number(product.physical_price) > 0;
                    const physicalStock = product.stock || 0;
                    const physicalAvailable = hasPhysical && physicalStock > 0;
                    
                    if (hasDigital && physicalAvailable) {
                      return (
                        <Badge variant="default" className="text-xs px-2 py-0.5 bg-secondary text-secondary-foreground hover:bg-secondary/80">
                          Physical
                        </Badge>
                      );
                    } else if (hasDigital) {
                      return (
                        <Badge variant="default" className="text-xs px-2 py-0.5 bg-accent text-accent-foreground hover:bg-accent/80">
                          Digital
                        </Badge>
                      );
                    } else if (physicalAvailable) {
                      return (
                        <Badge variant="default" className="text-xs px-2 py-0.5 bg-secondary text-secondary-foreground hover:bg-secondary/80">
                          Physical ({physicalStock} left)
                        </Badge>
                      );
                    } else {
                      return (
                        <Badge variant="destructive" className="text-xs px-2 py-0.5">
                          Out of Stock
                        </Badge>
                      );
                    }
                  })()}
                </div>
              )}
              
              {/* Add to Cart Button - hidden for private products */}
              {product.is_public !== false && (
                <Button 
                  onClick={() => handleAddToCartClick(product)}
                  disabled={(() => {
                    const hasDigital = Number(product.price || 0) > 0; // price field is digital price
                    const hasPhysical = product.physical_price && Number(product.physical_price) > 0;
                    const physicalStock = product.stock || 0;
                    const physicalAvailable = hasPhysical && physicalStock > 0;
                    
                    // Check if already at stock limit for physical items
                    const existingPhysicalItem = cartItems.find(item => 
                      item.product.id === product.id && item.variant_type === 'physical'
                    );
                    const existingDigitalItem = cartItems.find(item => 
                      item.product.id === product.id && item.variant_type === 'digital'
                    );
                    
                    // Disable if no variants available
                    if (!hasDigital && !physicalAvailable) return true;
                    
                    // Disable if physical is at max stock
                    if (hasPhysical && existingPhysicalItem && existingPhysicalItem.quantity >= physicalStock) return true;
                    
                    // Disable if trying to add digital but physical already in cart
                    if (hasDigital && !hasPhysical && existingPhysicalItem) return true;
                    
                    return false;
                  })()}
                  className={`mt-0.5 w-full ${isMobile ? 'h-7 text-xs' : 'h-8 text-xs'}`}
                  variant="default"
                  style={{maxWidth: '100%', minWidth: 0, overflow: 'hidden'}}
                >
                  <ShoppingCart className={`${isMobile ? 'mr-0.5 h-2.5 w-2.5' : 'mr-1 h-3 w-3'}`} />
                  {(() => {
                    const existingPhysicalItem = cartItems.find(item => 
                      item.product.id === product.id && item.variant_type === 'physical'
                    );
                    const hasPhysical = product.physical_price && Number(product.physical_price) > 0;
                    const physicalStock = product.stock || 0;
                    
                    if (hasPhysical && existingPhysicalItem && existingPhysicalItem.quantity >= physicalStock) {
                      return isMobile ? "Max Stock" : "Max Stock Reached";
                    }
                    return isMobile ? "Add" : "Add to Cart";
                  })()}
                </Button>
              )}
            </div>
          </div>
        ))}
        </div>
        </section>
        </div> {/* Close main content inner div */}
      </div> {/* Close main content div */}
      
      {/* Variant Selection Dialog */}
      {selectedProduct && (
        <VariantSelectionDialog
          open={isVariantDialogOpen}
          onOpenChange={setIsVariantDialogOpen}
          product={selectedProduct}
        />
      )}

      {/* Image Viewer Dialog */}
      <ImageViewerDialogProtected
        open={isImageViewerOpen}
        onOpenChange={setIsImageViewerOpen}
        url={selectedImageUrl}
        isPrivateProduct={selectedImageIsPrivate}
      />

      {/* PDF Viewer Dialog */}
      <PDFViewerDialogProtected
        open={isPdfViewerOpen}
        onOpenChange={setIsPdfViewerOpen}
        pdfUrl={selectedPdfUrl}
        isPrivateProduct={selectedPdfIsPrivate}
      />
    </div>
  );
}