'use client';

import React from 'react';
import { useTheme } from '../../../context/ThemeContext';
import '../../../styles/components/skeleton.scss';

interface SkeletonLoaderProps {
  className?: string;
  variant?: 'text' | 'rectangular' | 'circular' | 'card';
  width?: string | number;
  height?: string | number;
  children?: React.ReactNode;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  className = '',
  variant = 'text',
  width,
  height,
  children
}) => {
  const { theme, colorScheme } = useTheme();
  
  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  return (
    <div 
      className={`skeleton-loader skeleton-${variant} ${className}`}
      style={style}
      data-theme={theme}
      data-color-scheme={colorScheme}
      aria-hidden="true"
    >
      {children}
    </div>
  );
};

interface WatchingSkeletonProps {
  count?: number;
}

export const WatchingSkeleton: React.FC<WatchingSkeletonProps> = ({ count = 4 }) => {
  const { theme, colorScheme } = useTheme();
  
  return (
    <div className="now-watching" data-theme={theme} data-color-scheme={colorScheme}>
      <SkeletonLoader variant="text" width="220px" height="32px" className="skeleton-title" />
      <div className="watching-list">
        <div className="watching-list-container">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="profile-anime-card skeleton-card">
              <SkeletonLoader variant="rectangular" width="100%" height="240px" className="skeleton-cover" />
              <div className="skeleton-card-content">
                <SkeletonLoader variant="text" width="85%" height="18px" />
                <SkeletonLoader variant="text" width="60%" height="14px" />
                <SkeletonLoader variant="text" width="40%" height="14px" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const ProfileHeaderSkeleton: React.FC = () => {
  const { theme, colorScheme } = useTheme();
  
  return (
    <div className="profile-header" data-theme={theme} data-color-scheme={colorScheme}>
      <SkeletonLoader variant="rectangular" width="100%" height="200px" className="skeleton-banner" />
      <div className="profile-header-content">
        <div className="profile-avatar-section">
          <SkeletonLoader variant="circular" width="120px" height="120px" className="skeleton-avatar" />
        </div>
        <div className="profile-info-section">
          <SkeletonLoader variant="text" width="200px" height="28px" className="skeleton-username" />
          <SkeletonLoader variant="text" width="150px" height="16px" />
          <SkeletonLoader variant="text" width="300px" height="16px" />
          <div className="skeleton-badges">
            <SkeletonLoader variant="rectangular" width="60px" height="24px" />
            <SkeletonLoader variant="rectangular" width="80px" height="24px" />
          </div>
        </div>
      </div>
    </div>
  );
};

export const FavoritesSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => {
  const { theme, colorScheme } = useTheme();
  
  return (
    <div className="favorites" data-theme={theme} data-color-scheme={colorScheme}>
      <SkeletonLoader variant="text" width="160px" height="32px" className="skeleton-title" />
      <div className="favorites-grid">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="favorite-card skeleton-card">
            <SkeletonLoader variant="rectangular" width="100%" height="200px" className="skeleton-cover" />
            <div className="skeleton-card-content">
              <SkeletonLoader variant="text" width="90%" height="16px" />
              <SkeletonLoader variant="text" width="50%" height="14px" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const RecentActivitySkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => {
  const { theme, colorScheme } = useTheme();
  
  return (
    <div className="recent-activity" data-theme={theme} data-color-scheme={colorScheme}>
      <SkeletonLoader variant="text" width="180px" height="32px" className="skeleton-title" />
      <div className="activity-list">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="activity-item skeleton-card">
            <SkeletonLoader variant="circular" width="40px" height="40px" className="skeleton-icon" />
            <div className="activity-content">
              <SkeletonLoader variant="text" width="70%" height="16px" />
              <SkeletonLoader variant="text" width="40%" height="14px" />
            </div>
            <SkeletonLoader variant="text" width="60px" height="14px" />
          </div>
        ))}
      </div>
    </div>
  );
};
