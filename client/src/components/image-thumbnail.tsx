import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { FileImage, ExternalLink } from "lucide-react";

interface ImageThumbnailProps {
  productId: number;
  imageUrl: string | null;
  imageData: string | null;
  alt: string;
  onClick?: () => void;
  className?: string;
  width?: number;
  height?: number;
  showTryDirect?: boolean; // New prop to control Try Direct buttons
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
  showTryDirect = true, // Default to true for backward compatibility
}: ImageThumbnailProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const isProductImageEndpoint = imageUrl?.startsWith(`/api/products/${productId}/img`);
  const isUploadedImage = imageUrl?.startsWith('/uploads/');
  const imageSrc = productId && (isProductImageEndpoint || isUploadedImage || !imageUrl)
    ? `/api/products/${productId}/img?thumbnail=1`
    : imageUrl;

  useEffect(() => {
    setLoading(true);
    setError(false);
  }, [imageSrc]);

  return (
    <div
      className={cn(
        "relative rounded overflow-hidden border border-border bg-white flex items-center justify-center cursor-pointer group",
        className
      )}
      style={{ width: `${width}px`, height: `${height}px` }}
      onClick={onClick}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/60 animate-pulse">
          <FileImage className="h-7 w-7 text-muted-foreground/50" />
        </div>
      )}

      {error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-muted/50 text-muted-foreground p-2 text-center">
          <FileImage className="h-7 w-7 opacity-60" />
          <span className="text-xs">Preview unavailable</span>
          {showTryDirect && (imageUrl || imageSrc) && (
            <button
              className="flex items-center gap-1 text-primary hover:underline text-xs"
              onClick={(event) => {
                event.stopPropagation();
                window.open(imageUrl || imageSrc || '', '_blank', 'noopener,noreferrer');
              }}
            >
              <ExternalLink className="h-3 w-3" />
              Open original
            </button>
          )}
        </div>
      ) : (
        imageSrc && (
          <img
            src={imageSrc}
            alt={alt}
            loading="lazy"
            decoding="async"
            className="max-h-full max-w-full object-contain"
            style={{ opacity: loading ? 0 : 1 }}
            onLoad={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setError(true);
            }}
          />
        )
      )}

      {/* Show "Try Direct" button on hover when image is successfully loaded */}
      {showTryDirect && !error && !loading && productId && (
        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            className="p-1.5 bg-black/60 text-white rounded-full hover:bg-black/80 flex items-center justify-center shadow-lg"
            onClick={(e) => {
              e.stopPropagation();
              window.open(`/api/products/${productId}/img?v=${Date.now()}`, '_blank');
            }}
            title="View original image in new tab"
          >
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}
