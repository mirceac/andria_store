import { useQuery } from "@tanstack/react-query";
import { SelectProduct } from "@db/schema";
import { FileText, FileImage, Loader2, XCircle, ShoppingCart, Filter, ChevronRight, ChevronDown, Menu, X, User, Package } from "lucide-react";
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
              "hover:bg-gray-50 active:bg-gray-100",
              isSelected && "bg-indigo-50 border border-indigo-200 shadow-sm",
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
                    "hover:bg-gray-200 active:bg-gray-300",
                    isSelected && "hover:bg-indigo-200 active:bg-indigo-300"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCategoryExpansion(category.id);
                  }}
                >
                  {isExpanded ? (
                    <ChevronDown className={cn(
                      "h-3.5 w-3.5 transition-colors duration-200",
                      isSelected ? "text-indigo-700" : "text-gray-600"
                    )} />
                  ) : (
                    <ChevronRight className={cn(
                      "h-3.5 w-3.5 transition-colors duration-200",
                      isSelected ? "text-indigo-700" : "text-gray-600"
                    )} />
                  )}
                </button>
              )}
              {!categoryHasChildren && (
                <div className="w-5 mr-2 flex justify-center">
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full transition-colors duration-200",
                    isSelected ? "bg-indigo-500" : "bg-gray-400"
                  )}></div>
                </div>
              )}
              <span className={cn(
                "truncate text-sm font-medium transition-colors duration-200",
                isSelected ? "text-indigo-900" : "text-gray-700",
                "group-hover:text-gray-900"
              )}>
                {category.name}
              </span>
            </div>
          </div>
        </div>
        {categoryHasChildren && isExpanded && (
          <div className="ml-1 relative">
            <div className="absolute left-2 top-0 bottom-0 w-px bg-gray-200"></div>
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
            className="max-w-full max-h-full object-contain select-none hover:opacity-80 transition-opacity"
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
            className="max-w-full max-h-full object-contain select-none hover:opacity-80 transition-opacity"
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
    <div className="flex min-h-screen relative w-full overflow-x-hidden max-w-full">
      {/* Mobile Header */}
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 min-h-[60px]">
            <Button
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                setSidebarOpen(!sidebarOpen);
              }}
              className="h-10 w-10 p-0 flex-shrink-0"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <h1 className="text-lg font-semibold text-gray-900 mx-2">Store</h1>
            
            {/* Navigation buttons */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                variant="ghost"
                onClick={() => setLocation("/cart")}
                className="h-10 w-10 p-0 relative flex-shrink-0"
                title="Cart"
              >
                <ShoppingCart className="h-5 w-5" />
                {cartItems.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center leading-none">
                    {cartItems.length}
                  </span>
                )}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setLocation("/orders")}
                className="h-10 w-10 p-0 flex-shrink-0"
                title="Orders"
              >
                <Package className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                className="flex items-center gap-2 px-3 h-10 min-w-[90px]"
                onClick={() => {
                  if (user) {
                    logoutMutation.mutate(undefined, {
                      onSuccess: () => setLocation("/auth"),
                    });
                  } else {
                    setLocation("/auth");
                  }
                }}
                title={user ? "Sign Out" : "Sign In"}
              >
                <User className="h-5 w-5" />
                {user ? (
                  <span className="font-medium text-slate-700">{user.username} (Sign Out)</span>
                ) : (
                  <span className="font-medium text-slate-700">Sign In</span>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar Overlay - Shows when sidebar is open */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Fixed position, slides in from left on both mobile and desktop */}
      <div className={cn(
        "fixed left-0 top-0 bottom-0 z-50 w-64 bg-white border-r border-gray-200 shadow-lg transform transition-transform duration-300",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className={cn("p-4", isMobile && "pt-20")}> {/* Add top padding on mobile for header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">
              Categories
            </h2>
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
                "hover:bg-gray-50 active:bg-gray-100",
                selectedCategoryId === null && "bg-indigo-50 border border-indigo-200 shadow-sm",
                selectedCategoryId !== null && "border border-transparent"
              )}
              onClick={() => handleCategorySelect(null)}
            >
              <span className={cn(
                "text-sm font-medium transition-colors duration-200",
                selectedCategoryId === null ? "text-indigo-900" : "text-gray-700",
                "hover:text-gray-900"
              )}>
                All Products
              </span>
            </div>
            <div className="h-px bg-gray-200 my-3"></div>
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
        "flex-1 w-full",
        isMobile ? "pt-20 px-2 py-4" : "p-4"
      )}>
        <div>
          {/* Breadcrumb Navigation */}
          {selectedCategoryId && categories && (
            <div className="mb-6 border-b border-gray-200 pb-3">
              <nav className="flex items-center space-x-1 text-sm">
                <button
                  className="text-blue-600 hover:text-blue-800 hover:underline transition-colors"
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
                          className="text-blue-600 hover:text-blue-800 hover:underline transition-colors"
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
        
        <div 
          className={cn(
            "grid gap-2 w-full", 
            // Mobile-first responsive grid
            "grid-cols-2", // 2 columns on mobile
            "sm:grid-cols-3", // 3 columns on small screens
            "md:grid-cols-4", // 4 columns on medium screens
            "lg:grid-cols-5", // 5 columns on large screens
            "xl:grid-cols-6", // 6 columns on extra large screens
            "2xl:grid-cols-8" // 8 columns on 2xl screens
          )}
          style={{maxWidth: '100%', overflow: 'hidden'}}
          onContextMenu={(e) => e.preventDefault()} // Prevent right-click context menu
        >
        {filteredProducts?.map((product) => (
          <div 
            key={`${product.id}-${timestamp}`}
            className={cn(
              "flex flex-col rounded border hover:shadow-sm transition-shadow bg-gray-50 overflow-hidden w-full",
              // Mobile-optimized heights
              isMobile ? "h-[260px]" : "h-[290px]",
              product.stock > 0 
                ? "border-slate-200 hover:border-blue-200" 
                : "border-red-200 hover:border-red-300"
            )}
            style={{maxWidth: '100%', minWidth: 0}}
            onContextMenu={(e) => e.preventDefault()} // Prevent right-click on individual products
          >
            {/* Content based on priority */}
            <div 
              className={cn(
                "relative w-full flex items-center justify-center p-1 border-b overflow-hidden",
                // Mobile-optimized image heights
                isMobile ? "h-[180px]" : "h-[200px]"
              )}
              onContextMenu={(e) => e.preventDefault()} // Prevent right-click on thumbnails
            >
              {getContentByPriority(product)}
            </div>
            
            {/* Product info section */}
            <div className={cn(
              "px-1 py-0.5 flex flex-col flex-shrink-0 flex-grow min-w-0 w-full overflow-hidden",
              isMobile && "px-2 py-1", // Slightly more padding on mobile
              product.is_public === false && "justify-center items-center py-2" // Center for private products
            )}>
              <h3 className={cn(
                "font-medium text-slate-900 line-clamp-1 truncate w-full",
                isMobile ? "text-xs" : "text-sm", // Smaller text on mobile
                product.is_public === false && "text-center font-serif italic text-base" // Elegant styling for private products
              )} style={{maxWidth: '100%'}}>{product.name}</h3>
              
              {/* Price display - hidden for private products */}
              {product.is_public !== false && (
                <div className="mt-0.5">
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
                <div className="mt-0.5 mb-0.5">
                  {(() => {
                    const hasDigital = Number(product.price || 0) > 0; // price field is digital price
                    const hasPhysical = product.physical_price && Number(product.physical_price) > 0;
                    const physicalStock = product.stock || 0;
                    const physicalAvailable = hasPhysical && physicalStock > 0;
                    
                    if (hasDigital && physicalAvailable) {
                      return (
                        <Badge variant="default" className="text-xs px-2 py-0.5 bg-green-50 text-green-700 hover:bg-green-100">
                          Physical
                        </Badge>
                      );
                    } else if (hasDigital) {
                      return (
                        <Badge variant="default" className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 hover:bg-blue-100">
                          Digital
                        </Badge>
                      );
                    } else if (physicalAvailable) {
                      return (
                        <Badge variant="default" className="text-xs px-2 py-0.5 bg-green-50 text-green-700 hover:bg-green-100">
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
                  className={`mt-1 w-full ${isMobile ? 'h-6 text-xs' : 'h-7 text-xs'}`}
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