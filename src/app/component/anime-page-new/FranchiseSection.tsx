'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Network } from 'lucide-react';
import { API_SERVER } from '@/hosts/constants';

interface AnimeInFranchise {
    id: number;
    title: string;
    alttitle?: string;
    year?: string | number;
    status?: string;
    current_episode?: string | number;
    episode_all?: string | number;
    rating?: string;
    type?: string;
    imageUrl?: string;
    position?: number; // Порядок в цепочке франшизы
    cover?: {
        id: number;
    };
}

interface FranchiseSectionProps {
    animeId: number;
    className?: string;
}

const FranchiseSection: React.FC<FranchiseSectionProps> = ({ animeId, className = '' }) => {
    const [franchiseAnimes, setFranchiseAnimes] = useState<AnimeInFranchise[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [imageLoadingStates, setImageLoadingStates] = useState<Record<number, boolean>>({});
    const [imageUrls, setImageUrls] = useState<Record<number, string>>({});
    const [ratings, setRatings] = useState<Record<number, number | null>>({});

    const loadFranchiseData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // Получаем связанные аниме напрямую через франшизы
            const response = await fetch(`${API_SERVER}/api/anime/franchise-chain/anime/${animeId}`);
            
            if (!response.ok) {
                if (response.status === 404) {
                    // Аниме не состоит ни в одной цепочке
                    setFranchiseAnimes([]);
                    setLoading(false);
                    return;
                }
                throw new Error('Ошибка загрузки данных о франшизе');
            }

            const relatedAnime: AnimeInFranchise[] = await response.json();
            
            // Проверяем, что relatedAnime это массив
            if (Array.isArray(relatedAnime)) {
                console.log('Franchise data received:', relatedAnime);
                
                // Сортируем по полю position (порядок в цепочке)
                const sortedAnime = [...relatedAnime].sort((a, b) => {
                    // Если у обоих есть position - сортируем по нему
                    if (a.position !== undefined && b.position !== undefined) {
                        return a.position - b.position;
                    }
                    // Если position есть только у одного - он идет первым
                    if (a.position !== undefined) return -1;
                    if (b.position !== undefined) return 1;
                    // Если у обоих нет position - оставляем как есть
                    return 0;
                });
                
                console.log('🔄 Sorted franchise anime by position:', sortedAnime.map(a => ({ id: a.id, title: a.title, position: a.position })));
                
                setFranchiseAnimes(sortedAnime);
                
                // Инициализируем состояния загрузки для всех аниме (теперь не зависим от cover.id)
                const loadingStates: Record<number, boolean> = {};
                sortedAnime.forEach(anime => {
                    loadingStates[anime.id] = true; // Пытаемся загрузить для всех аниме
                });
                setImageLoadingStates(loadingStates);

                console.log('🚀 Starting to load franchise images for', sortedAnime.length, 'anime');

                // Загружаем обложки как на основной странице аниме - прямой запрос без cover.id
                const imagePromises = sortedAnime.map(async (anime) => {
                    console.log(`🔄 Loading cover for franchise anime ${anime.id} (${anime.title})`);
                    
                    try {
                        // Используем тот же URL что и на основной странице аниме
                        const coverUrl = `${API_SERVER}/api/stream/${anime.id}/cover`;
                        console.log(`📡 Fetching cover from: ${coverUrl}`);
                        
                        const response = await fetch(coverUrl);
                        
                        if (response.ok) {
                            const blob = await response.blob();
                            const imageUrl = URL.createObjectURL(blob);
                            console.log(`✅ Successfully loaded cover for anime ${anime.id}`);
                            
                            // Обновляем URL сразу после загрузки
                            setImageUrls(prev => ({
                                ...prev,
                                [anime.id]: imageUrl
                            }));
                        } else {
                            console.warn(`⚠️ Failed to load cover for anime ${anime.id}: ${response.status}`);
                        }
                    } catch (error) {
                        console.error(`❌ Error loading cover for anime ${anime.id}:`, error);
                    }
                    
                    // Убираем спиннер после загрузки (успешной или неуспешной)
                    setImageLoadingStates(prev => ({
                        ...prev,
                        [anime.id]: false
                    }));
                });

                await Promise.all(imagePromises);
                console.log('🎉 All franchise covers loaded!');
                
                // Загружаем рейтинги для всех аниме
                const ratingPromises = sortedAnime.map(async (anime) => {
                    try {
                        const ratingResponse = await fetch(`${API_SERVER}/api/anime/ratings/${anime.id}/rating`);
                        
                        if (ratingResponse.ok) {
                            const ratingData = await ratingResponse.json();
                            const rating = ratingData.average ? Number(ratingData.average.toFixed(1)) : null;
                            
                            setRatings(prev => ({
                                ...prev,
                                [anime.id]: rating
                            }));
                            
                            console.log(`⭐ Rating loaded for anime ${anime.id}: ${rating}`);
                        } else {
                            console.log(`❌ Failed to load rating for anime ${anime.id}`);
                            setRatings(prev => ({
                                ...prev,
                                [anime.id]: null
                            }));
                        }
                    } catch (error) {
                        console.error(`Error loading rating for anime ${anime.id}:`, error);
                        setRatings(prev => ({
                            ...prev,
                            [anime.id]: null
                        }));
                    }
                });
                
                await Promise.all(ratingPromises);
                console.log('🎉 All franchise ratings loaded!');
            } else {
                console.error('API returned non-array response:', relatedAnime);
                setFranchiseAnimes([]);
            }

        } catch (err) {
            console.error('Error loading franchise data:', err);
            setError(err instanceof Error ? err.message : 'Произошла ошибка');
        } finally {
            setLoading(false);
        }
    }, [animeId]);

    const handleImageLoad = useCallback((animeId: number) => {
        setImageLoadingStates(prev => ({
            ...prev,
            [animeId]: false
        }));
    }, []);

    const handleImageError = useCallback((animeId: number) => {
        setImageLoadingStates(prev => ({
            ...prev,
            [animeId]: false
        }));
    }, []);

    useEffect(() => {
        loadFranchiseData();
    }, [loadFranchiseData]);


    const formatEpisodes = (current?: string | number, total?: string | number, status?: string) => {
        // Не показываем эпизоды для Скоро/Анонс
        if (status === 'Скоро' || status === 'Анонс') {
            return '';
        }
        
        // Для завершенных - показываем только общее количество
        if (status === 'Завершён') {
            if (total) {
                return `${total} эп.`;
            }
            return 'Неизвестно';
        }
        
        // Для онгоингов - показываем текущий из общего
        if (status === 'Онгоинг') {
            if (current && total) {
                return `${current} из ${total} эп.`;
            }
            if (total) {
                return `${total} эп.`;
            }
            if (current) {
                return `${current} / ? эп.`;
            }
            return '1 / ? эп.';
        }
        
        // Остальные случаи
        if (current && total) {
            return `${current}/${total} эп.`;
        }
        if (total) {
            return `${total} эп.`;
        }
        if (current) {
            return `${current} эп.`;
        }
        return 'Неизвестно';
    };

    const getStatusClass = (status?: string) => {
        if (!status) return '';
        
        const normalizedStatus = status.toLowerCase().trim();
        
        switch (normalizedStatus) {
            case 'анонс':
                return 'status-anons';
            case 'завершён':
                return 'status-zavershen';
            case 'онгоинг':
                return 'status-ongoing';
            case 'скоро':
                return 'status-skoro';
            default:
                return '';
        }
    };

    if (loading) {
        return (
            <div className={`franchise-section ${className}`}>
                <div className="franchise-section-header">
                    <h2>
                        Франшиза
                        <Network className="section-icon" size={24} />
                    </h2>
                </div>
                <div className="franchise-loading">
                    <div className="franchise-spinner"></div>
                    <span>Загрузка...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`franchise-section ${className}`}>
                <div className="franchise-section-header">
                    <h2>
                        Франшиза
                        <Network className="section-icon" size={24} />
                    </h2>
                </div>
                <div className="franchise-error">
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    if (franchiseAnimes.length === 0) {
        return null; // Не показываем секцию если нет связанных аниме
    }

    return (
        <div className={`franchise-section ${className}`}>
            <div className="franchise-section-header">
                <h2>
                    <Network className="section-icon" size={24} />
                    Франшиза
                </h2>
            </div>

            <div className="franchise-list">
                {franchiseAnimes.map((anime) => (
                    <Link 
                        key={anime.id}
                        href={`/anime-page/${anime.id}`}
                        className="franchise-item"
                    >
                        <div className="franchise-cover">
                            {imageLoadingStates[anime.id] && (
                                <div className="franchise-image-loading">
                                    <div className="franchise-spinner"></div>
                                </div>
                            )}
                            {imageUrls[anime.id] ? (
                                <Image 
                                    src={imageUrls[anime.id]} 
                                    alt={anime.title}
                                    width={120}
                                    height={160}
                                    className="franchise-cover-image"
                                    unoptimized
                                    style={{ 
                                        display: imageLoadingStates[anime.id] ? 'none' : 'block'
                                    }}
                                    onLoad={() => handleImageLoad(anime.id)}
                                    onError={(e) => {
                                        console.log('Image failed to load for anime:', anime.id, anime.title);
                                        console.log('Image URL:', imageUrls[anime.id]);
                                        handleImageError(anime.id);
                                        e.currentTarget.style.display = 'none';
                                        const placeholder = e.currentTarget.parentElement?.querySelector('.franchise-cover-placeholder');
                                        if (placeholder) {
                                            (placeholder as HTMLElement).style.display = 'flex';
                                        }
                                    }}
                                />
                            ) : null}
                            <div className="franchise-cover-placeholder" style={{ display: imageUrls[anime.id] && !imageLoadingStates[anime.id] ? 'none' : 'flex' }}>
                                <span>Нет обложки</span>
                            </div>
                        </div>

                        <div className="franchise-info">
                            {anime.id === animeId && (
                                <div className="current-anime-marker">(ВЫ ЗДЕСЬ)</div>
                            )}
                            
                            <div className="franchise-title">{anime.title}</div>
                            
                            <div className="franchise-meta-line">
                                {anime.type && <span className="meta-type">{anime.type}</span>}
                                {anime.type && anime.year && <span className="meta-separator">•</span>}
                                {anime.year && <span className="meta-year">{anime.year}</span>}
                                {anime.year && ratings[anime.id] && <span className="meta-separator">•</span>}
                                {ratings[anime.id] && <span className="meta-rating">⭐ {ratings[anime.id]}</span>}
                            </div>
                            
                            <div className="franchise-meta-line">
                                {anime.status && <span className={`meta-status ${getStatusClass(anime.status)}`}>{anime.status}</span>}
                                {anime.status && formatEpisodes(anime.current_episode, anime.episode_all, anime.status) && <span className="meta-separator">•</span>}
                                {formatEpisodes(anime.current_episode, anime.episode_all, anime.status) && (
                                    <span className="meta-episodes">{formatEpisodes(anime.current_episode, anime.episode_all, anime.status)}</span>
                                )}
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
};

export default FranchiseSection;
