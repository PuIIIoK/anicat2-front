'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { YumekoProfileData } from '../../yumeko-anime-profile/hooks/useYumekoProfile';
import * as LucideIcons from 'lucide-react';

interface ProfileV2SidebarProps {
    profileData: YumekoProfileData;
    activeSection: 'activity' | 'anime' | 'reviews' | 'friends';
    setActiveSection: (section: 'activity' | 'anime' | 'reviews' | 'friends') => void;
}

const ProfileV2Sidebar: React.FC<ProfileV2SidebarProps> = ({ 
    profileData,
    activeSection,
    setActiveSection
}) => {
    const { friends, isLoadingFriends } = profileData;

    const navItems = [
        { id: 'activity' as const, icon: LucideIcons.Activity, label: 'Активность' },
        { id: 'anime' as const, icon: LucideIcons.Tv, label: 'Аниме' },
        { id: 'reviews' as const, icon: LucideIcons.MessageSquare, label: 'Отзывы' },
        { id: 'friends' as const, icon: LucideIcons.Users, label: 'Друзья' },
    ];

    return (
        <aside className="profile-v2-sidebar">
            {/* Навигация */}
            <div className="sidebar-card sidebar-nav">
                <div className="sidebar-card-header">
                    <LucideIcons.LayoutGrid size={18} />
                    <span>Навигация</span>
                </div>
                <nav className="sidebar-nav-list">
                    {navItems.map(item => (
                        <button
                            key={item.id}
                            className={`sidebar-nav-item ${activeSection === item.id ? 'active' : ''}`}
                            onClick={() => setActiveSection(item.id)}
                        >
                            <item.icon size={18} />
                            <span>{item.label}</span>
                            {activeSection === item.id && (
                                <div className="nav-indicator" />
                            )}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Друзья */}
            <div className="sidebar-card sidebar-friends">
                <div className="sidebar-card-header">
                    <LucideIcons.Users size={18} />
                    <span>Друзья</span>
                    <span className="friends-count">{friends.length}</span>
                </div>
                
                {isLoadingFriends ? (
                    <div className="friends-grid friends-grid--loading">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="friend-avatar-skeleton skeleton-pulse" />
                        ))}
                    </div>
                ) : friends.length > 0 ? (
                    <div className="friends-grid">
                        {friends.slice(0, 6).map((friend) => (
                            <Link
                                key={friend.id}
                                href={`/profile/${friend.username || friend.name}`}
                                className="friend-avatar-link"
                                title={friend.nickname || friend.name}
                            >
                                <div className="friend-avatar">
                                    {friend.avatarAnimatedUrl ? (
                                        <video
                                            src={friend.avatarAnimatedUrl}
                                            autoPlay
                                            loop
                                            muted
                                            playsInline
                                        />
                                    ) : friend.avatarUrl ? (
                                        <Image
                                            src={friend.avatarUrl}
                                            alt={friend.name}
                                            width={48}
                                            height={48}
                                        />
                                    ) : (
                                        <div className="friend-avatar-placeholder">
                                            {friend.name.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    {friend.verified && (
                                        <div className="friend-verified">
                                            <LucideIcons.BadgeCheck size={12} />
                                        </div>
                                    )}
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="friends-empty">
                        <LucideIcons.UserX size={32} />
                        <span>Пока нет друзей</span>
                    </div>
                )}

                {friends.length > 6 && (
                    <button 
                        className="sidebar-show-all"
                        onClick={() => setActiveSection('friends')}
                    >
                        Показать всех ({friends.length})
                    </button>
                )}
            </div>

            {/* Быстрые ссылки */}
            <div className="sidebar-card sidebar-links">
                <div className="sidebar-card-header">
                    <LucideIcons.Link2 size={18} />
                    <span>Ссылки</span>
                </div>
                <div className="sidebar-links-list">
                    <a href="#" className="sidebar-link" title="Скоро">
                        <LucideIcons.Twitter size={18} />
                    </a>
                    <a href="#" className="sidebar-link" title="Скоро">
                        <LucideIcons.Youtube size={18} />
                    </a>
                    <a href="#" className="sidebar-link" title="Скоро">
                        <LucideIcons.Github size={18} />
                    </a>
                </div>
            </div>
        </aside>
    );
};

export default ProfileV2Sidebar;
