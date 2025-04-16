import { useState } from "react";
import { Document, Page } from 'react-pdf';
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PDFThumbnailProps {
  pdfUrl: string;
  onClick?: () => void;
  width?: number;
  height?: number;
  className?: string;
}

export function PDFThumbnail({ 
  pdfUrl, 
  onClick, 
  width = 130,   // default width
  height = 182, // default height (maintaining 1.4 aspect ratio)
  className 
}: PDFThumbnailProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  return (
    <div 
      className={cn(
        "relative bg-white border border-gray-200 rounded overflow-hidden cursor-pointer hover:shadow-md transition-shadow flex items-center justify-center",
        className
      )}
      style={{ width: `${width}px`, height: `${height}px` }}
      onClick={onClick}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-50 text-red-500 text-xs p-2 text-center">
          Failed to load PDF
        </div>
      )}
      <Document
        file={pdfUrl}
        onLoadSuccess={() => {
          setIsLoading(false);
          setError(null);
        }}
        onLoadError={(err) => {
          console.error('Error loading PDF thumbnail:', err);
          setIsLoading(false);
          setError(err.message);
        }}
        loading={null}
        className="flex items-center justify-center"
      >
        <Page
          pageNumber={1}
          width={width}
          renderTextLayer={false}
          renderAnnotationLayer={false}
          className="flex items-center justify-center"
        />
      </Document>
    </div>
  );
}