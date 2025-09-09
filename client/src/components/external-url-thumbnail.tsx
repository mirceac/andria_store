import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Loader2, XCircle, FileText, RefreshCw } from "lucide-react";
import { useImageLoader } from "@/hooks/use-image-loader";

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
  // Check if it's a PDF
  const isPdf = url ? url.match(/\.(pdf)$/i) !== null : false;
  
  // Format the image source with a proxy for non-PDF URLs
  const formattedSrc = url && !isPdf 
    ? `/api/proxy/image?url=${encodeURIComponent(url)}` 
    : null;
  
  // Use our custom hook for image loading
  const { loading, error, retry, actualSrc } = useImageLoader(formattedSrc, { 
    timeoutMs: 3000 
  });
  
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
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 text-slate-400 text-xs text-center p-2">
          <XCircle className="h-6 w-6 text-gray-400 mb-1" />
          <span>Failed to load</span>
          <button
            className="mt-2 flex items-center px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              retry();
            }}
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Retry
          </button>
        </div>
      ) : (
        !loading && actualSrc && (
          <img
            src={actualSrc}
            alt="External URL"
            className="max-h-full max-w-full object-contain"
          />
        )
      )}
    </div>
  );
}
