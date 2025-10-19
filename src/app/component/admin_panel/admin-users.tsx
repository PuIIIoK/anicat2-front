'use client';

import React, { useEffect, useState } from 'react';
import { API_SERVER } from '../../../tools/constants';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import DeleteUserModal from './DeleteUserModal';

interface User {
    id: number;
    username: string;
    nickname: string;
    email: string;
    roles: string[];
    isBanned: boolean | null;
    isMuted: boolean | null;
    verified: boolean | null;
}

interface RawUser {
    userId: number;
    username: string;
    nickname: string;
    email?: string;
    roles: string[];
    banned: boolean | null;
    muted: boolean | null;
    verified: boolean | null;
}

const AdminUsers = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [search, setSearch] = useState('');
    const [sortAsc, setSortAsc] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const usersPerPage = 5;
    const router = useRouter();
    const [avatarUrls, setAvatarUrls] = useState<{ [username: string]: string }>({});
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);


    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await fetch(`${API_SERVER}/api/admin/users/list`);
            if (!res.ok) throw new Error('Ошибка при получении пользователей');
            const rawData = await res.json();

            const data: User[] = rawData.map((user: RawUser) => ({
                id: user.userId,
                username: user.username,
                nickname: user.nickname,
                email: user.email ?? '',
                roles: user.roles,
                isBanned: user.banned,
                isMuted: user.muted,
                verified: user.verified,
            }));

            setUsers(data);
            setFilteredUsers(data);
        } catch (err) {
            console.error(err);
        }
    };
    useEffect(() => {
        const fetchAvatars = async () => {
            const urls: { [username: string]: string } = {};

            await Promise.all(
                users.map(async (user) => {
                    const username = user.username?.trim();
                    if (!username) return;

                    try {
                        const res = await fetch(`${API_SERVER}/api/anime/image-links?username=${encodeURIComponent(username)}`);
                        if (!res.ok) return;
                        const data = await res.json();

                        if (data.avatarUrl) {
                            urls[username] = data.avatarUrl;
                        }
                    } catch {
                        console.warn(`Не удалось загрузить аватар для ${username}`);
                    }
                })
            );

            setAvatarUrls(urls);
        };

        if (users.length > 0) {
            fetchAvatars();
        }
    }, [users]);

    useEffect(() => {
        const filtered = [...users].filter(user => {
            const username = (user.username || '').toLowerCase();
            const nickname = (user.nickname || '').toLowerCase();
            const searchTerm = search.toLowerCase();
            
            return username.includes(searchTerm) || nickname.includes(searchTerm);
        });

        filtered.sort((a, b) => {
            const idA = a.id || 0;
            const idB = b.id || 0;
            return sortAsc ? idA - idB : idB - idA;
        });
        
        setFilteredUsers(filtered);
        setCurrentPage(1);
    }, [search, sortAsc, users]);

    const handleDeleteUser = (user: User) => {
        setUserToDelete(user);
        setDeleteModalOpen(true);
    };

    const handleCloseDeleteModal = () => {
        setDeleteModalOpen(false);
        setUserToDelete(null);
    };

    const handleConfirmDelete = () => {
        // Обновляем список пользователей после удаления
        fetchUsers();
    };

    const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
    const startIndex = (currentPage - 1) * usersPerPage;
    const visibleUsers = filteredUsers.slice(startIndex, startIndex + usersPerPage);

    return (
        <div className="modern-admin-users admin-users-container">
            {/* Десктопная версия */}
            <div className="admin-desktop-user desktop-only">
                <div className="controls-header">
                    <div className="search-container">
                        <svg className="search-icon" viewBox="0 0 24 24">
                            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                        </svg>
                        <input
                            type="text"
                            placeholder="Поиск по нику или логину..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="search-input"
                        />
                    </div>
                    <button className="sort-button" onClick={() => setSortAsc(prev => !prev)}>
                        <svg className="sort-icon" viewBox="0 0 24 24">
                            <path d="M3 18h6v-2H3v2zM3 6v2h18V6H3zm0 7h12v-2H3v2z"/>
                        </svg>
                        Сортировка {sortAsc ? '↑' : '↓'}
                    </button>
                </div>

                <div className="users-grid">
                    {visibleUsers.map(user => (
                        <div className="modern-user-card" key={user.id}>
                            <div className="user-header">
                                <div className="avatar-container">
                                    {avatarUrls[user.username] ? (
                                        <Image
                                            className="user-avatar"
                                            src={avatarUrls[user.username]}
                                            alt={user.nickname || 'Аватар'}
                                            width={56}
                                            height={56}
                                            unoptimized
                                        />
                                    ) : (
                                        <div className="user-avatar-placeholder">
                                            {user.username?.charAt(0)?.toUpperCase() || '?'}
                                        </div>
                                    )}
                                    <div className="status-indicators">
                                        {user.isBanned && <div className="status-badge banned">Бан</div>}
                                        {user.isMuted && <div className="status-badge muted">Мут</div>}
                                    </div>
                                </div>
                                <div className="user-details">
                                    <div className="user-name-container">
                                        <h3 className="display-name">
                                            {user.nickname || `@${user.username}`}
                                            {user.verified && (
                                                <svg className="verified-badge" viewBox="0 0 24 24" width="18" height="18">
                                                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="#1DA1F2"/>
                                                </svg>
                                            )}
                                        </h3>
                                        {user.nickname && (
                                            <p className="username-secondary">@{user.username}</p>
                                        )}
                                    </div>
                                    <div className="roles-container">
                                        {user.roles
                                            .filter(role => role !== 'USER')
                                            .map(role => (
                                                <span 
                                                    key={role} 
                                                    className={`role-badge ${role.toLowerCase()}`}
                                                >
                                                    {role === 'ADMIN' ? 'Админ' : 'Модер'}
                                                </span>
                                            ))
                                        }
                                    </div>
                                </div>
                            </div>
                            <div className="user-actions">
                                <Link 
                                    href={`/profile/${user.username}`}
                                    className="action-btn view"
                                >
                                    <svg viewBox="0 0 24 24">
                                        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                                    </svg>
                                    Посмотреть
                                </Link>
                                <button 
                                    className="action-btn edit"
                                    onClick={() => router.push(`/admin_panel/edit-users/${user.username}`)}
                                >
                                    <svg viewBox="0 0 24 24">
                                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                                    </svg>
                                    Настроить
                                </button>
                                <button 
                                    className="action-btn delete"
                                    onClick={() => handleDeleteUser(user)}
                                >
                                    <svg viewBox="0 0 24 24">
                                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                                    </svg>
                                    Удалить
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="modern-pagination">
                    <button 
                        className="pagination-btn"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} 
                        disabled={currentPage === 1}
                    >
                        <svg viewBox="0 0 24 24">
                            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                        </svg>
                        Назад
                    </button>
                    <div className="page-info">
                        <span className="current-page">{currentPage}</span>
                        <span className="page-separator">из</span>
                        <span className="total-pages">{totalPages}</span>
                    </div>
                    <button 
                        className="pagination-btn"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                    >
                        Вперёд
                        <svg viewBox="0 0 24 24">
                            <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/>
                        </svg>
                    </button>
                </div>
            </div>

            {/* Мобильная версия */}
            <div className="admin-mobile-user mobile-only admin-users-container">
                <div className="mobile-controls">
                    <div className="mobile-search-container">
                        <svg className="search-icon" viewBox="0 0 24 24">
                            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                        </svg>
                        <input
                            type="text"
                            placeholder="Поиск..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="mobile-search-input"
                        />
                    </div>
                    <button className="mobile-sort-button" onClick={() => setSortAsc(prev => !prev)}>
                        <svg viewBox="0 0 24 24">
                            <path d="M3 18h6v-2H3v2zM3 6v2h18V6H3zm0 7h12v-2H3v2z"/>
                        </svg>
                        {sortAsc ? '↑' : '↓'}
                    </button>
                </div>

                <div className="mobile-pagination">
                    <button 
                        className="mobile-pagination-btn"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} 
                        disabled={currentPage === 1}
                    >
                        ←
                    </button>
                    <span className="mobile-page-info">{currentPage} / {totalPages}</span>
                    <button 
                        className="mobile-pagination-btn"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                    >
                        →
                    </button>
                </div>

                <div className="mobile-users-list">
                    {visibleUsers.map(user => (
                        <div className="mobile-user-card" key={user.id}>
                            <div className="mobile-user-header">
                                <div className="mobile-avatar-container">
                                    {avatarUrls[user.username] ? (
                                        <Image
                                            className="mobile-user-avatar"
                                            src={avatarUrls[user.username]}
                                            alt={user.nickname || 'Аватар'}
                                            width={48}
                                            height={48}
                                            unoptimized
                                        />
                                    ) : (
                                        <div className="mobile-user-avatar-placeholder">
                                            {user.username?.charAt(0)?.toUpperCase() || '?'}
                                        </div>
                                    )}
                                    <div className="mobile-status-indicators">
                                        {user.isBanned && <div className="mobile-status-badge banned"></div>}
                                        {user.isMuted && <div className="mobile-status-badge muted"></div>}
                                    </div>
                                </div>
                                <div className="mobile-user-info">
                                    <div className="mobile-user-name-container">
                                        <h4 className="mobile-display-name">
                                            {user.nickname || `@${user.username}`}
                                            {user.verified && (
                                                <svg className="mobile-verified-badge" viewBox="0 0 24 24" width="16" height="16">
                                                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="#1DA1F2"/>
                                                </svg>
                                            )}
                                        </h4>
                                        {user.nickname && (
                                            <p className="mobile-username-secondary">@{user.username}</p>
                                        )}
                                    </div>
                                    <div className="mobile-roles">
                                        {user.roles
                                            .filter(role => role !== 'USER')
                                            .map(role => (
                                                <span 
                                                    key={role} 
                                                    className={`mobile-role-badge ${role.toLowerCase()}`}
                                                >
                                                    {role === 'ADMIN' ? 'А' : 'М'}
                                                </span>
                                            ))
                                        }
                                    </div>
                                </div>
                                <div className="mobile-quick-status">
                                    {!user.isBanned && !user.isMuted && <div className="status-ok">✓</div>}
                                    {user.isBanned && <div className="status-banned">!</div>}
                                    {user.isMuted && <div className="status-muted">🔇</div>}
                                </div>
                            </div>
                            <div className="mobile-user-actions">
                                <Link 
                                    href={`/profile/${user.username}`}
                                    className="mobile-action-btn view"
                                >
                                    👁
                                </Link>
                                <button 
                                    className="mobile-action-btn edit"
                                    onClick={() => router.push(`/admin_panel/edit-users/${user.username}`)}
                                >
                                    ⚙
                                </button>
                                <button 
                                    className="mobile-action-btn delete"
                                    onClick={() => handleDeleteUser(user)}
                                >
                                    🗑
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <DeleteUserModal
                user={userToDelete}
                isOpen={deleteModalOpen}
                onClose={handleCloseDeleteModal}
                onDelete={handleConfirmDelete}
            />
        </div>
    );
};

export default AdminUsers;