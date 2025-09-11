import { useState, useEffect, useRef, useMemo } from "react";
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
  // Simplified state management
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Generate URL using useMemo to prevent unnecessary re-renders
  const currentUrl = useMemo(() => {
    if (!pdfUrl) return null;
    const baseUrl = pdfUrl.split('?')[0];
    return retryCount > 0 
      ? `${baseUrl}?retry=${retryCount}&t=${Date.now()}`
      : `${baseUrl}?t=${Date.now()}`;
  }, [pdfUrl, retryCount]);

  // Initialize the PDF worker
  useEffect(() => {
    initPdfWorker();
  }, []);

  // Single effect to handle loading state and timeout
  useEffect(() => {
    if (!currentUrl) {
      setError("No PDF available");
      setIsLoading(false);
      return;
    }

    console.log('PDF thumbnail: Starting load for URL:', currentUrl);
    setError(null);
    setIsLoading(true);

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set timeout for missing files
    timeoutRef.current = setTimeout(() => {
      console.log('PDF thumbnail: Timeout reached, setting File not found');
      setIsLoading(false);
      setError("File not found");
    }, 3000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [currentUrl]);

  const handleRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('PDF thumbnail: Retrying load');
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
      {isLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 text-gray-500 p-2 text-center">
          <FileText className="h-8 w-8 mb-1 text-gray-400" />
          <span className="text-xs">
            {error === "File not found" ? "File not found" : 
             error === "Invalid PDF file" ? "Invalid PDF file" : 
             "PDF unavailable"}
          </span>
          {error !== "File not found" && error !== "Invalid PDF file" && (
            <button
              className="mt-2 flex items-center px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs"
              onClick={handleRetry}
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Retry
            </button>
          )}
        </div>
      )}
      {currentUrl && (
        <div key={`pdf-${retryCount}`}>
          <Document
            file={currentUrl}
          onLoadSuccess={() => {
            console.log('PDF thumbnail: onLoadSuccess called for', currentUrl);
            setIsLoading(false);
            setError(null);
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
            }
          }}
          onLoadError={(err) => {
            console.log('PDF thumbnail: onLoadError called for', currentUrl, 'Error:', err);
            setIsLoading(false);
            
            // Check if this is an "Invalid PDF structure" error
            if (err && (err.name === 'InvalidPDFException' || err.message?.includes('Invalid PDF structure'))) {
              console.log('PDF thumbnail: Invalid PDF structure detected for', currentUrl);
              
              // First check if the server actually returned HTML (file not found case)
              if (!currentUrl) {
                setError("File not found");
                return;
              }
              
              fetch(currentUrl, { method: 'HEAD' })
                .then(response => {
                  const contentType = response.headers.get('content-type') || '';
                  const isHtml = contentType.includes('text/html');
                  
                  if (isHtml || response.status === 404) {
                    console.log('PDF thumbnail: Server returned HTML/404, this is a missing file');
                    setIsLoading(false);
                    setError("File not found");
                  } else {
                    console.log('PDF thumbnail: Server returned PDF content-type, this is a corrupted file');
                    setIsLoading(false);
                    setError("Invalid PDF file");
                  }
                })
                .catch(() => {
                  // If fetch fails, assume it's a missing file
                  console.log('PDF thumbnail: Fetch failed, assuming missing file');
                  setIsLoading(false);
                  setError("File not found");
                });
              
              if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
              }
              return;
            }
            
            // For other errors, do a quick HEAD request to determine the issue
            console.log('PDF thumbnail: Other error, testing URL:', currentUrl, 'Error type:', err?.name, 'Message:', err?.message);
            
            if (!currentUrl) {
              setError("File not found");
              return;
            }
            
            fetch(currentUrl, { method: 'HEAD' })
              .then(response => {
                console.log('PDF thumbnail fetch response:', response.status, response.headers.get('content-type'), currentUrl);
                
                // Check if it's a 404 OR if we got HTML/JSON instead of a PDF (fallback responses)
                const contentType = response.headers.get('content-type') || '';
                const isHtml = contentType.includes('text/html');
                const isJson = contentType.includes('application/json');
                
                if (response.status === 404 || isHtml || isJson) {
                  console.log('PDF thumbnail: Setting "File not found" error for', currentUrl, 'Status:', response.status, 'Content-Type:', contentType);
                  setIsLoading(false);
                  setError("File not found");
                } else {
                  console.log('PDF thumbnail: Setting generic error for', currentUrl);
                  setIsLoading(false);
                  setError(err?.message || "Failed to load PDF");
                }
              })
              .catch((fetchErr) => {
                console.log('PDF thumbnail fetch error:', fetchErr, currentUrl);
                console.log('PDF thumbnail: Setting "File not found" due to fetch error');
                setIsLoading(false);
                setError("File not found"); // Assume network errors mean file not found
              });
            
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
      )}
    </div>
  );
}