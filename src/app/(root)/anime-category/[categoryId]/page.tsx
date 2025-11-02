'use client';

import React, { useState, useEffect, use } from 'react';
import { fetchCategoryById } from '../../../component/anime-structure/category-data';
import { AnimeInfo } from '../../../component/anime-structure/anime-data-info';
import GlobalAnimeCard from '../../../component/anime-structure/GlobalAnimeCard';
import { MiniCardProvider } from '../../../component/anime-structure/mini-card-context';
import Head from 'next/head';
import { API_SERVER } from '@/hosts/constants';

// Кэш для страниц категории (живёт, пока открыта вкладка)
const CATEGORY_CACHE_TTL_MS = 30 * 60 * 1000; // 30 минут
const animeCategoryCache: Map<string, { animeList: AnimeInfo[]; lastUpdated: number; fullyLoaded: boolean }>
    = new Map();

const AnimeCategoryPage = ({ params }: { params: Promise<{ categoryId: string }> }) => {
    const { categoryId } = use(params);
    const [categoryName, setCategoryName] = useState<string | null>(null);
    const [animeInCategory, setAnimeInCategory] = useState<AnimeInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [visibleCards, setVisibleCards] = useState<Set<number>>(new Set());

    useEffect(() => {
        let isMounted = true;

        const fetchData = async () => {
            try {
                // Очищаем состояния при новой загрузке
                if (!isMounted) return;
                setError(null);
                setVisibleCards(new Set());
                
                // Заголовок категории (без AbortSignal)
                const category = await fetchCategoryById(categoryId);
                if (!isMounted) return;
                
                if (!category) {
                    setCategoryName('Категория не найдена');
                    setLoading(false);
                    return;
                }
                
                setCategoryName(category.name);
                
                // Обновляем заголовок страницы
                if (typeof document !== 'undefined') {
                    document.title = `${category.name} | AniCat`;
                }

                // Проверяем кэш
                const cached = animeCategoryCache.get(categoryId);
                if (cached && cached.animeList.length > 0) {
                    if (!isMounted) return;
                    setAnimeInCategory(cached.animeList);
                    setLoading(false);
                    
                    // Плавное появление карточек из кэша
                    cached.animeList.forEach((anime, index) => {
                        setTimeout(() => {
                            if (!isMounted) return;
                            setVisibleCards(prev => new Set(prev).add(anime.id));
                        }, index * 100);
                    });
                    
                    const isFresh = Date.now() - cached.lastUpdated < CATEGORY_CACHE_TTL_MS;
                    if (isFresh && cached.fullyLoaded) {
                        return; // кэш свежий — не обновляем
                    }
                    // иначе — обновляем в фоне, без спинера
                }

                // Быстрая оптимизированная загрузка всех аниме одним запросом
                const animeIds: number[] = category.animeIds.map(Number);
                
                if (animeIds.length === 0) {
                    if (!isMounted) return;
                    setAnimeInCategory([]);
                    setLoading(false);
                    return;
                }
                
                // Загружаем все аниме одним оптимизированным запросом (без AbortSignal)
                const animeBasicRes = await fetch(
                    `${API_SERVER}/api/anime/optimized/get-anime-list/basic`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(animeIds)
                    }
                );

                if (!isMounted) return;

                if (!animeBasicRes.ok) {
                    throw new Error(`Ошибка загрузки аниме: ${animeBasicRes.status}`);
                }

                const animeData: AnimeInfo[] = await animeBasicRes.json();
                
                if (!isMounted) return;
                
                // Сортируем в том порядке, в котором они были в категории
                const sortedAnime = animeIds.map(id => 
                    animeData.find(anime => anime.id === id)
                ).filter(Boolean) as AnimeInfo[];

                setAnimeInCategory(sortedAnime);

                // Плавное появление карточек с более коротким интервалом
                sortedAnime.forEach((anime, index) => {
                    setTimeout(() => {
                        if (!isMounted) return;
                        setVisibleCards(prevVisible => new Set(prevVisible).add(anime.id));
                    }, index * 60); // Быстрее появление
                });

                // Обновляем кэш
                animeCategoryCache.set(categoryId, {
                    animeList: sortedAnime,
                    lastUpdated: Date.now(),
                    fullyLoaded: true,
                });
            } catch (err) {
                console.error('Ошибка загрузки категории:', err);
                if (!isMounted) return;
                setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchData();

        return () => { 
            isMounted = false; 
        };
    }, [categoryId]);

    return (
        <MiniCardProvider>
            <Head>
                <title>{categoryName ? `${categoryName} | AniCat` : 'Категория | AniCat'}</title>
                <meta 
                    name="description" 
                    content={`Просмотр аниме в категории ${categoryName || 'выбранной категории'}. Удобная навигация и детальная информация о каждом аниме.`} 
                />
                <meta property="og:title" content={`${categoryName || 'Категория'} | AniCat`} />
                <meta 
                    property="og:description" 
                    content={`Просмотр аниме в категории ${categoryName || 'выбранной категории'}`} 
                />
                <meta property="og:type" content="website" />
                <meta property="og:image" content="https://anicat.ru/logo-cover.jpg" />
            </Head>
            <div className="anime-category-container">
                <div className="anime-category-title">
                    <h1>{categoryName || 'Загрузка...'}</h1>
                </div>
                
                {error ? (
                    <div className="anime-category-error">
                        <div className="anime-category-error-icon">⚠️</div>
                        <h3 className="anime-category-error-title">Ошибка загрузки</h3>
                        <p className="anime-category-error-message">{error}</p>
                    </div>
                ) : loading && animeInCategory.length === 0 ? (
                    <div className="anime-category-loading">
                        <div className="anime-category-spinner-wrapper">
                            <div className="anime-category-spinner-core"></div>
                        </div>
                        <div className="anime-category-loading-text">Загружаем аниме...</div>
                    </div>
                ) : animeInCategory.length > 0 ? (
                    <div className="anime-category-grid">
                        {animeInCategory.map((anime) => (
                            <div 
                                key={anime.id}
                                className={`anime-category-card-wrapper ${visibleCards.has(anime.id) ? 'visible' : ''}`}
                            >
                                <GlobalAnimeCard
                                    anime={{
                                        ...anime,
                                        episodes: anime.episodes,
                                    }}
                                    priority={animeInCategory.indexOf(anime) < 8}
                                    showCollectionStatus={true}
                                    showRating={true}
                                    showType={true}
                                />
                            </div>
                        ))}
                    </div>
                ) : !loading ? (
                    <div className="anime-category-empty">
                        <div className="anime-category-empty-icon">🎬</div>
                        <h3 className="anime-category-empty-title">Нет аниме в этой категории</h3>
                        <p className="anime-category-empty-description">
                            Возможно, аниме еще не добавлены или категория временно пуста
                        </p>
                    </div>
                ) : null}
            </div>
        </MiniCardProvider>
    );
};

export default AnimeCategoryPage;
