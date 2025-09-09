import { useState, useEffect, useRef, useCallback } from 'react';

interface UseImageLoaderOptions {
  timeoutMs?: number;
  retryCount?: number;
}

export function useImageLoader(
  src: string | null, 
  options: UseImageLoaderOptions = {}
) {
  const { timeoutMs = 5000, retryCount: initialRetryCount = 0 } = options;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(initialRetryCount);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  
  // Generate the actual src with retry parameters if needed
  const actualSrc = src && retryCount > 0
    ? `${src}${src.includes('?') ? '&' : '?'}retry=${retryCount}`
    : src;
  
  // Reset state when src changes
  useEffect(() => {
    // Clear any existing timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    if (!actualSrc) {
      setLoading(false);
      setError(true);
      return;
    }
    
    setLoading(true);
    setError(false);
    
    // Create a new image element to test loading
    const img = new Image();
    imgRef.current = img;
    
    // Add load and error handlers
    img.onload = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setLoading(false);
      setError(false);
    };
    
    img.onerror = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setLoading(false);
      setError(true);
    };
    
    // Set a timeout to force failure if loading takes too long
    timeoutRef.current = setTimeout(() => {
      console.log('Image loading timed out:', actualSrc);
      // Force the image to stop loading
      if (imgRef.current) {
        imgRef.current.src = '';
      }
      setLoading(false);
      setError(true);
    }, timeoutMs);
    
    // Set the source to begin loading
    img.src = actualSrc;
    
    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (imgRef.current) {
        imgRef.current.onload = null;
        imgRef.current.onerror = null;
        imgRef.current.src = '';
      }
    };
  }, [actualSrc, timeoutMs]);
  
  // Function to retry loading the image
  const retry = useCallback(() => {
    setRetryCount(prev => prev + 1);
  }, []);
  
  return {
    loading,
    error,
    retry,
    retryCount,
    actualSrc
  };
}
