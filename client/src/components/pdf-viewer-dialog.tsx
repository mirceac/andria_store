import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {pdfUrl && (
          <div className="flex-1 w-full h-full min-h-[60vh] relative">
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
        )}
      </DialogContent>
    </Dialog>
  );
}