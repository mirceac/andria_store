import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, ZoomIn, ZoomOut, X } from "lucide-react";
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
  title
}: PDFViewerDialogProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPosition, setStartPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.1, 0.5));

  const handleMouseDown = (e: React.MouseEvent) => {
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

  useEffect(() => {
    if (open) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [open]);

  const baseWidth = 500;
  const baseHeight = 700;

  // Convert scale to percentage
  const zoomPercentage = Math.round(scale * 100);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] p-6">
        {/* Title and controls row */}
        <div className="flex items-center justify-between mb-4 relative">
          {/* Left: Title */}
          <h2 className="text-lg font-medium text-gray-700">{title}</h2>
          
          {/* Center: Zoom Controls - Absolute positioned */}
          <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-2">
            <Button
              variant="secondary"
              className="p-2"
              onClick={handleZoomOut}
              disabled={scale <= 0.5}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="min-w-[60px] text-center text-sm">
              {zoomPercentage}%
            </span>
            <Button
              variant="secondary"
              className="p-2"
              onClick={handleZoomIn}
              disabled={scale >= 2}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>

          {/* Right: Close button */}
          <Button
            variant="ghost"
            className="p-2 mr-6"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </div>

        {/* PDF Container - now full width */}
        <div 
          ref={containerRef}
          className="w-full h-[calc(90vh-110px)] bg-white rounded-lg overflow-hidden border relative"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-50 text-red-500 text-sm p-4 text-center">
              Failed to load PDF
            </div>
          )}
          <div 
            className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2"
            style={{
              transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px)`,
              cursor: isDragging ? 'grabbing' : 'grab'
            }}
          >
            <Document
              file={pdfUrl}
              onLoadSuccess={() => {
                setIsLoading(false);
                setError(null);
              }}
              onLoadError={(err) => {
                console.error('Error loading PDF:', err);
                setIsLoading(false);
                setError(err.message);
              }}
              loading={null}
            >
              <Page
                pageNumber={1}
                width={baseWidth * scale}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                scale={scale}
              />
            </Document>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}