import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Loader2, XCircle, FileText } from "lucide-react";

interface ExternalUrlThumbnailProps {
  url: string | null;
  onClick?: () => void;
  className?: string;
  width?: number;
  height?: number;
  size?: 'sm' | 'md' | 'lg';
}

export function ExternalUrlThumbnail({
  url,
  onClick,
  className,
  width = 130,
  height = 182,
  size
}: ExternalUrlThumbnailProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  // Check if it's a PDF
  const isPdf = url ? url.match(/\.(pdf)$/i) !== null : false;

  useEffect(() => {
    setLoading(true);
    setError(false);

    if (!url) {
      setError(true);
      setLoading(false);
      return;
    }

    // Create a proxy URL for external images
    const proxyUrl = `/api/proxy/image?url=${encodeURIComponent(url)}&thumbnail=1`;
    setImageSrc(proxyUrl);
    
    // For PDFs, we don't need to show loading state
    if (isPdf) {
      setLoading(false);
    }
  }, [url, isPdf]);

  const handleLoad = () => {
    setLoading(false);
  };

  const handleError = () => {
    if (imageSrc && imageSrc.includes('/api/proxy/image')) {
      // If we're using the proxy for an external URL and it failed,
      // try again with a different query parameter to bypass cache
      const newUrl = `${imageSrc}&retry=${Date.now()}`;
      console.log('Retrying proxy with bypass cache:', newUrl);
      setImageSrc(newUrl);
      return;
    }
    
    console.error('Failed to load external image:', url);
    setLoading(false);
    setError(true);
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
  
  // Don't allow className to override dimensions
  // We want exact consistency with other thumbnails

  // If it's a PDF, render a PDF icon
  if (isPdf) {
    return (
      <div
        className={cn(
          "relative rounded overflow-hidden border bg-blue-50 flex items-center justify-center cursor-pointer",
          className
        )}
        style={{ width: `${finalWidth}px`, height: `${finalHeight}px` }}
        onClick={onClick}
      >
        <div className="flex flex-col items-center justify-center text-xs text-gray-600">
          <FileText className="h-6 w-6 text-blue-500" />
          <span className="mt-1">PDF</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative rounded overflow-hidden border bg-white flex items-center justify-center cursor-pointer",
        className
      )}
      style={{ width: `${finalWidth}px`, height: `${finalHeight}px` }}
      onClick={onClick}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      )}

      {error ? (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-slate-400 text-xs text-center p-2">
          <XCircle className="h-6 w-6 text-gray-400" />
        </div>
      ) : (
        imageSrc && (
          <img
            src={imageSrc}
            alt="External URL"
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
