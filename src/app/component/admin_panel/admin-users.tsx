'use client';

import React, { useEffect, useState } from 'react';
import { API_SERVER } from '../../../tools/constants';
import { useRouter } from 'next/navigation';

interface User {
    id: number;
    username: string;
    nickname: string;
    email: string;
    roles: string[];
    isBanned: boolean;
}

const AdminUsers = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await fetch(`${API_SERVER}/api/admin/users`);
            if (!res.ok) throw new Error('Ошибка при получении пользователей');
            const data = await res.json();
            setUsers(data);
        } catch (err) {
            console.error(err);
            setError('Не удалось загрузить пользователей');
        } finally {
            setLoading(false);
        }
    };

    const handleBanUser = async (userId: number) => {
        if (!confirm('Вы уверены, что хотите забанить этого пользователя?')) return;
        try {
            const res = await fetch(`${API_SERVER}/api/admin/ban-user/${userId}`, {
                method: 'POST',
            });
            if (!res.ok) throw new Error('Ошибка при бане пользователя');
            setUsers((prev) =>
                prev.map((u) => (u.id === userId ? { ...u, isBanned: true } : u))
            );
        } catch (err) {
            console.error(err);
            alert('Ошибка при попытке бана');
        }
    };

    if (loading) return <div>Загрузка пользователей...</div>;
    if (error) return <div>{error}</div>;

    return (
        <div className="admin-section">
            <h2>👤 Пользователи</h2>
            <div className="admin-table">
                <div className="admin-table-header">
                    <span>ID</span>
                    <span>Логин</span>
                    <span>Ник</span>
                    <span>Email</span>
                    <span>Роли</span>
                    <span>Статус</span>
                    <span>Действия</span>
                </div>
                {users.map((user) => (
                    <div className="admin-table-row" key={user.id}>
                        <span>{user.id}</span>
                        <span>{user.username}</span>
                        <span>{user.nickname}</span>
                        <span>{user.email}</span>
                        <span>{user.roles.join(', ')}</span>
                        <span>{user.isBanned ? 'Забанен' : 'Активен'}</span>
                        <span className="admin-table-actions">
                            <button onClick={() => router.push(`/profile/${user.username}`)}>Посмотреть</button>
                            <button onClick={() => alert('Форма редактирования скоро появится')}>Изменить</button>
                            <button className="danger" onClick={() => handleBanUser(user.id)}>Забанить</button>
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AdminUsers;
