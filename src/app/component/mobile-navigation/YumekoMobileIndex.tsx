'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { API_SERVER } from '@/hosts/constants';
import { AnimeBasicInfo } from '../anime-structure/anime-basic-info';
import YumekoAnimeCard from '../anime-structure/YumekoAnimeCard';
import './yumeko-mobile-index.scss';

interface Category {
    id: string;
    name: string;
    position: number;
    animeIds: string[];
}

type AnimeCacheEntry = { animeList: AnimeBasicInfo[]; lastUpdated: number; fullyLoaded: boolean };
type AnimeCategoryCache = Map<string, AnimeCacheEntry>;
type CategoriesCache = { categories: Category[]; lastUpdated: number };

const getAuthToken = () => {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(/(?:^|;)\s*(?:token|authToken|access_token|jwt|auth)=([^;]+)/i);
    if (match && match[1]) {
        return decodeURIComponent(match[1]);
    }
    try {
        return localStorage.getItem('token');
    } catch {
        return null;
    }
};

declare global {
    // eslint-disable-next-line no-var
    var __yumekoMobileCategoriesCache: CategoriesCache | undefined;
    // eslint-disable-next-line no-var
    var __yumekoMobileAnimeCache: AnimeCategoryCache | undefined;
    // eslint-disable-next-line no-var
    var __yumekoLastSelectedCategoryId: string | null | undefined;
    // eslint-disable-next-line no-var
    var __pendingAnimeRequests: Map<string, Promise<AnimeBasicInfo[]>> | undefined;
}

if (!globalThis.__pendingAnimeRequests) {
    globalThis.__pendingAnimeRequests = new Map();
}
const pendingRequests = globalThis.__pendingAnimeRequests;

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 минут

