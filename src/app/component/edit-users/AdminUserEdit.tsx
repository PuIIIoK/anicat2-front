'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { API_SERVER } from '../../../tools/constants';

interface UserProfile {
    id: number;
    username: string;
    nickname: string;
    roles: string[];
    isBanned: boolean;
    isMuted: boolean;
    bio: string;
}

const AdminUserEdit = () => {
    const { username } = useParams();
    const router = useRouter();
    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [originalUser, setOriginalUser] = useState<UserProfile | null>(null);
    const searchParams = useSearchParams();
    const returnTab = searchParams.get('admin_panel') ?? 'edit-users';

    useEffect(() => {
        const fetchUser = async () => {
            try {
                // Извлечение токена из cookie
                const match = document.cookie.match(/(?:^|; )token=([^;]*)/);
                const token = match ? decodeURIComponent(match[1]) : null;

                if (!token) {
                    throw new Error('Токен не найден в cookies');
                }

                const res = await fetch(`${API_SERVER}/api/auth/get-profile/id?username=${username}`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!res.ok) throw new Error('Ошибка загрузки пользователя');

                const data = await res.json();
                console.log("Пришедшие данные:", data);

                const formattedUser: UserProfile = {
                    id: data.userId,
                    username: data.username,
                    nickname: data.nickname || '',
                    roles: data.roles || [],
                    isBanned: Boolean(data.banned),
                    isMuted: Boolean(data.muted),
                    bio: data.bio || '',
                };

                setUser(formattedUser);
                setOriginalUser(formattedUser);
            } catch (err) {
                console.error(err);
                setError('Не удалось загрузить пользователя');
            } finally {
                setLoading(false);
            }
        };

        if (username) fetchUser();
    }, [username]);


    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (JSON.stringify(user) !== JSON.stringify(originalUser)) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [user, originalUser]);

    const handleSave = async () => {
        if (!user) return;

        const payload = {
            username: user.username,
            nickname: user.nickname,
            roles: user.roles,
            banned: user.isBanned,
            muted: user.isMuted,
            bio: user.bio,
        };

        try {
            const res = await fetch(`${API_SERVER}/api/admin/users/update?by=username&value=${user.username}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!res.ok) throw new Error('Ошибка при сохранении');
            alert('Пользователь обновлён');
            router.push(`/admin_panel?admin_panel=${returnTab}`);
        } catch (err) {
            console.error(err);
            alert('Ошибка при сохранении');
        }

        console.log('Отправляется:', JSON.stringify(payload, null, 2));
    };

    if (loading) return <div>Загрузка...</div>;
    if (error || !user) return <div>{error || 'Пользователь не найден'}</div>;

    return (
        <div className="edit-user-section">
            <h2>Редактирование: {user.username}</h2>

            <div className="edit-user-field">
                <label>Ник:</label>
                <input value={user.nickname} onChange={(e) => setUser({ ...user, nickname: e.target.value })} />
            </div>

            <div className="edit-user-field">
                <label>Био:</label>
                <textarea value={user.bio} onChange={(e) => setUser({ ...user, bio: e.target.value })} />
            </div>

            <div className="edit-user-field">
                <label>Роли:</label>
                <div className="edit-user-roles">
                    {['MODERATOR', 'ADMIN'].map(role => (
                        <button
                            key={role}
                            className={`role-button ${user.roles.includes(role) ? 'active' : ''}`}
                            onClick={() =>
                                setUser({
                                    ...user,
                                    roles: user.roles.includes(role)
                                        ? user.roles.filter(r => r !== role)
                                        : [...user.roles, role]
                                })
                            }
                        >
                            {role}
                        </button>
                    ))}
                </div>
            </div>

            <div className="edit-user-field">
                <label>Бан:</label>
                <button
                    className={`ban-toggle ${user.isBanned ? 'banned' : 'not-banned'}`}
                    onClick={() => setUser({ ...user, isBanned: !user.isBanned })}
                >
                    {user.isBanned ? 'Разбанить' : 'Забанить'}
                </button>
            </div>

            <div className="edit-user-field">
                <label>Мут:</label>
                <button
                    className={`mute-toggle ${user.isMuted ? 'muted' : 'not-muted'}`}
                    onClick={() => setUser({ ...user, isMuted: !user.isMuted })}
                >
                    {user.isMuted ? 'Размутить' : 'Замутить'}
                </button>
            </div>

            <div className="edit-user-buttons">
                <button className="edit-user-save-button" onClick={handleSave}>💾 Сохранить</button>
                <button
                    className="edit-user-cancel-button"
                    onClick={() => {
                        if (confirm('Вы уверены, что хотите отменить изменения?')) {
                            router.push(`/admin_panel?admin_panel=${returnTab}`);
                        }
                    }}
                >
                    ❌ Отмена
                </button>
            </div>
        </div>
    );
};

export default AdminUserEdit;
