'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { API_SERVER } from '@/hosts/constants';
import { AnimeInfo } from '../anime-structure/anime-data-info';
import { getAuthToken } from '../../utils/auth';

export interface AnimeCollectionItem {
    collectionId: number;
    collectionType: string;
    addedAt: string;
    anime: AnimeInfo;
}

export const tabMap: { [key: string]: string } = {
    'Избранное': 'FAVORITE',
    'Смотрю': 'WATCHING',
    'В планах': 'PLANNED',
    'Просмотрено': 'COMPLETED',
    'Отложено': 'PAUSED',
    'Брошено': 'DROPPED',
};

export const collectionTypeMap: { [key: string]: string } = {
    FAVORITE: 'Избранное',
    WATCHING: 'Смотрю',
    PLANNED: 'В планах',
    COMPLETED: 'Просмотрено',
    PAUSED: 'Отложено',
    DROPPED: 'Брошено',
};

type CollectionCacheEntry = {
    items: AnimeCollectionItem[];
    lastUpdated: number;
    fullyLoaded: boolean;
};

declare global {
    // eslint-disable-next-line no-var
    var __collectionsCache: Map<string, CollectionCacheEntry> | undefined;
}

function getGlobalCollectionsCache(): Map<string, CollectionCacheEntry> {
    if (!globalThis.__collectionsCache) {
        globalThis.__collectionsCache = new Map<string, CollectionCacheEntry>();
    }
    return globalThis.__collectionsCache;
}

function isHardReload(): boolean {
    if (typeof window === 'undefined') return false;
    try {
        const entries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
        if (entries && entries.length > 0) return entries[0].type === 'reload';
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        if (performance && performance.navigation) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            return performance.navigation.type === 1; // TYPE_RELOAD
        }
    } catch { }
    return false;
}

