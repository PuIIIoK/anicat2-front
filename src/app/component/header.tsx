'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import '../styles/index.scss';

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

const Header: React.FC = () => {
    const router = useRouter();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isSearchModalVisible, setSearchModalVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<AnimeInfo[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [userRoles, setUserRoles] = useState<string[]>([]);

    const getCookieToken = () => {
        const match = document.cookie.match(/token=([^;]+)/);
        return match ? match[1] : '';
    };

    useEffect(() => {
        const checkAuth = async () => {
            const token = getCookieToken();
            if (!token) return setIsAuthenticated(false);

            try {
                const res = await fetch('http://localhost:8080/api/auth/get-profile', {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (res.ok) {
                    const data = await res.json();
                    setIsAuthenticated(true);
                    setUserRoles(data.roles || []);
                } else {
                    setIsAuthenticated(false);
                }
            } catch (err) {
                console.error('Ошибка проверки авторизации:', err);
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

    const handleLogout = () => {
        localStorage.removeItem('currentUser');
        document.cookie = 'token=; Max-Age=0; path=/';
        setIsAuthenticated(false);
        window.location.href = '/login';
    };

    const handleSearchInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const query = event.target.value.trim();
        setSearchQuery(query);

        if (!query) {
            setSearchResults([]);
            setErrorMessage('Введите название аниме, которое хотите найти');
            return;
        }

        setIsLoading(true);
        setErrorMessage('');
        try {
            const response = await fetch(`http://localhost:8080/api/anime/search?query=${encodeURIComponent(query)}`);
            if (!response.ok) {
                const text = await response.text();
                setErrorMessage(text || 'Ошибка при поиске');
                setSearchResults([]);
            } else {
                const results: AnimeInfo[] = await response.json();
                setSearchResults(results);
            }
        } catch (err) {
            console.error('Ошибка поиска:', err);
            setErrorMessage('Произошла ошибка при поиске');
            setSearchResults([]);
        } finally {
            setIsLoading(false);
        }
    };

    const openSearchModal = () => setSearchModalVisible(true);

    const closeSearchModal = () => {
        setSearchModalVisible(false);
        setSearchQuery('');
        setSearchResults([]);
        setErrorMessage('');
    };

    const handleAnimeClick = (id: number) => {
        closeSearchModal();
        router.push(`/anime-page/${id}`);
    };

    return (
        <header className="header">
            <div className="logo">
                <Link href="/">
                    <Image src="/logo.png" alt="Logo" className="logo-img" width={65} height={65} />
                </Link>
                <div className="logo-dropdown">
                    <ul>
                        <li><Link href="/">Главная</Link></li>
                        <li><Link href="/leaderboard">Лидеборд</Link></li>
                    </ul>
                </div>
            </div>

            <div className="search-bar-anime" onClick={openSearchModal}>
                <span className="search-placeholder">Поиск аниме...</span>
                <button className="search-icon-button">🔍</button>
            </div>

            <div className="profile">
                <Image src="/profile.png" alt="Профиль" width={50} height={50} className="profile-icon" />
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

                                {/* Отображать "Админ панель" только если пользователь админ */}
                                {userRoles.includes('ADMIN') && (
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
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={handleSearchInputChange}
                                placeholder="🔍 Введите название аниме..."
                                className="search-modal-input"
                            />

                            <div className="search-results">
                                {isLoading ? (
                                    <p className="loading-text">Загрузка...</p>
                                ) : errorMessage ? (
                                    <p className="loading-text">{errorMessage}</p>
                                ) : searchResults.length > 0 ? (
                                    searchResults.map(anime => (
                                        <div
                                            key={anime.id}
                                            className="anime-card"
                                            onClick={() => handleAnimeClick(anime.id)}
                                        >
                                            <Image
                                                className="anime-card-search-img"
                                                src={anime.imageUrl}
                                                alt={anime.title}
                                                width={75}
                                                height={110}
                                            />
                                            <div className="anime-card-info">
                                                <h3 className="anime-title">
                                                    {anime.title} [{anime.season}]
                                                    <span className="anime-episodes">
                                                        {anime.current_episode} из {anime.episode_all}
                                                    </span>
                                                </h3>
                                                <p className="anime-meta">
                                                    {anime.type} • {anime.year} • {anime.genres.split(',').join(' • ')}
                                                </p>
                                                <p className="anime-description">{anime.description}</p>
                                            </div>
                                        </div>
                                    ))
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