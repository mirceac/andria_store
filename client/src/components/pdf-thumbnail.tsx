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
      className="relative w-full h-40 rounded-t-lg cursor-pointer overflow-hidden"
      onClick={onClick}
    >
      {isLoading && !loadError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      )}
      
      {loadError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <FileText className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-xs text-muted-foreground">PDF Preview</p>
        </div>
      ) : (
        <object
          data={`${pdfUrl}#page=1&toolbar=0&navpanes=0&scrollbar=0&zoom=page-fit&view=fit`}
          type="application/pdf"
          className="w-full h-full object-contain"
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