export function useCollections() {
    const [activeTab, setActiveTab] = useState<string>('Просмотрено');
    const [collections, setCollections] = useState<AnimeCollectionItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [hasCache, setHasCache] = useState<boolean>(false);
    const abortRef = useRef<AbortController | null>(null);
    const animationTimersRef = useRef<number[]>([]);
    const isAnimatingRef = useRef<boolean>(false);
    const cache = getGlobalCollectionsCache();

    useEffect(() => {
        if (isHardReload()) {
            try { cache.clear(); } catch { }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const mergeAndAnimate = useCallback(async (
        base: AnimeCollectionItem[],
        incoming: AnimeCollectionItem[],
        onStep: (items: AnimeCollectionItem[]) => void,
        stepDelay = 80
    ) => {
        isAnimatingRef.current = true;
        const seen = new Set<number>(base.map(i => i.collectionId));
        const merged: AnimeCollectionItem[] = [...base];

        for (const it of incoming) {
            // Проверяем, не была ли отменена анимация
            if (!isAnimatingRef.current) {
                return merged;
            }

            if (!seen.has(it.collectionId)) {
                seen.add(it.collectionId);
                merged.push(it);
                onStep([...merged]);

                // eslint-disable-next-line no-await-in-loop
                await new Promise(r => {
                    const timer = window.setTimeout(r, stepDelay);
                    animationTimersRef.current.push(timer);
                });
            }
        }

        isAnimatingRef.current = false;
        return merged;
    }, []);

    const fetchCollection = useCallback(async (type: string) => {
        // Отменяем предыдущий запрос
        if (abortRef.current) {
            abortRef.current.abort();
        }

        // Останавливаем анимацию
        isAnimatingRef.current = false;

        // Очищаем все таймеры анимации
        animationTimersRef.current.forEach(timer => window.clearTimeout(timer));
        animationTimersRef.current = [];

        const controller = new AbortController();
        abortRef.current = controller;

        setLoading(true);
        try {
            const res = await fetch(`${API_SERVER}/api/collection/my?type=${type}`, {
                headers: {
                    Authorization: `Bearer ${getAuthToken() || ''}`,
                },
                signal: controller.signal,
            });
            if (!res.ok) throw new Error(`Ошибка ${res.status}`);
            const data: AnimeCollectionItem[] = await res.json();
            // Жёсткая фильтрация по типу вкладки — предотвращает попадание чужих статусов
            const filtered: AnimeCollectionItem[] = (data || []).filter((it) => it.collectionType === type);

            // Если данных для выбранного типа нет — сразу показываем пустое состояние
            if (filtered.length === 0) {
                setCollections([]);
                cache.set(type, { items: [], lastUpdated: Date.now(), fullyLoaded: true });
                return;
            }

            const cached = cache.get(type);
            if (cached && cached.items.length > 0) {
                // Есть кэш - анимируем добавление новых элементов
                const base = (cached.items || []).filter((it) => it.collectionType === type);
                await mergeAndAnimate(base, filtered, (next) => {
                    setCollections(next);
                    cache.set(type, { items: next, lastUpdated: Date.now(), fullyLoaded: false });
                }, 30); // Быстрее анимация
            } else {
                // Нет кэша - показываем всё сразу БЕЗ анимации для максимальной скорости
                setCollections(filtered);
                cache.set(type, { items: filtered, lastUpdated: Date.now(), fullyLoaded: true });
            }

            const currentItems = cache.get(type)?.items || filtered;
            cache.set(type, { items: currentItems, lastUpdated: Date.now(), fullyLoaded: true });
        } catch (err) {
            if (err instanceof Error) {
                if (err.name !== 'AbortError') {
                    console.error('Ошибка загрузки:', err);
                    setCollections([]);
                }
            } else {
                console.error('Ошибка загрузки:', err);
                setCollections([]);
            }
        } finally {
            setLoading(false);
        }
    }, [cache, mergeAndAnimate]);

    useEffect(() => {
        // СРАЗУ отменяем предыдущую загрузку и анимацию
        if (abortRef.current) {
            abortRef.current.abort();
        }
        isAnimatingRef.current = false;
        animationTimersRef.current.forEach(timer => window.clearTimeout(timer));
        animationTimersRef.current = [];

        const type = tabMap[activeTab];
        const cached = cache.get(type);

        if (cached && cached.items.length > 0) {
            // Есть кэш - показываем его сразу БЕЗ индикации загрузки и БЕЗ перезагрузки
            const safeItems = (cached.items || []).filter((it) => it.collectionType === type);
            setCollections(safeItems);
            setLoading(false);
            setHasCache(true); // Указываем, что данные из кэша
            // НЕ загружаем повторно - кэш живет до перезагрузки страницы
        } else {
            // Нет кэша - загружаем первый раз с индикацией
            // ВАЖНО: сначала устанавливаем loading=true, чтобы не мигало "пусто"
            setLoading(true);
            setHasCache(false);
            // НЕ очищаем коллекции - спиннер покажется благодаря loading=true
            fetchCollection(type);
        }

        return () => {
            // Отменяем запрос
            if (abortRef.current) {
                abortRef.current.abort();
            }

            // Останавливаем анимацию
            isAnimatingRef.current = false;

            // Очищаем все таймеры
            animationTimersRef.current.forEach(timer => window.clearTimeout(timer));
            animationTimersRef.current = [];
        };
    }, [activeTab, cache, fetchCollection]);

    const reloadCurrentTab = useCallback(() => {
        const type = tabMap[activeTab];

        // Очищаем кэш текущей вкладки
        cache.delete(type);

        // Останавливаем текущую анимацию
        if (abortRef.current) {
            abortRef.current.abort();
        }
        isAnimatingRef.current = false;
        animationTimersRef.current.forEach(timer => window.clearTimeout(timer));
        animationTimersRef.current = [];

        // Очищаем коллекции и начинаем загрузку заново
        setCollections([]);
        setLoading(true);
        setHasCache(false);
        fetchCollection(type);
    }, [activeTab, cache, fetchCollection]);

    return { activeTab, setActiveTab, collections, loading, hasCache, reloadCurrentTab };
}


