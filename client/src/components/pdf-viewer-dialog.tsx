import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Document, Page } from 'react-pdf';
import { initPdfWorker } from '@/lib/pdf-worker';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

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
  title = "View PDF"
}: PDFViewerDialogProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [zoom, setZoom] = useState(1.0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPosition, setStartPosition] = useState({ x: 0, y: 0 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [initialScale, setInitialScale] = useState(1.0);

  useEffect(() => {
    // Reset position and zoom when dialog opens/closes
    if (!open) {
      setPosition({ x: 0, y: 0 });
      setZoom(1.0);
    }
  }, [open]);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [open]);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Remove zoom check to allow dragging at any zoom level
    setIsDragging(true);
    setStartPosition({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - startPosition.x,
      y: e.clientY - startPosition.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoom = (increment: boolean) => {
    setZoom(prev => {
      const step = 0.1; // 10% increments
      const newZoom = increment ? prev + step : prev - step;
      return Math.max(0.1, Math.min(5.0, newZoom)); // 10% to 500% range
    });
    setPosition({ x: 0, y: 0 }); // Reset position on zoom change
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;
      
      // Start with a scale that fits the width
      const initialZoom = 0.8; // Start at 80% to ensure full content visibility
      setZoom(initialZoom);
      setInitialScale(initialZoom);
      setIsLoading(false);
    }
  };

  // Reset to fit scale when dialog opens
  useEffect(() => {
    if (open) {
      setZoom(initialScale);
      setPosition({ x: 0, y: 0 });
    }
  }, [open, initialScale]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] p-0">
        <DialogHeader className="p-4">
          <div className="flex items-center justify-between">
            <DialogTitle>{title}</DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleZoom(false)}
                disabled={zoom <= 0.1} // Disable at 10%
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium">{Math.round(zoom * 100)}%</span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleZoom(true)}
                disabled={zoom >= 5.0} // Disable at 500%
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div 
          ref={containerRef}
          className="flex-1 h-[calc(90vh-4rem)] overflow-hidden bg-white flex items-center justify-center p-4"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{
            // Update cursor to show grab/grabbing at any zoom level
            cursor: isDragging ? 'grabbing' : 'grab'
          }}
        >
          <div
            style={{
              transform: `translate(${position.x}px, ${position.y}px)`,
              transition: isDragging ? 'none' : 'transform 0.2s ease-out'
            }}
          >
            <Document
              file={pdfUrl}
              loading={<Loader2 className="h-8 w-8 animate-spin" />}
              error={<p>Unable to load PDF file.</p>}
              onLoadSuccess={onDocumentLoadSuccess}
            >
              <Page
                pageNumber={1}
                scale={zoom}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                loading={null}
              />
            </Document>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}