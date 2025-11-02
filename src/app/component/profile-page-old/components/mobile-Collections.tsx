'use client';

import GlobalAnimeCard from '../../anime-structure/GlobalAnimeCard';
import type { AnimeBasicInfo } from '../../anime-structure/anime-basic-info';
import { API_SERVER } from '@/hosts/constants';

type CollectionType = 'FAVORITE' | 'WATCHING' | 'PLANNED' | 'COMPLETED' | 'PAUSED' | 'DROPPED';

interface MobileCollectionsProps {
  username?: string;
  currentType: CollectionType;
  onChangeType: (t: CollectionType) => void;
  loading: boolean;
  items: Array<{
    collectionId: number;
    collectionType: string;
    addedAt: string;
    anime: { id: number; title: string };
  }>;
}

const typeLabel = (type: string): string => {
  switch (type) {
    case 'PLANNED':
      return 'В планах';
    case 'WATCHING':
      return 'Смотрю';
    case 'PAUSED':
      return 'Отложено';
    case 'COMPLETED':
      return 'Просмотрено';
    case 'DROPPED':
      return 'Брошено';
    case 'FAVORITE':
      return 'Избранное';
    default:
      return type;
  }
};

const MobileCollections: React.FC<MobileCollectionsProps> = ({
  currentType,
  onChangeType,
  loading,
  items,
}) => {
  // Конвертируем данные в формат AnimeBasicInfo для GlobalAnimeCard
  const convertToAnimeBasicInfo = (item: MobileCollectionsProps['items'][0]): AnimeBasicInfo => ({
    id: item.anime.id,
    title: item.anime.title,
    alttitle: '',
    status: item.collectionType.toLowerCase(),
    type: 'TV',
    episode_all: '',
    current_episode: '',
    rating: '0',
    year: '',
    season: '',
    mouth_season: '',
    studio: '',
    genres: '',
    alias: '',
    realesed_for: '',
    opened: true,
    anons: '',
    coverId: null,
    bannerId: null,
    hasScreenshots: false,
    coverUrl: `${API_SERVER}/api/stream/${item.anime.id}/cover` // Используем старый API endpoint для совместимости
  });

  return (
    <div className="user-collections-mobile">
      <div className="tabs-container-mobile">
        {(['FAVORITE', 'WATCHING', 'PLANNED', 'COMPLETED', 'PAUSED', 'DROPPED'] as const).map((t) => (
          <button
            key={t}
            className={`tab-button-mobile ${currentType === t ? 'active' : ''}`}
            onClick={() => onChangeType(t)}
          >
            {typeLabel(t)}
          </button>
        ))}
      </div>
      <div className="collection-grid-mobile" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
        gap: '16px',
        padding: '16px'
      }}>
        {loading ? (
          <div className="loading-text" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>
            Загрузка...
          </div>
        ) : items.length === 0 ? (
          <div className="empty-text" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', opacity: 0.7 }}>
            В этой коллекции пока нет аниме
          </div>
        ) : (
          items.map((item) => (
            <GlobalAnimeCard
              key={item.collectionId}
              anime={convertToAnimeBasicInfo(item)}
              collectionType={item.collectionType}
              showCollectionStatus={true}
              showRating={false}
              showType={false}
              priority={false}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default MobileCollections;


