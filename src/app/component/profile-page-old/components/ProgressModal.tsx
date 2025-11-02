'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { API_SERVER } from '@/hosts/constants';
import '../../../styles/components/progress-modal.scss';

interface ProgressModalProps {
  animeId: number;
  animeTitle: string;
  username?: string;
  onClose: () => void;
}

interface EpisodeProgress {
  source: string;
  voice: string;
  time: number;
  duration: number;
  opened: boolean;
  updatedAt: number;
}

const ProgressModal: React.FC<ProgressModalProps> = ({ 
  animeId, 
  animeTitle,
  username, 
  onClose 
}) => {
  const [progressData, setProgressData] = useState<Record<number, EpisodeProgress[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Функция для нормализации названий озвучек
  const normalizeVoiceName = (voice: string): string => {
    if (!voice) return 'Неизвестная озвучка';
    
    const voiceMapping: Record<string, string> = {
      'onwave': 'OnWave',
      'ONWAVE': 'OnWave',
      'OnWave': 'OnWave',
      'anidub': 'AniDub',
      'ANIDUB': 'AniDub',
      'AniDub': 'AniDub',
      'anilibria': 'АниЛиберти',
      'ANILIBRIA': 'АниЛиберти',
      'AniLibria': 'АниЛиберти',
      'animevost': 'AnimeVost',
      'ANIMEVOST': 'AnimeVost',
      'AnimeVost': 'AnimeVost',
      'unknown': 'Неизвестная озвучка',
      'UNKNOWN': 'Неизвестная озвучка',
    };
    
    // Проверяем точное совпадение
    if (voiceMapping[voice]) {
      return voiceMapping[voice];
    }
    
    // Проверяем совпадение без учета регистра
    const lowerVoice = voice.toLowerCase();
    for (const [key, value] of Object.entries(voiceMapping)) {
      if (key.toLowerCase() === lowerVoice) {
        return value;
      }
    }
    
    // Если не найдено в маппинге, просто капитализируем первую букву
    return voice.charAt(0).toUpperCase() + voice.slice(1).toLowerCase();
  };

  // Функция для получения правильной озвучки по источнику
  const getCorrectVoiceForSource = (source: string, originalVoice: string): string => {
    if (source && source.toLowerCase() === 'libria') {
      return 'АниЛиберти';
    }
    return normalizeVoiceName(originalVoice);
  };

  useEffect(() => {
    const fetchProgressDetails = async () => {
      if (!username) {
        setError('Username не указан');
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `${API_SERVER}/api/player/progress/details/${encodeURIComponent(username)}/${animeId}`
        );

        if (!response.ok) {
          throw new Error('Не удалось загрузить данные');
        }

        const data = await response.json();
        setProgressData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Произошла ошибка');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProgressDetails();
  }, [animeId, username]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = (time: number, duration: number): number => {
    if (!duration || duration === 0) return 0;
    return Math.min((time / duration) * 100, 100);
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Проверяем, что мы на клиенте
  if (typeof document === 'undefined') {
    return null;
  }

  const modalContent = (
    <div className="progress-modal-backdrop" onClick={handleBackdropClick}>
      <div className="progress-modal">
        <div className="progress-modal-header">
          <h2 className="progress-modal-title">История просмотра</h2>
          <div className="progress-modal-anime-title">{animeTitle}</div>
          <button 
            className="progress-modal-close" 
            onClick={onClose}
            aria-label="Закрыть"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="progress-modal-content">
          {isLoading ? (
            <div className="progress-modal-loading">
              <div className="loading-spinner"></div>
              <span>Загрузка...</span>
            </div>
          ) : error ? (
            <div className="progress-modal-error">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4m0 4h.01" />
              </svg>
              <span>{error}</span>
            </div>
          ) : Object.keys(progressData).length === 0 ? (
            <div className="progress-modal-empty">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12h18m-9-9v18" />
              </svg>
              <span>История просмотра пуста</span>
            </div>
          ) : (
            <div className="progress-episodes-list">
              {Object.entries(progressData)
                .sort(([a], [b]) => parseInt(a) - parseInt(b))
                .map(([episodeId, episodes]) => {
                  // Фильтруем и убираем дубликаты
                  const uniqueWatchedEpisodes = episodes
                    .filter(episode => {
                      // Показываем только если есть реальный прогресс или серия была открыта
                      const hasProgress = episode.time > 0;
                      const wasOpened = episode.opened === true;
                      
                      // Для LIBRIA источника - всегда показываем если есть прогресс/открыто
                      const isLibriaSource = episode.source?.toLowerCase() === 'libria';
                      if (isLibriaSource) {
                        return hasProgress || wasOpened;
                      }
                      
                      // Для остальных источников - проверяем озвучку
                      const voice = episode.voice || '';
                      const isNotUnknown = voice.toLowerCase() !== 'неизвестная озвучка' && 
                                          voice.toLowerCase() !== 'unknown' && 
                                          voice.trim() !== '' &&
                                          voice !== null;
                      
                      return (hasProgress || wasOpened) && isNotUnknown;
                    })
                    .reduce((unique: typeof episodes, current) => {
                      // Убираем дубликаты по комбинации source + voice + time + duration
                      const correctVoice = getCorrectVoiceForSource(current.source, current.voice);
                      const key = `${current.source}-${correctVoice}-${current.time}-${current.duration}`;
                      
                      const exists = unique.find(item => {
                        const itemVoice = getCorrectVoiceForSource(item.source, item.voice);
                        return `${item.source}-${itemVoice}-${item.time}-${item.duration}` === key;
                      });
                      
                      if (!exists) {
                        unique.push(current);
                      } else {
                        // Если найден дубликат, берем запись с более поздней датой обновления
                        const existingIndex = unique.findIndex(item => {
                          const itemVoice = getCorrectVoiceForSource(item.source, item.voice);
                          return `${item.source}-${itemVoice}-${item.time}-${item.duration}` === key;
                        });
                        
                        if (current.updatedAt > unique[existingIndex].updatedAt) {
                          unique[existingIndex] = current;
                        }
                      }
                      
                      return unique;
                    }, []);
                  
                  if (uniqueWatchedEpisodes.length === 0) return null;
                  
                  return (
                  <div key={episodeId} className="progress-episode-item">
                    <div className="progress-episode-header">
                      <span className="progress-episode-number">Серия {episodeId}</span>
                      <span className="progress-episode-count">
                        {uniqueWatchedEpisodes.length} {uniqueWatchedEpisodes.length === 1 ? 'озвучка' : 'озвучки'}
                      </span>
                    </div>
                    
                    <div className="progress-episode-voices">
                      {uniqueWatchedEpisodes.map((episode, index) => {
                        const percentage = getProgressPercentage(episode.time, episode.duration);
                        const isCompleted = percentage >= 90;
                        
                        // Для libria источника показываем по-особому
                        const isLibria = episode.source?.toLowerCase() === 'libria';
                        
                        return (
                          <div key={index} className={`progress-voice-item ${isCompleted ? 'completed' : ''}`}>
                            <div className="progress-voice-info">
                              <div className="progress-voice-header">
                                {isLibria ? (
                                  <>
                                    <span className="progress-voice-name libria-format">
                                      <span className="episode-part">Серия {episodeId}</span>
                                      <span>|</span>
                                      <span className="voice-part">АниЛиберти</span>
                                    </span>
                                    <span className="progress-voice-source">
                                      LIBRIA
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <span className="progress-voice-name">
                                      {getCorrectVoiceForSource(episode.source, episode.voice)}
                                    </span>
                                    <span className="progress-voice-source">
                                      {episode.source}
                                    </span>
                                  </>
                                )}
                              </div>
                              
                              {episode.duration > 0 && (
                                <div className="progress-voice-timeline">
                                  <div className="progress-bar">
                                    <div 
                                      className="progress-bar-fill"
                                      style={{ width: `${percentage}%` }}
                                    />
                                  </div>
                                  <span className="progress-time">
                                    {formatTime(episode.time)} / {formatTime(episode.duration)}
                                  </span>
                                </div>
                              )}
                              
                              <div className="progress-voice-meta">
                                {isCompleted && (
                                  <span className="progress-badge completed">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                      <path d="M20 6L9 17l-5-5" />
                                    </svg>
                                    Просмотрено
                                  </span>
                                )}
                                {episode.updatedAt && (
                                  <span className="progress-date">
                                    {formatDate(episode.updatedAt)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  );
                }).filter(Boolean)}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Рендерим модалку через портал в body
  return createPortal(modalContent, document.body);
};

export default ProgressModal;
