import { useState } from "react";
import { Loader2, ZoomIn, ZoomOut } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

  const handleZoom = (increment: number) => {
    setZoom(Math.max(50, Math.min(200, zoom + increment)));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh]">
        <DialogHeader>
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
              <span className="text-sm">{zoom}%</span>
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
          <div className="flex-1 w-full h-full min-h-[60vh] overflow-auto">
            <div 
              className="relative w-full h-full"
              style={{ 
                transform: `scale(${zoom / 100})`,
                transformOrigin: 'top left',
                transition: 'transform 0.2s ease-in-out'
              }}
            >
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              )}
              <object
                data={pdfUrl}
                type="application/pdf"
                className="w-full h-full"
                onLoad={() => setIsLoading(false)}
              >
                <p>Unable to display PDF file. <a href={pdfUrl} target="_blank" rel="noopener noreferrer">Download</a> instead.</p>
              </object>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}