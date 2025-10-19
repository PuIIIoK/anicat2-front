import React from 'react';
import Image from 'next/image';
import { useOptimizedImage } from '../hooks/useOptimizedImage';

interface OptimizedImageProps {
  src: string | null | undefined;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  className?: string;
  style?: React.CSSProperties;
  fallbackSrc?: string;
  priority?: boolean;
  quality?: number;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  fill = false,
  className,
  style,
  fallbackSrc = '/default-avatar.png',
  priority = false,
  quality = 75,
  placeholder = 'empty',
  blurDataURL,
}) => {
  const { url, isLoading, error } = useOptimizedImage(src, {
    fallbackUrl: fallbackSrc,
    cacheTimeout: 5 * 60 * 1000, // 5 minutes
    checkInterval: 30 * 1000, // 30 seconds
  });

  // Show loading state
  if (isLoading) {
    return (
      <div 
        className={`${className || ''} image-loading`}
        style={{
          width: fill ? '100%' : width,
          height: fill ? '100%' : height,
          backgroundColor: '#f0f0f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...style,
        }}
      >
        <div className="loading-spinner" />
      </div>
    );
  }

  // Show error state
  if (error || !url) {
    return (
      <div 
        className={`${className || ''} image-error`}
        style={{
          width: fill ? '100%' : width,
          height: fill ? '100%' : height,
          backgroundColor: '#f0f0f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#999',
          fontSize: '12px',
          ...style,
        }}
      >
        {alt}
      </div>
    );
  }

  // Render optimized image
  if (fill) {
    return (
      <Image
        src={url}
        alt={alt}
        fill
        className={className}
        style={style}
        priority={priority}
        quality={quality}
        placeholder={placeholder}
        blurDataURL={blurDataURL}
      />
    );
  }

  return (
    <Image
      src={url}
      alt={alt}
      width={width || 100}
      height={height || 100}
      className={className}
      style={style}
      priority={priority}
      quality={quality}
      placeholder={placeholder}
      blurDataURL={blurDataURL}
    />
  );
};
