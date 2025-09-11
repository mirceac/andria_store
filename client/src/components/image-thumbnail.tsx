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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const { markAsLoaded, hasBeenLoaded, clearCache } = useStorageCache(imageUrl);

  useEffect(() => {
    console.log('ImageThumbnail useEffect:', { productId, imageUrl, imageData: !!imageData });
    setLoading(true);
    setError(false);
    setErrorMessage(null);

    if (imageUrl) {
      // If we have a direct URL, use it
      console.log('Using imageUrl:', imageUrl);
      setImageSrc(imageUrl);
    } else if (imageData) {
      // For database-stored images, always use the API endpoint to avoid issues
      // This is safer and more reliable than trying to parse the data client-side
      if (productId) {
        const apiUrl = `/api/products/${productId}/img`;
        console.log('Using API endpoint for imageData:', apiUrl);
        setImageSrc(apiUrl);
      } else {
        setError(true);
        setLoading(false);
      }
    } else if (productId) {
      // If we have neither URL nor data, use the API endpoint
      const apiUrl = `/api/products/${productId}/img`;
      console.log('Using API endpoint (no data):', apiUrl);
      setImageSrc(apiUrl);
    } else {
      setError(true);
      setLoading(false);
    }
  }, [productId, imageUrl, imageData]);

  const handleLoad = () => {
    setLoading(false);
    if (imageUrl) {
      markAsLoaded(); // Mark as successfully loaded
    }
  };

  const handleError = () => {
    console.error('Failed to load image:', { imageUrl, imageData, imageSrc });
    setLoading(false);
    
    // Check if this is a file not found error
    if (imageSrc) {
      fetch(imageSrc, { method: 'HEAD' })
        .then(response => {
          console.log('Image fetch response:', response.status, response.headers.get('content-type'), imageSrc);
          
          // Check if it's a 404 OR if we got HTML/JSON instead of an image (fallback responses)
          const contentType = response.headers.get('content-type') || '';
          const isHtml = contentType.includes('text/html');
          const isJson = contentType.includes('application/json');
          
          if (response.status === 404 || isHtml || isJson) {
            setErrorMessage("File not found");
          } else {
            setErrorMessage(null);
          }
          setError(true);
        })
        .catch((err) => {
          console.log('Image fetch error:', err, imageSrc);
          setErrorMessage("File not found"); // Assume network errors mean file not found
          setError(true);
        });
    } else {
      setError(true);
      setErrorMessage(null);
    }
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
            {errorMessage === "File not found" ? (
              <span className="text-red-500">File not found</span>
            ) : productId ? (
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
