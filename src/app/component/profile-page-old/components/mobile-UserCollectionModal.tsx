'use client';

import React, { useEffect, useState } from 'react';
import { API_SERVER } from '@/hosts/constants';
import GlobalAnimeCard from '../../anime-structure/GlobalAnimeCard';
import { AnimeInfo } from '../../anime-structure/anime-data-info';
import type { AnimeBasicInfo } from '../../anime-structure/anime-basic-info';

type CollectionType = 'FAVORITE' | 'WATCHING' | 'PLANNED' | 'COMPLETED' | 'PAUSED' | 'DROPPED';

interface CollectionItem {
  collectionId: number;
  collectionType: string;
  addedAt: string;
  anime: AnimeInfo;
}

interface MobileUserCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  username?: string;
}

const typeLabel = (type: CollectionType): string => {
  switch (type) {
    case 'PLANNED': return 'В планах';
    case 'WATCHING': return 'Смотрю';
    case 'PAUSED': return 'Отложено';
    case 'COMPLETED': return 'Просмотрено';
    case 'DROPPED': return 'Брошено';
    case 'FAVORITE': return 'Избранное';
    default: return type;
  }
};

const MobileUserCollectionModal: React.FC<MobileUserCollectionModalProps> = ({ isOpen, onClose, username }) => {
  const [active, setActive] = useState<CollectionType>('COMPLETED');
  const [loading, setLoading] = useState<boolean>(false);
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [visibleAnime, setVisibleAnime] = useState<Set<string>>(new Set());

  // Конвертируем данные в формат AnimeBasicInfo для GlobalAnimeCard
  const convertToAnimeBasicInfo = (item: CollectionItem): AnimeBasicInfo => ({
    id: item.anime.id,
    title: item.anime.title,
    alttitle: item.anime.alttitle || '',
    status: item.anime.status || 'unknown',
    type: item.anime.type || 'TV',
    episode_all: item.anime.episode_all || '',
    current_episode: item.anime.current_episode || '',
    rating: '0',
    year: item.anime.year || '',
    season: item.anime.season || '',
    mouth_season: item.anime.mouth_season || '',
    studio: item.anime.studio || '',
    genres: item.anime.genres || '',
    alias: item.anime.alias || '',
    realesed_for: item.anime.realesed_for || '',
    opened: item.anime.opened ?? true,
    anons: item.anime.anons || '',
    coverId: null,
    bannerId: null,
    hasScreenshots: false,
    coverUrl: ''
  });

  // Получение статуса коллекции на русском
  const getCollectionStatusText = (type: string) => {
    switch (type?.toUpperCase()) {
      case 'WATCHING': return 'Смотрю';
      case 'COMPLETED': return 'Просмотрено';
      case 'PLANNED': return 'В планах';
      case 'DROPPED': return 'Брошено';
      case 'PAUSED': return 'Отложено';
      case 'FAVORITE': return 'Избранное';
      default: return type || '';
    }
  };

  useEffect(() => {
    if (!isOpen || !username) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setVisibleAnime(new Set()); // Очищаем видимые карточки при загрузке
      
      try {
        const res = await fetch(
          `${API_SERVER}/api/collection/user/${encodeURIComponent(username!)}?type=${encodeURIComponent(active)}`
        );
        if (!res.ok) throw new Error('load');
        const data = await res.json();
        const items = Array.isArray(data) ? data : [];
        
        if (!cancelled) {
          setItems(items);
          
          // Плавная анимация появления карточек
          items.forEach((item: CollectionItem, index: number) => {
            setTimeout(() => {
              if (!cancelled) {
                setVisibleAnime(prev => new Set([...prev, item.collectionId.toString()]));
              }
            }, index * 60); // Задержка 60ms между карточками
          });
        }
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [isOpen, username, active]);

  if (!isOpen) return null;

  return (
    <div className="mobile-collection-modal-overlay" onClick={onClose}>
      <div className="mobile-collection-modal" onClick={(e) => e.stopPropagation()}>
        <div className="mobile-collection-modal-header">
          <div className="mobile-collection-tabs">
            {(['FAVORITE','WATCHING','PLANNED','COMPLETED','PAUSED','DROPPED'] as CollectionType[]).map((t) => (
              <button key={t} className={`tab-chip ${active === t ? 'active' : ''}`} onClick={() => setActive(t)}>
                {typeLabel(t)}
              </button>
            ))}
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="mobile-collection-modal-body">
          {loading ? (
            <div className="loading-center">Загрузка...</div>
          ) : items.length === 0 ? (
            <div className="empty-text">В этой коллекции пока нет аниме</div>
          ) : (
            <div className="collection-mobile-anime-grid">
              {items.map((item) => (
                <div
                  key={item.collectionId}
                  className={`collection-mobile-anime-card ${
                    visibleAnime.has(item.collectionId.toString()) ? 'visible' : ''
                  }`}
                >
                  <GlobalAnimeCard
                    anime={convertToAnimeBasicInfo(item)}
                    collectionType={getCollectionStatusText(item.collectionType)}
                    showCollectionStatus={true}
                    showRating={true}
                    showType={false}
                    priority={false}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileUserCollectionModal;


