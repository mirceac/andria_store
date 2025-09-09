import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { useStorageCache } from "@/hooks/use-storage-cache";

interface ImageThumbnailProps {
  productId: number;
  imageUrl: string | null;
  imageData: string | null;
  alt: string;
  onClick?: () => void;
  className?: string;
  width?: number;
  height?: number;
}

export function ImageThumbnail({
  productId,
  imageUrl,
  imageData,
  alt,
  onClick,
  className,
  width = 130,
  height = 182,
}: ImageThumbnailProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const { markAsLoaded, hasBeenLoaded, clearCache } = useStorageCache(imageUrl);

  useEffect(() => {
    // If we've already successfully loaded this image before, don't reload
    if (imageUrl && hasBeenLoaded()) {
      setLoading(false);
      setError(false);
      return;
    }

    setLoading(true);
    setError(false);

    if (imageUrl) {
      // If we have a direct URL, use it
      setImageSrc(imageUrl);
    } else if (imageData) {
      try {
        // First, check if the imageData is a JSON string containing content type and data
        try {
          const parsedData = JSON.parse(imageData);
          if (parsedData && parsedData.contentType && parsedData.data) {
            // This is a JSON object with content type and base64 data
            setImageSrc(`data:${parsedData.contentType};base64,${parsedData.data}`);
            return;
          }
        } catch (e) {
          // Not JSON, which is fine - continue with normal processing
        }

        // If it's not JSON, assume it's raw base64 data and try different MIME types
        setImageSrc(`data:image/jpeg;base64,${imageData}`);
      } catch (err) {
        console.error('Error processing image data:', err);
        setError(true);
        setLoading(false);
      }
    } else if (productId) {
      // If we have neither URL nor data, use the API endpoint with cache busting
      const timestamp = Date.now();
      setImageSrc(`/api/products/${productId}/img?v=${timestamp}`);
    } else {
      setError(true);
      setLoading(false);
    }
  }, [productId, imageUrl, imageData, hasBeenLoaded]);

  const handleLoad = () => {
    setLoading(false);
    if (imageUrl) {
      markAsLoaded(); // Mark as successfully loaded
    }
  };

  const handleError = () => {
    if (imageData) {
      // If the first attempt with JPEG failed, try PNG
      if (imageSrc && imageSrc.includes('image/jpeg')) {
        setImageSrc(`data:image/png;base64,${imageData}`);
        return;
      }
      
      // If PNG failed, try a generic format
      if (imageSrc && imageSrc.includes('image/png')) {
        setImageSrc(`data:image/webp;base64,${imageData}`);
        return;
      }
      
      // If all else fails, use the API endpoint if we have a product ID
      if (productId && !imageSrc?.includes('/api/')) {
        const timestamp = Date.now();
        setImageSrc(`/api/products/${productId}/img?v=${timestamp}`);
        return;
      }
    } else if (imageUrl && imageUrl.includes('/api/proxy/image')) {
      // If we're using the proxy for an external URL and it failed,
      // try again with a different query parameter to bypass cache
      const newUrl = `${imageUrl}&retry=${Date.now()}`;
      console.log('Retrying proxy with bypass cache:', newUrl);
      clearCache(); // Clear cache for this URL since we're having to retry
      setImageSrc(newUrl);
      return;
    }
    
    console.error('Failed to load image:', { imageUrl, imageData });
    setLoading(false);
    setError(true);
  };

  return (
    <div
      className={cn(
        "relative rounded overflow-hidden border bg-white flex items-center justify-center cursor-pointer",
        className
      )}
      style={{ width: `${width}px`, height: `${height}px` }}
      onClick={onClick}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      )}

      {error ? (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-slate-400 text-xs text-center p-2">
          <div className="text-center p-2">
            {productId ? (
              <a 
                href={`/api/products/${productId}/img?v=${Date.now()}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                View Image
              </a>
            ) : (
              'Image preview unavailable'
            )}
          </div>
        </div>
      ) : (
        imageSrc && (
          <img
            src={imageSrc}
            alt={alt}
            className="max-h-full max-w-full object-contain"
            style={{ opacity: loading ? 0 : 1 }}
            onLoad={handleLoad}
            onError={handleError}
          />
        )
      )}
    </div>
  );
}
