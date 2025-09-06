import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, RefreshCw } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface ImageViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string | null;
}

export function ImageViewerDialog({ open, onOpenChange, url }: ImageViewerDialogProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Reset position when zoom changes or dialog opens/closes
  useEffect(() => {
    setPosition({ x: 0, y: 0 });
  }, [scale, open]);

  // Remove the upper limit on zoom in
  const handleZoomIn = () => setScale(prev => prev + 0.1);
  // Keep the lower limit for zoom out
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.1, 0.5));

  // Handle dragging functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    setPosition({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetView = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  if (!url) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-screen-lg h-[80vh] flex flex-col">
        <div className="flex items-center justify-between py-2 border-b">
          <div className="w-24" /> {/* Spacer to help center controls */}
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
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="w-16 text-center">
              {Math.round(scale * 100)}%
            </span>
            <Button
              variant="secondary"
              className="p-2"
              onClick={handleZoomIn}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
          <div className="w-24 flex justify-end">
            <Button
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        </div>
        <div 
          className="flex-1 w-full h-full min-h-0 overflow-hidden"
          ref={containerRef}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onMouseMove={handleMouseMove}
        >
          <div 
            className="w-full h-full flex items-center justify-center bg-black/10"
          >
            <img
              src={url}
              alt="Full size"
              className="object-contain transition-transform duration-75 select-none"
              style={{ 
                transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
                cursor: isDragging ? 'grabbing' : 'grab'
              }}
              onMouseDown={handleMouseDown}
              draggable="false"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
