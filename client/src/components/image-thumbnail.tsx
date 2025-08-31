import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Image } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageThumbnailProps {
  productId: number;
  imageUrl: string | null;
  imageData: string | null;
  alt: string;
  onClick?: () => void;
  className?: string;
}

export function ImageThumbnail({
  productId,
  imageUrl,
  imageData,
  alt,
  onClick,
  className,
}: ImageThumbnailProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    // Reset state when props change
    setError(false);

    if (imageUrl) {
      // Use the provided URL directly
      setSrc(imageUrl);
    } else if (imageData) {
      // For API endpoint that serves the image from database
      setSrc(`/api/products/${productId}/img`);
    } else {
      setSrc(null);
    }
  }, [productId, imageUrl, imageData]);

  if (error || !src) {
    return (
      <Button
        variant="ghost"
        onClick={onClick}
        className={cn("h-10 w-10 p-0 rounded-full hover:bg-slate-100", className)}
      >
        <Image className="h-5 w-5 text-blue-500" />
      </Button>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={cn("cursor-pointer hover:opacity-90 transition-opacity", className)}
      onClick={onClick}
      onError={() => setError(true)}
    />
  );
}