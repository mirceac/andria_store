import { useQuery } from "@tanstack/react-query";
import { SelectProduct } from "@db/schema";
import { FileText, FileImage, Loader2, XCircle, ShoppingCart } from "lucide-react";
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
import { useCart } from "@/hooks/use-cart";

export default function HomePage() {
  const { search } = useSearch();
  const { sort } = useSort();
  const { addToCart, items: cartItems } = useCart();
  const [timestamp, setTimestamp] = useState(Date.now());
  const [selectedProduct, setSelectedProduct] = useState<SelectProduct | null>(null);
  const [isVariantDialogOpen, setIsVariantDialogOpen] = useState(false);

  // Initialize timestamp once, but don't refresh it periodically
  useEffect(() => {
    // Set timestamp only once when the component mounts
    setTimestamp(Date.now());
    // No interval to prevent reloading icons
  }, []);

  const { data: products, isLoading } = useQuery<SelectProduct[]>({
    queryKey: ["/api/products"],
  });

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
    
    return matchesSearch;
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
        <div className="w-full h-full flex items-center justify-center">
          <ImageThumbnail
            productId={product.id}
            imageUrl={`${product.image_file}?v=${timestamp}`}
            imageData={null}
            alt={product.name}
            width={180}
            height={180}
            className="max-w-full max-h-full object-contain pointer-events-none select-none"
            showTryDirect={false}
          />
        </div>
      );
    } else if (product.image_data) {
      // 2. Image DB
      return (
        <div className="w-full h-full flex items-center justify-center">
          <ImageThumbnail
            productId={product.id}
            imageUrl={`/api/products/${product.id}/img?v=${timestamp}`}
            imageData={product.image_data}
            alt={product.name}
            width={180}
            height={180}
            className="max-w-full max-h-full object-contain pointer-events-none select-none"
            showTryDirect={false}
          />
        </div>
      );
    } else if (product.pdf_file) {
      // 3. PDF File
      return (
        <div className="w-full h-full flex items-center justify-center">
          <PDFThumbnail
            pdfUrl={`${product.pdf_file}?v=${timestamp}`}
            width={180}
            height={180}
            className="max-w-full max-h-full pointer-events-none select-none"
            showTryDirect={false}
          />
        </div>
      );
    } else if (product.pdf_data) {
      // 4. PDF DB
      return (
        <div className="w-full h-full flex items-center justify-center">
          <PDFThumbnail
            pdfUrl={`${getPdfUrl(product.id)}?v=${timestamp}`}
            width={180}
            height={180}
            className="max-w-full max-h-full pointer-events-none select-none"
            showTryDirect={false}
          />
        </div>
      );
    } else if (product.storage_url) {
      // 5. External Storage URL
      const isImageUrl = product.storage_url.match(/\.(jpeg|jpg|gif|png|webp|bmp|svg)$/i) || 
                        (!product.storage_url.match(/\.(pdf)$/i) && 
                         (product.storage_url.includes('image') || 
                          product.storage_url.includes('img') || 
                          product.storage_url.includes('photo') ||
                          product.storage_url.includes('picture')));
      
      const isPdfUrl = product.storage_url.match(/\.(pdf)$/i);
      
      if (isImageUrl) {
        // External Image URL
        return (
          <div className="w-full h-full flex items-center justify-center">
            <ExternalUrlThumbnail
              url={product.storage_url}
              width={180}
              height={180}
              className="max-w-full max-h-full pointer-events-none select-none"
              showTryDirect={false}
            />
          </div>
        );
      } else if (isPdfUrl) {
        // External PDF URL
        return (
          <div className="w-full h-full flex items-center justify-center">
            <PDFThumbnail
              pdfUrl={product.storage_url}
              width={180}
              height={180}
              className="max-w-full max-h-full pointer-events-none select-none"
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
    <div className="container mx-auto px-0.5 py-1">
  <div 
    className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8 2xl:grid-cols-10 gap-1" 
    style={{maxWidth: '100vw', overflow: 'hidden'}}
    onContextMenu={(e) => e.preventDefault()} // Prevent right-click context menu
  >
        {filteredProducts?.map((product) => (
          <div 
            key={`${product.id}-${timestamp}`}
            className={cn(
              "flex flex-col h-[290px] rounded border hover:shadow-sm transition-shadow bg-gray-50 overflow-hidden",
              product.stock > 0 
                ? "border-slate-200 hover:border-blue-200" 
                : "border-red-200 hover:border-red-300"
            )}
            style={{maxWidth: '100%', minWidth: 0}}
            onContextMenu={(e) => e.preventDefault()} // Prevent right-click on individual products
          >
            {/* Content based on priority */}
            <div 
              className="relative w-full h-[200px] flex items-center justify-center p-1 border-b overflow-hidden"
              onContextMenu={(e) => e.preventDefault()} // Prevent right-click on thumbnails
            >
              {getContentByPriority(product)}
            </div>
            
            {/* Product info section with Add to Cart */}
            <div className="px-1 py-0.5 flex flex-col flex-shrink-0 flex-grow min-w-0">
              <h3 className="font-medium text-sm text-slate-900 line-clamp-1 truncate" style={{maxWidth: '100%'}}>{product.name}</h3>
              
              {/* Price display - show range if multiple variants */}
              <div className="mt-0.5">
                {(() => {
                  const digitalPrice = Number(product.price || 0); // price field is digital price
                  const physicalPrice = product.physical_price ? Number(product.physical_price) : null;
                  
                  if (digitalPrice > 0 && physicalPrice && physicalPrice > 0) {
                    const minPrice = Math.min(digitalPrice, physicalPrice);
                    const maxPrice = Math.max(digitalPrice, physicalPrice);
                    if (minPrice === maxPrice) {
                      return <span className="text-sm font-semibold text-slate-900">${minPrice.toFixed(2)}</span>;
                    }
                    return <span className="text-sm font-semibold text-slate-900">${minPrice.toFixed(2)} - ${maxPrice.toFixed(2)}</span>;
                  } else if (digitalPrice > 0) {
                    return <span className="text-sm font-semibold text-slate-900">${digitalPrice.toFixed(2)}</span>;
                  } else if (physicalPrice && physicalPrice > 0) {
                    return <span className="text-sm font-semibold text-slate-900">${physicalPrice.toFixed(2)}</span>;
                  } else {
                    return <span className="text-sm font-semibold text-slate-900">$0.00</span>;
                  }
                })()}
              </div>
              
              {/* Availability status */}
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
              
              {/* Add to Cart Button */}
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
                className="mt-1 w-full h-7 text-xs"
                variant="default"
                style={{maxWidth: '100%', minWidth: 0, overflow: 'hidden'}}
              >
                <ShoppingCart className="mr-1 h-3 w-3" />
                {(() => {
                  const existingPhysicalItem = cartItems.find(item => 
                    item.product.id === product.id && item.variant_type === 'physical'
                  );
                  const hasPhysical = product.physical_price && Number(product.physical_price) > 0;
                  const physicalStock = product.stock || 0;
                  
                  if (hasPhysical && existingPhysicalItem && existingPhysicalItem.quantity >= physicalStock) {
                    return "Max Stock Reached";
                  }
                  return "Add to Cart";
                })()}
              </Button>
            </div>
          </div>
        ))}
      </div>
      
      {/* Variant Selection Dialog */}
      {selectedProduct && (
        <VariantSelectionDialog
          open={isVariantDialogOpen}
          onOpenChange={setIsVariantDialogOpen}
          product={selectedProduct}
        />
      )}
    </div>
  );
}