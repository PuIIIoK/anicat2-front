'use client';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import '@/styles/index.scss';
import { API_SERVER, AUTH_SITE_URL } from '@/hosts/constants';
import { performLogout } from '../utils/logoutUtils';
import ThemeModal from './ThemeModal';
import { useTheme } from '../context/ThemeContext';

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
    const { resetToDefaultTheme, loadUserThemeSettings } = useTheme();

    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isSearchModalVisible, setSearchModalVisible] = useState(false);
    const [searchMode, setSearchMode] = useState<'anime' | 'profile'>('anime');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<AnimeInfo[]>([]);
    const [profileResults, setProfileResults] = useState<ProfileInfo[]>([]);
    const [avatarUrls, setAvatarUrls] = useState<{ [username: string]: string }>({});
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [userRoles, setUserRoles] = useState<string[]>([]);
    const [coverUrls, setCoverUrls] = useState<{ [animeId: number]: string }>({});
    const [userAvatarUrl, setUserAvatarUrl] = useState<string>('/profile.png');
    const [searchTimeoutId, setSearchTimeoutId] = useState<NodeJS.Timeout | null>(null);
    const [currentSearchQuery, setCurrentSearchQuery] = useState('');
    const [isWaitingForSearch, setIsWaitingForSearch] = useState(false);

    const getCookieToken = () => {
        // Сначала проверяем yumeko_auth_token
        let match = document.cookie.match(/yumeko_auth_token=([^;]+)/);
        if (match) return match[1];
        
        // Fallback на старый token
        match = document.cookie.match(/token=([^;]+)/);
        return match ? match[1] : '';
    };

    useEffect(() => {
        const checkAuth = async () => {
            const token = getCookieToken();
            if (!token) return setIsAuthenticated(false);

            try {
                const res = await fetch(`${API_SERVER}/api/auth/get-profile`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (res.ok) {
                    const data = await res.json();
                    setIsAuthenticated(true);
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

    // Mobile apps modal state
    const [isMobileAppsModalVisible, setMobileAppsModalVisible] = useState(false);
    
    // Theme modal state
    const [isThemeModalVisible, setThemeModalVisible] = useState(false);

    const openMobileAppsModal = () => {
        if (typeof window !== 'undefined' && window.innerWidth <= 768) {
            setMobileAppsModalVisible(true);
        }
    };
    const closeMobileAppsModal = () => setMobileAppsModalVisible(false);
    
    const openThemeModal = () => setThemeModalVisible(true);
    const closeThemeModal = () => setThemeModalVisible(false);

    useEffect(() => {
        const anyModalOpen = isSearchModalVisible || isMobileAppsModalVisible || isThemeModalVisible;
        if (anyModalOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        if (isSearchModalVisible) {
            document.body.classList.add('search-modal-open');
        } else {
            document.body.classList.remove('search-modal-open');
        }
        return () => {
            document.body.style.overflow = '';
            document.body.classList.remove('search-modal-open');
        };
    }, [isSearchModalVisible, isMobileAppsModalVisible, isThemeModalVisible]);

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

    const handleLogout = () => {
        performLogout(setIsAuthenticated, setUserAvatarUrl, resetToDefaultTheme);
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
                <header className="header">
                    <div className="header-content">
                        <div className="header-left">
                        <div className="logo">
                            <div className="logo-left">
                                <Image 
                                    src="/yumeko_logo_index.png" 
                                    alt="Yumeko Logo" 
                                    className="logo-img" 
                                    width={150} 
                                    height={80}
                                    unoptimized
                                />
                                <div className="logo-dropdown">
                                    <ul>
                                        <li><Link href="/">Главная</Link></li>
                                        <li><Link href="/leaderboard">Лидеборд</Link></li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div className="our-apps">
                            <span className="our-apps-title" onClick={openMobileAppsModal}>Наши приложения</span>
                            <div className="apps-dropdown">
                                <ul>
                                    <li><Link href="/android">Android</Link></li>
                                    <li><Link href="/iphone">iPhone</Link></li>
                                    <li><Link href="/pc">PC</Link></li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="header-right">
                        <div className="search-bar-anime" onClick={openSearchModal}>
                            <span className="search-placeholder">Поиск аниме/Профилей...</span>
                        </div>

                        <button className="theme-button" onClick={openThemeModal} title="Сменить тему">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 18C15.31 18 18 15.31 18 12C18 8.69 15.31 6 12 6C8.69 6 6 8.69 6 12C6 15.31 8.69 18 12 18Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M12 1V3M12 21V23M4.22 4.22L5.64 5.64M18.36 18.36L19.78 19.78M1 12H3M21 12H23M4.22 19.78L5.64 18.36M18.36 5.64L19.78 4.22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </button>

                        <div className="profile">
                            <Image 
                                src={userAvatarUrl} 
                                alt="Профиль" 
                                width={42} 
                                height={42} 
                                className="profile-icon"
                                onError={() => setUserAvatarUrl('/profile.png')}
                                unoptimized
                            />
                            <div className="profile-dropdown">
                                <ul>
                                    {isAuthenticated ? (
                                        <>
                                            <li><Link href="/profile">Мой профиль</Link></li>
                                            <li><Link href="/profile/collection">Коллекции</Link></li>
                                            <li><Link href="/profile/settings">Настройки</Link></li>
                                            <li><button onClick={() => {
                                                const currentUrl = window.location.origin;
                                                const token = getCookieToken();
                                                
                                                // Передаем токен через URL (будет удален сразу после чтения)
                                                const authUrl = new URL(AUTH_SITE_URL);
                                                authUrl.searchParams.set('redirect_url', currentUrl);
                                                authUrl.searchParams.set('mode', 'switch');
                                                if (token) {
                                                    authUrl.searchParams.set('ct', btoa(token)); // Кодируем в base64
                                                }
                                                
                                                window.location.href = authUrl.toString();
                                            }}>Сменить аккаунт</button></li>
                                            <li><button onClick={handleLogout}>Выйти</button></li>
                                            {['MODERATOR', 'ADMIN', 'SUPER_ADMIN'].some(role => userRoles.includes(role)) && (
                                                <li><Link href="/admin_panel">Админ панель</Link></li>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <li><button onClick={() => {
                                                const currentUrl = window.location.origin;
                                                window.location.href = `${AUTH_SITE_URL}?redirect_url=${encodeURIComponent(currentUrl)}`;
                                            }}>Авторизация</button></li>
                                        </>
                                    )}
                                </ul>
                            </div>
                        </div>
                    </div>

                    {isSearchModalVisible && (
                        <div className="search-modal-overlay">
                            <div className="search-modal">
                                <div className="search-modal-content">
                                    <button className="close-button" onClick={closeSearchModal}>✖</button>

                                    <div className="search-mode-toggle">
                                        <button className={searchMode === 'anime' ? 'active' : ''} onClick={() => {
                                            setSearchMode('anime');
                                            // Перезапускаем поиск если есть запрос
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
                                            // Перезапускаем поиск если есть запрос
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
                                            // Пустое состояние пока ждем начала поиска
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

                    {isMobileAppsModalVisible && (
                        <div className="mobile-apps-modal-overlay" onClick={closeMobileAppsModal}>
                            <div className="mobile-apps-modal" onClick={(e) => e.stopPropagation()}>
                                <div className="mobile-apps-title">Выберите платформу</div>
                                <div className="mobile-apps-options">
                                    <button className="mobile-app-option" onClick={() => { closeMobileAppsModal(); router.push('/android'); }}>
                                        <span className="mobile-app-icon" aria-hidden>
                                            {/* Android SVG */}
                                            <svg width="28" height="28" viewBox="0 0 24 24" fill="#3DDC84" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M8 4.5l-1-1 .7-.7 1 1L8 4.5zm9-1l-1 1-.7-.7 1-1 .7.7zM7.5 9h9a1.5 1.5 0 011.5 1.5V17a2 2 0 01-2 2v1.5a1.5 1.5 0 11-3 0V19H10v1.5a1.5 1.5 0 11-3 0V19a2 2 0 01-2-2v-6.5A1.5 1.5 0 017.5 9zm1.75-3A.75.75 0 009.25 7 .75.75 0 1010 6.25zM14 6.25A.75.75 0 1114.75 7 .75.75 0 0114 6.25z"/>
                                            </svg>
                                        </span>
                                        <span className="mobile-app-name">Android</span>
                                        <span className="mobile-app-description">APK загрузка</span>
                                    </button>
                                    <button className="mobile-app-option" onClick={() => { closeMobileAppsModal(); router.push('/iphone'); }}>
                                        <span className="mobile-app-icon" aria-hidden>
                                            {/* Apple SVG */}
                                            <svg width="28" height="28" viewBox="0 0 24 24" fill="#ffffff" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M16.36 1.64A4.38 4.38 0 0013.4 3.3c-.38.56-.68 1.26-.56 2a4.4 4.4 0 002.95-1.66c.38-.56.68-1.26.57-2zM21 17.27c-.35.8-.76 1.54-1.24 2.22-.66.94-1.2 1.6-1.63 2-.63.58-1.31.88-2.05.91-.52.01-1.15-.15-1.9-.47-.76-.32-1.45-.48-2.07-.48-.65 0-1.36.16-2.12.48-.76.32-1.38.49-1.86.5-.72.03-1.42-.28-2.08-.94-.45-.41-1.01-1.09-1.68-2.03-.72-1-1.31-2.16-1.78-3.48-.5-1.4-.75-2.75-.75-4.04 0-1.5.33-2.8.99-3.9A5.6 5.6 0 015.9 6.2c.9-.63 1.86-.96 2.88-.98.57 0 1.32.19 2.22.57.9.38 1.48.57 1.74.57.2 0 .83-.2 1.9-.6.98-.36 1.8-.51 2.46-.43 1.82.15 3.19.87 4.1 2.17-1.62.98-2.43 2.36-2.43 4.13 0 1.37.5 2.52 1.5 3.45-.12.34-.25.68-.39 1.02z"/>
                                            </svg>
                                        </span>
                                        <span className="mobile-app-name">iPhone</span>
                                        <span className="mobile-app-description">Страница статуса</span>
                                    </button>
                                </div>
                                <button className="mobile-apps-close-button" onClick={closeMobileAppsModal}>Закрыть</button>
                            </div>
                        </div>
                    )}

                    <ThemeModal isOpen={isThemeModalVisible} onClose={closeThemeModal} />
                    </div>
                </header>

    );
};

export default Header;
