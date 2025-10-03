import { Link } from "wouter";
import { SelectProduct } from "@db/schema";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { ShoppingCart, XCircle } from "lucide-react";
import { useState } from "react";

interface ProductCardProps {
  product: SelectProduct;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart();
  const [selectedVariant, setSelectedVariant] = useState<'digital' | 'physical'>('digital');

  // Get product media based on priority (same as home page and cart)
  const getProductMediaUrl = (product: SelectProduct): { url: string | null; type: 'image' | 'pdf' } => {
    // 1. Image File (highest priority)
    if (product.image_file) {
      return { url: product.image_file, type: 'image' };
    }
    
    // 2. Image DB
    if (product.image_data) {
      return { url: `/api/products/${product.id}/img`, type: 'image' };
    }
    
    // 3. PDF File
    if (product.pdf_file) {
      return { url: product.pdf_file, type: 'pdf' };
    }
    
    // 4. PDF DB
    if (product.pdf_data) {
      return { url: `/api/products/${product.id}/pdf`, type: 'pdf' };
    }
    
    // 5. External Storage URL
    if (product.storage_url) {
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
        return { url: product.storage_url, type: 'image' };
      } else if (isPdfUrl) {
        return { url: product.storage_url, type: 'pdf' };
      } else {
        // Default to image for unknown external URLs
        return { url: product.storage_url, type: 'image' };
      }
    }
    
    return { url: null, type: 'image' };
  };

  const mediaInfo = getProductMediaUrl(product);
  const hasMedia = mediaInfo.url !== null;

  // Get pricing based on variant
  const getPrice = () => {
    if (selectedVariant === 'physical' && product.has_physical_variant) {
      return parseFloat(product.physical_price || '0');
    }
    return parseFloat(product.price);
  };

  const getStock = () => {
    if (selectedVariant === 'physical' && product.has_physical_variant) {
      return product.stock; // Physical stock
    }
    return Infinity; // Digital products have unlimited stock
  };

  const getStockDisplay = () => {
    if (selectedVariant === 'physical' && product.has_physical_variant) {
      return `${product.stock} in stock`;
    }
    return 'Digital - Always Available';
  };

  const isOutOfStock = () => {
    if (selectedVariant === 'physical' && product.has_physical_variant) {
      return product.stock === 0;
    }
    return false; // Digital products are never out of stock
  };

  const handleAddToCart = () => {
    addToCart(product, 1, selectedVariant);
  };

  return (
    <Card className="overflow-hidden">
      <Link href={`/product/${product.id}`}>
        <div className="aspect-square overflow-hidden bg-gray-50 flex items-center justify-center">
          {hasMedia ? (
            mediaInfo.type === 'image' ? (
              <img
                src={mediaInfo.url!}
                alt={product.name}
                className="w-full h-full object-cover transition-transform hover:scale-105"
              />
            ) : (
              <div className="flex flex-col items-center justify-center w-full h-full">
                <div className="text-blue-500 mb-1">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M9 15H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M9 18H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span className="text-sm text-blue-600">PDF Document</span>
              </div>
            )
          ) : (
            <XCircle className="h-10 w-10 text-gray-300 m-8" />
          )}
        </div>
      </Link>
      
      <CardContent className="p-4">
        <Link href={`/product/${product.id}`}>
          <h3 className="font-semibold text-lg hover:text-primary">
            {product.name}
          </h3>
        </Link>

        {/* Variant Selection */}
        {product.has_physical_variant && (
          <div className="mt-2 mb-2">
            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  setSelectedVariant('digital');
                }}
                className={`px-3 py-1 text-xs rounded-full border ${
                  selectedVariant === 'digital'
                    ? 'bg-blue-100 border-blue-300 text-blue-700'
                    : 'bg-gray-100 border-gray-300 text-gray-600'
                }`}
              >
                Digital
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  setSelectedVariant('physical');
                }}
                className={`px-3 py-1 text-xs rounded-full border ${
                  selectedVariant === 'physical'
                    ? 'bg-green-100 border-green-300 text-green-700'
                    : 'bg-gray-100 border-gray-300 text-gray-600'
                }`}
              >
                Physical
              </button>
            </div>
          </div>
        )}

        {/* Pricing Display */}
        <div className="mt-2">
          <p className="text-xl font-bold">${getPrice().toFixed(2)}</p>
          {product.has_physical_variant && (
            <p className="text-sm text-gray-500">
              {selectedVariant === 'digital' ? 'Digital version' : 'Physical version'}
            </p>
          )}
          <p className="text-sm text-gray-500">
            {getStockDisplay()}
          </p>
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <Button
          variant="secondary"
          className="w-full"
          onClick={handleAddToCart}
          disabled={isOutOfStock()}
        >
          <ShoppingCart className="mr-2 h-4 w-4" />
          {isOutOfStock() ? 'Out of Stock' : 'Add to Cart'}
        </Button>
      </CardFooter>
    </Card>
  );
}
