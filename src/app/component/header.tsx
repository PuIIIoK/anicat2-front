'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import '@/styles/index.scss';
import { API_SERVER } from '@/hosts/constants';
import { getAuthToken } from '../utils/auth';
import { useTheme } from '../context/ThemeContext';
import { useSidebar } from '../context/SidebarContext';
import { getProfile } from '@/utils/profileCache';
import SearchModal from './SearchModal';

const Header: React.FC = () => {
    const pathname = usePathname();
    const { loadUserThemeSettings } = useTheme();
    const { toggle: toggleSidebar } = useSidebar();

    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [username, setUsername] = useState<string>('');
    const [isSearchModalVisible, setSearchModalVisible] = useState(false);
    const [, setUserRoles] = useState<string[]>([]);
    const [, setUserAvatarUrl] = useState<string>('/profile.png');

    const authCheckedRef = useRef(false);

    useEffect(() => {
        if (authCheckedRef.current) return;
        authCheckedRef.current = true;

        const checkAuth = async () => {
            const token = getAuthToken();
            if (!token) return setIsAuthenticated(false);

            try {
                const data = await getProfile();

                if (data) {
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
    }, [loadUserThemeSettings]);

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

    const openSearchModal = () => setSearchModalVisible(true);
    const closeSearchModal = () => setSearchModalVisible(false);

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
                                <circle cx="11" cy="11" r="8" />
                                <line x1="21" y1="21" x2="16.65" y2="16.65" />
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
                                <line x1="3" y1="6" x2="21" y2="6" />
                                <line x1="3" y1="12" x2="21" y2="12" />
                                <line x1="3" y1="18" x2="21" y2="18" />
                            </svg>
                        </button>
                    </div>
                </div>
            </header>

            <SearchModal isOpen={isSearchModalVisible} onClose={closeSearchModal} />
        </>
    );
};

export default Header;
