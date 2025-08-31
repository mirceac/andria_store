import { useQuery, useQueryClient } from "@tanstack/react-query"; // Added useQueryClient
import { SelectProduct } from "@db/schema";
import { Loader2, ShoppingCart, Database, HardDrive, FileText, Image } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react"; // Added useEffect
import { PDFThumbnail } from "@/components/pdf-thumbnail";
import { PDFViewerDialog } from "@/components/pdf-viewer-dialog";
import { ImageThumbnail } from "../components/image-thumbnail";
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
  // Add refresh key to force re-rendering when products change
  const [refreshKey, setRefreshKey] = useState(Date.now());
  
  const queryClient = useQueryClient();

  const { data: products, isLoading } = useQuery<SelectProduct[]>({
    queryKey: ["/api/products"],
  });

  const { addToCart } = useCart();

  // Effect to detect changes in products and update the refresh key
  useEffect(() => {
    const timer = setTimeout(() => {
      setRefreshKey(Date.now());
    }, 300); // Small delay to ensure data is loaded
    
    return () => clearTimeout(timer);
  }, [products]);

  // Function to ensure PDF URLs have a cache-busting parameter
  const getFilePdfUrl = (pdfPath: string) => {
    // Add a timestamp to prevent caching issues
    if (pdfPath.includes('?')) {
      return `${pdfPath}&v=${refreshKey}`;
    } else {
      return `${pdfPath}?v=${refreshKey}`;
    }
  };

  // For database PDFs, use the API endpoint with cache busting
  const getDbPdfUrl = (productId: number) => {
    return `${getPdfUrl(productId)}?v=${refreshKey}`;
  };

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

  // Handler for cart operations that refreshes products
  const handleAddToCart = async (product: SelectProduct) => {
    await addToCart(product);
    // Force refresh product list after cart operation
    queryClient.invalidateQueries({ queryKey: ["/api/products"] });
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {filteredProducts?.map((product) => (
          <div 
            key={`${product.id}-${refreshKey}`} // Add refresh key to force re-render
            className={cn(
              "flex flex-col h-[380px] rounded-lg border-2 hover:shadow-md transition-shadow bg-gray-50",
              product.stock > 0 
                ? "border-slate-200 hover:border-blue-200" 
                : "border-red-200 hover:border-red-300"
            )}
          >
            {/* Thumbnails grid */}
            <div className="relative w-full h-[280px] grid grid-cols-2 gap-3 p-3">
              {/* Image File Thumbnail */}
              <div className="relative flex flex-col items-center justify-center bg-white border rounded-md overflow-hidden h-[130px]">
                <span className="absolute top-1 left-1 text-[10px] bg-gray-100 rounded-sm px-1 py-0.5 flex items-center opacity-80 z-10">
                  <HardDrive className="h-3 w-3 mr-0.5" />Img
                </span>
                <div className="w-full h-full flex items-center justify-center p-3">
                  {product.image_file ? (
                    <ImageThumbnail 
                      productId={product.id}
                      imageUrl={`${product.image_file}?v=${refreshKey}`} // Add cache busting
                      imageData={null}
                      alt={product.name}
                      onClick={() => {
                        setSelectedImage(`${product.image_file}?v=${refreshKey}`);
                        setSelectedProduct(product);
                        setIsImageViewerOpen(true);
                      }}
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                      <Image className="h-8 w-8 text-gray-300" />
                    </div>
                  )}
                </div>
              </div>
              
              {/* Image DB Thumbnail */}
              <div className="relative flex flex-col items-center justify-center bg-white border rounded-md overflow-hidden h-[130px]">
                <span className="absolute top-1 left-1 text-[10px] bg-gray-100 rounded-sm px-1 py-0.5 flex items-center opacity-80 z-10">
                  <Database className="h-3 w-3 mr-0.5" />Img
                </span>
                <div className="w-full h-full flex items-center justify-center p-3">
                  {product.image_data ? (
                    <ImageThumbnail 
                      productId={product.id}
                      imageUrl={null}
                      imageData={product.image_data}
                      alt={product.name}
                      onClick={() => {
                        setSelectedImage(`/api/products/${product.id}/img?v=${refreshKey}`);
                        setSelectedProduct(product);
                        setIsImageViewerOpen(true);
                      }}
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                      <Image className="h-8 w-8 text-gray-300" />
                    </div>
                  )}
                </div>
              </div>
              
              {/* PDF File Thumbnail */}
              <div className="relative flex flex-col items-center justify-center bg-white border rounded-md overflow-hidden h-[130px]">
                <span className="absolute top-1 left-1 text-[10px] bg-gray-100 rounded-sm px-1 py-0.5 flex items-center opacity-80 z-10">
                  <HardDrive className="h-3 w-3 mr-0.5" />PDF
                </span>
                <div className="w-full h-full flex items-center justify-center">
                  {product.pdf_file ? (
                    <PDFThumbnail
                      pdfUrl={getFilePdfUrl(product.pdf_file)}
                      onClick={() => {
                        if (product.pdf_file) {
                          const url = getFilePdfUrl(product.pdf_file);
                          console.log("Opening PDF from file:", url);
                          setSelectedPdf(url);
                          setSelectedProduct(product);
                          setIsPdfViewerOpen(true);
                        }
                      }}
                      className="w-24 h-24"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                      <FileText className="h-8 w-8 text-gray-300" />
                    </div>
                  )}
                </div>
              </div>
              
              {/* PDF DB Thumbnail */}
              <div className="relative flex flex-col items-center justify-center bg-white border rounded-md overflow-hidden h-[130px]">
                <span className="absolute top-1 left-1 text-[10px] bg-gray-100 rounded-sm px-1 py-0.5 flex items-center opacity-80 z-10">
                  <Database className="h-3 w-3 mr-0.5" />PDF
                </span>
                <div className="w-full h-full flex items-center justify-center">
                  {product.pdf_data ? (
                    <PDFThumbnail
                      pdfUrl={getDbPdfUrl(product.id)}
                      onClick={() => {
                        const url = getDbPdfUrl(product.id);
                        console.log("Opening PDF from DB:", url);
                        setSelectedPdf(url);
                        setSelectedProduct(product);
                        setIsPdfViewerOpen(true);
                      }}
                      className="w-24 h-24"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                      <FileText className="h-8 w-8 text-gray-300" />
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Product info section */}
            <div className="px-4 py-2 flex flex-col flex-shrink-0">
              <h3 className="font-medium text-base text-slate-900 line-clamp-1">{product.name}</h3>
              <div className="flex items-center justify-between mt-2">
                <span className="text-base font-semibold text-slate-900">${product.price.toFixed(2)}</span>
                <Badge 
                  variant={product.stock > 0 ? "default" : "destructive"} 
                  className={cn(
                    "text-xs px-2 py-1",
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
      
      {/* Image Viewer Dialog */}
      <ImageViewerDialog
        open={isImageViewerOpen}
        onOpenChange={setIsImageViewerOpen}
        url={selectedImage}
      />
    </div>
  );
}