const YumekoMobileIndex: React.FC = () => {
    // Инициализация кэшей
    if (!globalThis.__yumekoMobileCategoriesCache) {
        globalThis.__yumekoMobileCategoriesCache = { categories: [], lastUpdated: 0 };
    }
    if (!globalThis.__yumekoMobileAnimeCache) {
        globalThis.__yumekoMobileAnimeCache = new Map<string, AnimeCacheEntry>();
    }
    if (typeof globalThis.__yumekoLastSelectedCategoryId === 'undefined') {
        globalThis.__yumekoLastSelectedCategoryId = null;
    }

    const categoriesCache = globalThis.__yumekoMobileCategoriesCache!;
    const animeCache = globalThis.__yumekoMobileAnimeCache!;
    const lastSelectedRef = useMemo(() => ({
        get value() { return globalThis.__yumekoLastSelectedCategoryId as string | null; },
        set value(v: string | null) { globalThis.__yumekoLastSelectedCategoryId = v; }
    }), []);

    // Инициализация состояния из кэша для мгновенного отображения при возврате
    const [categories, setCategories] = useState<Category[]>(() =>
        globalThis.__yumekoMobileCategoriesCache?.categories || []
    );
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(() =>
        globalThis.__yumekoLastSelectedCategoryId || globalThis.__yumekoMobileCategoriesCache?.categories?.[0]?.id || null
    );
    const [animeList, setAnimeList] = useState<AnimeBasicInfo[]>(() => {
        const cachedCatId = globalThis.__yumekoLastSelectedCategoryId;
        if (cachedCatId) {
            return globalThis.__yumekoMobileAnimeCache?.get(cachedCatId)?.animeList || [];
        }
        return [];
    });
    const [loadingCategories, setLoadingCategories] = useState(() =>
        !globalThis.__yumekoMobileCategoriesCache?.categories?.length
    );
    const [loadingAnime, setLoadingAnime] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Refs
    const categoryRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const tabsContainerRef = useRef<HTMLDivElement | null>(null);
    const mountedRef = useRef(true);
    const fetchControllerRef = useRef<AbortController | null>(null);

    // Underline state
    const [underlineStyle, setUnderlineStyle] = useState({ left: 0, width: 0 });

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    // Загрузка категорий
    useEffect(() => {
        const fetchCategories = async () => {
            const isFresh = Date.now() - categoriesCache.lastUpdated < CACHE_TTL_MS && categoriesCache.categories.length > 0;

            // Если кэш свежий - просто используем его без загрузки
            if (isFresh) {
                if (!mountedRef.current) return;
                if (categories.length === 0) {
                    setCategories(categoriesCache.categories);
                }
                if (!selectedCategoryId) {
                    const fallbackId = categoriesCache.categories[0]?.id || null;
                    setSelectedCategoryId(
                        lastSelectedRef.value && categoriesCache.categories.some(c => c.id === lastSelectedRef.value)
                            ? lastSelectedRef.value
                            : fallbackId
                    );
                }
                setLoadingCategories(false);
                return;
            }

            // Показываем загрузку только если нет кэшированных данных
            if (categories.length === 0) {
                setLoadingCategories(true);
            }

            try {
                const res = await fetch(`${API_SERVER}/api/anime/category/get-category`);
                if (!res.ok) throw new Error('Ошибка загрузки');

                const data = await res.json();
                const fetched: Category[] = (data.categories || []).sort(
                    (a: Category, b: Category) => a.position - b.position
                );

                if (!mountedRef.current) return;
                setCategories(fetched);

                if (!selectedCategoryId) {
                    const initialId = lastSelectedRef.value && fetched.some(c => c.id === lastSelectedRef.value)
                        ? lastSelectedRef.value
                        : (fetched[0]?.id || null);
                    setSelectedCategoryId(initialId);
                }

                categoriesCache.categories = fetched;
                categoriesCache.lastUpdated = Date.now();
            } catch {
                if (categories.length === 0) {
                    setError('Ошибка загрузки категорий');
                }
            } finally {
                setLoadingCategories(false);
            }
        };

        fetchCategories();
    }, [categoriesCache, lastSelectedRef, categories.length, selectedCategoryId]);

    // Обновление underline
    const updateUnderline = useCallback(() => {
        const idx = categories.findIndex(c => c.id === selectedCategoryId);
        const el = categoryRefs.current[idx];
        const container = tabsContainerRef.current;

        if (el && container) {
            requestAnimationFrame(() => {
                setUnderlineStyle({
                    left: el.offsetLeft,
                    width: el.offsetWidth
                });

                // Скролл к активному табу
                const center = el.offsetLeft - container.clientWidth / 2 + el.offsetWidth / 2;
                container.scrollTo({ left: Math.max(0, center), behavior: 'smooth' });
            });
        }
    }, [categories, selectedCategoryId]);

    useEffect(() => {
        updateUnderline();
        window.addEventListener('resize', updateUnderline);
        return () => window.removeEventListener('resize', updateUnderline);
    }, [updateUnderline]);

    // Загрузка аниме для категории
    useEffect(() => {
        if (!selectedCategoryId) {
            setAnimeList([]);
            return;
        }

        if (fetchControllerRef.current) {
            fetchControllerRef.current.abort();
        }
        const controller = new AbortController();
        fetchControllerRef.current = controller;

        const fetchAnimeList = async () => {
            lastSelectedRef.value = selectedCategoryId;

            // Проверяем кэш
            const cached = animeCache.get(selectedCategoryId);
            const isFresh = cached && (Date.now() - cached.lastUpdated < CACHE_TTL_MS) && cached.animeList.length > 0;

            // Если есть кэш - используем его сразу
            if (cached && cached.animeList.length > 0) {
                if (!mountedRef.current) return;
                setAnimeList(cached.animeList);
                setLoadingAnime(false);

                // Если кэш свежий - не загружаем заново
                if (isFresh && cached.fullyLoaded) return;

                // Иначе обновляем в фоне без показа загрузки
            } else {
                // Показываем загрузку только если нет кэша
                setLoadingAnime(true);
                setAnimeList([]);
            }

            try {
                // Используем animeIds из категории напрямую (без отдельного запроса)
                const category = categories.find(c => c.id === selectedCategoryId);
                const animeIds: number[] = (category?.animeIds || []).map(Number);

                if (animeIds.length === 0) {
                    setAnimeList([]);
                    setLoadingAnime(false);
                    return;
                }

                const cacheKey = `mobile_cat_${selectedCategoryId}_${animeIds.join(',')}`;

                // Проверяем, есть ли уже pending запрос для этого ключа
                let fetchPromise = pendingRequests.get(cacheKey);

                if (!fetchPromise) {
                    // Создаём новый запрос
                    const token = getAuthToken();
                    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
                    if (token) {
                        headers['Authorization'] = `Bearer ${token}`;
                    }

                    fetchPromise = fetch(`${API_SERVER}/api/anime/get-anime`, {
                        method: 'POST',
                        headers,
                        body: JSON.stringify(animeIds),
                        signal: controller.signal
                    }).then(res => {
                        if (!res.ok) throw new Error(`HTTP ${res.status}`);
                        return res.json();
                    }).finally(() => {
                        pendingRequests.delete(cacheKey);
                    });

                    pendingRequests.set(cacheKey, fetchPromise);
                }

                const loadedAnime = await fetchPromise;

                if (!mountedRef.current || controller.signal.aborted) return;

                // Сортируем в порядке категории
                const sortedAnime = animeIds.map(id =>
                    loadedAnime.find((anime: AnimeBasicInfo) => anime.id === id)
                ).filter(Boolean) as AnimeBasicInfo[];

                setLoadingAnime(false);
                setAnimeList(sortedAnime);

                animeCache.set(selectedCategoryId, {
                    animeList: sortedAnime,
                    lastUpdated: Date.now(),
                    fullyLoaded: true
                });
            } catch (e) {
                if (e instanceof Error && e.name === 'AbortError') return;
                console.error('Error loading anime:', e);
                if (mountedRef.current) setAnimeList([]);
            } finally {
                if (mountedRef.current) setLoadingAnime(false);
            }
        };

        fetchAnimeList();

        return () => { controller.abort(); };
    }, [selectedCategoryId, animeCache, lastSelectedRef, categories]);

    const handleCategoryClick = useCallback((id: string) => {
        setSelectedCategoryId(id);
    }, []);

    // Обработка свайпа
    const touchStartX = useRef<number | null>(null);

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStartX.current === null) return;

        const touchEndX = e.changedTouches[0].clientX;
        const deltaX = touchEndX - touchStartX.current;

        if (Math.abs(deltaX) >= 50) {
            const currentIdx = categories.findIndex(c => c.id === selectedCategoryId);
            if (deltaX < 0 && currentIdx < categories.length - 1) {
                setSelectedCategoryId(categories[currentIdx + 1].id);
            } else if (deltaX > 0 && currentIdx > 0) {
                setSelectedCategoryId(categories[currentIdx - 1].id);
            }
        }

        touchStartX.current = null;
    };

    if (error) {
        return (
            <div className="yumeko-mobile-index-error">
                <span className="yumeko-mobile-index-error-icon">⚠️</span>
                <span className="yumeko-mobile-index-error-text">{error}</span>
                <button
                    className="yumeko-mobile-index-error-btn"
                    onClick={() => window.location.reload()}
                >
                    Повторить
                </button>
            </div>
        );
    }

    if (loadingCategories) {
        return (
            <div className="yumeko-mobile-index-loader">
                <div className="yumeko-mobile-index-spinner" />
            </div>
        );
    }

    return (
        <div
            className="yumeko-mobile-index"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            {/* Tabs Navigation */}
            <div className="yumeko-mobile-index-tabs-wrapper">
                <div
                    className="yumeko-mobile-index-tabs"
                    ref={tabsContainerRef}
                >
                    {categories.map((cat, index) => (
                        <button
                            key={cat.id}
                            ref={(el) => { categoryRefs.current[index] = el; }}
                            className={`yumeko-mobile-index-tab ${selectedCategoryId === cat.id ? 'active' : ''}`}
                            onClick={() => handleCategoryClick(cat.id)}
                        >
                            {cat.name}
                        </button>
                    ))}

                    {/* Underline */}
                    <div
                        className="yumeko-mobile-index-underline"
                        style={{
                            transform: `translateX(${underlineStyle.left}px)`,
                            width: `${underlineStyle.width}px`
                        }}
                    />
                </div>
            </div>

            {/* Anime Grid */}
            <div className="yumeko-mobile-index-content">
                {loadingAnime ? (
                    <div className="yumeko-mobile-index-loading">
                        <div className="yumeko-mobile-index-spinner" />
                        <span>Загрузка...</span>
                    </div>
                ) : (
                    <div className="yumeko-mobile-index-grid">
                        {animeList.length > 0 ? (
                            animeList.map((anime) => (
                                <div key={anime.id} className="yumeko-mobile-index-card">
                                    <YumekoAnimeCard
                                        anime={anime}
                                        showRating={true}
                                        showType={true}
                                        showCollectionStatus={true}
                                        dataPreloaded={true}
                                    />
                                </div>
                            ))
                        ) : (
                            <div className="yumeko-mobile-index-empty">
                                <span>📺</span>
                                <span>Аниме не найдено</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default YumekoMobileIndex;
