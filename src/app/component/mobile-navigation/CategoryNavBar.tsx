import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { API_SERVER } from '../../../tools/constants';
import { AnimeInfo } from '../anime-structure/anime-data-info';
import { AnimeBasicInfo } from '../anime-structure/anime-basic-info';
import GlobalAnimeCard from '../anime-structure/GlobalAnimeCard';
import ServerErrorPage from '../common/ServerErrorPage';

interface Category {
    id: string;
    name: string;
    animeIds: string[];
    position: number;
}

type AnimeCacheEntry = { animeList: (AnimeInfo | AnimeBasicInfo)[]; lastUpdated: number; fullyLoaded: boolean };
type PcAnimeCategoryCache = Map<string, AnimeCacheEntry>;
type MobileCategoriesCache = { categories: Category[]; lastUpdated: number };

declare global {
	// eslint-disable-next-line no-var
	var __mobileCategoriesCache: MobileCategoriesCache | undefined;
	// eslint-disable-next-line no-var
	var __mobileAnimeCache: PcAnimeCategoryCache | undefined;
	// eslint-disable-next-line no-var
	var __lastSelectedMobileCategoryId: string | null | undefined;
	// eslint-disable-next-line no-var
	var __pcAnimeCategoryCache: PcAnimeCategoryCache | undefined;
}

// TTL 30 минут, общий для мобильной навигации
const MOBILE_CACHE_TTL_MS = 30 * 60 * 1000;

