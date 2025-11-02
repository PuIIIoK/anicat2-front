'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimeBasicInfo } from './anime-basic-info';
import { API_SERVER } from '@/hosts/constants';
import GlobalAnimeCard from './GlobalAnimeCard';

interface OptimizedCategorySectionProps {
    categoryId: string;
    title: string;
    link?: string;
    position?: number;
}

// Кэш для категорий
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 минут
type CategoryCache = Map<string, { 
    animeList: AnimeBasicInfo[]; 
    lastUpdated: number; 
    fullyLoaded: boolean;
    sessionId: string;
}>;

const categoryCache: CategoryCache = new Map();
const sessionId = Date.now().toString();

// Функция для проверки, нужно ли обновить кэш
const shouldRefreshCache = (cached: { timestamp?: number; sessionId?: string; lastUpdated?: number } | null) => {
    if (!cached) return true;
    
    if (cached.sessionId !== sessionId) {
        return true;
    }
    
    return Date.now() - (cached.lastUpdated || 0) > CACHE_TTL_MS;
};

const OptimizedCategorySection: React.FC<OptimizedCategorySectionProps> = ({ 
    categoryId, 
    title 
}) => {
    const [animeList, setAnimeList] = useState<AnimeBasicInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [visibleCards, setVisibleCards] = useState<Set<number>>(new Set());
    const [loadedCount, setLoadedCount] = useState(0); // Количество загруженных карточек
    const [totalCount, setTotalCount] = useState(0); // Общее количество аниме в категории
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const abortRef = useRef<AbortController | null>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);
    const sentinelRef = useRef<HTMLDivElement>(null);

    // Определяем количество видимых карточек в зависимости от ширины экрана
    const getVisibleCardsCount = (): number => {
        if (typeof window === 'undefined') return 6;
        
        const width = window.innerWidth;
        if (width >= 1920) return 7;      // Очень большие экраны
        if (width >= 1600) return 6;      // Большие экраны
        if (width >= 1366) return 5;      // Стандартные ноутбуки
        if (width >= 1024) return 4;      // Планшеты горизонтально
        return 3;                         // Маленькие экраны
    };

    // Функции прокрутки
    const scrollLeft = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({
                left: -400,
                behavior: 'smooth'
            });
        }
    };

    const scrollRight = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({
                left: 400,
                behavior: 'smooth'
            });
        }
    };

    // Функция для загрузки дополнительных аниме
    const loadMoreAnime = async (startIndex: number, count: number, allAnimeIds: number[]) => {
        if (startIndex >= allAnimeIds.length) return;
        
        const controller = new AbortController();
        const idsToLoad = allAnimeIds.slice(startIndex, startIndex + count);
        
        try {
            const animeBasicRes = await fetch(
                `${API_SERVER}/api/anime/optimized/get-anime-list/basic`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(idsToLoad),
                    signal: controller.signal
                }
            );

            if (!animeBasicRes.ok) {
                throw new Error(`Ошибка загрузки аниме: ${animeBasicRes.status}`);
            }

            const newAnime: AnimeBasicInfo[] = await animeBasicRes.json();
            
            // Сортируем в правильном порядке
            const sortedNewAnime = idsToLoad.map(id => 
                newAnime.find(anime => anime.id === id)
            ).filter(Boolean) as AnimeBasicInfo[];
            
            setAnimeList(prev => [...prev, ...sortedNewAnime]);
            setLoadedCount(prev => prev + sortedNewAnime.length);
            
            // Плавное появление новых карточек
            sortedNewAnime.forEach((anime, index) => {
                setTimeout(() => {
                    setVisibleCards(prev => new Set(prev).add(anime.id));
                }, index * 50);
            });
            
        } catch (err) {
            console.error('Ошибка загрузки дополнительных аниме:', err);
        }
    };

    useEffect(() => {
        let isMounted = true;
        if (abortRef.current) abortRef.current.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        const loadOptimizedAnime = async () => {
            try {
                setError(null);
                setVisibleCards(new Set());
                
                // Проверяем кэш
                const cached = categoryCache.get(categoryId);
                if (cached && cached.animeList.length > 0 && !shouldRefreshCache(cached)) {
                    if (!isMounted) return;
                    
                    // Из кэша загружаем только видимое количество + 1
                    const visibleCount = getVisibleCardsCount();
                    const initialLoad = Math.min(visibleCount + 1, cached.animeList.length);
                    const initialAnime = cached.animeList.slice(0, initialLoad);
                    
                    setAnimeList(initialAnime);
                    setLoadedCount(initialLoad);
                    setTotalCount(cached.animeList.length);
                    setLoading(false);
                    
                    // Плавное появление карточек из кэша
                    initialAnime.forEach((anime, index) => {
                        setTimeout(() => {
                            setVisibleCards(prev => new Set(prev).add(anime.id));
                        }, index * 50);
                    });
                    
                    return;
                }

                // Загружаем категорию для получения списка ID аниме
                const categoryRes = await fetch(
                    `${API_SERVER}/api/anime/category/get-category/${categoryId}`, 
                    { signal: controller.signal }
                );
                
                if (!categoryRes.ok) {
                    throw new Error(`Ошибка загрузки категории: ${categoryRes.status}`);
                }

                const categoryData = await categoryRes.json();
                const animeIds: number[] = (categoryData.animeIds || []).map(Number);

                if (animeIds.length === 0) {
                    if (!isMounted) return;
                    setAnimeList([]);
                    setTotalCount(0);
                    setLoading(false);
                    return;
                }

                // ОПТИМИЗАЦИЯ: Загружаем только видимое количество + 1 карточку
                const visibleCount = getVisibleCardsCount();
                const initialLoadCount = Math.min(visibleCount + 1, animeIds.length);
                const initialIds = animeIds.slice(0, initialLoadCount);

                const animeBasicRes = await fetch(
                    `${API_SERVER}/api/anime/optimized/get-anime-list/basic`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(initialIds),
                        signal: controller.signal
                    }
                );

                if (!animeBasicRes.ok) {
                    throw new Error(`Ошибка загрузки базовых данных аниме: ${animeBasicRes.status}`);
                }

                const animeBasicData: AnimeBasicInfo[] = await animeBasicRes.json();
                console.log(`DEBUG: Загружено ${animeBasicData.length} из ${animeIds.length} аниме для категории "${title}"`);
                
                if (!isMounted) return;
                
                // Сортируем в том порядке, в котором они были в категории
                const sortedAnime = initialIds.map(id => 
                    animeBasicData.find(anime => anime.id === id)
                ).filter(Boolean) as AnimeBasicInfo[];

                setAnimeList(sortedAnime);
                setLoadedCount(sortedAnime.length);
                setTotalCount(animeIds.length);
                setLoading(false);

                // Плавное появление карточек
                sortedAnime.forEach((anime, index) => {
                    setTimeout(() => {
                        if (isMounted) {
                            setVisibleCards(prev => new Set(prev).add(anime.id));
                        }
                    }, index * 50);
                });

                // Сохраняем все ID в кэш для последующей загрузки
                categoryCache.set(categoryId, {
                    animeList: sortedAnime,
                    lastUpdated: Date.now(),
                    fullyLoaded: false,
                    sessionId: sessionId
                });
                
                // Сохраняем полный список ID для дальнейшей подгрузки
                if (typeof window !== 'undefined') {
                    (window as unknown as Record<string, number[]>)[`animeIds_${categoryId}`] = animeIds;
                }

            } catch (err) {
                if (err instanceof Error && err.name === 'AbortError') return;
                console.error('Ошибка загрузки категории:', err);
                if (!isMounted) return;
                setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
                setLoading(false);
            }
        };

        loadOptimizedAnime();

        return () => {
            isMounted = false;
            controller.abort();
        };
    }, [categoryId, title]);

    // Наблюдатель для подгрузки при прокрутке
    useEffect(() => {
        if (loading || loadedCount >= totalCount) return;
        
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && loadedCount < totalCount) {
                        // Подгружаем еще одну карточку
                        if (typeof window !== 'undefined') {
                            const allAnimeIds = (window as unknown as Record<string, number[]>)[`animeIds_${categoryId}`];
                            if (allAnimeIds && loadedCount < allAnimeIds.length) {
                                loadMoreAnime(loadedCount, 1, allAnimeIds);
                            }
                        }
                    }
                });
            },
            {
                root: scrollContainerRef.current,
                rootMargin: '0px 200px 0px 0px', // Начинаем загрузку за 200px до конца
                threshold: 0.1
            }
        );

        if (sentinelRef.current) {
            observer.observe(sentinelRef.current);
        }

        observerRef.current = observer;

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, [loading, loadedCount, totalCount, categoryId]);

    if (loading) {
        return (
            <section className="optimized-category-section">
                <div className="category-header">
                    <h2 className="category-title">{title}</h2>
                </div>
                <div className="category-content">
                    <div className="loading-state">
                        <div className="category-loading-spinner">
                            <div className="spinner-ring"></div>
                            <div className="spinner-ring"></div>
                            <div className="spinner-ring"></div>
                        </div>
                        <p className="loading-text">Загружаем аниме...</p>
                    </div>
                </div>
            </section>
        );
    }

    if (error) {
        return (
            <section className="optimized-category-section">
                <div className="category-header">
                    <h2 className="category-title">{title}</h2>
                </div>
                <div className="category-content">
                    <div className="error-state">
                        <p>Ошибка: {error}</p>
                    </div>
                </div>
            </section>
        );
    }

    if (!loading && animeList.length === 0) {
        return (
            <section className="optimized-category-section">
                <div className="category-header">
                    <h2 className="category-title">{title}</h2>
                </div>
                <div className="category-content">
                    <div className="empty-state">
                        <p>Нет доступных аниме в этой категории</p>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="optimized-category-section">
            <div className="category-header">
                <Link href={`/anime-category/${categoryId}`} className="category-title-link">
                    <h2 className="category-title">
                        {title}
                    </h2>
                </Link>
                
                <div className="category-actions">
                    <button 
                        className="scroll-btn scroll-left" 
                        onClick={scrollLeft}
                        aria-label="Прокрутить влево"
                    >
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                        </svg>
                    </button>
                    
                    <button 
                        className="scroll-btn scroll-right" 
                        onClick={scrollRight}
                        aria-label="Прокрутить вправо"
                    >
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                        </svg>
                    </button>
                    
                    <Link href={`/anime-category/${categoryId}`} className="view-all-btn">
                        Все аниме
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/>
                        </svg>
                    </Link>
                </div>
            </div>

            <div className="category-content">
                <div 
                    className="anime-grid-container" 
                    ref={scrollContainerRef}
                >
                    {animeList.map((anime, index) => (
                        <div 
                            key={anime.id}
                            className={`anime-card-wrapper ${visibleCards.has(anime.id) ? 'visible' : ''}`}
                        >
                            <GlobalAnimeCard
                                anime={anime}
                                priority={index < 6} // Первые 6 карточек с высоким приоритетом
                                showCollectionStatus={true}
                                showRating={true}
                                showType={true}
                            />
                        </div>
                    ))}
                    {/* Sentinel элемент для отслеживания прокрутки */}
                    {loadedCount < totalCount && (
                        <div 
                            ref={sentinelRef} 
                            className="sentinel-element"
                            style={{ 
                                width: '1px', 
                                height: '100%', 
                                visibility: 'hidden',
                                pointerEvents: 'none'
                            }}
                        />
                    )}
                </div>
            </div>
        </section>
    );
};

export default OptimizedCategorySection;
