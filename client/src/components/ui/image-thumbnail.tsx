import { FileImage } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface ImageThumbnailProps {
  productId?: number;
  imageUrl?: string | null;
  imageData?: string | null;
  alt: string;
  onClick?: () => void;
  width?: number;
  height?: number;
  className?: string;
  storageType?: "pdf" | "image";  // Add storage type prop
}

export function ImageThumbnail({ 
  productId,
  imageUrl, 
  imageData, 
  alt,
  onClick,
  width = 130,
  height = 182,
  className,
  storageType = "image"  // Default to image
}: ImageThumbnailProps) {
  const [imageSource, setImageSource] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only proceed if this is an image type
    if (storageType !== "image") {
      setImageSource('');
      setError('Not an image');
      return;
    }

    if (imageData && productId) {
      // If we have image data stored in DB, use the API endpoint
      setImageSource(`/api/products/${productId}/img`);
      setError(null);
    } else if (imageUrl) {
      // If we have a file system image, use the direct URL
      setImageSource(imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`);
      setError(null);
    } else {
      setImageSource('');
      setError(null);
    }
  }, [imageData, imageUrl, productId, storageType]);

  // Show placeholder if no image or error
  if ((!imageUrl && !imageData) || error) {
    return (
      <div 
        className={cn(
          "relative bg-white border border-gray-200 rounded overflow-hidden flex items-center justify-center",
          className
        )}
        style={{ width: `${width}px`, height: `${height}px` }}
      >
        <FileImage className="h-10 w-10 text-muted-foreground" />
        {error && (
          <span className="absolute bottom-2 text-xs text-red-500 px-2 text-center">
            {error}
          </span>
        )}
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "relative bg-white border border-gray-200 rounded overflow-hidden cursor-pointer hover:shadow-md transition-shadow",
        className
      )}
      style={{ width: `${width}px`, height: `${height}px` }}
      onClick={onClick}
    >
      <img
        src={imageSource}
        alt={alt}
        className="w-full h-full object-cover"
        loading="lazy"
        onError={(e) => {
          console.error('Image load error:', e);
          setError('Failed to load image');
        }}
      />
    </div>
  );
}

// In your schema.ts file
export type SelectProduct = {
  // ...other fields
  image_file: string | null;
  image_data: string | null;  // Should be base64 encoded
}