const CategoryNavBar: React.FC = () => {
	// Кэш списка категорий (живёт, пока открыта вкладка)
	if (!globalThis.__mobileCategoriesCache) {
		globalThis.__mobileCategoriesCache = { categories: [], lastUpdated: 0 };
	}
	// Кэш аниме по категориям
	if (!globalThis.__mobileAnimeCache) {
		globalThis.__mobileAnimeCache = new Map<string, AnimeCacheEntry>();
	}
	// Попытка переиспользовать ПК-кэш, если он уже создан на этой вкладке
	const pcCacheMaybe = globalThis.__pcAnimeCategoryCache;
	if (pcCacheMaybe && globalThis.__mobileAnimeCache && globalThis.__mobileAnimeCache.size === 0) {
		globalThis.__mobileAnimeCache = pcCacheMaybe;
	}
	// Запоминаем последнюю выбранную категорию
	if (typeof globalThis.__lastSelectedMobileCategoryId === 'undefined') {
		globalThis.__lastSelectedMobileCategoryId = null;
	}

	const categoriesCache: MobileCategoriesCache = globalThis.__mobileCategoriesCache!;
	const animeCache: PcAnimeCategoryCache = globalThis.__mobileAnimeCache!;
	const lastSelectedRef = useMemo(() => ({
		get value() { return globalThis.__lastSelectedMobileCategoryId as string | null; },
		set value(v: string | null) { globalThis.__lastSelectedMobileCategoryId = v; }
	}), []);

    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [animeList, setAnimeList] = useState<(AnimeInfo | AnimeBasicInfo)[]>([]);
    const [loadingCategories, setLoadingCategories] = useState(true);
    const [loadingAnime, setLoadingAnime] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [visibleAnime, setVisibleAnime] = useState<Set<string>>(new Set());

    // UI refs / states for underline & scrolling
    const categoryRefs = useRef<(HTMLDivElement | null)[]>([]);
    const navItemsRef = useRef<HTMLDivElement | null>(null);
    const [underlineX, setUnderlineX] = useState(0);
    const [underlineWidth, setUnderlineWidth] = useState(0);
    const [isSwiping, setIsSwiping] = useState(false);

    // touch tracking
    const [touchStartX, setTouchStartX] = useState<number | null>(null);
    const [touchStartY, setTouchStartY] = useState<number | null>(null);

    // mounted + fetch controller refs
    const mountedRef = useRef(true);
    const animeFetchControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        mountedRef.current = true;
        return () => { 
            mountedRef.current = false;
            // Очищаем throttle timer при размонтировании
            if (throttleTimerRef.current !== null) {
                clearTimeout(throttleTimerRef.current);
                throttleTimerRef.current = null;
            }
        };
    }, []);

    // --- categories loading (с кэшем + TTL)
	useEffect(() => {
        const fetchCategories = async () => {
            setLoadingCategories(true);
            try {
                const isFresh = Date.now() - categoriesCache.lastUpdated < MOBILE_CACHE_TTL_MS && categoriesCache.categories.length > 0;
                if (isFresh) {
                    if (!mountedRef.current) return;
                    setCategories(categoriesCache.categories);
					const fallbackId = categoriesCache.categories[0]?.id || null;
					setSelectedCategoryId(lastSelectedRef.value && categoriesCache.categories.some(c => c.id === lastSelectedRef.value)
                        ? lastSelectedRef.value
                        : fallbackId);
                    setLoadingCategories(false);
                    return;
                }

                const res = await fetch(`${API_SERVER}/api/anime/category/get-category`);
                if (!res.ok) throw new Error('network');
				const data = await res.json();
                const fetched: Category[] = (data.categories || []).sort(
                    (a: Category, b: Category) => a.position - b.position
                );
                if (!mountedRef.current) return;
                setCategories(fetched);
				const initialId = lastSelectedRef.value && fetched.some(c => c.id === lastSelectedRef.value)
                    ? lastSelectedRef.value
                    : (fetched[0]?.id || null);
                setSelectedCategoryId(initialId);
                categoriesCache.categories = fetched;
                categoriesCache.lastUpdated = Date.now();
            } catch {
                setError('Ошибка загрузки категорий');
            } finally {
                setLoadingCategories(false);
            }
        };

        fetchCategories();
	}, [categoriesCache, lastSelectedRef]);

    // --- measure underline / scroll active element into view (оптимизировано для производительности)
    const measureUnderline = useCallback(() => {
        if (!navItemsRef.current) return;
        const idx = categories.findIndex((c) => c.id === selectedCategoryId);
        const el = categoryRefs.current[idx];
        const parent = navItemsRef.current;
        if (el && parent) {
            // Используем requestAnimationFrame для оптимизации перерисовки
            requestAnimationFrame(() => {
                // offsetLeft relative to parent is simplest and stable
                setUnderlineX(el.offsetLeft);
                setUnderlineWidth(el.offsetWidth);

                // scroll active to center-ish
                const center = el.offsetLeft - parent.clientWidth / 2 + el.offsetWidth / 2;
                parent.scrollTo({ left: Math.max(0, center), behavior: 'smooth' });
            });
        } else {
            setUnderlineWidth(0);
            setUnderlineX(0);
        }
        setIsSwiping(false);
    }, [categories, selectedCategoryId]);

    useEffect(() => {
        measureUnderline();
        window.addEventListener('resize', measureUnderline);
        return () => window.removeEventListener('resize', measureUnderline);
    }, [measureUnderline]);

    // Throttle для оптимизации производительности
    const throttleTimerRef = useRef<number | null>(null);
    
    // --- touch handlers (simple swipe detection, оптимизировано)
    const handleGlobalTouchStart = useCallback((e: React.TouchEvent) => {
        setTouchStartX(e.touches[0].clientX);
        setTouchStartY(e.touches[0].clientY);
    }, []);

    const handleGlobalTouchMove = useCallback((e: React.TouchEvent) => {
        if (touchStartX === null) return;
        
        // Throttle: выполняем только раз в 16ms (~60fps)
        if (throttleTimerRef.current !== null) return;
        
        throttleTimerRef.current = window.setTimeout(() => {
            throttleTimerRef.current = null;
        }, 16);
        
        requestAnimationFrame(() => {
            const touchX = e.touches[0].clientX;
            const touchY = e.touches[0].clientY;
            const deltaX = touchX - touchStartX;
            const deltaY = touchY - touchStartY!;
            // if horizontal move beyond small threshold, mark as swiping
            if (Math.abs(deltaX) > 10 && Math.abs(deltaY) < 60) {
                setIsSwiping(true);
            }
        });
    }, [touchStartX, touchStartY]);

    const handleGlobalTouchEnd = useCallback((e: React.TouchEvent) => {
        if (touchStartX === null || touchStartY === null) {
            setTouchStartX(null);
            setTouchStartY(null);
            setIsSwiping(false);
            return;
        }
        
        // Используем requestAnimationFrame для плавности
        requestAnimationFrame(() => {
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;

            const deltaX = touchEndX - touchStartX;
            const deltaY = touchEndY - touchStartY;

            // simple thresholds: horizontal swipe at least 50px and not too vertical
            if (Math.abs(deltaX) >= 50 && Math.abs(deltaY) < 60) {
                const currentIdx = categories.findIndex((cat) => cat.id === selectedCategoryId);
                if (deltaX < 0 && currentIdx < categories.length - 1) {
                    setSelectedCategoryId(categories[currentIdx + 1].id);
                } else if (deltaX > 0 && currentIdx > 0) {
                    setSelectedCategoryId(categories[currentIdx - 1].id);
                }
            }

            setTouchStartX(null);
            setTouchStartY(null);
            setIsSwiping(false);
        });
    }, [touchStartX, touchStartY, categories, selectedCategoryId]);

    // --- keyboard navigation for categories
    const handleNavKeyDown = (e: React.KeyboardEvent) => {
        if (!categories.length) return;
        const idx = categories.findIndex((c) => c.id === selectedCategoryId);
        if (e.key === 'ArrowRight') {
            const next = Math.min(categories.length - 1, (idx === -1 ? 0 : idx + 1));
            setSelectedCategoryId(categories[next].id);
            e.preventDefault();
        } else if (e.key === 'ArrowLeft') {
            const prev = Math.max(0, (idx === -1 ? 0 : idx - 1));
            setSelectedCategoryId(categories[prev].id);
            e.preventDefault();
        }
    };

    // --- fetch anime list for category (последовательная загрузка с кэшем + TTL)
    useEffect(() => {
        if (!selectedCategoryId) {
            setAnimeList([]);
            setVisibleAnime(new Set());
            return;
        }

        // clear old controller and create new
        if (animeFetchControllerRef.current) {
            animeFetchControllerRef.current.abort();
        }
        const controller = new AbortController();
        animeFetchControllerRef.current = controller;

        const category = categories.find((c) => c.id === selectedCategoryId);
        if (!category) {
            setAnimeList([]);
            setVisibleAnime(new Set());
            return;
        }

		const fetchAnimeList = async (animeIds: string[], signal: AbortSignal) => {
			lastSelectedRef.value = selectedCategoryId;

            // пробуем кэш
            const cached = animeCache.get(selectedCategoryId);
            const isFresh = cached && (Date.now() - cached.lastUpdated < MOBILE_CACHE_TTL_MS) && cached.animeList.length > 0;
            if (cached && cached.animeList.length > 0) {
                if (!mountedRef.current) return;
                setAnimeList(cached.animeList);
                setVisibleAnime(new Set()); // Сначала скрываем все карточки
                setLoadingAnime(false);
                
                // Анимируем появление карточек даже для кэша (оптимизировано)
                cached.animeList.forEach((animeData, i) => {
                    setTimeout(() => {
                        if (mountedRef.current && !signal.aborted) {
                            // Используем requestAnimationFrame для плавной анимации
                            requestAnimationFrame(() => {
                                setVisibleAnime(prev => new Set([...prev, animeData.id.toString()]));
                            });
                        }
                    }, i * 50);
                });
                
                if (isFresh && cached.fullyLoaded) {
                    return; // свежий кэш — не обновляем
                }
                // устаревший кэш — обновляем в фоне без спинера
            } else {
                setLoadingAnime(true);
                setAnimeList([]);
                setVisibleAnime(new Set());
            }
            
            try {
                // Используем оптимизированный endpoint для быстрой загрузки всех аниме сразу
                const animeIdsNumbers = animeIds.map(id => parseInt(id, 10));
                
                const res = await fetch(`${API_SERVER}/api/anime/optimized/get-anime-list/basic`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(animeIdsNumbers),
                    signal
                });

                if (!res.ok) {
                    throw new Error(`HTTP ${res.status}`);
                }

                const loadedAnime = await res.json();
                
                if (!mountedRef.current || signal.aborted) return;

                // Убираем спиннер сразу после получения данных
                setLoadingAnime(false);
                
                // Объединяем с кэшированными данными (если есть)
                const next = [...(cached?.animeList || []), ...loadedAnime].reduce((acc: (AnimeInfo | AnimeBasicInfo)[], cur: AnimeInfo | AnimeBasicInfo) => {
                    if (!acc.some(a => a.id === cur.id)) acc.push(cur);
                    return acc;
                }, []);
                
                setAnimeList(next);
                animeCache.set(selectedCategoryId, { 
                    animeList: next, 
                    lastUpdated: Date.now(), 
                    fullyLoaded: false 
                });

                // Показываем карточки с небольшой задержкой для плавной анимации (оптимизировано)
                loadedAnime.forEach((animeData: AnimeBasicInfo, i: number) => {
                    setTimeout(() => {
                        if (mountedRef.current && !signal.aborted) {
                            // Используем requestAnimationFrame для синхронизации с частотой обновления экрана
                            requestAnimationFrame(() => {
                                setVisibleAnime(prev => new Set([...prev, animeData.id.toString()]));
                            });
                        }
                    }, i * 50); // Уменьшили задержку до 50ms для более быстрого появления
                });
            } catch (e) {
                if (e instanceof Error && e.name === 'AbortError') {
                    // aborted - ignore
                } else {
                    console.error(e);
                }
                if (mountedRef.current) setAnimeList([]);
            } finally {
                if (mountedRef.current) {
                    const current = animeCache.get(selectedCategoryId);
                    animeCache.set(selectedCategoryId, {
                        animeList: current?.animeList || [],
                        lastUpdated: Date.now(),
                        fullyLoaded: true,
                    });
                }
            }
        };

        fetchAnimeList(category.animeIds, controller.signal);

		return () => {
            controller.abort();
        };
	}, [selectedCategoryId, categories, animeCache, lastSelectedRef]);

    const handleCategoryClick = useCallback((id: string, index: number) => {
        // Используем requestAnimationFrame для оптимизации
        requestAnimationFrame(() => {
            setSelectedCategoryId(id);
            // bring into view + measure called by effect
            const el = categoryRefs.current[index];
            if (el && navItemsRef.current) {
                const parent = navItemsRef.current;
                const center = el.offsetLeft - parent.clientWidth / 2 + el.offsetWidth / 2;
                parent.scrollTo({ left: Math.max(0, center), behavior: 'smooth' });
            }
        });
    }, []);

    return (
        <div
            className="mobile-category-navbar"
            onTouchStart={handleGlobalTouchStart}
            onTouchEnd={handleGlobalTouchEnd}
        >
            {error && (
                <ServerErrorPage 
                    title="Внутренняя ошибка сервера!"
                    message="Не удалось загрузить категории аниме.\nПожалуйста, попробуйте позже"
                    onRetry={() => window.location.reload()}
                />
            )}

            {loadingCategories ? (
                <div className="mobile-center-screen-loader" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '70vh' }}>
                    <div className="mobile-spinner"/>
                </div>
            ) : (
                <>
                    <div
                        className="mobile-category-navbar-items"
                        ref={navItemsRef}
                        onKeyDown={handleNavKeyDown}
                        role="tablist"
                        aria-label="Категории"
                        onTouchStart={handleGlobalTouchStart}
                        onTouchMove={handleGlobalTouchMove}
                        onTouchEnd={handleGlobalTouchEnd}
                    >
                        {categories.map((cat, index) => (
                            <div
                                key={cat.id}
                                ref={(el) => { categoryRefs.current[index] = el }}
                                className={`mobile-category-navbar-item ${
                                    selectedCategoryId === cat.id ? 'active' : ''
                                }`}
                                role="tab"
                                aria-selected={selectedCategoryId === cat.id}
                                tabIndex={0}
                                onClick={() => handleCategoryClick(cat.id, index)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        handleCategoryClick(cat.id, index);
                                    }
                                }}
                            >
                                {cat.name}
                            </div>
                        ))}

                        <div
                            className={`mobile-category-underline ${isSwiping ? 'swiping' : ''}`}
                            style={{
                                '--underline-x': `${underlineX}px`,
                                '--underline-width': `${underlineWidth}px`
                            } as React.CSSProperties}
                        />
                    </div>

                    {loadingAnime ? (
                        <div className="mobile-anime-loading-container">
                            <div className="mobile-category-center-loader">
                                <div className="mobile-category-spinner"/>
                                <span className="mobile-category-loading-text">Загрузка аниме...</span>
                            </div>
                        </div>
                    ) : (
                        <div className="root-navbar-mobile-anime-grid">
                            {animeList.length > 0 ? (
                                animeList.map((anime) => (
                                    <div
                                        key={anime.id}
                                        className={`collection-mobile-anime-card ${
                                            visibleAnime.has(anime.id.toString()) ? 'visible' : ''
                                        }`}
                                    >
                                        <GlobalAnimeCard 
                                            anime={anime} 
                                            showCollectionStatus={true}
                                            showRating={true}
                                            showType={false} 
                                            priority={false}
                                        />
                                    </div>
                                ))
                            ) : null}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default CategoryNavBar;
