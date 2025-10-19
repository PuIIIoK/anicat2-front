'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { ProfileAnimeItem } from '../types';
import ProgressModal from './ProgressModal';
import '../../../styles/components/profile-anime-card.scss';

interface ProfileAnimeCardProps {
  item: ProfileAnimeItem;
  username?: string;
}

export const ProfileAnimeCard: React.FC<ProfileAnimeCardProps> = ({ item, username }) => {
  const [showProgressModal, setShowProgressModal] = useState(false);
  
  // Определяем, завершено ли аниме для форматирования эпизодов
  const isCompleted = item.currentEpisodes === item.totalEpisodes;
  
  // Форматируем эпизоды
  let episodeText = '';
  if (isCompleted && item.totalEpisodes) {
    episodeText = `${item.totalEpisodes} эп.`;
  } else if (item.currentEpisodes && item.totalEpisodes) {
    episodeText = `${item.currentEpisodes}/${item.totalEpisodes} эп.`;
  } else if (item.totalEpisodes) {
    episodeText = `${item.totalEpisodes} эп.`;
  }

  const handleProgressClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowProgressModal(true);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.profile-anime-progress-button')) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return (
    <>
      <Link href={`/anime-page/${item.id}`} prefetch={true} className="profile-anime-card" onClick={handleCardClick}>
        {/* Обложка */}
        <div className="profile-anime-card-image-container">
          <Image
            src={item.coverUrl || '/anime-placeholder.svg'}
            alt={item.title}
            width={160}
            height={220}
            className="profile-anime-card-image"
            sizes="160px"
          />
        </div>
        
        {/* Информация под обложкой */}
        <div className="profile-anime-card-content">
          {/* Название */}
          <h3 className="profile-anime-card-title" title={item.title}>
            {item.title}
          </h3>
          
          {/* Год слева, сезон справа */}
          <div className="profile-anime-card-year-season">
            <div className="profile-anime-card-year">
              {item.year}
            </div>
            
            {item.seasonLabel && (
              <div className="profile-anime-card-season">
                {item.seasonLabel}
              </div>
            )}
          </div>
          
          {/* Прогресс по озвучкам */}
          {item.voiceProgress && Object.keys(item.voiceProgress).length > 0 && (
            <div className="profile-anime-card-voices">
              {Object.entries(item.voiceProgress).slice(0, 2).map(([voice, count]) => (
                <div key={voice} className="profile-anime-card-voice-item">
                  <span className="voice-name">{voice}:</span>
                  <span className="voice-count">{count} эп.</span>
                </div>
              ))}
              {Object.keys(item.voiceProgress).length > 2 && (
                <div className="profile-anime-card-voice-more">
                  +{Object.keys(item.voiceProgress).length - 2} озв.
                </div>
              )}
            </div>
          )}
          
          {/* Кнопка списка просмотренных и эпизоды */}
          <div className="profile-anime-card-bottom">
            {item.progressDetails && item.progressDetails.length > 0 && (
              <button 
                className="profile-anime-progress-button"
                onClick={handleProgressClick}
                title="Список просмотренных серий"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 11L12 14L22 4" />
                  <path d="M21 12V19C21 20.1 20.1 21 19 21H5C3.9 21 3 20.1 3 19V5C3 3.9 3.9 3 5 3H16" />
                </svg>
                Список просмот.
              </button>
            )}
            
            {/* Эпизоды справа снизу */}
            {episodeText && (
              <div className="profile-anime-card-episodes">
                {episodeText}
              </div>
            )}
          </div>
          
          {/* Прогресс текст, если есть */}
          {item.progressText && (
            <div className="profile-anime-card-progress">
              {item.progressText}
            </div>
          )}
        </div>
      </Link>

      {/* Модалка с деталями просмотра */}
      {showProgressModal && (
        <ProgressModal
          animeId={item.id}
          animeTitle={item.title}
          username={username}
          onClose={() => setShowProgressModal(false)}
        />
      )}
    </>
  );
};

export default ProfileAnimeCard;
