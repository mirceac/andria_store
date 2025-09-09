import { useEffect, useRef } from 'react';

// Global cache for storing successfully loaded URLs
const successfullyLoadedUrls = new Map<string, boolean>();

/**
 * Hook to manage caching of successfully loaded storage URLs
 * This prevents unnecessary reloading of resources that have already been successfully loaded
 */
export function useStorageCache(url: string | null) {
  const originalUrl = useRef<string | null>(url);
  const isFirstLoad = useRef(true);
  
  // Check if the URL has changed from the original (non-cache-busted) URL
  useEffect(() => {
    // Only update the original URL reference on first render or when the URL changes
    // but ignore cache-busting parameters
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      originalUrl.current = getBaseUrl(url);
    } else if (getBaseUrl(url) !== getBaseUrl(originalUrl.current)) {
      // If the base URL actually changed (not just cache busting params), update it
      originalUrl.current = getBaseUrl(url);
    }
  }, [url]);

  /**
   * Mark a URL as successfully loaded
   */
  const markAsLoaded = () => {
    if (originalUrl.current) {
      successfullyLoadedUrls.set(originalUrl.current, true);
    }
  };

  /**
   * Check if a URL has been successfully loaded before
   */
  const hasBeenLoaded = (): boolean => {
    if (!originalUrl.current) return false;
    return successfullyLoadedUrls.get(originalUrl.current) === true;
  };

  /**
   * Clear the cached status for a URL
   */
  const clearCache = () => {
    if (originalUrl.current) {
      successfullyLoadedUrls.delete(originalUrl.current);
    }
  };

  return { markAsLoaded, hasBeenLoaded, clearCache };
}

/**
 * Get the base URL without cache-busting parameters
 */
function getBaseUrl(url: string | null): string | null {
  if (!url) return null;
  
  try {
    // Parse the URL
    const parsedUrl = new URL(url);
    
    // Remove common cache-busting parameters
    parsedUrl.searchParams.delete('v');
    parsedUrl.searchParams.delete('retry');
    parsedUrl.searchParams.delete('t');
    parsedUrl.searchParams.delete('_t');
    parsedUrl.searchParams.delete('timestamp');
    
    return parsedUrl.toString();
  } catch (e) {
    // If the URL is not valid (e.g., a relative path), return as is
    // Remove common cache busting parameters
    return url.split('?')[0];
  }
}
