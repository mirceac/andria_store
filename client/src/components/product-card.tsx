import { Link } from "wouter";
import { SelectProduct } from "@db/schema";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { ShoppingCart, XCircle } from "lucide-react";
import { useState, useEffect } from "react";

interface ProductCardProps {
  product: SelectProduct;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart();
  const [timestamp] = useState(Date.now());

  // Get product image based on priority
  const getProductImageUrl = (product: SelectProduct): string | null => {
    if (product.image_file) {
      // 1. Image File (highest priority)
      return `${product.image_file}?v=${timestamp}`;
    } else if (product.image_data) {
      // 2. Image DB
      return `/api/products/${product.id}/img?v=${timestamp}`;
    } else if (product.pdf_file) {
      // 3. PDF File (show a generic PDF thumbnail)
      return null; // Will render PDF thumbnail instead
    } else if (product.pdf_data) {
      // 4. PDF DB (show a generic PDF thumbnail)
      return null; // Will render PDF thumbnail instead
    } else if (product.storage_url) {
      // 5. External Storage URL
      const isImageUrl = product.storage_url.match(/\.(jpeg|jpg|gif|png|webp|bmp|svg)$/i) || 
                        (!product.storage_url.match(/\.(pdf)$/i) && 
                         (product.storage_url.includes('image') || 
                          product.storage_url.includes('img') || 
                          product.storage_url.includes('photo') ||
                          product.storage_url.includes('picture')));
      
      if (isImageUrl) {
        return `/api/proxy/image?url=${encodeURIComponent(product.storage_url || '')}&v=${timestamp}`;
      }
      return null; // Will render fallback if it's a PDF
    }
    return null; // No image available
  };

  const imageUrl = getProductImageUrl(product);
  const hasPdf = product.pdf_file || product.pdf_data || 
                (product.storage_url && product.storage_url.match(/\.(pdf)$/i));

  return (
    <Card className="overflow-hidden">
      <Link href={`/product/${product.id}`}>
        <div className="aspect-square overflow-hidden bg-gray-50 flex items-center justify-center">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={product.name}
              className="w-full h-full object-cover transition-transform hover:scale-105"
            />
          ) : hasPdf ? (
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
        <p className="text-xl font-bold mt-2">${product.price.toFixed(2)}</p>
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <Button
          variant="secondary"
          className="w-full"
          onClick={() => addToCart(product)}
        >
          <ShoppingCart className="mr-2 h-4 w-4" />
          Add to Cart
        </Button>
      </CardFooter>
    </Card>
  );
}
