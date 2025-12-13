'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { API_SERVER, AUTH_SITE_URL } from '@/hosts/constants';
import { useTheme, ColorScheme } from '../../context/ThemeContext';
import { getAuthToken } from '../../utils/auth';
import { performLogout } from '../../utils/logoutUtils';
import GlobalFriendsModal from '../yumeko-anime-profile/yumeko-profile-components/GlobalFriendsModal';
import { BADGE_META } from '../profile-page-old/badgeMeta';
import * as LucideIcons from 'lucide-react';
import { getProfile } from '@/utils/profileCache';

const MIN_SIDEBAR_WIDTH = 60;
const MAX_SIDEBAR_WIDTH = 400;
const DEFAULT_SIDEBAR_WIDTH = 260;
const COLLAPSED_WIDTH = 60;

interface Category {
    id: string;
    name: string;
    link?: string;
    position: number;
}

interface UserProfile {
    id: number;
    username: string;
    nickname: string;
    roles: string[];
    profileColor1?: string;
    profileColor2?: string;
    bio?: string;
    status?: string;
    bannerUrl?: string;
    bannerAnimatedUrl?: string;
    avatarUrl?: string;
    avatarAnimatedUrl?: string;
    verified?: boolean;
    badges?: string[];
}

interface SidebarProps {
    isOpen: boolean;
    onToggle: () => void;
}

