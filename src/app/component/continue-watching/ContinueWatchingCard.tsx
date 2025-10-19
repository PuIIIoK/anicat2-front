'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Play, Clock, Headphones, Monitor } from 'lucide-react';
import type { WatchingItem } from '../profile-page-old/types';
import { API_SERVER } from '../../../tools/constants';

interface ContinueWatchingCardProps {
    item: WatchingItem;
    priority?: boolean;
}

const ContinueWatchingCard: React.FC<ContinueWatchingCardProps> = ({ item, priority = false }) => {
    const [imageError, setImageError] = useState(false);
    const [animeData, setAnimeData] = useState<{ kodik?: string; alias?: string } | null>(null);

    // Загружаем данные аниме для получения kodik и alias
    useEffect(() => {
        const fetchAnimeData = async () => {
            try {
                const response = await fetch(`${API_SERVER}/api/anime/get-anime/${item.id}`);
                if (response.ok) {
                    const data = await response.json();
                    console.log('[ContinueWatchingCard] Fetched anime data:', data);
                    setAnimeData({
                        kodik: data.kodik || data.title || item.title,
                        alias: data.alias || ''
                    });
                } else {
                    console.error('[ContinueWatchingCard] Failed to fetch anime data, status:', response.status);
                }
            } catch (error) {
                console.error('[ContinueWatchingCard] Error fetching anime data:', error);
            }
        };
        
        fetchAnimeData();
    }, [item.id, item.title]);

    // Получаем последний просмотренный эпизод и детали
    const lastWatched = item.progressDetails && item.progressDetails.length > 0 
        ? item.progressDetails[item.progressDetails.length - 1] 
        : null;

    // Рассчитываем прогресс
    const progress = item.totalEpisodes && item.currentEpisodes
        ? (item.currentEpisodes / item.totalEpisodes) * 100
        : 0;

    // Форматируем время просмотра
    const formatTime = (seconds?: number) => {
        if (!seconds) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Форматируем название озвучки
    const formatVoiceName = (voice?: string) => {
        if (!voice) return 'Неизвестно';
        // Убираем лишние символы и делаем читаемым
        return voice.replace(/[_-]/g, ' ').trim();
    };

    return (
        <div className="continue-watching-card">
            <Link href={`/anime-page/${item.id}`}>
                <div className="continue-watching-card-image">
                    {!imageError ? (
                        <Image
                            src={item.coverUrl}
                            alt={item.title}
                            fill
                            priority={priority}
                            className="cover-image"
                            style={{ objectFit: 'cover' }}
                            onError={() => setImageError(true)}
                        />
                    ) : (
                        <div className="cover-placeholder">
                            <Monitor size={32} />
                        </div>
                    )}

                    {/* Прогресс бар */}
                    {progress > 0 && (
                        <div className="progress-overlay">
                            <div 
                                className="progress-bar"
                                style={{ width: `${Math.min(progress, 100)}%` }}
                            />
                        </div>
                    )}

                    {/* Play кнопка */}
                    <div className="play-overlay">
                        <div className="play-button">
                            <Play size={20} fill="currentColor" />
                        </div>
                    </div>
                </div>
            </Link>

            <div className="continue-watching-card-info">
                <Link href={`/anime-page/${item.id}`}>
                    <h3 className="anime-title">{item.title}</h3>
                </Link>

                <div className="watch-info">
                    {lastWatched && (
                        <>
                            <div className="episode-info">
                                <Clock size={14} />
                                <span>Эпизод {lastWatched.episodeId}</span>
                            </div>

                            {lastWatched.voice && (
                                <div className="voice-info">
                                    <Headphones size={14} />
                                    <span>{formatVoiceName(lastWatched.voice)}</span>
                                </div>
                            )}

                            {lastWatched.source && (
                                <div className="source-info">
                                    <Monitor size={14} />
                                    <span>{lastWatched.source}</span>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="progress-info">
                    <div className="progress-text">
                        {item.currentEpisodes || 0} / {item.totalEpisodes || '?'} серий
                    </div>
                    {lastWatched?.time && lastWatched?.duration && (
                        <div className="time-info">
                            {formatTime(lastWatched.time)} / {formatTime(lastWatched.duration)}
                        </div>
                    )}
                </div>

                {lastWatched && (
                    <Link 
                        href={(() => {
                            // Передаем только базовые параметры (как кнопка "Смотреть")
                            // Прогресс будет загружен плеером с сервера
                            const baseParams = new URLSearchParams({
                                kodik: animeData?.kodik || item.title,
                                alias: animeData?.alias || '',
                                title: item.title,
                                cover: item.coverUrl || ''
                            });
                            
                            const finalURL = `/watch/anime/${item.id}?${baseParams.toString()}`;
                            console.log('[ContinueWatchingCard] Generated continue URL (base params only):', finalURL);
                            
                            return finalURL;
                        })()}
                        className="continue-button"
                    >
                        <Play size={16} />
                        Продолжить просмотр
                    </Link>
                )}
            </div>
        </div>
    );
};

export default ContinueWatchingCard;
