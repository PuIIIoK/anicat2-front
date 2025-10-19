import { useState, useEffect, useRef } from 'react';

interface ImageCache {
  [key: string]: {
    url: string;
    timestamp: number;
    etag?: string | null;
  };
}

interface UseOptimizedImageOptions {
  fallbackUrl?: string;
  cacheTimeout?: number; // milliseconds
  checkInterval?: number; // milliseconds
}

export const useOptimizedImage = (
  imageUrl: string | null | undefined,
  options: UseOptimizedImageOptions = {}
) => {
  const {
    fallbackUrl = '',
    cacheTimeout = 5 * 60 * 1000, // 5 minutes default
    checkInterval = 30 * 1000, // 30 seconds default
  } = options;

  const [currentUrl, setCurrentUrl] = useState<string>(imageUrl || fallbackUrl);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<boolean>(false);
  
  const cacheRef = useRef<ImageCache>({});
  const intervalRef = useRef<NodeJS.Timeout>();
  const abortControllerRef = useRef<AbortController>();

  // Function to check if image has changed on server
  const checkImageUpdate = async (url: string) => {
    if (!url || url === fallbackUrl) return;

    try {
      abortControllerRef.current = new AbortController();
      const response = await fetch(url, {
        method: 'HEAD',
        signal: abortControllerRef.current.signal,
        cache: 'no-cache', // Force check for updates
      });

      if (response.ok) {
        const etag = response.headers.get('etag');
        const lastModified = response.headers.get('last-modified');
        
        const cacheKey = url;
        const cached = cacheRef.current[cacheKey];
        
        // Check if image has changed
        if (cached && (
          cached.etag !== etag ||
          (lastModified && new Date(lastModified).getTime() !== cached.timestamp)
        )) {
          // Image has changed, update cache and URL
          cacheRef.current[cacheKey] = {
            url,
            timestamp: lastModified ? new Date(lastModified).getTime() : Date.now(),
            etag: etag || undefined,
          };
          setCurrentUrl(url);
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        console.warn('Failed to check image update:', err);
      }
    }
  };

  // Initialize image
  useEffect(() => {
    if (!imageUrl) {
      setCurrentUrl(fallbackUrl);
      return;
    }

    const cacheKey = imageUrl;
    const cached = cacheRef.current[cacheKey];
    const now = Date.now();

    // Check if we have a valid cached version
    if (cached && (now - cached.timestamp) < cacheTimeout) {
      setCurrentUrl(cached.url);
      return;
    }

    // Load new image
    setIsLoading(true);
    setError(false);

    const img = new Image();
    img.onload = () => {
      setIsLoading(false);
      setError(false);
      
      // Cache the successful load
      cacheRef.current[cacheKey] = {
        url: imageUrl,
        timestamp: now,
      };
      
      setCurrentUrl(imageUrl);
    };

    img.onerror = () => {
      setIsLoading(false);
      setError(true);
      setCurrentUrl(fallbackUrl);
    };

    img.src = imageUrl;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [imageUrl, fallbackUrl, cacheTimeout]);

  // Set up periodic checking for image updates
  useEffect(() => {
    if (!imageUrl || imageUrl === fallbackUrl) return;

    intervalRef.current = setInterval(() => {
      checkImageUpdate(imageUrl);
    }, checkInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [imageUrl, fallbackUrl, checkInterval]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    url: currentUrl,
    isLoading,
    error,
    refresh: () => {
      if (imageUrl) {
        checkImageUpdate(imageUrl);
      }
    },
  };
};
