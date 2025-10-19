'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { tabMap, AnimeCollectionItem } from './useCollections';
import { API_SERVER } from '../../../tools/constants';
import GlobalAnimeCard from '../anime-structure/GlobalAnimeCard';
import type { AnimeBasicInfo } from '../anime-structure/anime-basic-info';

type CollectionsCacheEntry = { items: AnimeCollectionItem[]; lastUpdated: number; fullyLoaded: boolean };
type MobileCollectionsCache = Map<string, CollectionsCacheEntry>;

declare global {
	// eslint-disable-next-line no-var
	var __mobileCollectionsCache: MobileCollectionsCache | undefined;
	// eslint-disable-next-line no-var
	var __lastSelectedMobileCollectionTab: string | null | undefined;
}

// Кэш на время жизни вкладки
const MOBILE_CACHE_TTL_MS = 30 * 60 * 1000;

const CollectionsMobile: React.FC = () => {
    // Конвертируем данные в формат AnimeBasicInfo для GlobalAnimeCard
    const convertToAnimeBasicInfo = (item: AnimeCollectionItem): AnimeBasicInfo => ({
        id: item.anime.id,
        title: item.anime.title,
        alttitle: item.anime.alttitle || '',
        status: item.anime.status || 'unknown', // Используем реальный статус аниме, а не тип коллекции
        type: item.anime.type || 'TV',
        episode_all: item.anime.episode_all || '',
        current_episode: item.anime.current_episode || '',
        rating: '0',
        year: item.anime.year || '',
        season: item.anime.season || '',
        mouth_season: item.anime.mouth_season || '',
        studio: item.anime.studio || '',
        genres: item.anime.genres || '',
        alias: item.anime.alias || '',
        realesed_for: item.anime.realesed_for || '',
        opened: item.anime.opened ?? true,
        anons: item.anime.anons || '',
        coverId: null,
        bannerId: null,
        hasScreenshots: false,
        // Используем оптимизированный API endpoint для загрузки обложек
        coverUrl: ''  // GlobalAnimeCard сам загрузит обложку через оптимизированный endpoint
    });
    
    // Кэш коллекций
    if (!globalThis.__mobileCollectionsCache) {
        globalThis.__mobileCollectionsCache = new Map<string, CollectionsCacheEntry>();
    }
    
    // Запоминаем последнюю выбранную вкладку
    if (typeof globalThis.__lastSelectedMobileCollectionTab === 'undefined') {
        globalThis.__lastSelectedMobileCollectionTab = 'Просмотрено';
    }

    const collectionsCache: MobileCollectionsCache = globalThis.__mobileCollectionsCache!;
    const lastSelectedRef = useMemo(() => ({
        get value() { return (globalThis.__lastSelectedMobileCollectionTab ?? 'Просмотрено') as string; },
        set value(v: string) { globalThis.__lastSelectedMobileCollectionTab = v; }
    }), []);

    const tabs = Object.keys(tabMap);
    const [selectedTab, setSelectedTab] = useState<string>(lastSelectedRef.value);
    const [collections, setCollections] = useState<AnimeCollectionItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [visibleAnime, setVisibleAnime] = useState<Set<string>>(new Set());
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

    // UI refs for underline & scrolling
    const tabRefs = useRef<(HTMLDivElement | null)[]>([]);
    const navItemsRef = useRef<HTMLDivElement | null>(null);
    const [underlineX, setUnderlineX] = useState(0);
    const [underlineWidth, setUnderlineWidth] = useState(0);
    const [isSwiping, setIsSwiping] = useState(false);

    // touch tracking
    const [touchStartX, setTouchStartX] = useState<number | null>(null);
    const [touchStartY, setTouchStartY] = useState<number | null>(null);

    // mounted + fetch controller refs
    const mountedRef = useRef(true);
    const collectionsFetchControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    // Отслеживание состояния модалки поиска (класс на body + резервные проверки)
    useEffect(() => {
        const checkSearchModalState = () => {
            const byClass = document.body.classList.contains('search-modal-open');
            const byOverflow = (document.body.style.overflow || '').includes('hidden');
            const byOverlay = !!document.querySelector('.search-modal-overlay');
            const open = byClass || byOverflow || byOverlay;
            setIsSearchModalOpen(open);
        };

        checkSearchModalState();

        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    checkSearchModalState();
                }
            }
        });
        observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

        // Резервный таймер на случай нестандартного поведения
        const intervalId = window.setInterval(checkSearchModalState, 300);

        return () => {
            observer.disconnect();
            window.clearInterval(intervalId);
        };
    }, []);

    // Update underline position when selectedTab changes
    const measureUnderline = useCallback(() => {
        if (!navItemsRef.current) return;
        const activeIndex = tabs.findIndex(tab => tab === selectedTab);
        if (activeIndex >= 0 && tabRefs.current[activeIndex]) {
            const el = tabRefs.current[activeIndex];
            const parent = navItemsRef.current;
            const rect = el.getBoundingClientRect();
            const parentRect = parent.getBoundingClientRect();
            
            setUnderlineX(rect.left - parentRect.left + parent.scrollLeft);
            setUnderlineWidth(rect.width);
            
            // Bring into view
            const center = el.offsetLeft - parent.clientWidth / 2 + el.offsetWidth / 2;
            parent.scrollTo({ left: Math.max(0, center), behavior: 'smooth' });
        }
        setIsSwiping(false);
    }, [selectedTab, tabs]);

    useEffect(() => {
        measureUnderline();
        window.addEventListener('resize', measureUnderline);
        return () => window.removeEventListener('resize', measureUnderline);
    }, [measureUnderline]);

    // Touch handlers for swipe gestures
    const handleGlobalTouchStart = useCallback((e: React.TouchEvent) => {
        setTouchStartX(e.touches[0].clientX);
        setTouchStartY(e.touches[0].clientY);
        setIsSwiping(false);
    }, []);

    const handleGlobalTouchMove = useCallback((e: React.TouchEvent) => {
        if (touchStartX === null || touchStartY === null) return;
        
        const deltaX = Math.abs(e.touches[0].clientX - touchStartX);
        const deltaY = Math.abs(e.touches[0].clientY - touchStartY);
        
        if (deltaX > deltaY && deltaX > 10) {
            setIsSwiping(true);
        }
    }, [touchStartX, touchStartY]);

    const handleGlobalTouchEnd = useCallback((e: React.TouchEvent) => {
        if (touchStartX === null || touchStartY === null) {
            setTouchStartX(null);
            setTouchStartY(null);
            setIsSwiping(false);
            return;
        }

        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;

        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;

        // Swipe thresholds: horizontal swipe at least 50px and not too vertical
        if (Math.abs(deltaX) >= 50 && Math.abs(deltaY) < 60) {
            const currentIdx = tabs.findIndex(tab => tab === selectedTab);
            if (deltaX < 0 && currentIdx < tabs.length - 1) {
                // Swipe left - next tab
                setSelectedTab(tabs[currentIdx + 1]);
            } else if (deltaX > 0 && currentIdx > 0) {
                // Swipe right - previous tab
                setSelectedTab(tabs[currentIdx - 1]);
            }
        }

        setTouchStartX(null);
        setTouchStartY(null);
        setTimeout(() => setIsSwiping(false), 150);
    }, [touchStartX, touchStartY, selectedTab, tabs]);

    // Fetch collections for tab (последовательная загрузка с кэшем + TTL)
    useEffect(() => {
        if (!selectedTab) {
            setCollections([]);
            setVisibleAnime(new Set());
            return;
        }

        // clear old controller and create new
        if (collectionsFetchControllerRef.current) {
            collectionsFetchControllerRef.current.abort();
        }
        const controller = new AbortController();
        collectionsFetchControllerRef.current = controller;

        const collectionType = tabMap[selectedTab];
        if (!collectionType) {
            setCollections([]);
            setVisibleAnime(new Set());
            return;
        }

        const fetchCollections = async (type: string, signal: AbortSignal) => {
            lastSelectedRef.value = selectedTab;

            // пробуем кэш
            const cached = collectionsCache.get(type);
            const isFresh = cached && (Date.now() - cached.lastUpdated < MOBILE_CACHE_TTL_MS) && cached.items.length > 0;
            if (cached && cached.items.length > 0) {
                if (!mountedRef.current) return;
                setCollections(cached.items);
                setVisibleAnime(new Set(cached.items.map(item => item.collectionId.toString())));
                setLoading(false);
                if (isFresh && cached.fullyLoaded) {
                    return; // свежий кэш — не обновляем
                }
                // устаревший кэш — обновляем в фоне без спинера
            } else {
                setLoading(true);
                setCollections([]);
                setVisibleAnime(new Set());
            }
            
            try {
                const res = await fetch(`${API_SERVER}/api/collection/my?type=${type}`, {
                    headers: {
                        Authorization: `Bearer ${document.cookie.replace(/(?:(?:^|.*;\s*)token\s*=\s*([^;]*).*$)|^.*$/, "$1")}`,
                    },
                    signal,
                });
                
                if (!res.ok) throw new Error(`Ошибка ${res.status}`);
                const data: AnimeCollectionItem[] = await res.json();
                
                if (!mountedRef.current) return;
                
                // Последовательная загрузка для плавного появления
                const loadedItems: AnimeCollectionItem[] = [];
                for (let i = 0; i < data.length; i++) {
                    if (signal.aborted) break;
                    
                    // защита от дублей в потоке
                    if (!loadedItems.some(item => item.collectionId === data[i].collectionId)) {
                        loadedItems.push(data[i]);
                    }
                    
                    const next = [...(cached?.items || []), ...loadedItems].reduce((acc: AnimeCollectionItem[], cur: AnimeCollectionItem) => {
                        if (!acc.some(item => item.collectionId === cur.collectionId)) acc.push(cur);
                        return acc;
                    }, []);
                    
                    setCollections(next);
                    collectionsCache.set(type, { items: next, lastUpdated: Date.now(), fullyLoaded: false });
                    
                    // Показываем карточку с задержкой для анимации
                    setTimeout(() => {
                        if (mountedRef.current && !signal.aborted) {
                            setVisibleAnime(prev => new Set([...prev, data[i].collectionId.toString()]));
                        }
                    }, i * 150); // 150ms задержка между появлением карточек
                }
            } catch (e) {
                if (e instanceof Error && e.name === 'AbortError') {
                    // aborted - ignore
                } else {
                    console.error(e);
                    setError('Ошибка загрузки коллекций');
                }
                if (mountedRef.current) setCollections([]);
            } finally {
                if (mountedRef.current) {
                    setLoading(false);
                    const current = collectionsCache.get(collectionType);
                    collectionsCache.set(collectionType, {
                        items: current?.items || [],
                        lastUpdated: Date.now(),
                        fullyLoaded: true,
                    });
                }
            }
        };

        fetchCollections(collectionType, controller.signal);

        return () => {
            controller.abort();
        };
    }, [selectedTab, MOBILE_CACHE_TTL_MS, collectionsCache, lastSelectedRef]);

    const handleTabClick = (tab: string, index: number) => {
        setSelectedTab(tab);
        // bring into view + measure called by effect
        const el = tabRefs.current[index];
        if (el && navItemsRef.current) {
            const parent = navItemsRef.current;
            const center = el.offsetLeft - parent.clientWidth / 2 + el.offsetWidth / 2;
            parent.scrollTo({ left: Math.max(0, center), behavior: 'smooth' });
        }
    };

    return (
        <div
            className="category-collection-mobile-root"
            onTouchStart={handleGlobalTouchStart}
            onTouchMove={handleGlobalTouchMove}
            onTouchEnd={handleGlobalTouchEnd}
        >
            {error && <div className="category-collection-mobile-error-message">{error}</div>}

            {!isSearchModalOpen && (
                <div
                    className="category-collection-mobile-navbar-items"
                    ref={navItemsRef}
                    role="tablist"
                    aria-label="Коллекции"
                    onTouchStart={handleGlobalTouchStart}
                    onTouchMove={handleGlobalTouchMove}
                    onTouchEnd={handleGlobalTouchEnd}
                >
                    {tabs.map((tab, index) => (
                        <div
                            key={tab}
                            ref={(el) => { tabRefs.current[index] = el }}
                            className={`category-collection-mobile-navbar-item ${
                                selectedTab === tab ? 'active' : ''
                            }`}
                            role="tab"
                            aria-selected={selectedTab === tab}
                            tabIndex={0}
                            onClick={() => handleTabClick(tab, index)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    handleTabClick(tab, index);
                                }
                            }}
                        >
                            {tab}
                        </div>
                    ))}

                    <div
                        className={`category-collection-mobile-underline ${isSwiping ? 'swiping' : ''}`}
                        style={{
                            '--underline-x': `${underlineX}px`,
                            '--underline-width': `${underlineWidth}px`
                        } as React.CSSProperties}
                    />
                </div>
            )}

            <div className="collection-mobile-anime-grid">
                {loading ? (
                    <div className="category-collection-mobile-center-screen-loader" style={{ gridColumn: '1 / -1' }}>
                        <div className="category-collection-mobile-spinner"/>
                    </div>
                ) : collections.length > 0 ? (
                    collections.map((item) => (
                        <div
                            key={item.collectionId}
                            className={`collection-mobile-anime-card ${visibleAnime.has(item.collectionId.toString()) ? 'visible' : ''}`}
                        >
                            <GlobalAnimeCard
                                anime={convertToAnimeBasicInfo(item)}
                                collectionType={item.collectionType}
                                showCollectionStatus={true}
                                showRating={true}
                                showType={false}
                                priority={false}
                            />
                        </div>
                    ))
                ) : (
                    <div className="category-collection-mobile-empty">
                        Вы еще не добавили аниме в эту коллекцию
                    </div>
                )}
            </div>
        </div>
    );
};

export default CollectionsMobile;


