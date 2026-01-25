'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles } from 'lucide-react';
import { API_SERVER } from '@/hosts/constants';
import YumekoAnimeCard from '@/app/component/anime-structure/YumekoAnimeCard';

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

    const loadSimilarAnimes = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            if (!genres || genres.trim() === '') {
                setSimilarAnimes([]);
                setLoading(false);
                return;
            }

            const response = await fetch(
                `${API_SERVER}/api/anime/similar-by-genres?genres=${encodeURIComponent(genres)}&excludeAnimeId=${animeId}&limit=6`
            );

            if (response.ok) {
                const similarAnimeList: SimilarAnime[] = await response.json();
                setSimilarAnimes(similarAnimeList);
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

    useEffect(() => {
        if (genres && genres.trim()) {
            loadSimilarAnimes();
        } else {
            setLoading(false);
        }
    }, [loadSimilarAnimes, genres]);

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
                {similarAnimes.map((anime) => {
                    // Исключаем rating (возрастной рейтинг) чтобы YumekoAnimeCard загрузил звёздный рейтинг
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const { rating, ...animeWithoutRating } = anime;
                    return (
                        <YumekoAnimeCard
                            key={anime.id}
                            anime={animeWithoutRating as never}
                            showCollectionStatus={true}
                            showRating={true}
                        />
                    );
                })}
            </div>
        </div>
    );
};

export default SimilarAnimeSection;
