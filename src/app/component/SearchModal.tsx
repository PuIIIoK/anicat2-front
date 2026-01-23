'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { API_SERVER } from '@/hosts/constants';
import '@/styles/components/search-fullscreen.scss';

interface AnimeInfo {
    id: number;
    title: string;
    alttitle: string;
    season: string;
    current_episode: string;
    episode_all: string;
    type: string;
    year: string;
    genres: string;
    imageUrl: string;
    description: string;
    status?: string;
    anons?: string;
    averageRating?: number;
    kodik?: string;
    updatedAt?: string;
    createdAt?: string;
    videoSourceType?: string;
}

interface ProfileInfo {
    id: number;
    username: string;
    nickname: string;
    bio: string;
    avatarId: string;
    bannerId: string;
    roles: string[];
}

interface RecentUpdate {
    animeId: number;
    animeTitle: string;
    timestamp: string;
    updateSource: string;
    newEpisodeCount: string;
}

interface SearchModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const GENRES = [
    'Боевик', 'Комедия', 'Романтика', 'Фэнтези', 'Драма',
    'Приключения', 'Сёнен', 'Повседневность', 'Школа', 'Магия',
    'Экшен', 'Детектив', 'Триллер', 'Ужасы', 'Спорт',
    'Музыка', 'Меха', 'Исекай', 'Гарем', 'Этти'
];

const ITEMS_PER_PAGE = 20;

