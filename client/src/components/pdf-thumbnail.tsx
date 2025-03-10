import { useState } from "react";
import { Loader2, FileText } from "lucide-react";

interface PDFThumbnailProps {
  pdfUrl: string;
  onClick?: () => void;
}

export function PDFThumbnail({ pdfUrl, onClick }: PDFThumbnailProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  return (
    <div 
      className="relative aspect-[3/4] w-full max-w-[200px] rounded-lg border bg-muted cursor-pointer hover:opacity-90 transition-opacity"
      onClick={onClick}
    >
      {isLoading && !loadError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
      
      {loadError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
          <FileText className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-xs text-muted-foreground text-center">PDF Preview</p>
        </div>
      ) : (
        <object
          data={pdfUrl + '#page=1'}
          type="application/pdf"
          className="w-full h-full rounded-lg"
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setLoadError(true);
            setIsLoading(false);
          }}
        >
          <div className="flex items-center justify-center h-full">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
        </object>
      )}
    </div>
  );
}