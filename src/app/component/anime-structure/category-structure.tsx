'use client';

import React, { useEffect, useRef, useState } from 'react';
import GlobalAnimeCard from './GlobalAnimeCard';
import { AnimeInfo } from './anime-data-info';
import Link from 'next/link';
import { API_SERVER } from '../../../tools/constants';

interface CategoryProps {
    categoryId: string;
    title: string;
    link?: string;
    position?: number;
}

// Кэш в памяти по категориям (живёт, пока открыта вкладка)
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 минут
type PcAnimeCategoryCache = Map<string, { animeList: AnimeInfo[]; lastUpdated: number; fullyLoaded: boolean }>;
const categoryCache: PcAnimeCategoryCache = new Map();
// Делаем доступным для мобильной версии (CategoryNavBar) для переиспользования без перезагрузки
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
(globalThis as { __pcAnimeCategoryCache?: PcAnimeCategoryCache }).__pcAnimeCategoryCache = categoryCache;

const Category: React.FC<CategoryProps> = ({ categoryId, title }) => {
    const [animeList, setAnimeList] = useState<AnimeInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const abortRef = useRef<AbortController | null>(null);

    useEffect(() => {
        let isMounted = true;
        if (abortRef.current) abortRef.current.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        const loadAnime = async () => {
            try {
                // Если уже есть кэш — используем его
                const cached = categoryCache.get(categoryId);
                if (cached && cached.animeList.length > 0) {
                    if (!isMounted) return;
                    setAnimeList(cached.animeList);
                    setLoading(false);
                    const isFresh = Date.now() - cached.lastUpdated < CACHE_TTL_MS;
                    if (isFresh && cached.fullyLoaded) {
                        return; // свежий кэш — не обновляем
                    }
                    // кэш устарел — обновляем в фоне без спинера
                }

                const categoryRes = await fetch(`${API_SERVER}/api/anime/category/get-category/${categoryId}`, { signal: controller.signal });
                if (!categoryRes.ok) throw new Error(`Ошибка загрузки категории ${categoryId}`);

                const categoryData = await categoryRes.json();
                const animeIds: string[] = categoryData.animeIds || [];

                for (const id of animeIds) {
                    if (!isMounted) return;

                    try {
                        const animeRes = await fetch(`${API_SERVER}/api/anime/get-anime/${id}`, { signal: controller.signal });
                        if (!animeRes.ok) continue;

                        const anime: AnimeInfo = await animeRes.json();

                        if (!isMounted) return;
                        setAnimeList(prev => {
                            // защита от дублей
                            if (prev.some(a => a.id === anime.id)) return prev;
                            const next = [...prev, anime];
                            categoryCache.set(categoryId, {
                                animeList: next,
                                lastUpdated: Date.now(),
                                fullyLoaded: false,
                            });
                            return next;
                        });

                        // Задержка, чтобы аниме появлялись постепенно
                        await new Promise(r => setTimeout(r, 150));
                    } catch (err) {
                        if (err instanceof Error && err.name === 'AbortError') return;
                        console.warn(`Ошибка загрузки аниме ${id}`, err);
                    }
                }
            } catch (err) {
                if (err instanceof Error && err.name === 'AbortError') return;
                console.error(err);
            } finally {
                if (isMounted) {
                    setLoading(false);
                    const current = categoryCache.get(categoryId);
                    categoryCache.set(categoryId, {
                        animeList: current?.animeList || [],
                        lastUpdated: Date.now(),
                        fullyLoaded: true,
                    });
                }
            }
        };

        loadAnime();

        return () => {
            isMounted = false;
            controller.abort();
        };
    }, [categoryId]);

    return (
        <section className="category">
            <div className="container-wrapper">
                <Link href={`/anime-category/${categoryId}`}>
                    <h2 className="category-title">{title}</h2>
                </Link>

                <div className="anime-line-container-padding">
                    <div className="anime-line-container">
                        {loading && animeList.length === 0 ? (
                            <div className="anime-spinner-wrapper">
                                <div className="anime-loading-spinner"/>
                            </div>
                        ) : animeList.length > 0 ? (
                            animeList.map((anime, index) => (
                                <div
                                    key={anime.id}
                                    className="anime-container-card-loading"
                                    style={{ animationDelay: `${index * 0.06}s` }}
                                >
                                    <GlobalAnimeCard 
                                        anime={anime} 
                                        showCollectionStatus={true}
                                        showRating={true}
                                        showType={true} 
                                    />
                                </div>
                            ))
                        ) : (
                            <p>Нет аниме для отображения.</p>
                        )}
                    </div>
                </div>

                <Link href={`/anime-category/${categoryId}`}>
                    <div className="view-all-button">Посмотреть все</div>
                </Link>
            </div>
        </section>
    );
};

export default Category;
