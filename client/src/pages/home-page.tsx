import { useQuery } from "@tanstack/react-query";
import { SelectProduct } from "@db/schema";
import { Loader2, ShoppingCart, XCircle } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import { PDFThumbnail } from "@/components/pdf-thumbnail";
import { PDFViewerDialog, PDFViewer } from "@/components/pdf-viewer-dialog";
import { ImageViewerDialog } from "@/components/image-viewer-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getPdfUrl } from "@/lib/pdf-worker";
import { useSearch } from "@/contexts/search-context";
import { useSort } from "@/contexts/sort-context";
import { cn } from "@/lib/utils";

export default function HomePage() {
  const { search } = useSearch();
  const { sort } = useSort();
  const [selectedPdf, setSelectedPdf] = useState<string | null>(null);
  const [isPdfViewerOpen, setIsPdfViewerOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<SelectProduct | null>(null);
  const [timestamp, setTimestamp] = useState(Date.now());

  // Add timestamp refresh to prevent stale cache
  useEffect(() => {
    const interval = setInterval(() => {
      setTimestamp(Date.now());
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const { data: products, isLoading } = useQuery<SelectProduct[]>({
    queryKey: ["/api/products"],
  });

  const { addToCart } = useCart();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const filteredProducts = products
    ?.filter((product) =>
      product.name.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      switch (sort) {
        case "price_asc":
          return a.price - b.price;
        case "price_desc":
          return b.price - a.price;
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
        <div className="w-full h-full flex items-center justify-center bg-white">
          <img 
            src={`${product.image_file}?v=${timestamp}`}
            alt={product.name}
            className="max-w-full max-h-full object-contain p-0.5"
            onClick={() => {
              setSelectedImage(`${product.image_file}?v=${timestamp}`);
              setSelectedProduct(product);
              setIsImageViewerOpen(true);
            }}
          />
        </div>
      );
    } else if (product.image_data) {
      // 2. Image DB
      return (
        <div className="w-full h-full flex items-center justify-center bg-white">
          <img 
            src={`/api/products/${product.id}/img?v=${timestamp}`}
            alt={product.name}
            className="max-w-full max-h-full object-contain p-0.5"
            onClick={() => {
              setSelectedImage(`/api/products/${product.id}/img?v=${timestamp}`);
              setSelectedProduct(product);
              setIsImageViewerOpen(true);
            }}
          />
        </div>
      );
    } else if (product.pdf_file) {
      // 3. PDF File
      return (
        <div className="w-full h-full flex items-center justify-center">
          <PDFThumbnail
            pdfUrl={`${product.pdf_file}?v=${timestamp}`}
            onClick={() => {
              setSelectedPdf(`${product.pdf_file}?v=${timestamp}`);
              setSelectedProduct(product);
              setIsPdfViewerOpen(true);
            }}
            className="h-full"
          />
        </div>
      );
    } else if (product.pdf_data) {
      // 4. PDF DB
      return (
        <div className="w-full h-full flex items-center justify-center">
          <PDFThumbnail
            pdfUrl={`${getPdfUrl(product.id)}?v=${timestamp}`}
            onClick={() => {
              setSelectedPdf(`${getPdfUrl(product.id)}?v=${timestamp}`);
              setSelectedProduct(product);
              setIsPdfViewerOpen(true);
            }}
            className="h-full"
          />
        </div>
      );
    } else {
      // 5. No content available - show X icon
      return (
        <div className="w-full h-full flex items-center justify-center">
          <XCircle className="h-8 w-8 text-gray-300" />
        </div>
      );
    }
  };

  return (
    <div className="container mx-auto px-0.5 py-1">
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8 2xl:grid-cols-10 gap-1">
        {filteredProducts?.map((product) => (
          <div 
            key={`${product.id}-${timestamp}`}
            className={cn(
              "flex flex-col h-[290px] rounded border hover:shadow-sm transition-shadow bg-gray-50",
              product.stock > 0 
                ? "border-slate-200 hover:border-blue-200" 
                : "border-red-200 hover:border-red-300"
            )}
          >
            {/* Content based on priority */}
            <div className="relative w-full h-[200px] flex items-center justify-center p-0.5 border-b">
              {getContentByPriority(product)}
            </div>
            
            {/* Product info section with Add to Cart */}
            <div className="px-1 py-0.5 flex flex-col flex-shrink-0 flex-grow">
              <h3 className="font-medium text-sm text-slate-900 line-clamp-1">{product.name}</h3>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-sm font-semibold text-slate-900">${product.price.toFixed(2)}</span>
                <Badge 
                  variant={product.stock > 0 ? "default" : "destructive"} 
                  className={cn(
                    "text-xs px-2 py-0.5",
                    product.stock > 0 
                      ? "bg-blue-50 text-blue-700 hover:bg-blue-100" 
                      : "bg-red-50 text-red-700 hover:bg-red-100"
                  )}
                >
                  {product.stock > 0 ? "In Stock" : "Out of Stock"}
                </Badge>
              </div>
              
              {/* Add to Cart Button */}
              <Button 
                onClick={() => addToCart(product)} 
                disabled={product.stock <= 0}
                className="mt-1 w-full h-7 text-xs"
                variant="default"
              >
                <ShoppingCart className="mr-1 h-3 w-3" />
                Add to Cart
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* PDF Viewer Dialog */}
      <PDFViewerDialog
        open={isPdfViewerOpen}
        onOpenChange={setIsPdfViewerOpen}
        pdfUrl={selectedPdf}
        title={selectedProduct?.name}
      />
      
      {/* Image Viewer Dialog */}
      <ImageViewerDialog
        open={isImageViewerOpen}
        onOpenChange={setIsImageViewerOpen}
        url={selectedImage}
      />
    </div>
  );
}