import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { FileImage, FileText, ExternalLink } from "lucide-react";

interface ExternalUrlThumbnailProps {
  url: string | null;
  onClick?: () => void;
  className?: string;
  width?: number;
  height?: number;
  size?: 'sm' | 'md' | 'lg';
  showTryDirect?: boolean; // New prop to control Try Direct buttons
}

export function ExternalUrlThumbnail({
  url,
  onClick,
  className,
  width = 130,
  height = 182,
  size,
  showTryDirect = true, // Default to true for backward compatibility
}: ExternalUrlThumbnailProps) {
  // Check if it's a PDF - comprehensive detection
  const isPdf = url ? (
    url.match(/\.(pdf)(\?|$)/i) !== null ||
    url.toLowerCase().includes('pdf') ||
    url.toLowerCase().includes('document') ||
    url.toLowerCase().includes('doc') ||
    url.toLowerCase().includes('file')
  ) : false;
  
  const isRemoteUrl = (() => {
    if (!url) return false;
    try {
      return new URL(url, window.location.origin).origin !== window.location.origin;
    } catch {
      return false;
    }
  })();
  const thumbnailSrc = url && isRemoteUrl && !isPdf
    ? `/api/proxy/image?url=${encodeURIComponent(url)}&thumbnail=1`
    : url;
  const imageSources = thumbnailSrc && url && thumbnailSrc !== url
    ? [thumbnailSrc, url]
    : thumbnailSrc ? [thumbnailSrc] : [];
  const [sourceIndex, setSourceIndex] = useState(0);
  const [loading, setLoading] = useState(Boolean(thumbnailSrc));
  const [failed, setFailed] = useState(!thumbnailSrc);

  useEffect(() => {
    setSourceIndex(0);
    setLoading(Boolean(thumbnailSrc));
    setFailed(!thumbnailSrc);
  }, [url]);

  const activeSrc = imageSources[sourceIndex] ?? null;

  const handleImageError = () => {
    if (sourceIndex < imageSources.length - 1) {
      setLoading(true);
      setSourceIndex((currentIndex) => currentIndex + 1);
    } else {
      setLoading(false);
      setFailed(true);
    }
  };
  
  // Size presets similar to ImageThumbnail
  let finalWidth = width;
  let finalHeight = height;
  
  if (size) {
    switch(size) {
      case 'sm':
        finalWidth = 48;
        finalHeight = 48;
        break;
      case 'md':
        finalWidth = 64;
        finalHeight = 64;
        break;
      case 'lg':
        finalWidth = 128;
        finalHeight = 128;
        break;
    }
  }
  
  // If it's a PDF, render a PDF icon
  if (isPdf) {
    return (
      <div
        className={cn(
          "relative rounded overflow-hidden border bg-accent/40 flex items-center justify-center cursor-pointer group",
          className
        )}
        style={{ width: `${finalWidth}px`, height: `${finalHeight}px` }}
        onClick={onClick}
      >
        <div className="flex flex-col items-center justify-center text-xs text-gray-600">
          <FileText className="h-6 w-6 text-primary" />
          <span className="mt-1 text-foreground">PDF</span>
        </div>
        {/* Show "Try Direct" button on hover for PDFs */}
        {showTryDirect && url && (
          <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              className="p-1.5 bg-black/60 text-white rounded-full hover:bg-black/80 flex items-center justify-center shadow-lg"
              onClick={(e) => {
                e.stopPropagation();
                window.open(url, '_blank');
              }}
              title="View original PDF in new tab"
            >
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative rounded overflow-hidden border border-border bg-white flex items-center justify-center cursor-pointer group",
        className
      )}
      style={{ width: `${finalWidth}px`, height: `${finalHeight}px` }}
      onClick={onClick}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/60 animate-pulse">
          <FileImage className="h-7 w-7 text-muted-foreground/50" />
        </div>
      )}

      {failed ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-muted/50 text-muted-foreground text-xs text-center p-2">
          <FileImage className="h-7 w-7 opacity-60" />
          <span>Preview unavailable</span>
          {url && (
            <button
              className="flex items-center gap-1 text-primary hover:underline"
              onClick={(event) => {
                event.stopPropagation();
                window.open(url, '_blank', 'noopener,noreferrer');
              }}
            >
              <ExternalLink className="h-3 w-3" />
              Open original
            </button>
          )}
        </div>
      ) : (
        activeSrc && (
          <img
            key={activeSrc}
            src={activeSrc}
            alt="Product preview"
            loading="lazy"
            decoding="async"
            onLoad={() => {
              setLoading(false);
              setFailed(false);
            }}
            onError={handleImageError}
            className="h-full w-full object-contain"
          />
        )
      )}

      {/* Show "Try Direct" button on hover when content is successfully loaded */}
      {showTryDirect && !failed && !loading && url && (
        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            className="p-1.5 bg-black/60 text-white rounded-full hover:bg-black/80 flex items-center justify-center shadow-lg"
            onClick={(e) => {
              e.stopPropagation();
              window.open(url, '_blank');
            }}
            title="View original content in new tab"
          >
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}
