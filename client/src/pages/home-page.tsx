import { useQuery } from "@tanstack/react-query";
import { SelectProduct } from "@db/schema";
import { Loader2, ShoppingCart } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { PDFThumbnail } from "@/components/pdf-thumbnail";
import { PDFViewerDialog, PDFViewer } from "@/components/pdf-viewer-dialog";
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
  const [selectedProduct, setSelectedProduct] = useState<SelectProduct | null>(null);

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

  return (
    <div className="container mx-auto px-0.5 py-1">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-0.5">
        {filteredProducts?.map((product) => (
          <div 
            key={product.id} 
            className={cn(
              "flex flex-col h-[260px] rounded border hover:shadow-sm transition-shadow bg-gray-50",
              product.stock > 0 
                ? "border-slate-200 hover:border-blue-200" 
                : "border-red-200 hover:border-red-300"
            )}
          >
            {/* Adjusted thumbnail container */}
            <div className="relative w-full h-[200px] flex items-center justify-center p-0.5">
              <PDFThumbnail
                pdfUrl={getPdfUrl(product.id)}
                onClick={() => {
                  setSelectedPdf(getPdfUrl(product.id));
                  setSelectedProduct(product);
                  setIsPdfViewerOpen(true);
                }}
                className="w-full h-full object-contain rounded-t"
              />
            </div>
            {/* Reduced padding and text section height */}
            <div className="px-1 py-0.5 flex flex-col flex-shrink-0">
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
    </div>
  );
}