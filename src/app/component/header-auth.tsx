'use client';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import '../styles/index.scss';
import { API_SERVER } from '../../tools/constants';

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

    const getCookieToken = () => {
        const match = document.cookie.match(/token=([^;]+)/);
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
                } else {
                    setIsAuthenticated(false);
                }
            } catch {
                setIsAuthenticated(false);
            }
        };

        checkAuth();
    }, []);

    useEffect(() => {
        document.body.style.overflow = isSearchModalVisible ? 'hidden' : '';
        return () => {
            document.body.style.overflow = '';
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

    const handleSearchInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const query = event.target.value;
        setSearchQuery(query);

        if (!query) {
            setSearchResults([]);
            setProfileResults([]);
            setErrorMessage('Введите поисковый запрос');
            return;
        }

        setIsLoading(true);
        setErrorMessage('');

        try {
            if (searchMode === 'anime') {
                const res = await fetch(`${API_SERVER}/api/anime/search?query=${encodeURIComponent(query)}`);
                const data = await res.json();
                setSearchResults(data.anime || data || []);
                setProfileResults([]);
            } else {
                const res = await fetch(`${API_SERVER}/api/anime/search-profiles?query=${encodeURIComponent(query)}`);
                const data = await res.json();
                setProfileResults(data.profiles || []);
                setSearchResults([]);
            }
        } catch {
            setErrorMessage('Ошибка при поиске');
            setSearchResults([]);
            setProfileResults([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('currentUser');
        document.cookie = 'token=; Max-Age=0; path=/';
        setIsAuthenticated(false);
        window.location.href = '/login';
    };

    const openSearchModal = () => setSearchModalVisible(true);
    const closeSearchModal = () => {
        setSearchModalVisible(false);
        setSearchQuery('');
        setSearchResults([]);
        setProfileResults([]);
        setErrorMessage('');
    };

    const handleAnimeClick = (id: number) => {
        closeSearchModal();
        router.push(`/anime-page/${id}`);
    };

    const handleProfileClick = (username: string) => {
        closeSearchModal();
        router.push(`/profiles/${username}`);
    };

    return (
        <header className="header">
            <div className="logo">
                <div className="logo-left">
                    <Image src="/logo_auth.png" alt="Logo" className="logo-img" width={150} height={80}/>
                    <div className="logo-dropdown">
                        <ul>
                            <li><Link href="/">Главная</Link></li>
                            <li><Link href="/leaderboard">Лидеборд</Link></li>
                            <li><Link href="/shop">Магазин</Link></li>
                        </ul>
                    </div>
                </div>
            </div>

            <div className="search-bar-anime" onClick={openSearchModal}>
                <span className="search-placeholder">Поиск аниме...</span>
            </div>

            <div className="profile">
                <Image src="/profile.png" alt="Профиль" width={50} height={50} className="profile-icon"/>
                <div className="profile-dropdown">
                    <ul>
                        {isAuthenticated ? (
                            <>
                                <li><Link href="/profile">Мой профиль</Link></li>
                                <li><Link href="/profile/collection">Коллекции</Link></li>
                                <li><Link href="/profile/settings">Настройки</Link></li>
                                <li>
                                    <button onClick={handleLogout}>Выйти</button>
                                </li>
                                {['MODERATOR', 'ADMIN', 'SUPER_ADMIN'].some(role => userRoles.includes(role)) && (
                                    <li><Link href="/admin_panel">Админ панель</Link></li>
                                )}
                            </>
                        ) : (
                            <>
                                <li><Link href="/login">Войти</Link></li>
                                <li><Link href="/register">Регистрация</Link></li>
                            </>
                        )}
                    </ul>
                </div>
            </div>

            {isSearchModalVisible && (
                <div className="search-modal-overlay">
                    <div className="search-modal">
                        <div className="search-modal-content">
                            <button className="close-button" onClick={closeSearchModal}>✖</button>

                            <div className="search-mode-toggle">
                                <button className={searchMode === 'anime' ? 'active' : ''}
                                        onClick={() => setSearchMode('anime')}>Аниме
                                </button>
                                <button className={searchMode === 'profile' ? 'active' : ''}
                                        onClick={() => setSearchMode('profile')}>Профили
                                </button>
                            </div>

                            <input
                                type="text"
                                value={searchQuery}
                                onChange={handleSearchInputChange}
                                placeholder=" Введите запрос..."
                                className="search-modal-input"
                            />

                            <div className="search-results">
                                {isLoading ? (
                                    <p className="loading-text">Загрузка...</p>
                                ) : errorMessage ? (
                                    <p className="loading-text">{errorMessage}</p>
                                ) : searchMode === 'anime' && searchResults.length > 0 ? (
                                    searchResults.map(anime => (
                                        <div key={anime.id} className="anime-card-search"
                                             onClick={() => handleAnimeClick(anime.id)}>
                                            {coverUrls[anime.id] && (
                                                <Image className="anime-card-search-img" src={coverUrls[anime.id]}
                                                       alt={anime.title} width={75} height={110}/>
                                            )}
                                            <div className="anime-card-info-search">
                                                <h3 className="anime-title-search">{anime.title} [{anime.season}]<span
                                                    className="anime-episodes-search">{anime.current_episode} из {anime.episode_all}</span>
                                                </h3>
                                                <p className="anime-meta-search">{anime.type} • {anime.year} • {anime.genres.split(',').join(' • ')}</p>
                                                <p className="anime-description-search">{anime.description}</p>
                                            </div>
                                        </div>
                                    ))
                                ) : searchMode === 'profile' && profileResults.length > 0 ? (
                                    <>
                                        <h3 className="search-section-title">Профили</h3>
                                        {profileResults.map(profile => (
                                            <div key={`profile-${profile.id}`} className="profile-search-card"
                                                 onClick={() => handleProfileClick(profile.username)}>
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
                                                    <h4>{profile.nickname} <span
                                                        className="username">@{profile.username}</span></h4>
                                                    <p className="profile-bio">{profile.bio}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </>
                                ) : (
                                    <p className="loading-text">Ничего не найдено</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
};

export default Header;
