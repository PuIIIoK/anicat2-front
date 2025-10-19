'use client';

import React, { useRef } from 'react';
import type { FavoriteItem } from '../types';
import { ProfileAnimeCard } from './ProfileAnimeCard';

interface FavoritesProps {
  userName: string;
  items: FavoriteItem[];
}

export const Favorites: React.FC<FavoritesProps> = ({ userName, items }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  return (
    <div className="favorites-block-pc favorites-as-watching">
      <h2>Избранное {userName}</h2>

      <div className="favorites-scroll-container" ref={containerRef}>
        <div className="favorites-grid-pc">
          {items.map((anime, index) => (
            <ProfileAnimeCard key={index} item={anime} username={userName} />
          ))}
        </div>
      </div>
    </div>
  );
};


