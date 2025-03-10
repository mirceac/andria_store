import { useState, useEffect } from "react";
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
  return (
    <Document
      file={url}
      loading={<Loader2 className="h-8 w-8 animate-spin" />}
      error={<p>Unable to load PDF file.</p>}
    >
      <Page
        pageNumber={1}
        scale={scale}
        renderTextLayer={false}
        renderAnnotationLayer={false}
        loading={null}
      />
    </Document>
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

  useEffect(() => {
    // Reset position and zoom when dialog opens/closes
    if (!open) {
      setPosition({ x: 0, y: 0 });
      setZoom(1.0);
    }
  }, [open]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
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
      const newZoom = increment ? prev + 0.5 : prev - 0.5;
      return Math.max(0.5, Math.min(5, newZoom));
    });
    setPosition({ x: 0, y: 0 }); // Reset position on zoom change
  };

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
                disabled={zoom <= 0.5}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium">{Math.round(zoom * 100)}%</span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleZoom(true)}
                disabled={zoom >= 5}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div 
          className="flex-1 h-[calc(90vh-4rem)] overflow-hidden bg-white"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{
            cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
          }}
        >
          <div
            style={{
              transform: `translate(${position.x}px, ${position.y}px)`,
              transition: isDragging ? 'none' : 'transform 0.2s ease-out'
            }}
          >
            <PDFViewer url={pdfUrl!} scale={zoom} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}