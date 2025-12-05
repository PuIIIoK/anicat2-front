'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Play, ChevronLeft, ChevronRight } from 'lucide-react';
import { getCurrentUser } from '../../utils/auth';
import { API_SERVER } from '@/hosts/constants';
import YumekoContinueCard from './YumekoContinueCard';
import type { WatchingItem } from '../profile-page-old/types';

// Кэш для данных аниме
const animeDataCache = new Map<number, { kodik?: string; alias?: string }>();

const ContinueWatchingSection: React.FC = () => {
    const [watchingAnime, setWatchingAnime] = useState<WatchingItem[]>([]);
    const [animeExtraData, setAnimeExtraData] = useState<Map<number, { kodik?: string; alias?: string }>>(new Map());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [visibleCards, setVisibleCards] = useState<Set<number>>(new Set());
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const fetchedRef = useRef(false);

    // Загрузка данных при монтировании
    useEffect(() => {
        // Защита от React StrictMode double-invoke
        if (fetchedRef.current) return;

        const loadWatchingData = async () => {
            if (fetchedRef.current) return;
            fetchedRef.current = true;

            try {
                setLoading(true);
                setError(null);

                const currentUser = getCurrentUser();
                if (!currentUser?.username) {
                    setWatchingAnime([]);
                    return;
                }

                const response = await fetch(
                    `${API_SERVER}/api/player/progress/watching-anime/${encodeURIComponent(currentUser.username)}`
                );

                if (!response.ok) {
                    if (response.status === 404) {
                        setWatchingAnime([]);
                        return;
                    }
                    throw new Error('Ошибка загрузки данных');
                }

                const data = await response.json();

                if (!Array.isArray(data) || data.length === 0) {
                    setWatchingAnime([]);
                    return;
                }

                // Преобразуем данные в нужный формат
                const formattedData: WatchingItem[] = data
                    .map((item: Record<string, unknown>) => {
                        const year = String(item.year || 'N/A');
                        const totalEpisodes = item.episode_all ? parseInt(String(item.episode_all)) : undefined;
                        const isAnons = String(item.status || '').toLowerCase() === 'скоро' || 
                                       (item.anons && String(item.anons).trim().length > 0);
                        const progressText: string | undefined = isAnons ? (String(item.anons) || 'скоро') : undefined;

                        return {
                            id: Number(item.id),
                            title: String(item.title),
                            coverUrl: `${API_SERVER}/api/stream/${item.id}/cover`,
                            year,
                            seasonLabel: item.season ? String(item.season) : 'N/A',
                            progressText,
                            currentEpisodes: Number(item.totalWatchedEpisodes) || 0,
                            totalEpisodes: typeof totalEpisodes === 'number' && !isNaN(totalEpisodes) ? totalEpisodes : undefined,
                            voiceProgress: (item.voiceProgress as Record<string, unknown>) || {},
                            progressDetails: (item.progressDetails as unknown[]) || [],
                        } as WatchingItem;
                    })
                    .filter(item => 
                        // Показываем только аниме с реальным прогрессом просмотра
                        item.progressDetails && item.progressDetails.length > 0
                    )
                    .slice(0, 12); // Ограничиваем до 12 элементов

                setWatchingAnime(formattedData);

                // Загружаем дополнительные данные аниме ОДНИМ запросом
                if (formattedData.length > 0) {
                    const animeIds = formattedData.map(item => item.id);
                    
                    // Проверяем кэш - загружаем только те, которых нет
                    const idsToFetch = animeIds.filter(id => !animeDataCache.has(id));
                    
                    if (idsToFetch.length > 0) {
                        try {
                            const animeRes = await fetch(`${API_SERVER}/api/anime/get-anime`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(idsToFetch)
                            });
                            
                            if (animeRes.ok) {
                                const animeDataList = await animeRes.json();
                                const newExtraData = new Map(animeDataCache);
                                
                                for (const anime of animeDataList) {
                                    const extraData = {
                                        kodik: anime.kodik || anime.title,
                                        alias: anime.alias || ''
                                    };
                                    newExtraData.set(anime.id, extraData);
                                    animeDataCache.set(anime.id, extraData);
                                }
                                
                                setAnimeExtraData(newExtraData);
                            }
                        } catch (e) {
                            console.warn('Не удалось загрузить дополнительные данные аниме:', e);
                        }
                    } else {
                        // Все данные уже в кэше
                        setAnimeExtraData(new Map(animeDataCache));
                    }
                }

                // Анимация появления карточек
                setTimeout(() => {
                    formattedData.forEach((item, index) => {
                        setTimeout(() => {
                            setVisibleCards(prev => new Set([...prev, item.id]));
                        }, index * 100);
                    });
                }, 100);

            } catch (err) {
                console.error('Ошибка загрузки данных просмотра:', err);
                setError('Ошибка загрузки данных');
            } finally {
                setLoading(false);
            }
        };

        loadWatchingData();
    }, []);

    // Функции прокрутки
    const scrollLeft = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({ left: -400, behavior: 'smooth' });
        }
    };

    const scrollRight = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({ left: 400, behavior: 'smooth' });
        }
    };

    // Не показываем секцию если нет данных или пользователь не авторизован
    if (loading && watchingAnime.length === 0) {
        return (
            <section className="continue-watching-section">
                <div className="continue-watching-header">
                    <h2 className="continue-watching-title">
                        <Play className="section-icon" size={24} />
                        Продолжить просмотр
                    </h2>
                </div>
                <div className="continue-watching-loading">
                    <div className="continue-watching-spinner" />
                </div>
            </section>
        );
    }

    if (error || watchingAnime.length === 0) {
        return null; // Скрываем секцию если нет данных или ошибка
    }

    return (
        <section className="continue-watching-section">
            <div className="continue-watching-header">
                <h2 className="continue-watching-title">
                    <Play className="section-icon" size={24} />
                    Продолжить просмотр
                </h2>
                
                <div className="continue-watching-actions">
                    <button 
                        className="scroll-btn scroll-left" 
                        onClick={scrollLeft}
                        aria-label="Прокрутить влево"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    
                    <button 
                        className="scroll-btn scroll-right" 
                        onClick={scrollRight}
                        aria-label="Прокрутить вправо"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            <div className="continue-watching-content">
                <div 
                    className="continue-watching-grid" 
                    ref={scrollContainerRef}
                >
                    {watchingAnime.map((item, index) => (
                        <div 
                            key={item.id}
                            className={`continue-watching-card-wrapper ${visibleCards.has(item.id) ? 'visible' : ''}`}
                        >
                            <YumekoContinueCard
                                item={item}
                                priority={index < 6}
                                animeData={animeExtraData.get(item.id)}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default ContinueWatchingSection;
