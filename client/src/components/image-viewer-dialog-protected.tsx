import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, RefreshCw, RotateCw } from "lucide-react";
import { useState, useRef, useEffect, ReactNode } from "react";

interface ImageViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string | null;
  isPrivateProduct?: boolean;
}

export function ImageViewerDialogProtected({ open, onOpenChange, url, isPrivateProduct = false }: ImageViewerDialogProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageError, setImageError] = useState<ReactNode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debug logging
  useEffect(() => {
    if (open) {
      console.log('ImageViewerDialogProtected opened:', {
        url,
        isPrivateProduct,
        willShowWatermark: !isPrivateProduct
      });
    }
  }, [open, url, isPrivateProduct]);

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
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
      e.preventDefault();
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Copyright watermark overlay - static regardless of zoom level
  const getCopyrightOverlay = () => {
    // Fixed protection - same at all zoom levels
    const fixedOpacity = 0.15; // Consistent opacity
    const fixedDensity = 4; // Consistent number of watermarks

    const watermarks = [];
    for (let i = 0; i < fixedDensity; i++) {
      for (let j = 0; j < fixedDensity; j++) {
        watermarks.push(
          <div
            key={`${i}-${j}`}
            className="absolute text-white font-bold select-none pointer-events-none"
            style={{
              left: `${(i / fixedDensity) * 100 + 10}%`,
              top: `${(j / fixedDensity) * 100 + 10}%`,
              opacity: fixedOpacity,
              textShadow: '2px 2px 8px rgba(0,0,0,0.9), -2px -2px 8px rgba(0,0,0,0.9)',
              transform: `rotate(-25deg)`,
              fontSize: '1rem', // Fixed size
              zIndex: 10,
              fontWeight: 900,
              letterSpacing: '0.1em',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              MozUserSelect: 'none',
              msUserSelect: 'none',
            }}
          >
            © ANDRIA STORE
          </div>
        );
      }
    }

    return (
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 15 }}>
        {watermarks}
        {/* Fixed subtle grid overlay */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `repeating-linear-gradient(
              45deg,
              transparent,
              transparent 40px,
              rgba(255,255,255,0.02) 41px,
              rgba(255,255,255,0.02) 42px
            )`,
            zIndex: 5,
          }}
        />
      </div>
    );
  };

  if (!url) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-screen-lg h-[80vh] flex flex-col select-none"
        style={{
          userSelect: 'none',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none',
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
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
          className="flex-1 w-full h-full min-h-0 overflow-hidden relative"
          ref={containerRef}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onMouseMove={handleMouseMove}
        >
          <div 
            className="w-full h-full flex items-center justify-center bg-black/10 relative"
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
            
            <div
              className="relative"
              onMouseDown={handleMouseDown}
              onContextMenu={(e) => e.preventDefault()}
              style={{
                userSelect: 'none',
                WebkitUserSelect: 'none',
                MozUserSelect: 'none',
                msUserSelect: 'none',
              }}
            >
              <img
                src={url}
                alt="Protected Viewer"
                className={scale > 1 ? "cursor-grab active:cursor-grabbing select-none" : "select-none"}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
                  transformOrigin: 'center center',
                  transition: isDragging ? 'none' : 'transform 0.2s ease-out',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  MozUserSelect: 'none',
                  msUserSelect: 'none',
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
                      <p className="text-sm text-gray-600 mb-3">The image could not be displayed.</p>
                    </div>
                  );
                }}
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
              />
              
              {/* Copyright watermark overlay - only for public products */}
              {!isPrivateProduct && getCopyrightOverlay()}
              
              {/* Invisible overlay to capture interactions */}
              <div 
                className={scale > 1 ? "absolute inset-0 cursor-grab active:cursor-grabbing" : "absolute inset-0"}
                onMouseDown={handleMouseDown}
                onContextMenu={(e) => e.preventDefault()}
                style={{
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  MozUserSelect: 'none',
                  msUserSelect: 'none',
                  zIndex: 20,
                }}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}