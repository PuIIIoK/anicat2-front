'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { API_SERVER } from '../../../tools/constants';
import { AnimeInfo } from '../anime-structure/anime-data-info';

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

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 минут

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
    } catch {}
    return false;
}

export function useCollections() {
    const [activeTab, setActiveTab] = useState<string>('Просмотрено');
    const [collections, setCollections] = useState<AnimeCollectionItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const abortRef = useRef<AbortController | null>(null);
    const cache = getGlobalCollectionsCache();

    useEffect(() => {
        if (isHardReload()) {
            try { cache.clear(); } catch {}
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const mergeAndAnimate = useCallback(async (
        base: AnimeCollectionItem[],
        incoming: AnimeCollectionItem[],
        onStep: (items: AnimeCollectionItem[]) => void,
        stepDelay = 80
    ) => {
        const seen = new Set<number>(base.map(i => i.collectionId));
        const merged: AnimeCollectionItem[] = [...base];
        for (const it of incoming) {
            if (!seen.has(it.collectionId)) {
                seen.add(it.collectionId);
                merged.push(it);
                onStep([...merged]);
                // eslint-disable-next-line no-await-in-loop
                await new Promise(r => setTimeout(r, stepDelay));
            }
        }
        return merged;
    }, []);

    const fetchCollection = useCallback(async (type: string, useBackground = false) => {
        if (abortRef.current) abortRef.current.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        if (!useBackground) {
            setLoading(true);
            // очищаем предыдущие элементы, чтобы не мелькали элементы из другой вкладки
            setCollections([]);
        }
        try {
            const res = await fetch(`${API_SERVER}/api/collection/my?type=${type}`, {
                headers: {
                    Authorization: `Bearer ${document.cookie.replace(/(?:(?:^|.*;\s*)token\s*=\s*([^;]*).*$)|^.*$/, "$1")}`,
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
                // Доп. защита: база тоже фильтруется по типу
                const base = (cached.items || []).filter((it) => it.collectionType === type);
                await mergeAndAnimate(base, filtered, (next) => {
                    setCollections(next);
                    cache.set(type, { items: next, lastUpdated: Date.now(), fullyLoaded: false });
                }, 60);
            } else {
                await mergeAndAnimate([], filtered, (next) => {
                    setCollections(next);
                    cache.set(type, { items: next, lastUpdated: Date.now(), fullyLoaded: false });
                }, 60);
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
        const type = tabMap[activeTab];
        const cached = cache.get(type);
        const isFresh = cached && (Date.now() - cached.lastUpdated < CACHE_TTL_MS);
        if (cached && cached.items.length > 0) {
            // Безопасно отобразим только элементы нужного типа
            const safeItems = (cached.items || []).filter((it) => it.collectionType === type);
            setCollections(safeItems);
            setLoading(false);
            if (!isFresh || !cached.fullyLoaded) {
                fetchCollection(type, true);
            }
        } else {
            // нет кэша — очищаем и показываем загрузку, чтобы не отображались элементы другой вкладки
            setCollections([]);
            setLoading(true);
            fetchCollection(type, false);
        }

        return () => { if (abortRef.current) abortRef.current.abort(); };
    }, [activeTab, cache, fetchCollection]);

    return { activeTab, setActiveTab, collections, loading };
}


