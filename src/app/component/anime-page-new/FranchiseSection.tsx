'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Network, Loader2 } from 'lucide-react';
import { API_SERVER } from '@/hosts/constants';
import YumekoAnimeCard from '@/app/component/anime-structure/YumekoAnimeCard';

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
    position?: number;
    anons?: string;
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

    const loadFranchiseData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch(`${API_SERVER}/api/anime/franchise-chain/anime/${animeId}`);

            if (!response.ok) {
                if (response.status === 404) {
                    setFranchiseAnimes([]);
                    setLoading(false);
                    return;
                }
                throw new Error('Ошибка загрузки данных о франшизе');
            }

            const relatedAnime: AnimeInFranchise[] = await response.json();

            if (Array.isArray(relatedAnime)) {
                // Сортируем по полю position
                const sortedAnime = [...relatedAnime].sort((a, b) => {
                    if (a.position !== undefined && b.position !== undefined) {
                        return a.position - b.position;
                    }
                    if (a.position !== undefined) return -1;
                    if (b.position !== undefined) return 1;
                    return 0;
                });

                setFranchiseAnimes(sortedAnime);
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

    useEffect(() => {
        loadFranchiseData();
    }, [loadFranchiseData]);

    if (loading) {
        return (
            <div className={`franchise-section ${className}`}>
                <div className="franchise-loading">
                    <Loader2 size={24} className="spinning" />
                    <span>Загрузка...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`franchise-section ${className}`}>
                <div className="franchise-error">
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    if (franchiseAnimes.length === 0) {
        return null;
    }

    return (
        <div className={`franchise-section ${className}`}>

            <div className="franchise-list">
                {franchiseAnimes.map((anime) => {
                    const isCurrentAnime = anime.id === animeId;
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const { rating, ...animeWithoutRating } = anime;

                    return (
                        <div key={anime.id} className={`franchise-card-wrapper ${isCurrentAnime ? 'current' : ''}`}>
                            {isCurrentAnime && (
                                <div className="current-anime-badge">ВЫ ЗДЕСЬ</div>
                            )}
                            <YumekoAnimeCard
                                anime={animeWithoutRating as never}
                                showCollectionStatus={true}
                                showRating={true}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default FranchiseSection;
