'use client';

import React, { useRef } from 'react';
import type { WatchingItem } from '../types';
import { ProfileAnimeCard } from './ProfileAnimeCard';
import { WatchingSkeleton } from './SkeletonLoader';

interface NowWatchingProps {
  items: WatchingItem[];
  username?: string;
  isLoading?: boolean;
}

export const NowWatching: React.FC<NowWatchingProps> = ({ items, username, isLoading = false }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  if (isLoading) {
    return <WatchingSkeleton count={4} />;
  }
  
  return (
    <div className="now-watching">
      <h2>Недавно просмотренно</h2>
      <div className="watching-list">
        <div className="watching-list-container" ref={containerRef}>
          {items.map((anime, i) => (
            <ProfileAnimeCard key={i} item={anime} username={username} />
          ))}
        </div>
      </div>
    </div>
  );
};


