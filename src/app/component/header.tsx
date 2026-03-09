'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import '@/styles/index.scss';
import { API_SERVER } from '@/hosts/constants';
import { getAuthToken } from '../utils/auth';
import { useTheme } from '../context/ThemeContext';
import { useSidebar } from '../context/SidebarContext';
import { getProfile } from '@/utils/profileCache';
import { performLogout } from '../utils/logoutUtils';
import SearchModal from './SearchModal';
import GlobalFriendsModal from './yumeko-anime-profile/yumeko-profile-components/GlobalFriendsModal';

const Header: React.FC = () => {
    const pathname = usePathname();
    const router = useRouter();
    const { loadUserThemeSettings, resetToDefaultTheme } = useTheme();
    const { toggle: toggleSidebar } = useSidebar();

    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [username, setUsername] = useState<string>('');
    const [isSearchModalVisible, setSearchModalVisible] = useState(false);
    const [userRoles, setUserRoles] = useState<string[]>([]);
    const [userAvatarUrl, setUserAvatarUrl] = useState<string>('/profile.png');
    const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
    const [isFriendsModalOpen, setIsFriendsModalOpen] = useState(false);
    const profileDropdownRef = useRef<HTMLDivElement>(null);

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

    // Close profile dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target as Node)) {
                setProfileDropdownOpen(false);
            }
        };
        if (profileDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [profileDropdownOpen]);

    const handleLogout = useCallback(() => {
        setProfileDropdownOpen(false);
        performLogout(setIsAuthenticated, setUserAvatarUrl, resetToDefaultTheme);
        router.push('/');
    }, [resetToDefaultTheme, router]);

    const isAdmin = userRoles.includes('admin') || userRoles.includes('ADMIN');

    return (
        <>
            <header className="header yumeko-header">
                <div className="header-content">
                    {/* Left: Menu Action + Logo */}
                    <div className="header-left">
                        <button
                            className="header-menu-btn"
                            onClick={toggleSidebar}
                            title="Меню"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="3" y1="6" x2="21" y2="6" />
                                <line x1="3" y1="12" x2="21" y2="12" />
                                <line x1="3" y1="18" x2="21" y2="18" />
                            </svg>
                        </button>

                        <Link href="/" className={`header-logo-text ${pathname === '/' ? 'active' : ''}`}>
                            <span className="logo-yumeko">Yumeko</span>
                            <span className="logo-animelib">AnimeLib</span>
                        </Link>

                        {/* Navigation Links - Desktop */}
                        <nav className="header-nav desktop-only">
                            <Link href="/leaderboard" className={`nav-link ${pathname === '/leaderboard' ? 'active' : ''}`}>Рейтинг</Link>
                            {isAuthenticated && (
                                <>
                                    <Link href={`/profile/${username}`} className={`nav-link ${pathname?.startsWith('/profile/') && !pathname?.includes('/collection') && !pathname?.includes('/settings') ? 'active' : ''}`}>Мой профиль</Link>
                                    <Link href="/profile/collection" className={`nav-link ${pathname === '/profile/collection' ? 'active' : ''}`}>Мои коллекции</Link>
                                </>
                            )}
                        </nav>
                    </div>

                    {/* Right: Search + Actions */}
                    <div className="header-right">
                        <button className="header-search-icon-btn" onClick={openSearchModal} title="Поиск аниме">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="11" cy="11" r="8" />
                                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                        </button>

                        {isAuthenticated && (
                            <div className="header-profile-wrapper" ref={profileDropdownRef}>
                                <button
                                    className={`header-profile-btn ${profileDropdownOpen ? 'active' : ''}`}
                                    onClick={() => setProfileDropdownOpen(prev => !prev)}
                                    title="Профиль"
                                >
                                    <img src={userAvatarUrl} alt="Профиль" className="header-avatar" />
                                </button>

                                {profileDropdownOpen && (
                                    <div className="header-profile-dropdown">
                                        <Link href={`/profile/${username}`} className="header-dropdown-item" onClick={() => setProfileDropdownOpen(false)}>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                            <span>Мой профиль</span>
                                        </Link>
                                        <Link href="/profile/collection" className="header-dropdown-item" onClick={() => setProfileDropdownOpen(false)}>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                                            <span>Коллекции</span>
                                        </Link>
                                        <button className="header-dropdown-item" onClick={() => { setProfileDropdownOpen(false); setIsFriendsModalOpen(true); }}>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                                            <span>Друзья</span>
                                        </button>
                                        <Link href="/profile/settings" className="header-dropdown-item" onClick={() => setProfileDropdownOpen(false)}>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                                            <span>Настройки</span>
                                        </Link>
                                        {isAdmin && (
                                            <>
                                                <div className="header-dropdown-divider" />
                                                <Link href="/admin_panel" className="header-dropdown-item admin" onClick={() => setProfileDropdownOpen(false)}>
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                                                    <span>Админ панель</span>
                                                </Link>
                                            </>
                                        )}
                                        <div className="header-dropdown-divider" />
                                        <button className="header-dropdown-item logout" onClick={handleLogout}>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                                            <span>Выйти</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <SearchModal isOpen={isSearchModalVisible} onClose={closeSearchModal} />
            {isFriendsModalOpen && (
                <GlobalFriendsModal onClose={() => setIsFriendsModalOpen(false)} />
            )}
        </>
    );
};

export default Header;
