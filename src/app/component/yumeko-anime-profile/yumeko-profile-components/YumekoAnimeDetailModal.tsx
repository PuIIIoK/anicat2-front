'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import Link from 'next/link';
import * as LucideIcons from 'lucide-react';
import { API_SERVER } from '@/hosts/constants';
import SkeletonLoader from './SkeletonLoader';

interface AnimeDetail {
    id: number;
    title: string;
    year?: string;
    season?: string;
    totalEpisodes?: number;
    currentEpisodes?: number;
    episode_all?: string;
    current_episode?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    voiceProgress?: Record<string, any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    progressDetails?: any[];
}

interface YumekoAnimeDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    anime: AnimeDetail | null;
    username?: string;
}

interface EpisodeProgress {
    source: string;
    voice: string;
    time: number;
    duration: number;
    opened: boolean;
    updatedAt: number;
}

const YumekoAnimeDetailModal: React.FC<YumekoAnimeDetailModalProps> = ({ isOpen, onClose, anime, username }) => {
    const [progressData, setProgressData] = useState<Record<number, EpisodeProgress[]>>({});
    const [isLoadingProgress, setIsLoadingProgress] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [animeDetails, setAnimeDetails] = useState<any>(null);

    useEffect(() => {
        if (!isOpen || !anime || !username) {
            setProgressData({});
            return;
        }

        const fetchData = async () => {
            setIsLoadingProgress(true);
            try {
                // Загружаем историю просмотра
                const progressResponse = await fetch(
                    `${API_SERVER}/api/player/progress/details/${encodeURIComponent(username)}/${anime.id}`
                );

                if (progressResponse.ok) {
                    const data = await progressResponse.json();
                    setProgressData(data);
                }

                // Загружаем детали аниме для получения точного количества эпизодов
                const animeResponse = await fetch(`${API_SERVER}/api/stream/${anime.id}`);
                if (animeResponse.ok) {
                    const animeData = await animeResponse.json();
                    setAnimeDetails(animeData);
                }
            } catch (err) {
                console.error('Ошибка загрузки данных:', err);
            } finally {
                setIsLoadingProgress(false);
            }
        };

        fetchData();
    }, [isOpen, anime, username]);

    if (!isOpen || !anime) return null;

    // Используем episode_all и current_episode из данных аниме
    const totalEpisodes = anime.episode_all || animeDetails?.episode_all || animeDetails?.totalEpisodes || anime.totalEpisodes || '?';
    const currentEpisode = anime.current_episode || animeDetails?.current_episode || anime.currentEpisodes || Object.keys(progressData).length || 0;
    
    // Получаем общую статистику по озвучкам (просмотренные эпизоды)
    const voiceStats = anime.voiceProgress || {};

    const normalizeVoiceName = (voice: string): string => {
        if (!voice) return 'Неизвестная озвучка';
        
        const voiceMapping: Record<string, string> = {
            'onwave': 'OnWave',
            'anidub': 'AniDub',
            'anilibria': 'АниЛиберти',
            'animevost': 'AnimeVost',
            'unknown': 'Неизвестная озвучка',
        };
        
        const lowerVoice = voice.toLowerCase();
        for (const [key, value] of Object.entries(voiceMapping)) {
            if (key === lowerVoice) return value;
        }
        
        return voice.charAt(0).toUpperCase() + voice.slice(1).toLowerCase();
    };

    const getCorrectVoiceForSource = (source: string, originalVoice: string): string => {
        if (source && source.toLowerCase() === 'libria') {
            return 'АниЛиберти';
        }
        return normalizeVoiceName(originalVoice);
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

    const modalContent = (
        <div className="yumeko-anime-modal-overlay" onClick={onClose}>
            <div className="yumeko-anime-modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="yumeko-anime-modal-close" onClick={onClose}>
                    <LucideIcons.X size={24} />
                </button>

                <div className="yumeko-anime-modal-header">
                    <div className="yumeko-anime-modal-cover">
                        <Image 
                            src={`${API_SERVER}/api/stream/${anime.id}/cover`}
                            alt={anime.title}
                            width={300}
                            height={450}
                        />
                    </div>
                    <div className="yumeko-anime-modal-info">
                        <h2>{anime.title}</h2>
                        <div className="yumeko-anime-modal-meta">
                            <span className="year">{anime.year || animeDetails?.year || '2025'}</span>
                            <span className="season">{anime.season || animeDetails?.season || '1 сезон'}</span>
                            <span className="episodes-badge">
                                <LucideIcons.Film size={14} />
                                {totalEpisodes} эп.
                            </span>
                        </div>
                        
                        {animeDetails?.description && (
                            <div className="yumeko-anime-description">
                                <p>{animeDetails.description.length > 200 
                                    ? `${animeDetails.description.substring(0, 200)}...` 
                                    : animeDetails.description}
                                </p>
                            </div>
                        )}
                        
                        {Object.keys(voiceStats).length > 0 && (
                            <div className="yumeko-anime-voices">
                                <h4>Просмотрено в озвучках:</h4>
                                <div className="voices-grid">
                                    {Object.entries(voiceStats).map(([voice, count]) => (
                                        <div key={voice} className="yumeko-voice-item">
                                            <span className="voice-name">{voice}</span>
                                            <span className="voice-count">{count} эп.</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="yumeko-anime-actions">
                            <Link href={`/anime-page/${anime.id}`} className="yumeko-btn-watch">
                                <LucideIcons.Play size={18} />
                                Смотреть
                            </Link>
                            <div className="yumeko-progress-badge">
                                <LucideIcons.CheckCircle2 size={16} />
                                {currentEpisode}/{totalEpisodes} эп.
                            </div>
                        </div>
                    </div>
                </div>

                <div className="yumeko-anime-modal-body">
                    <h3>История просмотра</h3>
                    
                    {isLoadingProgress ? (
                        <SkeletonLoader type="history" count={10} />
                    ) : Object.keys(progressData).length === 0 ? (
                        <div className="yumeko-progress-empty">
                            <LucideIcons.PlayCircle size={48} opacity={0.3} />
                            <span>История просмотра пуста</span>
                        </div>
                    ) : (
                        <div className="yumeko-progress-list">
                            {Object.entries(progressData)
                                .sort(([a], [b]) => parseInt(a) - parseInt(b))
                                .map(([episodeId, episodes]) => {
                                    const uniqueWatchedEpisodes = episodes
                                        .filter(episode => {
                                            const hasProgress = episode.time > 0;
                                            const wasOpened = episode.opened === true;
                                            const isLibriaSource = episode.source?.toLowerCase() === 'libria';
                                            
                                            if (isLibriaSource) {
                                                return hasProgress || wasOpened;
                                            }
                                            
                                            const voice = episode.voice || '';
                                            const isNotUnknown = voice.toLowerCase() !== 'неизвестная озвучка' && 
                                                              voice.toLowerCase() !== 'unknown' && 
                                                              voice.trim() !== '' &&
                                                              voice !== null;
                                            
                                            return (hasProgress || wasOpened) && isNotUnknown;
                                        })
                                        .reduce((unique: typeof episodes, current) => {
                                            const correctVoice = getCorrectVoiceForSource(current.source, current.voice);
                                            const key = `${current.source}-${correctVoice}-${current.time}-${current.duration}`;
                                            
                                            const exists = unique.find(item => {
                                                const itemVoice = getCorrectVoiceForSource(item.source, item.voice);
                                                return `${item.source}-${itemVoice}-${item.time}-${item.duration}` === key;
                                            });
                                            
                                            if (!exists) {
                                                unique.push(current);
                                            } else {
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
                                        <div key={episodeId} className="yumeko-progress-episode">
                                            <div className="yumeko-progress-episode-header">
                                                <span className="episode-number">Серия {episodeId}</span>
                                                <span className="episode-count">
                                                    {uniqueWatchedEpisodes.length} {uniqueWatchedEpisodes.length === 1 ? 'озвучка' : 'озвучки'}
                                                </span>
                                            </div>
                                            
                                            <div className="yumeko-progress-voices">
                                                {uniqueWatchedEpisodes.map((episode, index) => {
                                                    const percentage = getProgressPercentage(episode.time, episode.duration);
                                                    const isCompleted = percentage >= 90;
                                                    
                                                    return (
                                                        <div key={index} className={`yumeko-progress-voice ${isCompleted ? 'completed' : ''}`}>
                                                            <div className="voice-header">
                                                                <div className="voice-info">
                                                                    <span className="voice-name">
                                                                        {getCorrectVoiceForSource(episode.source, episode.voice)}
                                                                    </span>
                                                                    <span className="voice-source">{episode.source}</span>
                                                                </div>
                                                                {isCompleted && (
                                                                    <span className="completed-badge">
                                                                        <LucideIcons.Check size={14} />
                                                                        Просмотрено
                                                                    </span>
                                                                )}
                                                            </div>
                                                            
                                                            {episode.duration > 0 && (
                                                                <div className="voice-progress">
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
                                                            
                                                            {episode.updatedAt && (
                                                                <div className="voice-date">
                                                                    <LucideIcons.Clock size={12} />
                                                                    {formatDate(episode.updatedAt)}
                                                                </div>
                                                            )}
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

    return createPortal(modalContent, document.body);
};

export default YumekoAnimeDetailModal;
