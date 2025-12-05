'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AnimeInfo } from './anime-data-info';
import { AnimeBasicInfo } from './anime-basic-info';
import { API_SERVER } from '@/hosts/constants';

interface YumekoAnimeCardProps {
    anime: AnimeInfo | AnimeBasicInfo;
    collectionType?: string;
    showCollectionStatus?: boolean;
    showRating?: boolean;
    showType?: boolean;
    priority?: boolean;
    /** Если true, не делать отдельные запросы на rating/collection - данные уже в anime объекте */
    dataPreloaded?: boolean;
}

const YumekoAnimeCard: React.FC<YumekoAnimeCardProps> = ({ 
    anime, 
    collectionType: propsCollectionType, 
    showCollectionStatus = true,
    showRating = true,
    showType = true,
    priority = false,
    dataPreloaded = false
}) => {
    const [coverUrl, setCoverUrl] = useState<string>('');
    const [rating, setRating] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [imageError, setImageError] = useState(false);
    const [userCollection, setUserCollection] = useState<string>(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        propsCollectionType || (anime as any)?.collectionType || ''
    );
    const [isLoadingCollection, setIsLoadingCollection] = useState(false);

    // Status text
    const getStatusText = (type: string) => {
        const map: Record<string, string> = {
            'WATCHING': 'Смотрю',
            'COMPLETED': 'Просмотрено',
            'PLAN_TO_WATCH': 'В планах',
            'PLANNED': 'В планах',
            'DROPPED': 'Брошено',
            'ON_HOLD': 'Отложено',
            'PAUSED': 'Отложено',
            'REWATCHING': 'Пересматриваю',
            'FAVORITE': 'Избранное'
        };
        return map[type?.toUpperCase()] || '';
    };

    // Status class
    const getStatusClass = (type: string) => {
        const map: Record<string, string> = {
            'WATCHING': 'watching',
            'COMPLETED': 'completed',
            'PLAN_TO_WATCH': 'planned',
            'PLANNED': 'planned',
            'DROPPED': 'dropped',
            'ON_HOLD': 'paused',
            'PAUSED': 'paused',
            'REWATCHING': 'rewatching',
            'FAVORITE': 'favorite'
        };
        return map[type?.toUpperCase()] || '';
    };

    // Clean anime type
    const cleanType = (type: string) => {
        if (!type) return '';
        if (/\d/.test(type)) return type.trim();
        
        const lower = type.toLowerCase().trim();
        if (lower.includes('фильм')) return 'Фильм';
        if (lower.includes('сезон')) return 'Сезон';
        if (lower.includes('ova')) return 'OVA';
        if (lower.includes('ona')) return 'ONA';
        if (lower.includes('special')) return 'Special';
        if (lower.includes('тв') || lower.includes('tv')) return 'ТВ';
        return type.trim();
    };

    // Get cookie
    const getCookie = (name: string): string | null => {
        if (typeof document !== 'undefined') {
            const cookies = document.cookie.split(';');
            for (const cookie of cookies) {
                const [cookieName, cookieValue] = cookie.trim().split('=');
                if (cookieName === name) return decodeURIComponent(cookieValue);
            }
        }
        return null;
    };

    // Get token
    const getToken = () => {
        const tokenNames = ['token', 'authToken', 'access_token', 'jwt', 'auth'];
        for (const name of tokenNames) {
            const token = getCookie(name);
            if (token) return token;
        }
        if (typeof window !== 'undefined') {
            return localStorage.getItem('token');
        }
        return null;
    };

    // Fetch cover
    useEffect(() => {
        const fetchCover = async () => {
            try {
                setIsLoading(true);
                setImageError(false);
                
                // Check coverUrl from props
                if (anime.coverUrl && anime.coverUrl.trim() && !anime.coverUrl.includes('placeholder')) {
                    setCoverUrl(anime.coverUrl);
                    setIsLoading(false);
                    return;
                }
                
                // Check image_url (old format)
                if ('image_url' in anime && anime.image_url?.url && anime.image_url.url.trim()) {
                    setCoverUrl(anime.image_url.url);
                    setIsLoading(false);
                    return;
                }
                
                // Try optimized endpoint
                try {
                    const response = await fetch(`${API_SERVER}/api/anime/optimized/get-anime/${anime.id}/basic`);
                    if (response.ok) {
                        const data = await response.json();
                        if (data.coverUrl && data.coverUrl.trim() && !data.coverUrl.includes('placeholder')) {
                            setCoverUrl(data.coverUrl);
                            setIsLoading(false);
                            return;
                        }
                    }
                } catch {}

                setImageError(true);
            } catch {
                setImageError(true);
            } finally {
                setIsLoading(false);
            }
        };

        if (anime?.id) fetchCover();

        return () => {
            if (coverUrl && coverUrl.startsWith('blob:')) {
                try { URL.revokeObjectURL(coverUrl); } catch {}
            }
        };
    }, [anime?.id, anime?.coverUrl]);

    // Fetch rating
    useEffect(() => {
        if (!showRating || !anime?.id) return;

        /* eslint-disable @typescript-eslint/no-explicit-any */
        const providedRating = (() => {
            if (typeof (anime as any).averageRating === 'number') {
                return (anime as any).averageRating as number;
            }
            if (typeof (anime as any).rating === 'number') {
                return (anime as any).rating as number;
            }
            if (typeof (anime as any).rating === 'string') {
                const parsed = parseFloat((anime as any).rating);
                if (!Number.isNaN(parsed)) return parsed;
            }
            return null;
        })();
        /* eslint-enable @typescript-eslint/no-explicit-any */

        if (providedRating !== null && !Number.isNaN(providedRating)) {
            setRating(providedRating);
            return;
        }
        
        // Если данные предзагружены, не делаем дополнительный запрос
        if (dataPreloaded) return;
        
        // Try multiple endpoints as fallback
        const fetchRating = async () => {
            try {
                // First try ratings endpoint
                let res = await fetch(`${API_SERVER}/api/anime/ratings/${anime.id}/rating`);
                if (res.ok) {
                    const data = await res.json();
                    if (data?.average) {
                        setRating(data.average);
                        return;
                    }
                }
                
                // Try optimized endpoint
                res = await fetch(`${API_SERVER}/api/anime/optimized/get-anime/${anime.id}/rating`);
                if (res.ok) {
                    const data = await res.json();
                    if (data?.rating) {
                        setRating(data.rating);
                        return;
                    }
                    if (data?.average) {
                        setRating(data.average);
                        return;
                    }
                }
            } catch {}
        };
        
        fetchRating();
    }, [anime, showRating, dataPreloaded]);

    // Fetch collection status
    useEffect(() => {
        if (!showCollectionStatus || !anime?.id) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const providedStatus = propsCollectionType || (anime as any)?.collectionType;
        if (providedStatus) {
            setUserCollection(providedStatus);
            return;
        }
        
        // Если данные предзагружены (collectionType уже проверен на сервере), не делаем запрос
        // Пустой collectionType означает что аниме не в коллекции
        if (dataPreloaded) return;
        
        const token = getToken();
        if (!token) return;

        setIsLoadingCollection(true);
        fetch(`${API_SERVER}/api/anime/optimized/get-anime/${anime.id}/collection-status`, {
            headers: { Authorization: `Bearer ${token}` }
        })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
            // Check multiple response formats
            if (data?.hasStatus === 'true' && data?.status) {
                setUserCollection(data.status);
            } else if (data?.collectionType) {
                setUserCollection(data.collectionType);
            } else if (data?.type) {
                setUserCollection(data.type);
            }
        })
        .catch(() => {})
        .finally(() => setIsLoadingCollection(false));
    }, [anime, showCollectionStatus, propsCollectionType, dataPreloaded]);

    // Image handlers
    const handleImageError = () => {
        if (!imageError) {
            setImageError(true);
            setCoverUrl('/anime-placeholder.svg');
        }
        setIsLoading(false);
    };

    const handleImageLoad = () => {
        setIsLoading(false);
        if (!coverUrl?.includes('placeholder')) setImageError(false);
    };

    // Data
    const status = userCollection || propsCollectionType || '';
    const animeStatus = anime.status?.toUpperCase() || '';
    const isUpcoming = ['UPCOMING', 'NOT_YET_AIRED', 'SOON', 'АНОНС', 'СКОРО'].includes(animeStatus);
    const anons = 'anons' in anime ? anime.anons : '';
    
    const currentEp = anime.current_episode || 
        ('currentEpisode' in anime ? (anime as { currentEpisode?: string }).currentEpisode : '') || '';
    const totalEp = anime.episode_all || 
        ('episodeAll' in anime ? (anime as { episodeAll?: string }).episodeAll : '') || '';
    
    const isCompleted = ['COMPLETED', 'FINISHED', 'ЗАВЕРШЕН', 'ВЫШЕЛ'].includes(animeStatus) ||
        (currentEp && totalEp && currentEp === totalEp);

    // Episode text
    const getEpisodeText = () => {
        if (isUpcoming) return anons?.trim() ? anons.toUpperCase() : 'СКОРО';
        if (isCompleted) return totalEp ? `${totalEp} эп.` : 'Завершен';
        if (currentEp && totalEp) return `${currentEp}/${totalEp} эп.`;
        if (totalEp) return `${totalEp} эп.`;
        if (currentEp) return `${currentEp} / ? эп.`;
        return '';
    };

    return (
        <Link href={`/anime-page/${anime.id}`} prefetch={true} className="yumeko-anime-card">
            <div className="yumeko-anime-card-cover">
                {isLoading && (
                    <div className="yumeko-anime-card-loader">
                        <div className="yumeko-anime-card-spinner" />
                    </div>
                )}
                
                {imageError ? (
                    <div className="yumeko-anime-card-placeholder">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <rect x="3" y="3" width="18" height="18" rx="2"/>
                            <circle cx="8.5" cy="8.5" r="1.5"/>
                            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                        </svg>
                    </div>
                ) : (
                    <Image
                        src={coverUrl || '/anime-placeholder.svg'}
                        alt={anime.title || 'Аниме'}
                        fill
                        className="yumeko-anime-card-image"
                        onLoad={handleImageLoad}
                        onError={handleImageError}
                        style={{ opacity: isLoading ? 0 : 1 }}
                        priority={priority}
                        sizes="180px"
                    />
                )}

                {/* Rating */}
                {!isUpcoming && showRating && rating && rating > 0 && (
                    <div className="yumeko-anime-card-rating">
                        <span>★</span> {rating.toFixed(1)}
                    </div>
                )}

                {/* Collection Status */}
                {showCollectionStatus && status && !isLoadingCollection && (
                    <div className={`yumeko-anime-card-status ${getStatusClass(status)}`}>
                        {getStatusText(status)}
                    </div>
                )}

                {/* Type */}
                {showType && anime.type && (
                    <div className="yumeko-anime-card-type">
                        {cleanType(anime.type)}
                    </div>
                )}
            </div>

            <div className="yumeko-anime-card-info">
                <h3 className="yumeko-anime-card-title">{anime.title || 'Без названия'}</h3>
                <div className="yumeko-anime-card-meta">
                    <span className={`yumeko-anime-card-episodes ${isUpcoming ? 'upcoming' : ''}`}>{getEpisodeText()}</span>
                    {anime.year && (
                        <span className="yumeko-anime-card-year">{anime.year}</span>
                    )}
                </div>
            </div>
        </Link>
    );
};

export default YumekoAnimeCard;