const colorSchemes: { value: ColorScheme; label: string; color: string }[] = [
    { value: 'orange', label: 'Оранжевая', color: '#ff9500' },
    { value: 'purple', label: 'Фиолетовая', color: '#af52de' },
    { value: 'red', label: 'Красная', color: '#ff3b30' },
    { value: 'blue', label: 'Синяя', color: '#007aff' }
];

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onToggle }) => {
    const pathname = usePathname();
    const { theme, setTheme, colorScheme, setColorScheme, resetToDefaultTheme } = useTheme();
    const [categories, setCategories] = useState<Category[]>([]);
    const [loadingCategories, setLoadingCategories] = useState(true);
    const [expandedSection, setExpandedSection] = useState<string | null>('categories');
    
    // Profile states
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [userAvatarUrl, setUserAvatarUrl] = useState<string>('/profile.png');
    const [showProfileCard, setShowProfileCard] = useState(false);
    const [isFriendsModalOpen, setIsFriendsModalOpen] = useState(false);
    
    // Resize states
    const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
    const [isResizing, setIsResizing] = useState(false);
    const sidebarRef = useRef<HTMLElement>(null);
    
    // Hydration fix
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);
    
    // Set initial CSS variable
    useEffect(() => {
        document.documentElement.style.setProperty('--sidebar-width', `${DEFAULT_SIDEBAR_WIDTH}px`);
    }, []);
    
    // Handle resize
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
    }, []);
    
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;
            
            const newWidth = window.innerWidth - e.clientX;
            if (newWidth >= MIN_SIDEBAR_WIDTH && newWidth <= MAX_SIDEBAR_WIDTH) {
                setSidebarWidth(newWidth);
                document.documentElement.style.setProperty('--sidebar-width', `${newWidth}px`);
            }
        };
        
        const handleMouseUp = () => {
            setIsResizing(false);
        };
        
        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'ew-resize';
            document.body.style.userSelect = 'none';
        }
        
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
    }, [isResizing]);

    const authCheckedRef = useRef(false);

    // Check authentication and load profile
    useEffect(() => {
        if (authCheckedRef.current) return;
        authCheckedRef.current = true;

        const checkAuth = async () => {
            const token = getAuthToken();
            if (!token) {
                setIsAuthenticated(false);
                return;
            }

            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const data: any = await getProfile();

                if (data) {
                    setIsAuthenticated(true);
                    
                    // Load avatar, banner and badges from separate endpoints
                    const [avatarRes, bannerRes, badgesRes] = await Promise.all([
                        fetch(`${API_SERVER}/api/profiles/avatar?username=${encodeURIComponent(data.username)}`, {
                            headers: { Authorization: `Bearer ${token}` },
                        }),
                        fetch(`${API_SERVER}/api/profiles/banner?username=${encodeURIComponent(data.username)}`, {
                            headers: { Authorization: `Bearer ${token}` },
                        }),
                        fetch(`${API_SERVER}/api/badges/user/${encodeURIComponent(data.username)}`, {
                            headers: { Authorization: `Bearer ${token}` },
                        })
                    ]);
                    
                    let avatarUrl = '/profile.png';
                    let avatarAnimatedUrl: string | undefined;
                    let bannerUrl: string | undefined;
                    let bannerAnimatedUrl: string | undefined;
                    let badges: string[] = [];
                    
                    if (avatarRes.ok) {
                        const avatarData = await avatarRes.json();
                        if (avatarData.animatedUrl) {
                            avatarAnimatedUrl = avatarData.animatedUrl;
                        }
                        // Use staticUrl for static avatar, fallback to url
                        if (avatarData.staticUrl) {
                            avatarUrl = avatarData.staticUrl;
                        } else if (avatarData.url && !avatarData.url.endsWith('.webm')) {
                            avatarUrl = avatarData.url;
                        }
                    }
                    
                    if (bannerRes.ok) {
                        const bannerData = await bannerRes.json();
                        if (bannerData.animatedUrl) {
                            bannerAnimatedUrl = bannerData.animatedUrl;
                        }
                        // Use staticUrl for static banner, fallback to url if not webm
                        if (bannerData.staticUrl) {
                            bannerUrl = bannerData.staticUrl;
                        } else if (bannerData.url && !bannerData.url.endsWith('.webm')) {
                            bannerUrl = bannerData.url;
                        }
                    }
                    
                    // Parse badges from separate API
                    if (badgesRes.ok) {
                        const badgesData = await badgesRes.json();
                        badges = badgesData.map((b: { badgeName: string }) => b.badgeName);
                    }
                    
                    setUserAvatarUrl(avatarUrl);
                    
                    setUserProfile({
                        id: data.id,
                        username: data.username,
                        nickname: data.nickname || data.username,
                        roles: (data.roles || []).map((r: string) => r.replace('ROLE_', '')),
                        profileColor1: data.profileColor1,
                        profileColor2: data.profileColor2,
                        bio: data.bio,
                        status: data.status,
                        bannerUrl,
                        bannerAnimatedUrl,
                        avatarUrl,
                        avatarAnimatedUrl,
                        verified: data.verified || false,
                        badges
                    });
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
        const fetchCategories = async () => {
            try {
                const res = await fetch(`${API_SERVER}/api/anime/category/get-category`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.categories && Array.isArray(data.categories)) {
                        setCategories(data.categories.sort((a: Category, b: Category) => a.position - b.position));
                    }
                }
            } catch (error) {
                console.error('Error fetching categories:', error);
            } finally {
                setLoadingCategories(false);
            }
        };

        fetchCategories();
    }, []);
    
    const handleLogout = () => {
        performLogout(setIsAuthenticated, setUserAvatarUrl, resetToDefaultTheme);
        setUserProfile(null);
        setShowProfileCard(false);
    };
    
    const handleSwitchAccount = () => {
        const currentUrl = window.location.origin;
        const token = getAuthToken();
        
        const authUrl = new URL(AUTH_SITE_URL);
        authUrl.searchParams.set('redirect_url', currentUrl);
        authUrl.searchParams.set('mode', 'switch');
        if (token) {
            authUrl.searchParams.set('ct', btoa(token));
        }
        
        window.location.href = authUrl.toString();
    };
    
    const toggleSection = (section: string) => {
        setExpandedSection(expandedSection === section ? null : section);
    };

    const isActive = (path: string) => pathname === path;

    const menuItems = [
        {
            id: 'home',
            icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    <polyline points="9,22 9,12 15,12 15,22"/>
                </svg>
            ),
            label: 'Главная',
            href: '/'
        },
        {
            id: 'leaderboard',
            icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
            ),
            label: 'Лидерборд',
            href: '/leaderboard'
        },
        {
            id: 'collection',
            icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                </svg>
            ),
            label: 'Моя коллекция',
            href: '/profile/collection'
        }
    ];

    const platformItems = [
        { 
            id: 'android', 
            label: 'Android', 
            href: '/android', 
            icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.523 2.277a.75.75 0 0 0-1.046 1.046l1.5 1.5a.75.75 0 0 0 1.046-1.046l-1.5-1.5zM6.477 2.277l-1.5 1.5a.75.75 0 0 0 1.046 1.046l1.5-1.5a.75.75 0 0 0-1.046-1.046zM12 5.5a6.5 6.5 0 0 0-6.5 6.5v5a3 3 0 0 0 3 3h7a3 3 0 0 0 3-3v-5a6.5 6.5 0 0 0-6.5-6.5zM7 12a5 5 0 0 1 10 0v5a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 7 17v-5zm2.5 1a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm5 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"/>
                </svg>
            )
        },
        { 
            id: 'iphone', 
            label: 'iPhone', 
            href: '/iphone', 
            icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
            )
        },
        { 
            id: 'pc', 
            label: 'PC', 
            href: '/pc', 
            icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="3" width="20" height="14" rx="2"/>
                    <line x1="8" y1="21" x2="16" y2="21"/>
                    <line x1="12" y1="17" x2="12" y2="21"/>
                </svg>
            )
        }
    ];

    return (
        <>
            {/* Overlay для мобильных */}
            <div 
                className={`sidebar-overlay ${isOpen ? 'active' : ''}`}
                onClick={onToggle}
            />
            
            <aside 
                ref={sidebarRef}
                className={`yumeko-sidebar ${isOpen ? 'open' : 'closed'} ${isResizing ? 'resizing' : ''} ${sidebarWidth < COLLAPSED_WIDTH + 60 ? 'collapsed' : ''}`}
            >
                {/* Resize Handle */}
                <div 
                    className="sidebar-resize-handle"
                    onMouseDown={handleMouseDown}
                />
                
                {/* Mobile Close Button */}
                <button 
                    className="sidebar-mobile-close-btn"
                    onClick={onToggle}
                    aria-label="Закрыть меню"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
                
                {/* Header removed */}
                
{/* Mini Profile Card removed - moved to bottom */}

                <nav className="sidebar-nav">
                    {/* Main Menu */}
                    <div className="sidebar-section">
                        <span className="sidebar-section-title">Меню</span>
                        <ul className="sidebar-menu">
                            {menuItems.map((item) => (
                                <li key={item.id} className={item.id === 'catalog' ? 'sidebar-catalog' : ''}>
                                    <Link 
                                        href={item.href}
                                        className={`sidebar-menu-item ${isActive(item.href) ? 'active' : ''}`}
                                        onClick={() => {
                                            if (window.innerWidth <= 1024) onToggle();
                                        }}
                                    >
                                        <span className="sidebar-menu-icon">{item.icon}</span>
                                        <span className="sidebar-menu-label">{item.label}</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Profile Section - Only for authenticated users */}
                    {isAuthenticated && (
                        <div className="sidebar-section">
                            <button 
                                className={`sidebar-section-header ${expandedSection === 'profile' ? 'expanded' : ''}`}
                                onClick={() => toggleSection('profile')}
                            >
                                <span className="sidebar-section-icon">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                        <circle cx="12" cy="7" r="4"/>
                                    </svg>
                                </span>
                                <span className="sidebar-section-title">Профиль</span>
                                <svg className="sidebar-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="6 9 12 15 18 9"/>
                                </svg>
                            </button>
                            <ul className={`sidebar-menu collapsible ${expandedSection === 'profile' ? 'expanded' : ''}`}>
                                <li>
                                    <Link 
                                        href={userProfile?.username ? `/profile/${userProfile.username}` : '/profile'}
                                        className={`sidebar-menu-item ${isActive('/profile') ? 'active' : ''}`}
                                        onClick={() => { if (window.innerWidth <= 1024) onToggle(); }}
                                    >
                                        <span className="sidebar-menu-icon">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                                <circle cx="12" cy="7" r="4"/>
                                            </svg>
                                        </span>
                                        <span className="sidebar-menu-label">Мой профиль</span>
                                    </Link>
                                </li>
                                <li>
                                    <button 
                                        className="sidebar-menu-item"
                                        onClick={() => { setIsFriendsModalOpen(true); }}
                                    >
                                        <span className="sidebar-menu-icon">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                                <circle cx="9" cy="7" r="4"/>
                                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                                                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                                            </svg>
                                        </span>
                                        <span className="sidebar-menu-label">Друзья</span>
                                    </button>
                                </li>
                                <li>
                                    <Link 
                                        href="/profile/collection"
                                        className={`sidebar-menu-item ${isActive('/profile/collection') ? 'active' : ''}`}
                                        onClick={() => { if (window.innerWidth <= 1024) onToggle(); }}
                                    >
                                        <span className="sidebar-menu-icon">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                                            </svg>
                                        </span>
                                        <span className="sidebar-menu-label">Коллекции</span>
                                    </Link>
                                </li>
                                <li>
                                    <Link 
                                        href="/profile/settings"
                                        className={`sidebar-menu-item ${isActive('/profile/settings') ? 'active' : ''}`}
                                        onClick={() => { if (window.innerWidth <= 1024) onToggle(); }}
                                    >
                                        <span className="sidebar-menu-icon">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <circle cx="12" cy="12" r="3"/>
                                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                                            </svg>
                                        </span>
                                        <span className="sidebar-menu-label">Настройки</span>
                                    </Link>
                                </li>
                                <li>
                                    <button className="sidebar-menu-item" onClick={handleSwitchAccount}>
                                        <span className="sidebar-menu-icon">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                                <circle cx="8.5" cy="7" r="4"/>
                                                <polyline points="17 11 19 13 23 9"/>
                                            </svg>
                                        </span>
                                        <span className="sidebar-menu-label">Сменить аккаунт</span>
                                    </button>
                                </li>
                                <li>
                                    <button className="sidebar-menu-item sidebar-logout-btn" onClick={handleLogout}>
                                        <span className="sidebar-menu-icon">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                                                <polyline points="16 17 21 12 16 7"/>
                                                <line x1="21" y1="12" x2="9" y2="12"/>
                                            </svg>
                                        </span>
                                        <span className="sidebar-menu-label">Выйти</span>
                                    </button>
                                </li>
                                {userProfile && ['MODERATOR', 'ADMIN', 'SUPER_ADMIN'].some(role => userProfile?.roles?.includes(role)) && (
                                    <li>
                                        <Link 
                                            href="/admin_panel"
                                            className={`sidebar-menu-item ${isActive('/admin_panel') ? 'active' : ''}`}
                                            onClick={() => { if (window.innerWidth <= 1024) onToggle(); }}
                                        >
                                            <span className="sidebar-menu-icon">
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                                                </svg>
                                            </span>
                                            <span className="sidebar-menu-label">Админ панель</span>
                                        </Link>
                                    </li>
                                )}
                            </ul>
                        </div>
                    )}

                    {/* Categories */}
                    <div className="sidebar-section sidebar-categories">
                        <button 
                            className={`sidebar-section-header ${expandedSection === 'categories' ? 'expanded' : ''}`}
                            onClick={() => toggleSection('categories')}
                        >
                            <span className="sidebar-section-icon">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="3" width="7" height="7"/>
                                    <rect x="14" y="3" width="7" height="7"/>
                                    <rect x="14" y="14" width="7" height="7"/>
                                    <rect x="3" y="14" width="7" height="7"/>
                                </svg>
                            </span>
                            <span className="sidebar-section-title">Категории</span>
                            <svg className="sidebar-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="6 9 12 15 18 9"/>
                            </svg>
                        </button>
                        <ul className={`sidebar-menu collapsible ${expandedSection === 'categories' ? 'expanded' : ''}`}>
                            {loadingCategories ? (
                                <li className="sidebar-loading">
                                    <div className="sidebar-loading-spinner" />
                                    <span>Загрузка...</span>
                                </li>
                            ) : (
                                categories.slice(0, 10).map((category) => (
                                    <li key={category.id}>
                                        <Link 
                                            href={`/anime-category/${category.id}`}
                                            className="sidebar-menu-item"
                                            onClick={() => {
                                                if (window.innerWidth <= 1024) onToggle();
                                            }}
                                        >
                                            <span className="sidebar-category-dot" />
                                            <span className="sidebar-menu-label">{category.name}</span>
                                        </Link>
                                    </li>
                                ))
                            )}
                            {categories.length > 10 && (
                                <li>
                                    <Link href="/all-anime" className="sidebar-menu-item sidebar-see-all">
                                        <span className="sidebar-menu-label">Показать все →</span>
                                    </Link>
                                </li>
                            )}
                        </ul>
                    </div>

                    {/* Platforms */}
                    <div className="sidebar-section">
                        <button 
                            className={`sidebar-section-header ${expandedSection === 'platforms' ? 'expanded' : ''}`}
                            onClick={() => toggleSection('platforms')}
                        >
                            <span className="sidebar-section-icon">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
                                    <line x1="12" y1="18" x2="12" y2="18"/>
                                </svg>
                            </span>
                            <span className="sidebar-section-title">Приложения</span>
                            <svg className="sidebar-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="6 9 12 15 18 9"/>
                            </svg>
                        </button>
                        <ul className={`sidebar-menu collapsible ${expandedSection === 'platforms' ? 'expanded' : ''}`}>
                            {platformItems.map((item) => (
                                <li key={item.id}>
                                    <Link 
                                        href={item.href}
                                        className={`sidebar-menu-item ${isActive(item.href) ? 'active' : ''}`}
                                        onClick={() => {
                                            if (window.innerWidth <= 1024) onToggle();
                                        }}
                                    >
                                        <span className="sidebar-platform-icon">{item.icon}</span>
                                        <span className="sidebar-menu-label">{item.label}</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Theme Settings */}
                    <div className="sidebar-section">
                        <button 
                            className={`sidebar-section-header ${expandedSection === 'theme' ? 'expanded' : ''}`}
                            onClick={() => toggleSection('theme')}
                        >
                            <span className="sidebar-section-icon">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="5"/>
                                    <line x1="12" y1="1" x2="12" y2="3"/>
                                    <line x1="12" y1="21" x2="12" y2="23"/>
                                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                                    <line x1="1" y1="12" x2="3" y2="12"/>
                                    <line x1="21" y1="12" x2="23" y2="12"/>
                                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                                </svg>
                            </span>
                            <span className="sidebar-section-title">Смена темы</span>
                            <svg className="sidebar-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="6 9 12 15 18 9"/>
                            </svg>
                        </button>
                        <div className={`sidebar-theme-content collapsible ${expandedSection === 'theme' ? 'expanded' : ''}`}>
                            {/* Light/Dark Toggle */}
                            <div className="sidebar-theme-mode">
                                <span className="sidebar-theme-mode-label">Режим</span>
                                <div className="sidebar-theme-toggle">
                                    <button 
                                        className={`sidebar-theme-btn ${theme === 'light' ? 'active' : ''}`}
                                        onClick={() => setTheme('light')}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="12" cy="12" r="5"/>
                                            <line x1="12" y1="1" x2="12" y2="3"/>
                                            <line x1="12" y1="21" x2="12" y2="23"/>
                                            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                                            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                                            <line x1="1" y1="12" x2="3" y2="12"/>
                                            <line x1="21" y1="12" x2="23" y2="12"/>
                                            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                                            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                                        </svg>
                                        Светлая
                                    </button>
                                    <button 
                                        className={`sidebar-theme-btn ${theme === 'dark' ? 'active' : ''}`}
                                        onClick={() => setTheme('dark')}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                                        </svg>
                                        Тёмная
                                    </button>
                                </div>
                            </div>
                            
                            {/* Color Scheme */}
                            <div className="sidebar-color-scheme">
                                <span className="sidebar-theme-mode-label">Цветовая схема</span>
                                <div className="sidebar-color-options">
                                    {colorSchemes.map((scheme) => (
                                        <button
                                            key={scheme.value}
                                            className={`sidebar-color-option ${mounted && colorScheme === scheme.value ? 'active' : ''}`}
                                            onClick={() => setColorScheme(scheme.value)}
                                            title={scheme.label}
                                        >
                                            <span 
                                                className="sidebar-color-dot"
                                                style={{ backgroundColor: scheme.color }}
                                            />
                                            <span className="sidebar-color-label">{scheme.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </nav>

                {/* User Panel with Profile Popup */}
                {isAuthenticated && userProfile && (
                    <div className="sidebar-user-panel-wrapper">
                        {/* Profile Popup Card - hide when collapsed */}
                        {showProfileCard && sidebarWidth >= COLLAPSED_WIDTH + 60 && (
                            <div 
                                className="sidebar-profile-popup-border"
                                style={{
                                    background: `linear-gradient(135deg, ${userProfile.profileColor1 || '#af52de'}, ${userProfile.profileColor2 || '#8b3fc4'})`
                                }}
                            >
                                <div 
                                    className="sidebar-profile-popup"
                                    style={{
                                        '--popup-color-1': userProfile.profileColor1 || '#af52de',
                                        '--popup-color-2': userProfile.profileColor2 || '#8b3fc4'
                                    } as React.CSSProperties}
                                >
                                    <div className="sidebar-profile-popup-banner">
                                    {/* Banner: animated > static > gradient */}
                                    {userProfile.bannerAnimatedUrl ? (
                                        <video 
                                            src={userProfile.bannerAnimatedUrl}
                                            className="sidebar-profile-popup-banner-media"
                                            autoPlay
                                            loop
                                            muted
                                            playsInline
                                        />
                                    ) : userProfile.bannerUrl ? (
                                        <img
                                            src={userProfile.bannerUrl}
                                            alt=""
                                            className="sidebar-profile-popup-banner-media"
                                        />
                                    ) : (
                                        <div 
                                            className="sidebar-profile-popup-banner-gradient"
                                            style={{ 
                                                background: `linear-gradient(135deg, var(--primary-color, #af52de), var(--primary-color-dark, #8b3fc4))`
                                            }}
                                        />
                                    )}
                                    
                                    {/* Avatar: animated > static > icon */}
                                    <div className="sidebar-profile-popup-avatar-container">
                                        {userProfile.avatarAnimatedUrl ? (
                                            <video 
                                                src={userProfile.avatarAnimatedUrl}
                                                className="sidebar-profile-popup-avatar-media"
                                                autoPlay
                                                loop
                                                muted
                                                playsInline
                                            />
                                        ) : userAvatarUrl && userAvatarUrl !== '/profile.png' ? (
                                            <img
                                                src={userAvatarUrl}
                                                alt=""
                                                className="sidebar-profile-popup-avatar-media"
                                            />
                                        ) : (
                                            <div className="sidebar-profile-popup-avatar-placeholder">
                                                <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                                                </svg>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="sidebar-profile-popup-content">
                                    {/* Roles - above name */}
                                    {userProfile.roles && userProfile.roles.filter(r => r !== 'USER').length > 0 && (
                                        <div className="sidebar-profile-popup-roles">
                                            {userProfile.roles
                                                .filter(role => role !== 'USER')
                                                .map((role, idx) => (
                                                <span key={idx} className={`sidebar-profile-popup-role ${role.toLowerCase()}`}>
                                                    {['ADMIN', 'ADMINISTRATOR'].includes(role) ? 'Администрация' : 
                                                     ['MODERATOR', 'MODER'].includes(role) ? 'Модерация' : 
                                                     role === 'DEVELOPER' ? 'Разработчик' : 
                                                     role === 'VIP' ? 'VIP' : role}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    
                                    <div className="sidebar-profile-popup-name">
                                        <span className="sidebar-profile-popup-nickname">{userProfile.nickname || userProfile.username}</span>
                                        {userProfile.verified && (
                                            <svg className="sidebar-profile-popup-verified" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                                <circle cx="12" cy="12" r="10"/>
                                                <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                        )}
                                    </div>
                                    <span className="sidebar-profile-popup-username">@{userProfile.username}</span>
                                    
                                    {/* Badges - below name */}
                                    {userProfile.badges && userProfile.badges.length > 0 && (
                                        <div className="sidebar-profile-popup-badges">
                                            {userProfile.badges.map((badge, idx) => {
                                                const meta = BADGE_META[badge.toLowerCase()];
                                                if (!meta) return null;
                                                const IconComponent = LucideIcons[meta.icon as keyof typeof LucideIcons] as React.ComponentType<{size?: number; className?: string}>;
                                                return (
                                                    <span key={idx} className="sidebar-profile-popup-badge" title={meta.title + ' — ' + meta.description}>
                                                        {IconComponent && <IconComponent size={16} />}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    )}
                                    
                                    {userProfile.bio && (
                                        <p className="sidebar-profile-popup-bio">{userProfile.bio}</p>
                                    )}
                                    <div className="sidebar-profile-popup-actions">
                                        {/* Row 1: Полный профиль */}
                                        <Link 
                                            href={`/profile/${userProfile.username}`}
                                            className="sidebar-profile-popup-btn"
                                            onClick={() => { setShowProfileCard(false); if (window.innerWidth <= 1024) onToggle(); }}
                                        >
                                            Полный профиль
                                        </Link>
                                        
                                        {/* Row 2: Коллекция + Друзья */}
                                        <div className="sidebar-profile-popup-row">
                                            <Link 
                                                href={`/profile/${userProfile.username}?tab=collection`}
                                                className="sidebar-profile-popup-btn secondary small"
                                                onClick={() => { setShowProfileCard(false); if (window.innerWidth <= 1024) onToggle(); }}
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                                                </svg>
                                                Коллекция
                                            </Link>
                                            <button 
                                                className="sidebar-profile-popup-btn secondary small"
                                                onClick={() => { setShowProfileCard(false); setIsFriendsModalOpen(true); }}
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                                    <circle cx="9" cy="7" r="4"/>
                                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                                                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                                                </svg>
                                                Друзья
                                            </button>
                                        </div>
                                        
                                        {/* Row 3: Настройки + Выйти */}
                                        <div className="sidebar-profile-popup-row">
                                            <Link 
                                                href="/profile/settings"
                                                className="sidebar-profile-popup-btn secondary small"
                                                onClick={() => { setShowProfileCard(false); if (window.innerWidth <= 1024) onToggle(); }}
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <circle cx="12" cy="12" r="3"/>
                                                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                                                </svg>
                                                Настройки
                                            </Link>
                                            <button 
                                                className="sidebar-profile-popup-btn secondary small logout"
                                                onClick={() => { setShowProfileCard(false); handleLogout(); }}
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                                                    <polyline points="16 17 21 12 16 7"/>
                                                    <line x1="21" y1="12" x2="9" y2="12"/>
                                                </svg>
                                                Выйти
                                            </button>
                                        </div>
                                        
                                        {/* Row 4: Админ панель (only for admins/moderators) */}
                                        {userProfile.roles && ['ADMIN', 'ADMINISTRATOR', 'MODERATOR', 'MODER'].some(role => userProfile.roles?.includes(role)) && (
                                            <Link 
                                                href="/admin_panel"
                                                className="sidebar-profile-popup-btn admin"
                                                onClick={() => { setShowProfileCard(false); if (window.innerWidth <= 1024) onToggle(); }}
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                                                </svg>
                                                Админ панель
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </div>
                            </div>
                        )}
                        
                        {/* User Panel */}
                        <div 
                            className="sidebar-user-panel"
                            style={{ 
                                background: userProfile.profileColor1 && userProfile.profileColor2 
                                    ? `linear-gradient(135deg, ${userProfile.profileColor1}60 0%, ${userProfile.profileColor2}60 100%)`
                                    : 'rgba(0, 0, 0, 0.3)',
                                borderColor: userProfile.profileColor1 || 'rgba(255, 255, 255, 0.1)'
                            }}
                        >
                            <button 
                                className="sidebar-user-panel-info"
                                onClick={() => setShowProfileCard(!showProfileCard)}
                            >
                                <img
                                    src={userAvatarUrl}
                                    alt=""
                                    className="sidebar-user-panel-avatar"
                                    onError={(e) => { 
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                        target.nextElementSibling?.classList.remove('hidden');
                                    }}
                                />
                                <div className="sidebar-user-panel-avatar-placeholder hidden">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                                    </svg>
                                </div>
                                <div className="sidebar-user-panel-names">
                                    <span className="sidebar-user-panel-nickname">{userProfile.nickname || userProfile.username}</span>
                                    <span className="sidebar-user-panel-username">@{userProfile.username}</span>
                                </div>
                            </button>
                            <Link 
                                href="/profile/settings"
                                className="sidebar-user-panel-settings"
                                title="Настройки"
                                onClick={() => { if (window.innerWidth <= 1024) onToggle(); }}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="3"/>
                                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                                </svg>
                            </Link>
                        </div>
                    </div>
                )}
                
                {/* Login button when not authenticated */}
                {!isAuthenticated && (
                    <div className="sidebar-login-panel">
                        <button 
                            className="sidebar-login-btn"
                            onClick={() => {
                                const currentUrl = window.location.origin;
                                window.location.href = `${AUTH_SITE_URL}?redirect_url=${encodeURIComponent(currentUrl)}`;
                            }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                                <polyline points="10 17 15 12 10 7"/>
                                <line x1="15" y1="12" x2="3" y2="12"/>
                            </svg>
                            Авторизация
                        </button>
                    </div>
                )}
            </aside>
            
            {/* Friends Modal */}
            {isFriendsModalOpen && (
                <GlobalFriendsModal onClose={() => setIsFriendsModalOpen(false)} />
            )}
        </>
    );
};

export default Sidebar;
