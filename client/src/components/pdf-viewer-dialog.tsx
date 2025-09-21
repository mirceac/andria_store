import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, ZoomIn, ZoomOut, X, RefreshCw, FileText, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Document, Page } from 'react-pdf';
import { initPdfWorker } from '@/lib/pdf-worker';
import { useStorageCache } from "@/hooks/use-storage-cache";
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import './pdf-viewer.css';

// Initialize PDF worker
initPdfWorker();

export function PDFViewer({ url, scale = 1.0 }: { url: string; scale?: number }) {
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    // Set initial dimensions based on container width
    setDimensions({
      width: 400, // thumbnail width
      height: 160 // thumbnail height (40px container)
    });
  };

  return (
    <div className="w-full h-40 flex items-center justify-center bg-white">
      <Document
        file={url}
        loading={<Loader2 className="h-8 w-8 animate-spin" />}
        error={<p>Unable to load PDF file.</p>}
        onLoadSuccess={onDocumentLoadSuccess}
      >
        <Page
          pageNumber={1}
          scale={scale}
          renderTextLayer={false}
          renderAnnotationLayer={false}
          loading={null}
          width={400}
        />
      </Document>
    </div>
  );
}

interface PDFViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pdfUrl: string | null;
  title?: string;
}

export function PDFViewerDialog({
  open,
  onOpenChange,
  pdfUrl,
  title
}: PDFViewerDialogProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasErrorOccurred, setHasErrorOccurred] = useState(false);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPosition, setStartPosition] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { markAsLoaded, hasBeenLoaded, clearCache } = useStorageCache(pdfUrl);

  const handleZoomIn = () => setScale(prev => prev + 0.1);
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.1, 0.5));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  const resetView = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setRotation(0);
  };

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
    setHasErrorOccurred(false);
    clearCache(); // Clear the cache for this URL to force a reload
    setRetryCount(prev => prev + 1);
  };

  // Set up loading timeout
  useEffect(() => {
    if (open && currentUrl && !hasErrorOccurred) {
      // If we've already successfully loaded this PDF before and we're not explicitly retrying,
      // don't set up the loading process again
      if (hasBeenLoaded() && retryCount === 0) {
        setIsLoading(false);
        return;
      }

      // Check if we've exceeded maximum retry attempts (3 tries total)
      if (retryCount >= 3) {
        console.log('PDF viewer: Maximum retry attempts reached, stopping');
        setIsLoading(false);
        setHasErrorOccurred(true);
        setCurrentUrl(null);
        setError("Cannot load PDF - Maximum retry attempts exceeded. The file may be corrupted or unavailable.");
        return;
      }
      
      setIsLoading(true);
      setError(null);
      
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Set a new timeout - shorter timeout for quicker failure detection
      timeoutRef.current = setTimeout(() => {
        if (isLoading && retryCount < 3) {
          console.log('PDF viewer loading timed out, attempt:', retryCount + 1);
          // Auto-retry up to 3 times
          setRetryCount(prev => prev + 1);
        } else if (retryCount >= 3) {
          console.log('PDF viewer: Maximum retries reached after timeout');
          setIsLoading(false);
          setHasErrorOccurred(true);
          setCurrentUrl(null);
          setError("Cannot load PDF - The file appears to be unavailable or corrupted after multiple attempts.");
        }
      }, 3000); // Reduced to 3 seconds timeout
    }
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [open, currentUrl, retryCount, hasBeenLoaded, isLoading, hasErrorOccurred]);

  useEffect(() => {
    if (open) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setRotation(0);
      // Reset retry count when dialog is opened
      setRetryCount(0);
      // Reset error states
      setError(null);
      setHasErrorOccurred(false);
      setIsLoading(true);
    }
  }, [open]);

  // Adjusted dimensions to better fit the dialog
  const baseWidth = 350;
  const baseHeight = 500;

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
              onClick={resetView}
              title="Reset view"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
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
            {isLoading && !error && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            )}
            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-amber-50 p-4">
                <div className="text-center max-w-md p-4">
                  <div className="w-16 h-16 mx-auto mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14,2 14,8 20,8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <line x1="10" y1="9" x2="8" y2="9"></line>
                      <line x1="3" y1="21" x2="21" y2="3" className="text-red-500" strokeWidth="1.5"></line>
                    </svg>
                  </div>
                  <p className="font-semibold text-lg text-amber-700 mb-2">Failed to load PDF</p>
                  <p className="text-sm text-amber-600 mb-4">{error}</p>
                  <div className="text-xs text-gray-500 text-left bg-white p-3 rounded-md shadow-sm">
                    <p className="mb-2">Possible solutions:</p>
                    <ul className="list-disc pl-4 space-y-1">
                      <li>Check if the PDF file exists and is accessible</li>
                      <li>Verify the file is not corrupted</li>
                      <li>Try refreshing the page</li>
                      <li>Contact support if the problem persists</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
            <div 
              className="relative"
              style={{
                transform: `translate(${position.x}px, ${position.y}px)`,
                cursor: isDragging ? 'grabbing' : (error ? 'default' : 'grab')
              }}
            >
              {currentUrl && !error && !hasErrorOccurred && (
                <Document
                  file={currentUrl}
                  onLoadSuccess={() => {
                    setIsLoading(false);
                    setError(null);
                    markAsLoaded(); // Mark this URL as successfully loaded
                    if (timeoutRef.current) {
                      clearTimeout(timeoutRef.current);
                    }
                  }}
                  onLoadError={(err) => {
                    console.error('Error loading PDF:', err, currentUrl, 'Attempt:', retryCount + 1);
                    
                    // Check if we've reached maximum retry attempts
                    if (retryCount >= 2) { // 0, 1, 2 = 3 attempts total
                      console.log('PDF viewer: Maximum retry attempts reached after error');
                      setIsLoading(false);
                      setHasErrorOccurred(true);
                      setCurrentUrl(null);
                      setError("Cannot load PDF - The file appears to be corrupted or unavailable after multiple attempts.");
                      
                      if (timeoutRef.current) {
                        clearTimeout(timeoutRef.current);
                      }
                      return;
                    }
                    
                    // For the first 2 attempts, try to determine the specific error type
                    setIsLoading(false);
                    
                    // Check if this is an "Invalid PDF structure" error - could be HTML response (file not found)
                    if (err && (err.name === 'InvalidPDFException' || err.message?.includes('Invalid PDF structure'))) {
                      console.log('PDF viewer: Invalid PDF structure detected, checking if file exists, attempt:', retryCount + 1);
                      
                      // Check if the server actually returned HTML (file not found case)
                      fetch(pdfUrl || '', { method: 'HEAD' })
                        .then(response => {
                          const contentType = response.headers.get('content-type') || '';
                          const isHtml = contentType.includes('text/html');
                          
                          if (isHtml || response.status === 404) {
                            console.log('PDF viewer: Server returned HTML/404, file not found');
                            setHasErrorOccurred(true);
                            setCurrentUrl(null);
                            setError("File not found - The PDF file does not exist");
                          } else {
                            console.log('PDF viewer: Server returned PDF content-type, will retry');
                            // Auto-retry for potentially corrupted PDF
                            setTimeout(() => {
                              if (retryCount < 2) {
                                setRetryCount(prev => prev + 1);
                              }
                            }, 1000); // Wait 1 second before retry
                          }
                        })
                        .catch(() => {
                          console.log('PDF viewer: Fetch failed, file not found');
                          setHasErrorOccurred(true);
                          setCurrentUrl(null);
                          setError("File not found - The PDF file does not exist");
                        });
                    } else {
                      // For other types of errors, retry
                      console.log('PDF viewer: Other error, will retry, attempt:', retryCount + 1);
                      setTimeout(() => {
                        if (retryCount < 2) {
                          setRetryCount(prev => prev + 1);
                        }
                      }, 1000); // Wait 1 second before retry
                    }
                    
                    if (timeoutRef.current) {
                      clearTimeout(timeoutRef.current);
                    }
                  }}
                  loading={null}
                  className="pdf-document"
                >
                  <Page
                    pageNumber={1}
                    width={displayWidth * scale}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    rotate={rotation}
                  />
                </Document>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}