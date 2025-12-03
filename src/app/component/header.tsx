'use client';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import '@/styles/index.scss';
import { API_SERVER } from '@/hosts/constants';
import { getAuthToken } from '../utils/auth';
import { useTheme } from '../context/ThemeContext';
import { useSidebar } from '../context/SidebarContext';

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

const Header: React.FC = () => {
    const router = useRouter();
    const pathname = usePathname();
    const { loadUserThemeSettings } = useTheme();
    const { toggle: toggleSidebar } = useSidebar();

    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [username, setUsername] = useState<string>('');
    const [isSearchModalVisible, setSearchModalVisible] = useState(false);
    const [searchMode, setSearchMode] = useState<'anime' | 'profile'>('anime');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<AnimeInfo[]>([]);
    const [profileResults, setProfileResults] = useState<ProfileInfo[]>([]);
    const [avatarUrls, setAvatarUrls] = useState<{ [username: string]: string }>({});
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [, setUserRoles] = useState<string[]>([]);
    const [coverUrls, setCoverUrls] = useState<{ [animeId: number]: string }>({});
    const [, setUserAvatarUrl] = useState<string>('/profile.png');
    const [searchTimeoutId, setSearchTimeoutId] = useState<NodeJS.Timeout | null>(null);
    const [currentSearchQuery, setCurrentSearchQuery] = useState('');
    const [isWaitingForSearch, setIsWaitingForSearch] = useState(false);

    useEffect(() => {
        const checkAuth = async () => {
            const token = getAuthToken();
            if (!token) return setIsAuthenticated(false);

            try {
                const res = await fetch(`${API_SERVER}/api/auth/get-profile`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (res.ok) {
                    const data = await res.json();
                    setIsAuthenticated(true);
                    setUsername(data.username || '');
                    setUserRoles(data.roles || []);
                    
                        // Загружаем настройки темы пользователя
                    await loadUserThemeSettings();
                    
                    // Загружаем аватарку пользователя
                    const avatarRes = await fetch(`${API_SERVER}/api/anime/image-links?username=${encodeURIComponent(data.username)}`);
                    if (avatarRes.ok) {
                        const avatarData = await avatarRes.json();
                        if (avatarData.avatarUrl) {
                            setUserAvatarUrl(avatarData.avatarUrl);
                        }
                    }
                } else {
                    setIsAuthenticated(false);
                }
            } catch {
                setIsAuthenticated(false);
            }
        };

        checkAuth();
    }, []);

    // Cleanup поисковых таймеров при размонтировании
    useEffect(() => {
        return () => {
            if (searchTimeoutId) {
                clearTimeout(searchTimeoutId);
            }
        };
    }, [searchTimeoutId]);

    useEffect(() => {
        if (isSearchModalVisible) {
            document.body.style.overflow = 'hidden';
            document.body.classList.add('search-modal-open');
        } else {
            document.body.style.overflow = '';
            document.body.classList.remove('search-modal-open');
        }
        return () => {
            document.body.style.overflow = '';
            document.body.classList.remove('search-modal-open');
        };
    }, [isSearchModalVisible]);

    useEffect(() => {
        const fetchCovers = async () => {
            const urls: { [id: number]: string } = {};

            await Promise.all(
                searchResults.map(async (anime) => {
                    try {
                        const res = await fetch(`${API_SERVER}/api/stream/${anime.id}/cover`);
                        if (res.ok) {
                            const blob = await res.blob();
                            const url = URL.createObjectURL(blob);
                            urls[anime.id] = url;
                        }
                    } catch {}
                })
            );

            setCoverUrls(urls);
        };

        if (searchResults.length > 0) fetchCovers();
    }, [searchResults]);

    useEffect(() => {
        const fetchAvatars = async () => {
            const urls: { [username: string]: string } = {};
            await Promise.all(
                profileResults.map(async (profile) => {
                    try {
                        const res = await fetch(`${API_SERVER}/api/anime/image-links?username=${encodeURIComponent(profile.username)}`);
                        const data = await res.json();
                        if (data.avatarUrl) urls[profile.username] = data.avatarUrl;
                    } catch {}
                })
            );
            setAvatarUrls(urls);
        };

        if (profileResults.length > 0) fetchAvatars();
    }, [profileResults]);

    const performSearch = async (query: string, mode: 'anime' | 'profile') => {
        console.log('🚀 performSearch запущен:', { query, mode });
        
        if (!query.trim()) {
            console.log('❌ Пустой запрос, отменяем');
            return;
        }

        setIsWaitingForSearch(false); // Сбрасываем состояние ожидания
        setIsLoading(true);
        setErrorMessage('');

        try {
            if (mode === 'anime') {
                console.log('🎬 Ищем аниме:', query);
                const res = await fetch(`${API_SERVER}/api/anime/search?query=${encodeURIComponent(query)}`);
                console.log('📡 Ответ сервера аниме:', res.status);
                const data = await res.json();
                console.log('📄 Данные аниме:', data);
                
                const results = data.anime || data || [];
                console.log('✅ Устанавливаем результаты аниме:', results.length, 'найдено');
                setSearchResults(results);
                setProfileResults([]);
                
                if (results.length === 0) {
                    setErrorMessage('Аниме не найдено');
                }
            } else {
                console.log('👥 Ищем профили:', query);
                const res = await fetch(`${API_SERVER}/api/anime/search-profiles?query=${encodeURIComponent(query)}`);
                console.log('📡 Ответ сервера профили:', res.status);
                const data = await res.json();
                console.log('📄 Данные профили:', data);
                
                const results = data.profiles || [];
                console.log('✅ Устанавливаем результаты профили:', results.length, 'найдено');
                setProfileResults(results);
                setSearchResults([]);
                
                if (results.length === 0) {
                    setErrorMessage('Профили не найдены');
                }
            }
        } catch (error) {
            console.error('💥 Ошибка поиска:', error);
            setErrorMessage('Ошибка при поиске');
            setSearchResults([]);
            setProfileResults([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearchInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const query = event.target.value;
        setSearchQuery(query);
        setCurrentSearchQuery(query);

        console.log('🔍 Ввод поиска:', query, 'режим:', searchMode);

        // Отменяем предыдущий таймер поиска
        if (searchTimeoutId) {
            clearTimeout(searchTimeoutId);
            console.log('🚫 Отменили предыдущий таймер');
        }

        if (!query.trim()) {
            setSearchResults([]);
            setProfileResults([]);
            setErrorMessage('');
            setIsLoading(false);
            setIsWaitingForSearch(false);
            console.log('🔄 Очистили результаты поиска');
            return;
        }

        // Устанавливаем состояние ожидания поиска
        setIsWaitingForSearch(true);
        setSearchResults([]);
        setProfileResults([]);
        setErrorMessage('');

        // Устанавливаем задержку для debounce (1 секунда)
        console.log('⏰ Устанавливаем таймер на 1 секунду...');
        const timeoutId = setTimeout(() => {
            console.log('⏱️ ТАЙМЕР СРАБОТАЛ! Выполняем поиск для:', query);
            performSearch(query.trim(), searchMode);
        }, 1000);
        
        setSearchTimeoutId(timeoutId);
        console.log('✅ Таймер установлен:', timeoutId);
    };

    const openSearchModal = () => setSearchModalVisible(true);
    const closeSearchModal = () => {
        // Отменяем активный поиск при закрытии модального окна
        if (searchTimeoutId) {
            clearTimeout(searchTimeoutId);
            setSearchTimeoutId(null);
        }
        
        setSearchModalVisible(false);
        setSearchQuery('');
        setCurrentSearchQuery('');
        setSearchResults([]);
        setProfileResults([]);
        setErrorMessage('');
        setIsLoading(false);
        setIsWaitingForSearch(false);
    };

    const handleAnimeClick = (id: number) => {
        closeSearchModal();
        router.push(`/anime-page/${id}`);
    };

    const handleProfileClick = (username: string) => {
        closeSearchModal();
        router.push(`/profile/${username}`);
    };

    return (
        <>
                <header className="header yumeko-header">
                    <div className="header-content">
                        {/* Left: Logo */}
                        <div className="header-left">
                            <Link href="/" className="header-logo-text">
                                <span className="logo-yumeko">Yumeko</span>
                                <span className="logo-animelib">AnimeLib</span>
                            </Link>
                            
                            {/* Navigation Links - Desktop */}
                            <nav className="header-nav desktop-only">
                                <Link href="/" className={`nav-link ${pathname === '/' ? 'active' : ''}`}>Главная</Link>
                                <Link href="/leaderboard" className={`nav-link ${pathname === '/leaderboard' ? 'active' : ''}`}>Рейтинг</Link>
                                {isAuthenticated && (
                                    <>
                                        <Link href={`/profile/${username}`} className={`nav-link ${pathname?.startsWith('/profile/') && !pathname?.includes('/collection') && !pathname?.includes('/settings') ? 'active' : ''}`}>Мой профиль</Link>
                                        <Link href="/profile/collection" className={`nav-link ${pathname === '/profile/collection' ? 'active' : ''}`}>Мои коллекции</Link>
                                    </>
                                )}
                            </nav>
                        </div>

                        {/* Center: Search */}
                        <div className="header-center">
                            <div className="search-bar-anime" onClick={openSearchModal}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="11" cy="11" r="8"/>
                                    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                                </svg>
                                <span className="search-placeholder">Поиск аниме...</span>
                            </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="header-right">
                            {/* Menu Toggle Button - Opens Right Sidebar */}
                            <button 
                                className="header-menu-btn"
                                onClick={toggleSidebar}
                                title="Меню"
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <line x1="3" y1="6" x2="21" y2="6"/>
                                    <line x1="3" y1="12" x2="21" y2="12"/>
                                    <line x1="3" y1="18" x2="21" y2="18"/>
                                </svg>
                            </button>
                        </div>
                    </div>

                </header>

                {isSearchModalVisible && (
                    <div className="search-modal-overlay">
                        <div className="search-modal">
                            <div className="search-modal-content">
                                <button className="close-button" onClick={closeSearchModal}>✖</button>

                                <div className="search-mode-toggle">
                                    <button className={searchMode === 'anime' ? 'active' : ''} onClick={() => {
                                        setSearchMode('anime');
                                        if (currentSearchQuery) {
                                            if (searchTimeoutId) clearTimeout(searchTimeoutId);
                                            setIsWaitingForSearch(true);
                                            setSearchResults([]);
                                            setProfileResults([]);
                                            setErrorMessage('');
                                            const timeoutId = setTimeout(() => performSearch(currentSearchQuery, 'anime'), 1000);
                                            setSearchTimeoutId(timeoutId);
                                        }
                                    }}>Аниме</button>
                                    <button className={searchMode === 'profile' ? 'active' : ''} onClick={() => {
                                        setSearchMode('profile');
                                        if (currentSearchQuery) {
                                            if (searchTimeoutId) clearTimeout(searchTimeoutId);
                                            setIsWaitingForSearch(true);
                                            setSearchResults([]);
                                            setProfileResults([]);
                                            setErrorMessage('');
                                            const timeoutId = setTimeout(() => performSearch(currentSearchQuery, 'profile'), 1000);
                                            setSearchTimeoutId(timeoutId);
                                        }
                                    }}>Профили</button>
                                </div>

                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={handleSearchInputChange}
                                    placeholder=" Введите запрос..."
                                    className="search-modal-input"
                                />

                                <div className="search-results">
                                    {!searchQuery ? (
                                        <p className="loading-text">Введите поисковый запрос</p>
                                    ) : isWaitingForSearch ? (
                                        null
                                    ) : isLoading ? (
                                        <div className="loader-wrapper">
                                            <div className="loader-modal-input"></div>
                                        </div>
                                    ) : searchMode === 'anime' && searchResults.length > 0 ? (
                                        searchResults.map(anime => (
                                            <div key={anime.id} className="anime-card-search" onClick={() => handleAnimeClick(anime.id)}>
                                                {coverUrls[anime.id] && (
                                                    <Image className="anime-card-search-img" src={coverUrls[anime.id]} alt={anime.title} width={75} height={110} />
                                                )}
                                                <div className="anime-card-info-search">
                                                    <h3 className="anime-title-search">{anime.title}{anime.season ? ` [${anime.season}]` : ''}<span className="anime-episodes-search">{anime.current_episode} из {anime.episode_all}</span></h3>
                                                    <p className="anime-meta-search">{anime.type} • {anime.year} • {anime.genres.split(',').join(' • ')}</p>
                                                    <p className="anime-description-search">{anime.description}</p>
                                                </div>
                                            </div>
                                        ))
                                    ) : searchMode === 'profile' && profileResults.length > 0 ? (
                                        <>
                                            <h3 className="search-section-title">Профили</h3>
                                            {profileResults.map(profile => (
                                                <div key={`profile-${profile.id}`} className="profile-search-card" onClick={() => handleProfileClick(profile.username)}>
                                                    {avatarUrls[profile.username] && (
                                                        <Image
                                                            className="profile-avatar"
                                                            src={avatarUrls[profile.username]}
                                                            alt={profile.nickname || 'Аватар'}
                                                            width={50}
                                                            height={50}
                                                            unoptimized
                                                        />
                                                    )}
                                                    <div className="profile-info">
                                                        <h4>{profile.nickname} <span className="username">@{profile.username}</span></h4>
                                                        <p className="profile-bio">{profile.bio}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </>
                                    ) : errorMessage ? (
                                        <p className="loading-text">{errorMessage}</p>
                                    ) : (
                                        <p className="loading-text">Ничего не найдено</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
        </>
    );
};

export default Header;
