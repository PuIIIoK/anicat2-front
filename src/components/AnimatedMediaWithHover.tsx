import React, { useState } from 'react';
import AnimatedMedia from './AnimatedMedia';

interface AnimatedMediaWithHoverProps {
  staticSrc: string;
  animatedSrc: string;
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
 * Компонент для отображения анимированных медиа с hover эффектом
 * По умолчанию показывает статический preview, при наведении - анимацию
 */
const AnimatedMediaWithHover: React.FC<AnimatedMediaWithHoverProps> = ({
  staticSrc,
  animatedSrc,
  alt,
  width,
  height,
  className = '',
  style = {},
  fill = false,
  objectFit = 'cover',
  showSpinner = true,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ width: fill ? '100%' : width, height: fill ? '100%' : height }}
    >
      <AnimatedMedia
        src={isHovered ? animatedSrc : staticSrc}
        alt={alt}
        width={width}
        height={height}
        className={className}
        style={style}
        fill={fill}
        objectFit={objectFit}
        showSpinner={showSpinner}
      />
    </div>
  );
};

export default AnimatedMediaWithHover;

