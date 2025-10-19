'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimeInfo } from './anime-data-info';
import { API_SERVER } from '../../../tools/constants';
import GlobalAnimeCard from './GlobalAnimeCard';

interface NewCategorySectionProps {
    categoryId: string;
    title: string;
    link?: string;
    position?: number;
}

// Улучшенный кэш для категорий с поддержкой обновления страницы
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 минут
type CategoryCache = Map<string, { 
    animeList: AnimeInfo[]; 
    lastUpdated: number; 
    fullyLoaded: boolean;
    sessionId: string; // Для отслеживания сессии
}>;

const categoryCache: CategoryCache = new Map();

// Генерируем ID сессии при загрузке компонента
const sessionId = Date.now().toString();

// Функция для проверки, нужно ли обновить кэш
const shouldRefreshCache = (cached: { timestamp?: number; sessionId?: string; lastUpdated?: number } | null) => {
    if (!cached) return true;
    
    // Если сессия изменилась (страница была обновлена), очищаем кэш
    if (cached.sessionId !== sessionId) {
        return true;
    }
    
    // Если прошло больше TTL, обновляем
    return Date.now() - (cached.lastUpdated || 0) > CACHE_TTL_MS;
};

const NewCategorySection: React.FC<NewCategorySectionProps> = ({ categoryId, title }) => {
    const [animeList, setAnimeList] = useState<AnimeInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [visibleCards, setVisibleCards] = useState<Set<number>>(new Set());
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const abortRef = useRef<AbortController | null>(null);



    // Функция для плавной прокрутки
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

    useEffect(() => {
        let isMounted = true;
        if (abortRef.current) abortRef.current.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        const loadAnime = async () => {
            try {
                setError(null);
                setVisibleCards(new Set()); // Очищаем видимые карточки при новой загрузке
                
                // Проверяем кэш
                const cached = categoryCache.get(categoryId);
                if (cached && cached.animeList.length > 0 && !shouldRefreshCache(cached)) {
                    if (!isMounted) return;
                    setAnimeList(cached.animeList);
                    setLoading(false);
                    
                    // Плавное появление карточек из кэша
                    cached.animeList.forEach((anime, index) => {
                        setTimeout(() => {
                            setVisibleCards(prev => new Set(prev).add(anime.id));
                        }, index * 100);
                    });
                    
                    return;
                }

                // Если обновляем страницу, начинаем загрузку заново

                // Загружаем категорию
                const categoryRes = await fetch(
                    `${API_SERVER}/api/anime/category/get-category/${categoryId}`, 
                    { signal: controller.signal }
                );
                
                if (!categoryRes.ok) {
                    throw new Error(`Ошибка загрузки категории: ${categoryRes.status}`);
                }

                const categoryData = await categoryRes.json();
                const animeIds: string[] = categoryData.animeIds || [];

                if (animeIds.length === 0) {
                    if (!isMounted) return;
                    setAnimeList([]);
                    setLoading(false);
                    return;
                }

                // НЕ убираем loading здесь - ждем загрузки всех аниме

                // ПООЧЕРЕДНАЯ загрузка аниме (по одному)
                for (let i = 0; i < animeIds.length; i++) {
                    if (!isMounted) return;
                    
                    const id = animeIds[i];
                    
                    try {
                        const animeRes = await fetch(
                            `${API_SERVER}/api/anime/get-anime/${id}`, 
                            { signal: controller.signal }
                        );
                        
                        if (animeRes.ok) {
                            const anime: AnimeInfo = await animeRes.json();
                            
                            if (!isMounted) return;
                            
                            // Добавляем аниме по одному в список
                            setAnimeList(prev => {
                                // Защита от дублей
                                if (prev.some(a => a.id === anime.id)) return prev;
                                const newList = [...prev, anime];
                                
                                // Убираем спиннер после загрузки первого аниме
                                if (newList.length === 1) {
                                    setLoading(false);
                                }
                                
                                // Добавляем плавное появление с задержкой
                                setTimeout(() => {
                                    setVisibleCards(prev => new Set(prev).add(anime.id));
                                }, newList.length * 100); // Задержка увеличивается для каждой карточки
                                
                                // Обновляем кэш после каждого добавления
                                categoryCache.set(categoryId, {
                                    animeList: newList,
                                    lastUpdated: Date.now(),
                                    fullyLoaded: i === animeIds.length - 1,
                                    sessionId: sessionId
                                });
                                
                                return newList;
                            });
                        }
                    } catch (err) {
                        if (err instanceof Error && err.name === 'AbortError') return;
                        console.warn(`Ошибка загрузки аниме ${id}:`, err);
                    }
                    
                    // Небольшая задержка между загрузкой аниме для плавности
                    await new Promise(resolve => setTimeout(resolve, 100));
                }

            } catch (err) {
                if (err instanceof Error && err.name === 'AbortError') return;
                console.error('Ошибка загрузки категории:', err);
                if (!isMounted) return;
                setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
                setLoading(false); // Убираем loading в случае ошибки
            }
        };

        loadAnime();

        return () => {
            isMounted = false;
            controller.abort();
        };
    }, [categoryId]);

    if (loading) {
        return (
            <section className="new-category-section">
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
            <section className="new-category-section">
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

    // Показываем пустое состояние только если загрузка завершена и список пуст
    if (!loading && animeList.length === 0) {
        return (
            <section className="new-category-section">
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
        <section className="new-category-section">
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
                    {animeList.map((anime) => (
                        <div 
                            key={anime.id}
                            className={`anime-card-wrapper ${visibleCards.has(anime.id) ? 'visible' : ''}`}
                        >
                            <GlobalAnimeCard
                                anime={anime}
                                showCollectionStatus={true}
                                showRating={true}
                                showType={true}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default NewCategorySection;
