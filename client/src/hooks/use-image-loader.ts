import { useState, useEffect, useRef, useCallback } from 'react';

interface UseImageLoaderOptions {
  timeoutMs?: number;
  retryCount?: number;
  maxAutoRetries?: number;
}

export function useImageLoader(
  src: string | null,
  options: UseImageLoaderOptions = {}
) {
  const { timeoutMs = 5000, retryCount: initialRetryCount = 0, maxAutoRetries = 0 } = options;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(initialRetryCount);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const autoRetryCountRef = useRef(0);
  const lastBaseSrcRef = useRef<string | null>(null);

  // Generate the actual src with retry parameters if needed
  const actualSrc = src && retryCount > 0
    ? `${src}${src.includes('?') ? '&' : '?'}retry=${retryCount}`
    : src;

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Reset auto-retry counter when the base src changes (not on each retry)
    if (src !== lastBaseSrcRef.current) {
      lastBaseSrcRef.current = src;
      autoRetryCountRef.current = 0;
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

    const handleSuccess = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setLoading(false);
      setError(false);
    };

    const handleFailure = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (autoRetryCountRef.current < maxAutoRetries) {
        // Auto-retry: increment counter and trigger reload, keep spinner visible
        autoRetryCountRef.current++;
        setRetryCount(prev => prev + 1);
      } else {
        setLoading(false);
        setError(true);
      }
    };

    img.onload = handleSuccess;
    img.onerror = () => {
      console.log('Image loading error:', actualSrc);
      handleFailure();
    };

    // Set a timeout to force failure if loading takes too long
    timeoutRef.current = setTimeout(() => {
      console.log('Image loading timed out:', actualSrc);
      if (imgRef.current) imgRef.current.src = '';
      handleFailure();
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
  }, [actualSrc, timeoutMs, maxAutoRetries]);

  // Function to manually retry loading the image
  const retry = useCallback(() => {
    autoRetryCountRef.current = 0; // Reset auto-retries on manual retry
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
