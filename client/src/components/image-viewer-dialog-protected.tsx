import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, RefreshCw, RotateCw } from "lucide-react";
import { useState, useRef, useEffect, ReactNode } from "react";

interface ImageViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string | null;
}

export function ImageViewerDialogProtected({ open, onOpenChange, url }: ImageViewerDialogProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [imageError, setImageError] = useState<ReactNode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Reset state when image changes or dialog opens/closes
  useEffect(() => {
    setPosition({ x: 0, y: 0 });
    setScale(1);
    setRotation(0);
    setImageError(null);
    setIsLoading(true);
    
    // Disable keyboard shortcuts that could be used to save/copy
    const handleKeyDown = (e: KeyboardEvent) => {
      // Disable common save/copy shortcuts
      if ((e.ctrlKey || e.metaKey) && ['s', 'a', 'c', 'p', 'i'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      // Disable F12 (dev tools)
      if (e.key === 'F12') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      // Disable print screen
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    if (open) {
      document.addEventListener('keydown', handleKeyDown, true);
      // Disable drag and drop
      document.addEventListener('dragstart', (e) => e.preventDefault());
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('dragstart', (e) => e.preventDefault());
    };
    
    // For external URLs through our proxy, verify the URL works
    if (url?.includes('/api/proxy/image')) {
      console.log('Validating external URL through proxy:', url);
    }
  }, [url, open]);

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
    setRotation(0);
  };

  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  // Copyright watermark overlay - static regardless of zoom level
  const getCopyrightOverlay = () => {
    // Fixed protection - same at all zoom levels
    const fixedOpacity = 0.25; // Consistent opacity
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
            }}
          >
            © ANDRIA STORE
          </div>
        );
      }
    }

    return (
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 5 }}>
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
            ), repeating-linear-gradient(
              -45deg,
              transparent,
              transparent 40px,
              rgba(0,0,0,0.02) 41px,
              rgba(0,0,0,0.02) 42px
            )`,
            zIndex: 3,
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
        onContextMenu={(e) => e.preventDefault()} // Disable right-click on entire dialog
      >
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
            <Button
              variant="secondary"
              className="p-2"
              onClick={handleRotate}
              title="Rotate 90°"
            >
              <RotateCw className="h-4 w-4" />
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
                    <>
                      <div className="w-16 h-16 mx-auto mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500">
                          <rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect>
                          <circle cx="9" cy="9" r="2"></circle>
                          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path>
                          <line x1="3" y1="21" x2="21" y2="3" className="text-red-500" strokeWidth="1.5"></line>
                        </svg>
                      </div>
                      <p className="font-semibold text-lg text-amber-700 mb-2">Failed to load image</p>
                      <p className="text-sm text-amber-600 mb-4">{imageError}</p>
                      <div className="text-xs text-gray-500 text-left bg-white p-3 rounded-md shadow-sm">
                        <p className="mb-2">Possible solutions:</p>
                        <ul className="list-disc pl-4 space-y-1">
                          <li>Check if the URL is publicly accessible</li>
                          <li>Convert HEIC/HEIF images to JPEG format</li>
                          <li>Try a different image hosting service</li>
                        </ul>
                        <p className="mt-3 text-xs text-gray-400 break-all">{url}</p>
                      </div>
                    </>
                  ) : (
                    imageError
                  )}
                </div>
              </div>
            )}
            
            <img
              src={url}
              alt="Full size"
              className="max-h-full max-w-full object-contain transition-transform duration-75 select-none"
              style={{ 
                transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px) rotate(${rotation}deg)`,
                cursor: isDragging ? 'grabbing' : 'grab',
                display: imageError ? 'none' : 'block',
                height: 'auto',
                width: 'auto'
              }}
              onMouseDown={handleMouseDown}
              draggable="false"
              onLoad={() => {
                setIsLoading(false);
                setImageError(null);
              }}
              onError={(e) => {
                console.error("Failed to load image in viewer:", url);
                setIsLoading(false);
                
                // Check if we're using the proxy
                if (url && url.includes('/api/proxy/image')) {
                  // Try to retry with a cache-busting parameter
                  const retryUrl = `${url}&retry=${Date.now()}`;
                  console.log("Retrying with cache-busting URL:", retryUrl);
                  
                  // Create a new image element to test if the URL works
                  const testImg = new Image();
                  testImg.onload = () => {
                    console.log("Retry successful, updating source");
                    e.currentTarget.src = retryUrl;
                  };
                  testImg.onerror = () => {
                    console.error("Retry also failed");
                    setImageError(
                      <div className="space-y-4">
                        <p>The external image could not be loaded. This could be due to:</p>
                        <ul className="list-disc pl-8 space-y-2">
                          <li>The URL might not be publicly accessible (e.g., requires login)</li>
                          <li>The image might be in an unsupported format (e.g., HEIC/HEIF)</li>
                          <li>Google Photos links require special sharing permissions</li>
                          <li>The source website may be blocking access to the image</li>
                        </ul>
                        <p className="mt-4 text-sm">Try downloading the image and uploading it directly instead.</p>
                        <p className="text-xs text-gray-500 mt-2">URL: {url.split('?url=')[1]?.split('&')[0] || url}</p>
                      </div>
                    );
                  };
                  testImg.src = retryUrl;
                } else {
                  setImageError(
                    <div>
                      <p>The image could not be loaded. The URL might be invalid or inaccessible.</p>
                      <p className="text-xs text-gray-500 mt-2">URL: {url}</p>
                    </div>
                  );
                }
              }}
              onContextMenu={(e) => e.preventDefault()} // Disable right-click
            />

            {/* Copyright overlay that appears when zoomed */}
            {getCopyrightOverlay()}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}