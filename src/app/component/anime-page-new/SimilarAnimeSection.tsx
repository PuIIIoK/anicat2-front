'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { API_SERVER } from '@/hosts/constants';

interface SimilarAnime {
    id: number;
    title: string;
    alttitle?: string;
    year?: string | number;
    status?: string;
    current_episode?: string | number;
    episode_all?: string | number;
    rating?: string;
    type?: string;
    genres?: string;
    imageUrl?: string;
    cover?: {
        id: number;
    };
}

interface SimilarAnimeSectionProps {
    animeId: number;
    genres: string;
    className?: string;
}

const SimilarAnimeSection: React.FC<SimilarAnimeSectionProps> = ({ animeId, genres, className = '' }) => {
    const [similarAnimes, setSimilarAnimes] = useState<SimilarAnime[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [imageLoadingStates, setImageLoadingStates] = useState<Record<number, boolean>>({});
    const [imageUrls, setImageUrls] = useState<Record<number, string>>({});
    const [ratings, setRatings] = useState<Record<number, number | null>>({});

    const loadSimilarAnimes = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            if (!genres || genres.trim() === '') {
                setSimilarAnimes([]);
                setLoading(false);
                return;
            }

            // Используем новый API endpoint для поиска похожих аниме
            const response = await fetch(
                `${API_SERVER}/api/anime/similar-by-genres?genres=${encodeURIComponent(genres)}&excludeAnimeId=${animeId}&limit=8`
            );

            if (response.ok) {
                const similarAnimeList: SimilarAnime[] = await response.json();
                console.log('Similar anime data received:', similarAnimeList);
                
                setSimilarAnimes(similarAnimeList);
                
                // Инициализируем состояния загрузки для всех аниме (теперь не зависим от cover.id)
                const loadingStates: Record<number, boolean> = {};
                similarAnimeList.forEach(anime => {
                    loadingStates[anime.id] = true; // Пытаемся загрузить для всех аниме
                });
                setImageLoadingStates(loadingStates);

                console.log('🚀 Starting to load similar anime images for', similarAnimeList.length, 'anime');

                // Загружаем обложки как на основной странице аниме - прямой запрос без cover.id
                const imagePromises = similarAnimeList.map(async (anime) => {
                    console.log(`🔄 Loading cover for similar anime ${anime.id} (${anime.title})`);
                    
                    try {
                        // Используем тот же URL что и на основной странице аниме
                        const coverUrl = `${API_SERVER}/api/stream/${anime.id}/cover`;
                        console.log(`📡 Fetching similar cover from: ${coverUrl}`);
                        
                        const response = await fetch(coverUrl);
                        
                        if (response.ok) {
                            const blob = await response.blob();
                            const imageUrl = URL.createObjectURL(blob);
                            console.log(`✅ Successfully loaded similar cover for anime ${anime.id}`);
                            
                            // Обновляем URL сразу после загрузки
                            setImageUrls(prev => ({
                                ...prev,
                                [anime.id]: imageUrl
                            }));
                        } else {
                            console.warn(`⚠️ Failed to load similar cover for anime ${anime.id}: ${response.status}`);
                        }
                    } catch (error) {
                        console.error(`❌ Error loading similar cover for anime ${anime.id}:`, error);
                    }
                    
                    // Убираем спиннер после загрузки (успешной или неуспешной)
                    setImageLoadingStates(prev => ({
                        ...prev,
                        [anime.id]: false
                    }));
                });

                await Promise.all(imagePromises);
                console.log('🎉 All similar anime covers loaded!');
                
                // Загружаем рейтинги для всех аниме
                const ratingPromises = similarAnimeList.map(async (anime) => {
                    try {
                        const ratingResponse = await fetch(`${API_SERVER}/api/anime/ratings/${anime.id}/rating`);
                        
                        if (ratingResponse.ok) {
                            const ratingData = await ratingResponse.json();
                            const rating = ratingData.average ? Number(ratingData.average.toFixed(1)) : null;
                            
                            setRatings(prev => ({
                                ...prev,
                                [anime.id]: rating
                            }));
                            
                            console.log(`⭐ Rating loaded for similar anime ${anime.id}: ${rating}`);
                        } else {
                            console.log(`❌ Failed to load rating for similar anime ${anime.id}`);
                            setRatings(prev => ({
                                ...prev,
                                [anime.id]: null
                            }));
                        }
                    } catch (error) {
                        console.error(`Error loading rating for similar anime ${anime.id}:`, error);
                        setRatings(prev => ({
                            ...prev,
                            [anime.id]: null
                        }));
                    }
                });
                
                await Promise.all(ratingPromises);
                console.log('🎉 All similar anime ratings loaded!');
            } else {
                throw new Error('Ошибка загрузки похожих аниме');
            }

        } catch (err) {
            console.error('Error loading similar animes:', err);
            setError(err instanceof Error ? err.message : 'Произошла ошибка');
        } finally {
            setLoading(false);
        }
    }, [animeId, genres]);

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
        if (genres && genres.trim()) {
            loadSimilarAnimes();
        } else {
            setLoading(false);
        }
    }, [loadSimilarAnimes, genres]);


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
            <div className={`similar-section ${className}`}>
                <div className="similar-section-header">
                    <h2>
                        Похожее
                        <Sparkles className="section-icon" size={20} />
                    </h2>
                </div>
                <div className="similar-loading">
                    <div className="similar-spinner"></div>
                    <span>Поиск похожих аниме...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`similar-section ${className}`}>
                <div className="similar-section-header">
                    <h2>
                        Похожее
                        <Sparkles className="section-icon" size={20} />
                    </h2>
                </div>
                <div className="similar-error">
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    if (similarAnimes.length === 0) {
        return (
            <div className={`similar-section ${className}`}>
                <div className="similar-section-header">
                    <h2>
                        Похожее
                        <Sparkles className="section-icon" size={20} />
                    </h2>
                </div>
                <div className="similar-empty">
                    <p>Похожие аниме не найдены</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`similar-section ${className}`}>
            <div className="similar-section-header">
                <h2>
                    <Sparkles className="section-icon" size={24} />
                    Похожее
                </h2>
            </div>

            <div className="similar-list">
                {similarAnimes.map((anime) => (
                    <Link 
                        key={anime.id}
                        href={`/anime-page/${anime.id}`}
                        className="similar-item"
                    >
                        <div className="similar-cover">
                            {imageLoadingStates[anime.id] && (
                                <div className="similar-image-loading">
                                    <div className="similar-spinner"></div>
                                </div>
                            )}
                            {imageUrls[anime.id] ? (
                                <Image 
                                    src={imageUrls[anime.id]} 
                                    alt={anime.title}
                                    width={120}
                                    height={160}
                                    className="similar-cover-image"
                                    unoptimized
                                    style={{ 
                                        display: imageLoadingStates[anime.id] ? 'none' : 'block'
                                    }}
                                    onLoad={() => handleImageLoad(anime.id)}
                                    onError={(e) => {
                                        console.log('Image failed to load for similar anime:', anime.id, anime.title);
                                        console.log('Image URL:', imageUrls[anime.id]);
                                        handleImageError(anime.id);
                                        e.currentTarget.style.display = 'none';
                                        const placeholder = e.currentTarget.parentElement?.querySelector('.similar-cover-placeholder');
                                        if (placeholder) {
                                            (placeholder as HTMLElement).style.display = 'flex';
                                        }
                                    }}
                                />
                            ) : null}
                            <div className="similar-cover-placeholder" style={{ display: imageUrls[anime.id] && !imageLoadingStates[anime.id] ? 'none' : 'flex' }}>
                                <span>Нет обложки</span>
                            </div>
                        </div>

                        <div className="similar-info">
                            <div className="similar-title">{anime.title}</div>
                            
                            <div className="similar-meta-line">
                                {anime.type && <span className="meta-type">{anime.type}</span>}
                                {anime.type && anime.year && <span className="meta-separator">•</span>}
                                {anime.year && <span className="meta-year">{anime.year}</span>}
                                {anime.year && ratings[anime.id] && <span className="meta-separator">•</span>}
                                {ratings[anime.id] && <span className="meta-rating">⭐ {ratings[anime.id]}</span>}
                            </div>
                            
                            <div className="similar-meta-line">
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

export default SimilarAnimeSection;
