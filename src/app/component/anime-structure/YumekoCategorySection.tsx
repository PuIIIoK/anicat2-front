'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { API_SERVER } from '@/hosts/constants';
import YumekoAnimeCard from './YumekoAnimeCard';
import { AnimeBasicInfo } from './anime-basic-info';

// Глобальный кэш для аниме (общий для всех компонентов)
declare global {
    // eslint-disable-next-line no-var
    var __globalAnimeCache: Map<string, { animeList: AnimeBasicInfo[]; timestamp: number }> | undefined;
    // eslint-disable-next-line no-var
    var __pendingAnimeRequests: Map<string, Promise<AnimeBasicInfo[]>> | undefined;
}

if (!globalThis.__globalAnimeCache) {
    globalThis.__globalAnimeCache = new Map();
}
if (!globalThis.__pendingAnimeRequests) {
    globalThis.__pendingAnimeRequests = new Map();
}

const globalAnimeCache = globalThis.__globalAnimeCache;
const pendingRequests = globalThis.__pendingAnimeRequests;
const CACHE_TTL = 5 * 60 * 1000; // 5 минут

const getAuthToken = () => {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(/(?:^|;)\s*(?:token|authToken|access_token|jwt|auth)=([^;]+)/i);
    if (match && match[1]) return decodeURIComponent(match[1]);
    try {
        return localStorage.getItem('token');
    } catch {
        return null;
    }
};

interface YumekoCategorySectionProps {
    categoryId: string;
    title: string;
    /** Список ID аниме для категории (передаётся из родителя, чтобы избежать лишних запросов) */
    animeIds?: string[];
}

const YumekoCategorySection: React.FC<YumekoCategorySectionProps> = ({ categoryId, title, animeIds: propAnimeIds }) => {
    const [animeList, setAnimeList] = useState<AnimeBasicInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const fetchedRef = useRef(false);
    const lastCategoryIdRef = useRef<string | null>(null);

    useEffect(() => {
        // Предотвращаем повторные запросы для той же категории
        if (fetchedRef.current && lastCategoryIdRef.current === categoryId) {
            return;
        }

        const fetchAnime = async () => {
            // Защита от React StrictMode double-invoke
            if (fetchedRef.current && lastCategoryIdRef.current === categoryId) {
                return;
            }
            
            fetchedRef.current = true;
            lastCategoryIdRef.current = categoryId;

            try {
                // Используем animeIds из пропсов если есть, иначе делаем запрос
                let animeIdsToUse: number[] = [];
                
                if (propAnimeIds && propAnimeIds.length > 0) {
                    animeIdsToUse = propAnimeIds.map(Number);
                } else {
                    // Fallback: запрашиваем категорию если animeIds не переданы
                    const categoryRes = await fetch(`${API_SERVER}/api/anime/category/get-category/${categoryId}`);
                    if (!categoryRes.ok) throw new Error('Failed to fetch category');
                    const categoryData = await categoryRes.json();
                    animeIdsToUse = (categoryData.animeIds || []).map(Number);
                }
                
                if (animeIdsToUse.length === 0) {
                    setAnimeList([]);
                    setLoading(false);
                    return;
                }

                const idsToFetch = animeIdsToUse.slice(0, 20);
                const cacheKey = `cat_${categoryId}_${idsToFetch.join(',')}`;
                
                // Проверяем глобальный кэш
                const cached = globalAnimeCache.get(cacheKey);
                if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
                    setAnimeList(cached.animeList);
                    setLoading(false);
                    return;
                }

                // Проверяем, есть ли уже pending запрос для этого ключа
                let fetchPromise = pendingRequests.get(cacheKey);
                
                if (!fetchPromise) {
                    // Создаём новый запрос
                    const token = getAuthToken();
                    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
                    if (token) headers['Authorization'] = `Bearer ${token}`;

                    fetchPromise = fetch(`${API_SERVER}/api/anime/get-anime`, {
                        method: 'POST',
                        headers,
                        body: JSON.stringify(idsToFetch)
                    }).then(res => {
                        if (!res.ok) throw new Error('Failed to fetch anime details');
                        return res.json();
                    }).finally(() => {
                        pendingRequests.delete(cacheKey);
                    });

                    pendingRequests.set(cacheKey, fetchPromise);
                }

                const animeData: AnimeBasicInfo[] = await fetchPromise;
                
                // Sort in category order
                const sortedAnime = idsToFetch.map(id => 
                    animeData.find(anime => anime.id === id)
                ).filter(Boolean) as AnimeBasicInfo[];
                
                // Сохраняем в глобальный кэш
                globalAnimeCache.set(cacheKey, { animeList: sortedAnime, timestamp: Date.now() });
                
                setAnimeList(sortedAnime);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Error loading anime');
                console.error('Category fetch error:', err);
                fetchedRef.current = false; // Позволяем retry при ошибке
            } finally {
                setLoading(false);
            }
        };

        fetchAnime();
    }, [categoryId, propAnimeIds]);

    const scroll = (direction: 'left' | 'right') => {
        if (!scrollRef.current) return;
        const scrollAmount = 400;
        scrollRef.current.scrollBy({
            left: direction === 'left' ? -scrollAmount : scrollAmount,
            behavior: 'smooth'
        });
    };

    if (loading) {
        return (
            <section className="yumeko-category">
                <div className="yumeko-category-header">
                    <h2 className="yumeko-category-title">{title}</h2>
                </div>
                <div className="yumeko-category-loading">
                    <div className="yumeko-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
            </section>
        );
    }

    if (error || animeList.length === 0) {
        return null;
    }

    return (
        <section className="yumeko-category">
            <div className="yumeko-category-header">
                <Link href={`/anime-category/${categoryId}`} className="yumeko-category-title-link">
                    <h2 className="yumeko-category-title">{title}</h2>
                </Link>
                
                <div className="yumeko-category-controls">
                    <button 
                        className="yumeko-scroll-btn"
                        onClick={() => scroll('left')}
                        aria-label="Назад"
                    >
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                        </svg>
                    </button>
                    
                    <button 
                        className="yumeko-scroll-btn"
                        onClick={() => scroll('right')}
                        aria-label="Вперед"
                    >
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                        </svg>
                    </button>
                    
                    <Link href={`/anime-category/${categoryId}`} className="yumeko-view-all">
                        Все аниме
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/>
                        </svg>
                    </Link>
                </div>
            </div>

            <div className="yumeko-category-content" ref={scrollRef}>
                {animeList.map((anime, index) => (
                    <div key={anime.id} className="yumeko-card-item">
                        <YumekoAnimeCard
                            anime={anime}
                            priority={index < 6}
                            showCollectionStatus={true}
                            showRating={true}
                            showType={true}
                            dataPreloaded={true}
                        />
                    </div>
                ))}
            </div>
        </section>
    );
};

export default YumekoCategorySection;