const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
    const router = useRouter();
    const resultsRef = useRef<HTMLDivElement>(null);

    // Search state
    const [searchMode, setSearchMode] = useState<'anime' | 'profile'>('anime');
    const [searchQuery, setSearchQuery] = useState('');
    const [profileResults, setProfileResults] = useState<ProfileInfo[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [coverUrls, setCoverUrls] = useState<{ [animeId: number]: string }>({});
    const [avatarUrls, setAvatarUrls] = useState<{ [username: string]: string }>({});
    const [searchTimeoutId, setSearchTimeoutId] = useState<NodeJS.Timeout | null>(null);

    // All anime state (for browsing with filters)
    const [allAnime, setAllAnime] = useState<AnimeInfo[]>([]);
    const [recentAnimeIds, setRecentAnimeIds] = useState<number[]>([]);
    const [isLoadingAll, setIsLoadingAll] = useState(false);
    const [displayedCount, setDisplayedCount] = useState(ITEMS_PER_PAGE);
    const [hasLoadedAll, setHasLoadedAll] = useState(false);

    // Filter state
    const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
    const [minRating, setMinRating] = useState<number>(0);
    const [selectedSource, setSelectedSource] = useState<'all' | 'libria' | 'yumeko'>('all');

    // Load recent and all anime when modal opens
    useEffect(() => {
        if (isOpen && !hasLoadedAll && searchMode === 'anime') {
            loadAllAnime();
            loadRecentUpdates();
        }
    }, [isOpen, searchMode, hasLoadedAll]);

    // Reset displayed count when filters change
    useEffect(() => {
        setDisplayedCount(ITEMS_PER_PAGE);
    }, [selectedGenres, minRating, selectedSource, searchQuery]);

    // Load recent updates from API
    const loadRecentUpdates = async () => {
        try {
            const res = await fetch(`${API_SERVER}/api/anime/recent-updates?limit=12`);
            if (res.ok) {
                const data: RecentUpdate[] = await res.json();
                const ids = data.map(update => update.animeId);
                setRecentAnimeIds(ids);
            }
        } catch (error) {
            console.error('Failed to load recent updates:', error);
        }
    };

    // Load all anime
    const loadAllAnime = async () => {
        if (isLoadingAll) return;

        setIsLoadingAll(true);
        try {
            const res = await fetch(`${API_SERVER}/api/anime/get-anime`);
            if (res.ok) {
                const data = await res.json();
                const animeList: AnimeInfo[] = Array.isArray(data) ? data : (data.anime || []);
                setAllAnime(animeList);
                setHasLoadedAll(true);
            }
        } catch (error) {
            console.error('Failed to load anime:', error);
        } finally {
            setIsLoadingAll(false);
        }
    };

    // Populate covers from loaded anime list to avoid N+1 requests
    useEffect(() => {
        if (allAnime.length === 0) return;

        const newUrls: { [id: number]: string } = {};
        allAnime.forEach(anime => {
            if (anime.imageUrl && anime.imageUrl.trim() && !anime.imageUrl.includes('placeholder')) {
                let url = anime.imageUrl;
                if (url.startsWith('/')) {
                    url = `${API_SERVER}${url}`;
                }
                newUrls[anime.id] = url;
            }
        });

        setCoverUrls(prev => {
            // Only update if we have new urls to add to avoid unnecessary re-renders
            if (Object.keys(newUrls).length === 0) return prev;
            return { ...prev, ...newUrls };
        });
    }, [allAnime]);

    // Get recent anime based on IDs from update logs
    const getRecentAnime = useCallback((): AnimeInfo[] => {
        if (recentAnimeIds.length === 0) return [];

        // Map IDs to anime and preserve order
        const animeMap = new Map(allAnime.map(a => [a.id, a]));
        return recentAnimeIds
            .map(id => animeMap.get(id))
            .filter((a): a is AnimeInfo => a !== undefined)
            .slice(0, 12);
    }, [recentAnimeIds, allAnime]);

    // Intersection Observer for infinite scroll
    const loaderRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            const first = entries[0];
            if (first.isIntersecting && !isLoading) {
                setDisplayedCount(prev => prev + ITEMS_PER_PAGE);
            }
        }, {
            threshold: 0.1,
            rootMargin: '200px',
            root: resultsRef.current // Explicitly set the scroll container as root
        });

        const currentLoader = loaderRef.current;
        if (currentLoader) {
            observer.observe(currentLoader);
        }

        return () => {
            if (currentLoader) observer.unobserve(currentLoader);
            observer.disconnect();
        };
    }, [isLoading, displayedCount, resultsRef.current]); // Re-run if ref changes

    // Close on Escape
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    // Get anime to display (for covers) - all visible anime
    const getDisplayAnime = useCallback((): AnimeInfo[] => {
        return allAnime;
    }, [allAnime]);

    // Fetch covers for displayed anime
    useEffect(() => {
        const displayAnime = getDisplayAnime();
        if (displayAnime.length === 0) return;

        const fetchCovers = async () => {
            const newUrls: { [id: number]: string } = { ...coverUrls };
            const recentToFetch = recentAnime.filter(anime => !newUrls[anime.id]);
            const displayToFetch = displayAnime
                .slice(0, displayedCount + 20) // Fetch a bit more than displayed
                .filter(anime => !newUrls[anime.id]);

            // Combine and deduplicate
            const animeToFetch = [...recentToFetch];
            displayToFetch.forEach(anime => {
                if (!animeToFetch.some(a => a.id === anime.id)) {
                    animeToFetch.push(anime);
                }
            });

            if (animeToFetch.length === 0) return;

            await Promise.all(
                animeToFetch.map(async (anime) => {
                    try {
                        const response = await fetch(`${API_SERVER}/api/anime/optimized/get-anime/${anime.id}/basic`);
                        if (response.ok) {
                            const data = await response.json();
                            if (data.coverUrl && data.coverUrl.trim() && !data.coverUrl.includes('placeholder')) {
                                let url = data.coverUrl;
                                if (url.startsWith('/')) {
                                    url = `${API_SERVER}${url}`;
                                }
                                newUrls[anime.id] = url;
                            }
                        }
                    } catch { }
                })
            );
            setCoverUrls(newUrls);
        };

        fetchCovers();
    }, [getDisplayAnime, displayedCount]);

    // Fetch avatars
    useEffect(() => {
        const fetchAvatars = async () => {
            const urls: { [username: string]: string } = {};
            await Promise.all(
                profileResults.map(async (profile) => {
                    try {
                        const res = await fetch(`${API_SERVER}/api/anime/image-links?username=${encodeURIComponent(profile.username)}`);
                        const data = await res.json();
                        if (data.avatarUrl) urls[profile.username] = data.avatarUrl;
                    } catch { }
                })
            );
            setAvatarUrls(urls);
        };
        if (profileResults.length > 0) fetchAvatars();
    }, [profileResults]);

    // Apply filters - ALL client-side, no server requests
    const applyFilters = useCallback((results: AnimeInfo[]): AnimeInfo[] => {
        return results.filter(anime => {
            // Text search filter (if searchQuery exists, filter by title)
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase();
                const title = (anime.title || '').toLowerCase();
                const altTitle = (anime.alttitle || '').toLowerCase();
                if (!title.includes(query) && !altTitle.includes(query)) {
                    return false;
                }
            }

            // Genre filter - check if anime has at least one of the selected genres
            if (selectedGenres.length > 0) {
                const animeGenres = anime.genres?.toLowerCase() || '';
                const hasGenre = selectedGenres.some(genre =>
                    animeGenres.includes(genre.toLowerCase())
                );
                if (!hasGenre) return false;
            }

            // Rating filter
            if (minRating > 0 && (anime.averageRating || 0) < minRating) {
                return false;
            }

            // Source filter - kodik means external (libria), yumeko means own content
            if (selectedSource !== 'all') {
                const hasKodik = anime.kodik && anime.kodik.trim().length > 0;
                if (selectedSource === 'libria' && !hasKodik) return false;
                // For yumeko: check videoSourceType='yumeko' OR no kodik field
                if (selectedSource === 'yumeko') {
                    const isYumekoSource = anime.videoSourceType === 'yumeko' || !hasKodik;
                    if (!isYumekoSource) return false;
                }
            }

            return true;
        });
    }, [selectedGenres, minRating, selectedSource, searchQuery]);

    // Search function for profiles only
    const performProfileSearch = useCallback(async (query: string) => {
        if (!query.trim()) {
            setProfileResults([]);
            return;
        }

        setIsLoading(true);

        try {
            const res = await fetch(`${API_SERVER}/api/anime/search-profiles?query=${encodeURIComponent(query)}`);
            const data = await res.json();
            setProfileResults(data.profiles || []);
        } catch {
            setProfileResults([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Handle search input
    const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        setSearchQuery(query);

        if (searchTimeoutId) clearTimeout(searchTimeoutId);

        if (!query.trim()) {
            setProfileResults([]);
            return;
        }

        // For anime - client-side filtering only (no API call needed)
        if (searchMode === 'anime') {
            // Client-side filtering happens automatically via applyFilters
            return;
        }

        // For profiles - use API search with debounce
        const timeoutId = setTimeout(() => performProfileSearch(query), 500);
        setSearchTimeoutId(timeoutId);
    };

    // Toggle genre filter
    const toggleGenre = (genre: string) => {
        setSelectedGenres(prev =>
            prev.includes(genre)
                ? prev.filter(g => g !== genre)
                : [...prev, genre]
        );
    };

    // Handle anime click
    const handleAnimeClick = (id: number) => {
        onClose();
        router.push(`/anime-page/${id}`);
    };

    // Handle profile click
    const handleProfileClick = (username: string) => {
        onClose();
        router.push(`/profile/${username}`);
    };

    // Get filtered results - pure client-side filtering
    const getFilteredAnime = useCallback((): AnimeInfo[] => {
        return applyFilters(allAnime);
    }, [allAnime, applyFilters]);

    const filteredAnime = getFilteredAnime();
    const displayedAnime = filteredAnime.slice(0, displayedCount);
    const hasMoreAnime = displayedCount < filteredAnime.length;
    const recentAnime = getRecentAnime();

    // Check if any filter is active
    const hasActiveFilters = selectedGenres.length > 0 || minRating > 0 || selectedSource !== 'all' || searchQuery.trim() !== '';

    // Check if anime is upcoming
    const isUpcoming = (status?: string) =>
        ['UPCOMING', 'NOT_YET_AIRED', 'SOON', 'АНОНС', 'СКОРО'].includes(status?.toUpperCase() || '');

    if (!isOpen) return null;

    return (
        <div className="search-fullscreen">
            <div className="search-fullscreen__backdrop" onClick={onClose} />

            <div className="search-fullscreen__layout">
                {/* Left Sidebar - Filters */}
                {searchMode === 'anime' && (
                    <aside className="search-fullscreen__sidebar">
                        <div className="sidebar-header">
                            <h2 className="sidebar-title">Фильтры</h2>
                            {(selectedGenres.length > 0 || minRating > 0 || selectedSource !== 'all') && (
                                <button
                                    className="filter-clear-btn"
                                    onClick={() => {
                                        setSelectedGenres([]);
                                        setMinRating(0);
                                        setSelectedSource('all');
                                    }}
                                >
                                    Сбросить
                                </button>
                            )}
                        </div>

                        {/* Genres */}
                        <div className="filter-section">
                            <h4 className="filter-title">Жанры</h4>
                            <div className="filter-genres">
                                {GENRES.map(genre => (
                                    <button
                                        key={genre}
                                        className={`filter-genre ${selectedGenres.includes(genre) ? 'active' : ''}`}
                                        onClick={() => toggleGenre(genre)}
                                    >
                                        {genre}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Rating */}
                        <div className="filter-section">
                            <h4 className="filter-title">Минимальный рейтинг: {minRating > 0 ? minRating.toFixed(1) : 'Любой'}</h4>
                            <div className="filter-rating">
                                <input
                                    type="range"
                                    min="0"
                                    max="5"
                                    step="0.5"
                                    value={minRating}
                                    onChange={(e) => setMinRating(parseFloat(e.target.value))}
                                    className="rating-slider"
                                />
                                <div className="rating-marks">
                                    <span>0</span>
                                    <span>1</span>
                                    <span>2</span>
                                    <span>3</span>
                                    <span>4</span>
                                    <span>5</span>
                                </div>
                            </div>
                        </div>
                    </aside>
                )}

                {/* Main Content Area */}
                <main className="search-fullscreen__main">
                    {/* Header */}
                    <div className="search-fullscreen__header">
                        <div className="search-fullscreen__logo">
                            <span className="logo-gradient">Поиск</span>
                        </div>
                        <button className="search-fullscreen__close" onClick={onClose}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>

                    {/* Search Input Area */}
                    <div className="search-fullscreen__search-area">
                        <div className="search-fullscreen__input-wrapper">
                            <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="11" cy="11" r="8" />
                                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={handleSearchInput}
                                placeholder="Введите название аниме..."
                                className="search-fullscreen__input"
                                autoFocus
                            />
                            {searchQuery && (
                                <button
                                    className="search-fullscreen__clear"
                                    onClick={() => {
                                        setSearchQuery('');
                                        setProfileResults([]);
                                    }}
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        {/* Mode Toggle */}
                        <div className="search-fullscreen__tabs">
                            <button
                                className={`search-tab ${searchMode === 'anime' ? 'active' : ''}`}
                                onClick={() => {
                                    setSearchMode('anime');
                                    if (!hasLoadedAll) loadAllAnime();
                                }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="2" y="2" width="20" height="20" rx="2" />
                                    <path d="M10 8l6 4-6 4V8z" />
                                </svg>
                                Аниме
                            </button>
                            <button
                                className={`search-tab ${searchMode === 'profile' ? 'active' : ''}`}
                                onClick={() => {
                                    setSearchMode('profile');
                                    if (searchQuery) performProfileSearch(searchQuery);
                                }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                    <circle cx="12" cy="7" r="4" />
                                </svg>
                                Профили
                            </button>
                        </div>
                    </div>

                    {/* Results */}
                    <div className="search-fullscreen__results" ref={resultsRef}>
                        {isLoading || isLoadingAll ? (
                            <div className="search-loader">
                                <div className="search-loader__spinner"></div>
                                <p>{isLoadingAll ? 'Загрузка каталога...' : 'Поиск...'}</p>
                            </div>
                        ) : searchMode === 'anime' ? (
                            <>
                                {/* Recent Anime Section - only show when no filters active */}
                                {!hasActiveFilters && recentAnime.length > 0 && (
                                    <div className="search-section">
                                        <h3 className="search-section__title">
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <circle cx="12" cy="12" r="10" />
                                                <polyline points="12 6 12 12 16 14" />
                                            </svg>
                                            Недавно обновлённые
                                        </h3>
                                        <div className="search-results-grid search-results-grid--recent">
                                            {recentAnime.map(anime => (
                                                <Link
                                                    href={`/anime-page/${anime.id}`}
                                                    key={`recent-${anime.id}`}
                                                    className="anime-search-card anime-search-card--mini"
                                                    onClick={onClose}
                                                >
                                                    <div className="anime-search-card__cover">
                                                        {coverUrls[anime.id] ? (
                                                            <Image
                                                                src={coverUrls[anime.id]}
                                                                alt={anime.title}
                                                                fill
                                                                sizes="120px"
                                                                className="anime-search-card__image"
                                                            />
                                                        ) : (
                                                            <div className="anime-search-card__placeholder">
                                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                                    <rect x="3" y="3" width="18" height="18" rx="2" />
                                                                    <circle cx="8.5" cy="8.5" r="1.5" />
                                                                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                                                                </svg>
                                                            </div>
                                                        )}
                                                        {isUpcoming(anime.status) && (
                                                            <span className="anime-search-card__anons">АНОНС</span>
                                                        )}
                                                    </div>
                                                    <div className="anime-search-card__info">
                                                        <h3 className="anime-search-card__title">{anime.title}</h3>
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* All Anime Section */}
                                <div className="search-section">
                                    <h3 className="search-section__title">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="3" y="3" width="7" height="7" />
                                            <rect x="14" y="3" width="7" height="7" />
                                            <rect x="14" y="14" width="7" height="7" />
                                            <rect x="3" y="14" width="7" height="7" />
                                        </svg>
                                        {hasActiveFilters ? `Результаты (${filteredAnime.length})` : 'Весь каталог'}
                                    </h3>

                                    {displayedAnime.length > 0 ? (
                                        <>
                                            <div className="search-results-grid">
                                                {displayedAnime.map((anime, index) => (
                                                    <Link
                                                        href={`/anime-page/${anime.id}`}
                                                        key={`${anime.id}-${index}`}
                                                        className="anime-search-card"
                                                        onClick={onClose}
                                                    >
                                                        <div className="anime-search-card__cover">
                                                            {coverUrls[anime.id] ? (
                                                                <Image
                                                                    src={coverUrls[anime.id]}
                                                                    alt={anime.title}
                                                                    fill
                                                                    sizes="140px"
                                                                    className="anime-search-card__image"
                                                                />
                                                            ) : (
                                                                <div className="anime-search-card__placeholder">
                                                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                                        <rect x="3" y="3" width="18" height="18" rx="2" />
                                                                        <circle cx="8.5" cy="8.5" r="1.5" />
                                                                        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                                                                    </svg>
                                                                </div>
                                                            )}

                                                            <span className="anime-search-card__type">{anime.type}</span>

                                                            {anime.averageRating && anime.averageRating > 0 && (
                                                                <span className="anime-search-card__rating">
                                                                    ★ {anime.averageRating.toFixed(1)}
                                                                </span>
                                                            )}

                                                            {isUpcoming(anime.status) && (
                                                                <span className="anime-search-card__anons">АНОНС</span>
                                                            )}
                                                        </div>

                                                        <div className="anime-search-card__info">
                                                            <h3 className="anime-search-card__title">
                                                                {anime.title}
                                                                {anime.season && <span className="season-tag">[{anime.season}]</span>}
                                                            </h3>

                                                            <div className="anime-search-card__meta">
                                                                {isUpcoming(anime.status) ? (
                                                                    <span className="anons-date">{anime.anons || 'Скоро'}</span>
                                                                ) : (
                                                                    <span className="episodes">{anime.current_episode || '?'} / {anime.episode_all || '?'} эп.</span>
                                                                )}
                                                                {!isUpcoming(anime.status) && anime.year && (
                                                                    <span className="year">{anime.year}</span>
                                                                )}
                                                            </div>

                                                            <p className="anime-search-card__genres">{anime.genres?.split(',').slice(0, 3).join(' • ')}</p>
                                                        </div>
                                                    </Link>
                                                ))}
                                            </div>

                                            {hasMoreAnime && (
                                                <div className="search-load-more" ref={loaderRef}>
                                                    <div className="search-loader__spinner search-loader__spinner--small"></div>
                                                    <span>Загрузка...</span>
                                                </div>
                                            )}
                                        </>
                                    ) : hasActiveFilters ? (
                                        <div className="search-empty">
                                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.5">
                                                <circle cx="12" cy="12" r="10" />
                                                <line x1="15" y1="9" x2="9" y2="15" />
                                                <line x1="9" y1="9" x2="15" y2="15" />
                                            </svg>
                                            <p>Ничего не найдено</p>
                                            <span>Попробуйте изменить фильтры</span>
                                        </div>
                                    ) : null}
                                </div>
                            </>
                        ) : searchMode === 'profile' ? (
                            !searchQuery ? (
                                <div className="search-empty">
                                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.5">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                        <circle cx="12" cy="7" r="4" />
                                    </svg>
                                    <p>Поиск профилей</p>
                                    <span>Введите никнейм или имя пользователя</span>
                                </div>
                            ) : profileResults.length > 0 ? (
                                <div className="search-profiles-list">
                                    {profileResults.map(profile => (
                                        <div
                                            key={profile.id}
                                            className="profile-search-card"
                                            onClick={() => handleProfileClick(profile.username)}
                                        >
                                            <div className="profile-search-card__avatar">
                                                {avatarUrls[profile.username] ? (
                                                    <Image
                                                        src={avatarUrls[profile.username]}
                                                        alt={profile.nickname || profile.username}
                                                        width={48}
                                                        height={48}
                                                        className="profile-avatar-img"
                                                    />
                                                ) : (
                                                    <div className="profile-avatar-placeholder">
                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                                            <circle cx="12" cy="7" r="4" />
                                                        </svg>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="profile-search-card__info">
                                                <h4 className="profile-search-card__name">
                                                    {profile.nickname || profile.username}
                                                    <span className="username">@{profile.username}</span>
                                                </h4>
                                                {profile.bio && <p className="profile-search-card__bio">{profile.bio}</p>}
                                                {profile.roles && profile.roles.length > 0 && (
                                                    <div className="profile-search-card__roles">
                                                        {profile.roles
                                                            .filter(role => role !== 'USER')
                                                            .map(role => {
                                                                const roleLabel = role === 'ADMIN' ? 'Администратор'
                                                                    : role === 'MODERATOR' ? 'Модератор'
                                                                        : role === 'SUPER_ADMIN' ? 'Главный админ'
                                                                            : role;
                                                                return (
                                                                    <span key={role} className={`role-badge role-${role.toLowerCase()}`}>{roleLabel}</span>
                                                                );
                                                            })}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="search-empty">
                                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.5">
                                        <circle cx="12" cy="12" r="10" />
                                        <line x1="15" y1="9" x2="9" y2="15" />
                                        <line x1="9" y1="9" x2="15" y2="15" />
                                    </svg>
                                    <p>Профили не найдены</p>
                                    <span>Попробуйте изменить запрос</span>
                                </div>
                            )
                        ) : null}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default SearchModal;
