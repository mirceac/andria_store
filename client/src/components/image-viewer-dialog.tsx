import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, RefreshCw, RotateCw } from "lucide-react";
import { useState, useRef, useEffect, ReactNode } from "react";

interface ImageViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string | null;
}

export function ImageViewerDialog({ open, onOpenChange, url }: ImageViewerDialogProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageError, setImageError] = useState<ReactNode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset state when image changes or dialog opens/closes
  useEffect(() => {
    if (open && url) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setRotation(0);
      setImageError(null);
      setIsLoading(true);
    }
  }, [open, url]);

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.25, 5));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.25, 0.25));
  };

  const resetView = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setRotation(0);
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  if (!url) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-screen-lg h-[80vh] flex flex-col">
        <div className="flex items-center justify-between py-2 border-b">
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
              disabled={scale <= 0.25}
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
            <Button
              variant="secondary"
              className="p-2"
              onClick={handleRotate}
              title="Rotate 90°"
            >
              <RotateCw className="h-4 w-4" />
            </Button>
          </div>
          <div className="w-24"></div>
        </div>
        <div 
          className="flex-1 w-full h-full min-h-0 overflow-hidden"
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div 
            className="w-full h-full flex items-center justify-center bg-black/10 cursor-grab active:cursor-grabbing"
          >
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                <div className="h-8 w-8 border-4 border-t-blue-500 border-gray-200 rounded-full animate-spin"></div>
              </div>
            )}
            
            {imageError && (
              <div className="absolute inset-0 flex items-center justify-center bg-amber-50 p-4">
                <div className="text-center max-w-md p-4">
                  {typeof imageError === 'string' ? (
                    <p className="text-amber-800">{imageError}</p>
                  ) : (
                    imageError
                  )}
                </div>
              </div>
            )}
            
            <img
              src={url}
              alt="Viewer"
              className="select-none pointer-events-none"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
                transformOrigin: 'center center',
                transition: isDragging ? 'none' : 'transform 0.2s ease-out'
              }}
              onLoad={() => {
                setIsLoading(false);
                setImageError(null);
              }}
              onError={() => {
                setIsLoading(false);
                setImageError(
                  <div>
                    <p className="text-red-600 font-medium mb-2">Failed to load image</p>
                    <p className="text-sm text-gray-600 mb-3">The image could not be displayed. This might be due to:</p>
                    <ul className="text-xs text-gray-500 text-left space-y-1">
                      <li>• Network connectivity issues</li>
                      <li>• File access restrictions</li>
                      <li>• Unsupported file format</li>
                    </ul>
                  </div>
                );
              }}
              draggable={false}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}