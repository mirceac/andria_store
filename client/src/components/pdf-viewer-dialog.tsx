import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  const [isLoading, setIsLoading] = useState(true);
  const [zoom, setZoom] = useState(100);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0 });
  const pdfContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      
      const scale = zoom / 100;
      const newX = (e.clientX - dragRef.current.startX) / scale;
      const newY = (e.clientY - dragRef.current.startY) / scale;
      
      setPosition({
        x: newX,
        y: newY
      });
    };

    const handleGlobalMouseUp = () => {
      setIsDragging(false);
      document.body.style.cursor = 'default';
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
      document.body.style.cursor = 'grabbing';
    }

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      document.body.style.cursor = 'default';
    };
  }, [isDragging, zoom]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 100) return; // Only allow dragging when zoomed in
    e.preventDefault();
    setIsDragging(true);
    const rect = pdfContainerRef.current?.getBoundingClientRect();
    if (rect) {
      dragRef.current = {
        startX: e.clientX - (position.x * (zoom / 100)),
        startY: e.clientY - (position.y * (zoom / 100))
      };
    }
    document.body.style.cursor = 'grabbing';
  };

  // Reset position when zoom changes or dialog opens
  useEffect(() => {
    setPosition({ x: 0, y: 0 });
  }, [zoom, open]);

  // Handle zoom change
  const handleZoom = (increment: number) => {
    setZoom(Math.max(50, Math.min(200, zoom + increment)));
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
                onClick={() => handleZoom(-10)}
                disabled={zoom <= 50}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium">{zoom}%</span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleZoom(10)}
                disabled={zoom >= 200}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {pdfUrl && (
          <div 
            className="flex-1 h-[calc(90vh-4rem)] overflow-hidden"
            ref={pdfContainerRef}
          >
            <div
              className="relative w-full h-full"
              onMouseDown={handleMouseDown}
              style={{
                transform: `scale(${zoom / 100}) translate(${position.x}px, ${position.y}px)`,
                transformOrigin: 'center',
                transition: isDragging ? 'none' : 'transform 0.2s ease-in-out',
                cursor: zoom > 100 ? (isDragging ? 'grabbing' : 'grab') : 'default',
                touchAction: 'none'
              }}
            >
              <object
                data={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0&view=Fit`}
                type="application/pdf"
                className="w-full h-full"
                style={{ 
                  pointerEvents: isDragging ? 'none' : 'auto',
                  userSelect: 'none'
                }}
                onLoad={() => setIsLoading(false)}
              >
                <p>Unable to display PDF file.</p>
              </object>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}