'use client';

import GlobalAnimeCard from '../../anime-structure/GlobalAnimeCard';
import type { AnimeBasicInfo } from '../../anime-structure/anime-basic-info';

interface OverviewFavoritesProps {
  favoriteAnime: Array<{
    id: number;
    coverUrl: string;
    title: string;
    totalEpisodes?: number;
    progressText?: string;
  }>;
}

const MobileOverviewFavorites: React.FC<OverviewFavoritesProps> = ({ favoriteAnime }) => {
  // Конвертируем данные в формат AnimeBasicInfo для GlobalAnimeCard
  const convertToAnimeBasicInfo = (anime: OverviewFavoritesProps['favoriteAnime'][0]): AnimeBasicInfo => ({
    id: anime.id,
    title: anime.title,
    alttitle: '',
    status: 'completed', // Для избранного можно использовать completed по умолчанию
    type: 'TV',
    episode_all: anime.totalEpisodes?.toString() || '',
    current_episode: anime.totalEpisodes?.toString() || '',
    rating: '0',
    year: '',
    season: '',
    mouth_season: '',
    studio: '',
    genres: '',
    alias: '',
    realesed_for: '',
    opened: true,
    anons: anime.progressText || '',
    coverId: null,
    bannerId: null,
    hasScreenshots: false,
    coverUrl: anime.coverUrl
  });

  return (
    <div className="overview-mobile">
      <div className="mobile-anime-grid" style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', 
        gap: '16px',
        padding: '16px'
      }}>
        {favoriteAnime.length === 0 ? (
          <div style={{ opacity: 0.7, gridColumn: '1 / -1', textAlign: 'center', padding: '20px' }}>
            Нет избранного
          </div>
        ) : (
          favoriteAnime.slice(0, 6).map((anime) => (
            <GlobalAnimeCard
              key={anime.id}
              anime={convertToAnimeBasicInfo(anime)}
              showCollectionStatus={false}
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

export default MobileOverviewFavorites;


