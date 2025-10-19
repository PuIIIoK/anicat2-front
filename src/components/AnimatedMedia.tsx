import React, { useState, useEffect } from 'react';
import Image from 'next/image';

interface AnimatedMediaProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
  fill?: boolean;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  showSpinner?: boolean;
}

/**
 * Компонент для отображения изображений и анимированных медиа
 */
const AnimatedMedia: React.FC<AnimatedMediaProps> = ({
  src,
  alt,
  width,
  height,
  className = '',
  style = {},
  fill = false,
  objectFit = 'cover',
  showSpinner = true,
}) => {
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'unknown'>('unknown');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    setError(false);
    
    const determineMediaType = async () => {
      if (!src) {
        setMediaType('unknown');
        setIsLoading(false);
        return;
      }

      const lowerSrc = src.toLowerCase();
      
      // Видео форматы по расширению (учитываем URL с параметрами)
      if (lowerSrc.includes('.mp4') || lowerSrc.includes('.webm') || 
          lowerSrc.includes('video.webm') || lowerSrc.includes('video/') ||
          lowerSrc.includes('/temp/avatar/') && lowerSrc.includes('video') ||
          lowerSrc.includes('/temp/banner/') && lowerSrc.includes('video')) {
        setMediaType('video');
        return;
      }
      
      // Для blob URL пытаемся определить тип через fetch
      if (lowerSrc.startsWith('blob:')) {
        try {
          const response = await fetch(src);
          const blob = await response.blob();
          const type = blob.type.toLowerCase();
          
          if (type.startsWith('video/')) {
            setMediaType('video');
          } else {
            setMediaType('image');
          }
        } catch {
          // Если не удалось определить, считаем изображением
          setMediaType('image');
        }
        return;
      }
      
      // Изображения (включая GIF)
      setMediaType('image');
    };

    determineMediaType();
  }, [src]);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setError(true);
    setIsLoading(false);
  };

  const renderSpinner = () => {
    if (!showSpinner || !isLoading) return null;
    
    return (
      <div 
        className="animated-media-spinner"
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0, 0, 0, 0.3)',
          zIndex: 10,
        }}
      >
        <div 
          className="spinner"
          style={{
            width: '32px',
            height: '32px',
            border: '3px solid rgba(255, 255, 255, 0.2)',
            borderTopColor: '#fff',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
      </div>
    );
  };

  if (error) {
    return (
      <div
        className={`animated-media-error ${className}`}
        style={{
          ...style,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(255, 255, 255, 0.05)',
          color: 'rgba(255, 255, 255, 0.3)',
        }}
      >
        {alt.charAt(0).toUpperCase()}
      </div>
    );
  }

  const commonStyle = {
    ...style,
    objectFit,
    width: fill ? '100%' : width,
    height: fill ? '100%' : height,
  };

  if (mediaType === 'video') {
    if (!src) return null;
    
    return (
      <div style={{ position: 'relative', width: fill ? '100%' : width, height: fill ? '100%' : height }}>
        {renderSpinner()}
        <video
          src={src}
          className={className}
          style={commonStyle}
          autoPlay
          loop
          muted
          playsInline
          onLoadedData={handleLoad}
          onError={handleError}
          aria-label={alt}
        />
      </div>
    );
  }

  if (mediaType === 'image') {
    if (!src) return null;
    
    // Для blob URL или GIF используем обычный img
    if (src.startsWith('blob:') || src.endsWith('.gif')) {
      return (
        <div style={{ position: 'relative', width: fill ? '100%' : width, height: fill ? '100%' : height }}>
          {renderSpinner()}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className={className}
            style={commonStyle}
            onLoad={handleLoad}
            onError={handleError}
          />
        </div>
      );
    }

    // Для остальных используем Next.js Image
    return (
      <div style={{ position: 'relative', width: fill ? '100%' : width, height: fill ? '100%' : height }}>
        {renderSpinner()}
        <Image
          src={src}
          alt={alt}
          fill={fill}
          width={!fill ? width : undefined}
          height={!fill ? height : undefined}
          className={className}
          style={commonStyle}
          onLoad={handleLoad}
          onError={handleError}
        />
      </div>
    );
  }

  return null;
};

export default AnimatedMedia;

