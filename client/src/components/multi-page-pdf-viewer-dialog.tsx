import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Loader2, ZoomIn, ZoomOut, X, RefreshCw, FileText, RotateCw, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Document, Page } from 'react-pdf';
import { initPdfWorker } from '@/lib/pdf-worker';
import { useStorageCache } from "@/hooks/use-storage-cache";
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import '../components/pdf-viewer.css';

// Initialize PDF worker
initPdfWorker();

interface MultiPagePDFViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pdfUrl: string | null;
  title?: string;
}

export function MultiPagePDFViewerDialog({
  open,
  onOpenChange,
  pdfUrl,
  title
}: MultiPagePDFViewerDialogProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPosition, setStartPosition] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { markAsLoaded, hasBeenLoaded, clearCache } = useStorageCache(pdfUrl);

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.1, 0.5));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  const handleNextPage = () => setPageNumber(prev => Math.min(prev + 1, numPages));
  const handlePrevPage = () => setPageNumber(prev => Math.max(prev - 1, 1));

  // Update URL with retry count
  useEffect(() => {
    if (!pdfUrl) {
      setCurrentUrl(null);
      return;
    }
    
    // If we've already successfully loaded this PDF before and we're not explicitly retrying,
    // just use the original URL
    if (hasBeenLoaded() && retryCount === 0) {
      setCurrentUrl(pdfUrl);
      setIsLoading(false);
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

  const handleMouseDown = (e: React.MouseEvent) => {
    if (error) return; // Don't allow dragging if there's an error
    setIsDragging(true);
    setStartPosition({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const newX = e.clientX - startPosition.x;
    const newY = e.clientY - startPosition.y;
    
    setPosition({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    clearCache(); // Clear the cache for this URL to force a reload
    setRetryCount(prev => prev + 1);
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
    setError(null);
    markAsLoaded(); // Mark this URL as successfully loaded
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  // Set up loading timeout
  useEffect(() => {
    if (open && currentUrl) {
      // If we've already successfully loaded this PDF before and we're not explicitly retrying,
      // don't set up the loading process again
      if (hasBeenLoaded() && retryCount === 0) {
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      setError(null);
      
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Set a new timeout
      timeoutRef.current = setTimeout(() => {
        if (isLoading) {
          console.log('PDF viewer loading timed out:', currentUrl);
          setIsLoading(false);
          setError("Loading timeout - PDF may be too large or unavailable");
        }
      }, 10000); // 10 seconds timeout
    }
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [open, currentUrl, retryCount, hasBeenLoaded, isLoading]);

  useEffect(() => {
    if (open) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setRotation(0);
      setPageNumber(1);
      // Reset retry count when dialog is opened
      setRetryCount(0);
    }
  }, [open]);

  // Adjusted dimensions to better fit the dialog
  const baseWidth = 400;
  const baseHeight = 550;

  // Calculate the dimensions based on rotation
  const isLandscape = rotation === 90 || rotation === 270;
  const displayWidth = isLandscape ? baseHeight : baseWidth;
  const displayHeight = isLandscape ? baseWidth : baseHeight;

  // Convert scale to percentage
  const zoomPercentage = Math.round(scale * 100);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-screen-lg h-[80vh] flex flex-col">
        {/* Title and controls row */}
        <div className="flex items-center justify-between py-2 border-b">
          <div className="w-24">
            {title && <h2 className="text-lg font-medium text-gray-700 truncate max-w-[200px]">{title}</h2>}
          </div>
          
          {/* Center: Controls */}
          <div className="flex items-center gap-4">
            <Button
              variant="secondary"
              className="p-2"
              onClick={handleZoomOut}
              disabled={scale <= 0.5}
              title="Zoom Out"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="w-16 text-center">
              {zoomPercentage}%
            </span>
            <Button
              variant="secondary"
              className="p-2"
              onClick={handleZoomIn}
              disabled={scale >= 2}
              title="Zoom In"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary" 
              className="p-2"
              onClick={handleRotate}
              title="Rotate 90°"
            >
              <RotateCw className="h-4 w-4" />
            </Button>
          </div>

          {/* Right: Close button */}
          <div className="w-24 flex justify-end">
            <Button
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        </div>

        {/* PDF Container - flex-grow to take up available space */}
        <div 
          ref={containerRef}
          className="flex-1 w-full h-full min-h-0 overflow-hidden"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div className="w-full h-full flex items-center justify-center bg-black/10">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            )}
            {error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 text-gray-500 p-4 text-center">
                <FileText className="h-16 w-16 mb-2 text-gray-400" />
                <p className="mb-4 text-gray-600">{error}</p>
                <button
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center"
                  onClick={handleRetry}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry Loading
                </button>
              </div>
            )}
            <div 
              className="relative"
              style={{
                transform: `translate(${position.x}px, ${position.y}px)`,
                cursor: isDragging ? 'grabbing' : (error ? 'default' : 'grab')
              }}
            >
              {currentUrl && !error && (
                <Document
                  file={currentUrl}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={(err) => {
                    console.error('Error loading PDF:', err);
                    setIsLoading(false);
                    setError("Could not load this content as a PDF. It may be a different file type or the URL may be invalid.");
                    if (timeoutRef.current) {
                      clearTimeout(timeoutRef.current);
                    }
                  }}
                  loading={null}
                  className="pdf-document"
                >
                  <Page
                    pageNumber={pageNumber}
                    width={displayWidth * scale}
                    height={displayHeight * scale}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    rotate={rotation}
                  />
                </Document>
              )}
            </div>
          </div>
        </div>
        
        {/* Page navigation */}
        {numPages > 1 && (
          <div className="flex items-center justify-center py-2 border-t gap-4">
            <Button
              variant="secondary"
              className="p-2"
              onClick={handlePrevPage}
              disabled={pageNumber <= 1}
              title="Previous Page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Page {pageNumber} of {numPages}
            </span>
            <Button
              variant="secondary"
              className="p-2"
              onClick={handleNextPage}
              disabled={pageNumber >= numPages}
              title="Next Page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
