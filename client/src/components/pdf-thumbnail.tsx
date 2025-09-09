import { useState, useEffect, useRef } from "react";
import { Document, Page } from 'react-pdf';
import { Loader2, FileText, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { initPdfWorker } from "@/lib/pdf-worker";
import { useStorageCache } from "@/hooks/use-storage-cache";

interface PDFThumbnailProps {
  pdfUrl: string;
  onClick?: () => void;
  width?: number;
  height?: number;
  className?: string;
}

export function PDFThumbnail({ 
  pdfUrl, 
  onClick, 
  width = 130,   // default width
  height = 182, // default height (maintaining 1.4 aspect ratio)
  className 
}: PDFThumbnailProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [currentUrl, setCurrentUrl] = useState(pdfUrl);
  const { markAsLoaded, hasBeenLoaded, clearCache } = useStorageCache(pdfUrl);

  // Initialize the PDF worker
  useEffect(() => {
    initPdfWorker();
  }, []);

  // Add cache-busting parameter for retries
  useEffect(() => {
    // If we've already successfully loaded this PDF before, don't reload
    if (hasBeenLoaded() && retryCount === 0) {
      setIsLoading(false);
      setError(null);
      return;
    }

    if (retryCount > 0) {
      const urlWithRetry = pdfUrl.includes('?') 
        ? `${pdfUrl}&retry=${retryCount}` 
        : `${pdfUrl}?retry=${retryCount}`;
      setCurrentUrl(urlWithRetry);
    } else {
      setCurrentUrl(pdfUrl);
    }
  }, [pdfUrl, retryCount, hasBeenLoaded]);

  // Set up loading timeout
  useEffect(() => {
    // If we've already successfully loaded this PDF before, don't set up timeout
    if (hasBeenLoaded() && retryCount === 0) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Set a timeout to prevent infinite loading state
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      if (isLoading) {
        console.log('PDF loading timed out:', pdfUrl);
        setIsLoading(false);
        setError("Loading timeout - PDF may be too large or unavailable");
      }
    }, 8000); // 8 seconds timeout

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [pdfUrl, retryCount, hasBeenLoaded, isLoading]);

  const handleRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLoading(true);
    setError(null);
    clearCache(); // Clear the cache for this URL to force reload
    setRetryCount(prev => prev + 1);
  };

  return (
    <div 
      className={cn(
        "relative bg-white border border-gray-200 rounded overflow-hidden cursor-pointer hover:shadow-md transition-shadow flex items-center justify-center",
        className
      )}
      style={{ width: `${width}px`, height: `${height}px` }}
      onClick={onClick}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 text-gray-500 p-2 text-center">
          <FileText className="h-8 w-8 mb-1 text-gray-400" />
          <span className="text-xs">PDF unavailable</span>
          <button
            className="mt-2 flex items-center px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs"
            onClick={handleRetry}
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Retry
          </button>
        </div>
      )}
      <div key={`pdf-${retryCount}`}>
        <Document
          file={currentUrl}
          onLoadSuccess={() => {
            setIsLoading(false);
            setError(null);
            markAsLoaded(); // Mark as successfully loaded
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
            }
          }}
          onLoadError={(err) => {
            console.error('Error loading PDF thumbnail:', err);
            setIsLoading(false);
            setError(err.message || "Failed to load PDF");
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
            }
          }}
          loading={null}
          className="flex items-center justify-center"
        >
          <Page
            pageNumber={1}
            width={width}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            className="flex items-center justify-center"
          />
        </Document>
      </div>
    </div>
  );
}