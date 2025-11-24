import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { SelectProduct } from "@db/schema";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { Loader2, ShoppingCart, XCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { PDFThumbnail } from "@/components/pdf-thumbnail";
import { PDFViewerDialog } from "@/components/pdf-viewer-dialog";
import { ImageViewerDialog } from "@/components/image-viewer-dialog";
import { getPdfUrl } from "@/lib/pdf-worker";

export default function ProductPage() {
  const [, params] = useRoute("/product/:id");
  const { addToCart } = useCart();
  const [timestamp, setTimestamp] = useState(Date.now());
  const [selectedPdf, setSelectedPdf] = useState<string | null>(null);
  const [isPdfViewerOpen, setIsPdfViewerOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);

  // Set timestamp only once when the component mounts
  useEffect(() => {
    setTimestamp(Date.now());
  }, []);

  const { data: product, isLoading } = useQuery<SelectProduct>({
    queryKey: [`/api/products/${params?.id}`],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!product) return null;

  // Helper function to get content based on priority
  const getProductMedia = () => {
    if (product.image_file) {
      // 1. Image File (highest priority)
      const imageUrl = `${product.image_file}?v=${timestamp}`;
      return (
        <div className="aspect-square bg-white rounded-md border overflow-hidden flex items-center justify-center">
          <img 
            src={imageUrl}
            alt={product.name}
            className="max-w-full max-h-full object-contain cursor-zoom-in"
            onClick={() => {
              setSelectedImage(imageUrl);
              setIsImageViewerOpen(true);
            }}
          />
        </div>
      );
    } else if (product.image_data) {
      // 2. Image DB
      const imageUrl = `/api/products/${product.id}/img?v=${timestamp}`;
      return (
        <div className="aspect-square bg-white rounded-md border overflow-hidden flex items-center justify-center">
          <img 
            src={imageUrl}
            alt={product.name}
            className="max-w-full max-h-full object-contain cursor-zoom-in"
            onClick={() => {
              setSelectedImage(imageUrl);
              setIsImageViewerOpen(true);
            }}
          />
        </div>
      );
    } else if (product.pdf_file) {
      // 3. PDF File
      const pdfUrl = `${product.pdf_file}?v=${timestamp}`;
      return (
        <div className="aspect-square bg-white rounded-md border overflow-hidden flex items-center justify-center p-4">
          <PDFThumbnail
            pdfUrl={pdfUrl}
            onClick={() => {
              setSelectedPdf(pdfUrl);
              setIsPdfViewerOpen(true);
            }}
            width={300}
            height={400}
          />
        </div>
      );
    } else if (product.pdf_data) {
      // 4. PDF DB
      const pdfUrl = `${getPdfUrl(product.id)}?v=${timestamp}`;
      return (
        <div className="aspect-square bg-white rounded-md border overflow-hidden flex items-center justify-center p-4">
          <PDFThumbnail
            pdfUrl={pdfUrl}
            onClick={() => {
              setSelectedPdf(pdfUrl);
              setIsPdfViewerOpen(true);
            }}
            width={300}
            height={400}
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
        const proxyUrl = `/api/proxy/image?url=${encodeURIComponent(product.storage_url || '')}&v=${timestamp}`;
        return (
          <div className="aspect-square bg-white rounded-md border overflow-hidden flex items-center justify-center">
            <img 
              src={proxyUrl}
              alt={product.name}
              className="max-w-full max-h-full object-contain cursor-zoom-in"
              onClick={() => {
                setSelectedImage(proxyUrl);
                setIsImageViewerOpen(true);
              }}
            />
          </div>
        );
      } else if (isPdfUrl) {
        // External PDF URL
        return (
          <div className="aspect-square bg-white rounded-md border overflow-hidden flex items-center justify-center p-4">
            <PDFThumbnail
              pdfUrl={product.storage_url}
              onClick={() => {
                setSelectedPdf(product.storage_url);
                setIsPdfViewerOpen(true);
              }}
              width={300}
              height={400}
            />
          </div>
        );
      } else {
        // External URL that doesn't match specific patterns - default to image treatment
        const proxyUrl = `/api/proxy/image?url=${encodeURIComponent(product.storage_url || '')}&v=${timestamp}`;
        return (
          <div className="aspect-square bg-white rounded-md border overflow-hidden flex items-center justify-center">
            <img 
              src={proxyUrl}
              alt={product.name}
              className="max-w-full max-h-full object-contain cursor-zoom-in"
              onClick={() => {
                setSelectedImage(proxyUrl);
                setIsImageViewerOpen(true);
              }}
            />
          </div>
        );
      }
    }
    
    // 6. No content available - show X icon
    return (
      <div className="aspect-square bg-gray-100 rounded-md border flex items-center justify-center">
        <XCircle className="h-16 w-16 text-gray-300" />
      </div>
    );
  };

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
      <div className="grid md:grid-cols-2 gap-8">
        <div>
          {getProductMedia()}
        </div>
        
        <div className="space-y-6">
          <h1 className="text-4xl font-bold">{product.name}</h1>
          
          {/* Hide price for private products */}
          {product.is_public !== false && (
            <p className="text-3xl font-semibold">${Number(product.price).toFixed(2)}</p>
          )}
          
          <p className="text-muted-foreground">{product.description}</p>

          {/* Hide stock and add to cart for private products */}
          {product.is_public !== false && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Stock: {product.stock} units
              </p>
              <Button
                className="btn-primary"
                onClick={() => addToCart(product)}
              >
                <ShoppingCart className="mr-2 h-4 w-4" />
                Add to Cart
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {/* Image Viewer Dialog */}
      <ImageViewerDialog
        open={isImageViewerOpen}
        onOpenChange={setIsImageViewerOpen}
        url={selectedImage}
      />
      
      {/* PDF Viewer Dialog */}
      <PDFViewerDialog
        open={isPdfViewerOpen}
        onOpenChange={setIsPdfViewerOpen}
        pdfUrl={selectedPdf}
      />
    </div>
  );
}
