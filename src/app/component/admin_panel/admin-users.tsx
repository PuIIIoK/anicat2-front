'use client';

import React, { useEffect, useState } from 'react';
import { API_SERVER } from '../../../tools/constants';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface User {
    id: number;
    username: string;
    nickname: string;
    email: string;
    roles: string[];
    isBanned: boolean | null;
    isMuted: boolean | null;
}

interface RawUser {
    userId: number;
    username: string;
    nickname: string;
    email?: string;
    roles: string[];
    banned: boolean | null;
    muted: boolean | null;
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
        const filtered = [...users].filter(user =>
            (user.username?.toLowerCase() || '').includes(search.toLowerCase()) ||
            (user.nickname?.toLowerCase() || '').includes(search.toLowerCase())
        );

        filtered.sort((a, b) => sortAsc ? a.id - b.id : b.id - a.id);
        setFilteredUsers(filtered);
        setCurrentPage(1);
    }, [search, sortAsc, users]);


    const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
    const startIndex = (currentPage - 1) * usersPerPage;
    const visibleUsers = filteredUsers.slice(startIndex, startIndex + usersPerPage);

    return (
        <div className="admin-section">

            {/* Десктопная версия */}
            <div className="admin-desktop-user">
                <div className="search-sort">
                    <input
                        type="text"
                        placeholder="Поиск по нику или логину"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{padding: '8px', width: '60%'}}
                    />
                    <button onClick={() => setSortAsc(prev => !prev)}>
                        Сортировать по ID ({sortAsc ? '↑' : '↓'})
                    </button>
                </div>

                <div className="user-cards">
                    {visibleUsers.map(user => (
                        <div className="user-card" key={user.id}>
                            <div className="user-info">
                                <Image
                                    className="avatar"
                                    src={avatarUrls[user.username] || '/default-avatar.png'}
                                    alt={user.nickname || 'Аватар'}
                                    width={64}
                                    height={64}
                                    unoptimized
                                />
                                <div className="user-meta">
                                    <p><b>Логин:</b> {user.username}</p>
                                    <p><b>Ник:</b> {user.nickname}</p>
                                    <p><b>Роли:</b> {
                                        user.roles
                                            .filter(role => role !== 'USER')
                                            .map((role, index, arr) => {
                                                let label = null;
                                                if (role === 'ADMIN') {
                                                    label = <span key={role} style={{
                                                        color: '#ff4d4f',
                                                        fontWeight: 'bold'
                                                    }}>Администратор</span>;
                                                } else if (role === 'MODERATOR') {
                                                    label = <span key={role} style={{
                                                        color: '#4a76ff',
                                                        fontWeight: 'bold'
                                                    }}>Модератор</span>;
                                                }
                                                return label ? <React.Fragment
                                                    key={role}>{label}{index < arr.length - 1 ? ', ' : ''}</React.Fragment> : null;
                                            })
                                    }</p>
                                    <p><b>Бан:</b> {user.isBanned ? '❌ В бане' : '✅ Не в бане'}</p>
                                    <p><b>Мут:</b> {user.isMuted ? '🔇 В муте' : '🟢 Не в муте'}</p>
                                </div>
                            </div>
                            <div className="user-actions">
                                <button onClick={() => router.push(`/profiles/${user.username}`)}>Посмотреть</button>
                                <button
                                    onClick={() => router.push(`/admin_panel/edit-users/${user.username}`)}>Настроить
                                </button>
                                <button className="danger-outline"
                                        onClick={() => alert('Скоро появится удаление')}>Удалить
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="pagination">
                    <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1}>
                        Назад
                    </button>
                    <span>Страница {currentPage} из {totalPages}</span>
                    <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}>
                        Вперёд
                    </button>
                </div>
            </div>

            {/* Мобильная версия */}
            <div className="admin-mobile-user">

                <div className="search-sort">
                    <input
                        type="text"
                        placeholder="Поиск по нику или логину"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{padding: '8px', width: '100%', marginBottom: '10px'}}
                    />
                    <button onClick={() => setSortAsc(prev => !prev)} style={{width: '100%'}}>
                        Сортировать по ID ({sortAsc ? '↑' : '↓'})
                    </button>
                </div>
                <div className="pagination">
                    <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1}>
                        Назад
                    </button>
                    <span>Стр. {currentPage} / {totalPages}</span>
                    <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}>
                        Вперёд
                    </button>
                </div>
                <div className="user-cards">
                    {visibleUsers.map(user => (
                        <div className="user-card" key={user.id}>
                            <div className="user-info">
                                <Image
                                    className="avatar"
                                    src={avatarUrls[user.username] || '/default-avatar.png'}
                                    alt={user.nickname || 'Аватар'}
                                    width={64}
                                    height={64}
                                    unoptimized
                                />
                                <div className="user-meta">
                                    <p><b>Логин:</b> {user.username}</p>
                                    <p><b>Ник:</b> {user.nickname}</p>
                                    <p><b>Роли:</b> {
                                        user.roles
                                            .filter(role => role !== 'USER')
                                            .map((role, index, arr) => {
                                                let label = null;
                                                if (role === 'ADMIN') {
                                                    label = <span key={role} style={{
                                                        color: '#ff4d4f',
                                                        fontWeight: 'bold'
                                                    }}>Админ</span>;
                                                } else if (role === 'MODERATOR') {
                                                    label = <span key={role} style={{
                                                        color: '#4a76ff',
                                                        fontWeight: 'bold'
                                                    }}>Модер</span>;
                                                }
                                                return label ? <React.Fragment
                                                    key={role}>{label}{index < arr.length - 1 ? ', ' : ''}</React.Fragment> : null;
                                            })
                                    }</p>
                                    <p><b>Бан:</b> {user.isBanned ? '❌ В бане' : '✅'}</p>
                                    <p><b>Мут:</b> {user.isMuted ? '🔇 В муте' : '🟢'}</p>
                                </div>
                            </div>
                            <div className="user-actions">
                                <button onClick={() => router.push(`/profiles/${user.username}`)}>Посмотреть</button>
                                <button
                                    onClick={() => router.push(`/admin_panel/edit-users/${user.username}`)}>Настроить
                                </button>
                                <button className="danger-outline"
                                        onClick={() => alert('Скоро появится удаление')}>Удалить
                                </button>
                            </div>
                        </div>
                    ))}
                </div>


            </div>
        </div>
    );
};

export default AdminUsers;