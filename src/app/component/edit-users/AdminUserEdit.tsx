'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { API_SERVER } from '../../../tools/constants';
import Image from 'next/image';
import { 
    Ban, 
    VolumeX, 
    CheckCircle, 
    Crown, 
    Shield, 
    User, 
    ShieldCheck, 
    Settings, 
    Eye,
    X,
    Save,
    AlertTriangle,
    CheckCircle2,
    Bug,
    Cat,
    ShieldPlus,
    Star,
    Coffee,
    HelpingHand,
    HelpCircle,
    Trash2 
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { BADGE_META } from '../profile-page-old/badgeMeta';
import './AdminUserEdit.scss';

interface UserProfile {
    id: number;
    username: string;
    nickname: string;
    roles: string[];
    isBanned: boolean;
    isMuted: boolean;
    bio: string;
    verified: boolean;
    badges: string[];
    banReason?: string;
    banStartDate?: string;
    banEndDate?: string;
    isPermanentBan?: boolean;
    muteReason?: string;
    muteEndDate?: string;
}

const AdminUserEdit = () => {
    const { username } = useParams();
    const router = useRouter();
    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [originalUser, setOriginalUser] = useState<UserProfile | null>(null);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [notification, setNotification] = useState<{
        show: boolean;
        message: string;
        type: 'success' | 'error';
    }>({
        show: false,
        message: '',
        type: 'success'
    });
    const searchParams = useSearchParams();
    const returnTab = searchParams.get('admin_panel') ?? 'edit-users';
    
    // Состояния для системы банов
    const [showBanModal, setShowBanModal] = useState(false);
    const [banDuration, setBanDuration] = useState<'1d' | '3d' | '7d' | '30d' | 'permanent'>('1d');
    const [banReason, setBanReason] = useState('');
    const [showMuteModal, setShowMuteModal] = useState(false);
    const [muteDuration, setMuteDuration] = useState<'1h' | '3h' | '1d' | '7d'>('1h');
    const [muteReason, setMuteReason] = useState('');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const fetchUser = async () => {
            try {
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

                // Загружаем бейджики пользователя
                let userBadges: string[] = [];
                try {
                    const badgesRes = await fetch(`${API_SERVER}/api/badges/user/${encodeURIComponent(data.username)}`, {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    });
                    if (badgesRes.ok) {
                        const badgesData = await badgesRes.json();
                        userBadges = Array.isArray(badgesData) ? badgesData.map((b: { badgeName: string }) => b.badgeName as string) : [];
                    }
                } catch (badgeErr) {
                    console.warn('Не удалось загрузить бейджики:', badgeErr);
                }

                const formattedUser: UserProfile = {
                    id: data.userId,
                    username: data.username,
                    nickname: data.nickname || '',
                    roles: data.roles || [],
                    isBanned: Boolean(data.banned),
                    isMuted: Boolean(data.muted),
                    bio: data.bio || '',
                    verified: Boolean(data.verified),
                    badges: userBadges,
                    banReason: data.banReason,
                    banStartDate: data.banStartDate,
                    banEndDate: data.banEndDate,
                    isPermanentBan: data.isPermanentBan,
                    muteReason: data.muteReason,
                    muteEndDate: data.muteEndDate,
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
        const fetchAvatar = async () => {
            if (!user?.username) return;

            try {
                const res = await fetch(`${API_SERVER}/api/anime/image-links?username=${encodeURIComponent(user.username)}`);
                if (!res.ok) return;
                const data = await res.json();

                if (data.avatarUrl) {
                    setAvatarUrl(data.avatarUrl);
                }
            } catch {
                console.warn(`Не удалось загрузить аватар для ${user.username}`);
            }
        };

        if (user) {
            fetchAvatar();
        }
    }, [user]);

    // Функция для показа уведомления
    const showNotification = (message: string, type: 'success' | 'error') => {
        setNotification({ show: true, message, type });
        setTimeout(() => {
            setNotification(prev => ({ ...prev, show: false }));
        }, 4000); // Скрыть через 4 секунды
    };

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

    // Функция для применения бана
    const handleApplyBan = () => {
        if (!banReason.trim()) {
            showNotification('Укажите причину бана', 'error');
            return;
        }

        const now = new Date();
        let endDate: Date | null = null;
        
        switch (banDuration) {
            case '1d':
                endDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
                break;
            case '3d':
                endDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
                break;
            case '7d':
                endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                break;
            case '30d':
                endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
                break;
            case 'permanent':
                endDate = null;
                break;
        }

        setUser({
            ...user!,
            isBanned: true,
            banReason: banReason,
            banStartDate: now.toISOString(),
            banEndDate: endDate ? endDate.toISOString() : undefined,
            isPermanentBan: banDuration === 'permanent'
        });
        
        setShowBanModal(false);
        setBanReason('');
        showNotification('Бан применен', 'success');
    };

    const handleApplyMute = () => {
        if (!muteReason.trim()) {
            showNotification('Укажите причину мута', 'error');
            return;
        }

        const now = new Date();
        let endDate: Date;
        
        switch (muteDuration) {
            case '1h':
                endDate = new Date(now.getTime() + 60 * 60 * 1000);
                break;
            case '3h':
                endDate = new Date(now.getTime() + 3 * 60 * 60 * 1000);
                break;
            case '1d':
                endDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
                break;
            case '7d':
                endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                break;
            default:
                endDate = new Date(now.getTime() + 60 * 60 * 1000);
                break;
        }

        setUser({
            ...user!,
            isMuted: true,
            muteReason: muteReason,
            muteEndDate: endDate.toISOString()
        });
        
        setShowMuteModal(false);
        setMuteReason('');
        showNotification('Мут применен', 'success');
    };

    const handleDeleteUser = async () => {
        if (!user) return;

        setIsDeleting(true);
        try {
            const tokenMatch = document.cookie.match(/(?:^|; )token=([^;]*)/);
            const token = tokenMatch ? tokenMatch[1] : null;

            if (!token) {
                showNotification('Необходима авторизация', 'error');
                return;
            }

            const response = await fetch(`${API_SERVER}/api/admin/users/${user.username}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                showNotification('Пользователь успешно удален', 'success');
                setShowDeleteModal(false);
                // Перенаправляем на список пользователей через небольшую задержку
                setTimeout(() => {
                    router.push(`/admin_panel?admin_panel=edit-users`);
                }, 1500);
            } else {
                const errorText = await response.text();
                showNotification(`Ошибка при удалении: ${errorText}`, 'error');
            }
        } catch (error) {
            console.error('Ошибка при удалении пользователя:', error);
            showNotification('Произошла ошибка при удалении пользователя', 'error');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSave = async () => {
        if (!user) return;

        const payload = {
            username: user.username,
            nickname: user.nickname,
            roles: user.roles,
            banned: user.isBanned,
            muted: user.isMuted,
            bio: user.bio,
            verified: user.verified,
            banReason: user.banReason,
            banStartDate: user.banStartDate,
            banEndDate: user.banEndDate,
            isPermanentBan: user.isPermanentBan,
            muteReason: user.muteReason,
            muteEndDate: user.muteEndDate,
        };

        try {
            const match = document.cookie.match(/(?:^|; )token=([^;]*)/);
            const token = match ? decodeURIComponent(match[1]) : null;

            if (!token) {
                throw new Error('Токен не найден в cookies');
            }

            // Обновляем основную информацию пользователя
            const res = await fetch(`${API_SERVER}/api/admin/users/update?by=username&value=${user.username}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            if (!res.ok) throw new Error('Ошибка при сохранении профиля');

            // Обновляем бейджики пользователя
            const badgesPayload = {
                badges: user.badges,
            };

            const badgesRes = await fetch(`${API_SERVER}/api/badges/set/${encodeURIComponent(user.username)}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(badgesPayload),
            });

            if (!badgesRes.ok) {
                console.warn('Ошибка при обновлении бейджиков:', await badgesRes.text());
                // Продолжаем выполнение, так как основная информация сохранена
            }

            showNotification('Пользователь успешно обновлён!', 'success');
            
            // Задержка перед переходом, чтобы пользователь увидел уведомление
            setTimeout(() => {
                router.push(`/admin_panel?admin_panel=${returnTab}`);
            }, 1500);
        } catch (err) {
            console.error(err);
            showNotification('Ошибка при сохранении: ' + (err as Error).message, 'error');
        }
    };

    if (loading) return (
        <div className="modern-edit-page">
            <div className="loading-container-edit">
                <div className="loading-spinner"></div>
                <p>Загрузка...</p>
            </div>
        </div>
    );
    
    if (error || !user) return (
        <div className="modern-edit-page">
                            <div className="error-container-edit">
                <div className="error-icon">
                    <AlertTriangle size={48} />
                </div>
                <p>{error || 'Пользователь не найден'}</p>
            </div>
        </div>
    );

    return (
        <div className="modern-edit-page">
            {/* Уведомление */}
            {notification.show && (
                <div 
                    className={`notification ${notification.type}`}
                    onClick={() => setNotification(prev => ({ ...prev, show: false }))}
                >
                    <div className="notification-content">
                        <div className="notification-icon">
                            {notification.type === 'success' ? (
                                <CheckCircle size={20} />
                            ) : (
                                <AlertTriangle size={20} />
                            )}
                        </div>
                        <span className="notification-message">{notification.message}</span>
                        <button 
                            className="notification-close"
                            onClick={(e) => {
                                e.stopPropagation();
                                setNotification(prev => ({ ...prev, show: false }));
                            }}
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>
            )}

            <div className="user-card">
                {/* Левая секция - Профиль пользователя */}
                <div className="user-profile-section">
                    <div className="profile-header">
                        <div className="profile-avatar">
                            {avatarUrl ? (
                                <Image
                                    src={avatarUrl}
                                    alt={user.nickname || user.username}
                                    width={120}
                                    height={120}
                                    className="avatar-image"
                                    unoptimized
                                />
                            ) : (
                                <div className="avatar-placeholder">
                                    {user.username.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>
                        <div className="profile-info">
                            <h1 className="user-display-name">{user.nickname || user.username}</h1>
                            <div className="user-details">
                                <span className="username">@{user.username}</span>
                                <span className="user-id">ID: {user.id}</span>
                            </div>
                        </div>
                    </div>

                    <div className="profile-stats">
                        <div className="stat-item">
                            <div className="stat-label">Статус</div>
                            <div className="stat-value">
                                {user.isBanned ? (
                                    <span className="status-badge banned">
                                        <Ban size={16} />
                                        Заблокирован
                                    </span>
                                ) : user.isMuted ? (
                                    <span className="status-badge muted">
                                        <VolumeX size={16} />
                                        В муте
                                    </span>
                                ) : (
                                    <span className="status-badge active">
                                        <CheckCircle size={16} />
                                        Активен
                                    </span>
                                )}
                            </div>
                </div>
                        
                        <div className="stat-item">
                            <div className="stat-label">Роли</div>
                            <div className="stat-value">
                                {user.roles.filter(role => role !== 'USER').length > 0 ? (
                                    <div className="roles-list">
                                        {user.roles.filter(role => role !== 'USER').map(role => (
                                            <span key={role} className={`role-badge ${role.toLowerCase()}`}>
                                                {role === 'ADMIN' ? (
                                                    <>
                                                        <Crown size={14} />
                                                        Админ
                                                    </>
                                                ) : (
                                                    <>
                                                        <Shield size={14} />
                                                        Модер
                                                    </>
                                                )}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <span className="no-roles">Пользователь</span>
                                )}
                            </div>
                        </div>

                        {user.bio && (
                            <div className="stat-item">
                                <div className="stat-label">Описание</div>
                                <div className="stat-value bio-text">{user.bio}</div>
                            </div>
                        )}

                        {/* Верификация */}
                        <div className="stat-item">
                            <div className="stat-label">Верификация</div>
                            <div className="stat-value">
                                {user.verified ? (
                                    <span className="status-badge verified">
                                        <CheckCircle2 size={16} />
                                        Верифицирован
                                    </span>
                                ) : (
                                    <span className="status-badge not-verified">
                                        Не верифицирован
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Бейджики */}
                        {user.badges.length > 0 && (
                            <div className="stat-item">
                                <div className="stat-label">Достижения</div>
                                <div className="stat-value">
                                    <div className="badges-list">
                                        {user.badges.map(badgeKey => {
                                            const badgeMeta = BADGE_META[badgeKey];
                                            if (!badgeMeta) return null;

                                            const iconMap: Record<string, LucideIcon> = {
                                                Bug,
                                                Cat,
                                                Shield,
                                                ShieldPlus,
                                                Star,
                                                Coffee,
                                                HelpingHand
                                            };
                                            const IconComponent = iconMap[badgeMeta.icon] || Shield;

                                            return (
                                                <span key={badgeKey} className="badge-item" title={badgeMeta.description}>
                                                    <IconComponent size={14} />
                                                    {badgeMeta.title}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="profile-actions">
                        <Link 
                            href={`/profile/${user.username}`}
                            className="profile-action-btn view-profile"
                        >
                            <Eye size={18} />
                            Посмотреть профиль
                        </Link>
                    </div>
                </div>

                {/* Правая секция - Форма редактирования */}
                <div className="user-edit-section">
                    <div className="edit-header">
                        <h2 className="edit-title">Настройки пользователя</h2>
                        <p className="edit-subtitle">Измените информацию и права доступа</p>
                    </div>

                    <div className="edit-form">
                        {/* Секция профиля */}
                        <div className="form-section">
                            <h3 className="section-title">
                                <User className="section-icon" size={20} />
                                Информация профиля
                            </h3>
                            <div className="form-fields">
                                <div className="form-field">
                                    <label className="field-label">Отображаемое имя</label>
                                    <input 
                                        type="text"
                                        className="field-input"
                                        value={user.nickname}
                                        onChange={(e) => setUser({ ...user, nickname: e.target.value })}
                                        placeholder="Введите имя пользователя"
                                    />
                                </div>

                                <div className="form-field">
                                    <label className="field-label">Описание профиля</label>
                                    <textarea 
                                        className="field-textarea"
                                        value={user.bio}
                                        onChange={(e) => setUser({ ...user, bio: e.target.value })}
                                        placeholder="Расскажите о пользователе..."
                                        rows={3}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Секция ролей */}
                        <div className="form-section">
                            <h3 className="section-title">
                                <ShieldCheck className="section-icon" size={20} />
                                Права доступа
                            </h3>
                            <div className="form-fields">
                                <div className="roles-grid">
                            {['MODERATOR', 'ADMIN'].map(role => {
                                        const isActive = user.roles.includes(role);
                                return (
                                    <button
                                        key={role}
                                        type="button"
                                                className={`role-toggle ${isActive ? 'active' : ''}`}
                                        onClick={() =>
                                            setUser({
                                                ...user,
                                                        roles: isActive 
                                                            ? user.roles.filter(r => r !== role) 
                                                            : [...user.roles, role]
                                                    })
                                                }
                                            >
                                                <div className="role-icon">
                                                    {role === 'ADMIN' ? <Crown size={24} /> : <Shield size={24} />}
                                                </div>
                                                <div className="role-info">
                                                    <span className="role-name">
                                                        {role === 'ADMIN' ? 'Администратор' : 'Модератор'}
                                                    </span>
                                                    <span className="role-description">
                                                        {role === 'ADMIN' 
                                                            ? 'Полный доступ к системе' 
                                                            : 'Модерация контента'
                                                        }
                                                    </span>
                                                </div>
                                                <div className="role-checkbox">
                                                    {isActive && <svg viewBox="0 0 24 24">
                                                        <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/>
                                                    </svg>}
                                                </div>
                                    </button>
                                );
                            })}
                                </div>
                        </div>
                    </div>

                        {/* Секция модерации */}
                        <div className="form-section">
                            <h3 className="section-title">
                                <Settings className="section-icon" size={20} />
                                Модерация
                            </h3>
                            <div className="form-fields">
                                <div className="moderation-controls">
                                    <div className="moderation-item">
                                        <div className="moderation-info">
                                            <div className="moderation-title">Блокировка пользователя</div>
                                            <div className="moderation-description">
                                                {user.isBanned ? (
                                                    <div className="ban-info">
                                                        <span className="ban-status">🔴 Пользователь заблокирован</span>
                                                        {user.banReason && <p>Причина: {user.banReason}</p>}
                                                        {user.isPermanentBan ? (
                                                            <p>Тип: Перманентный бан</p>
                                                        ) : (
                                                            <>
                                                                {user.banStartDate && <p>С: {new Date(user.banStartDate).toLocaleString('ru-RU')}</p>}
                                                                {user.banEndDate && <p>До: {new Date(user.banEndDate).toLocaleString('ru-RU')}</p>}
                                                            </>
                                                        )}
                                                    </div>
                                                ) : (
                                                    'Заблокированный пользователь не может входить в систему'
                                                )}
                                            </div>
                                        </div>
                                        {user.isBanned ? (
                                            <button
                                                type="button"
                                                className="moderation-toggle active danger"
                                                onClick={() => {
                                                    setUser({ 
                                                        ...user, 
                                                        isBanned: false,
                                                        banReason: undefined,
                                                        banStartDate: undefined,
                                                        banEndDate: undefined,
                                                        isPermanentBan: false
                                                    });
                                                }}
                                            >
                                                <Ban size={16} />
                                                <span>Снять бан</span>
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                className="moderation-toggle"
                                                onClick={() => setShowBanModal(true)}
                                            >
                                                <Ban size={16} />
                                                <span>Заблокировать</span>
                                            </button>
                                        )}
                                    </div>

                                    <div className="moderation-item">
                                        <div className="moderation-info">
                                            <div className="moderation-title">Ограничение комментариев</div>
                                            <div className="moderation-description">
                                                {user.isMuted ? (
                                                    <div className="ban-info">
                                                        <span className="ban-status">🟡 Пользователь ограничен</span>
                                                        {user.muteReason && <p>Причина: {user.muteReason}</p>}
                                                        {user.muteEndDate && <p>До: {new Date(user.muteEndDate).toLocaleString('ru-RU')}</p>}
                                                    </div>
                                                ) : (
                                                    'Пользователь не может оставлять комментарии и отзывы'
                                                )}
                                            </div>
                                        </div>
                                        {user.isMuted ? (
                                            <button
                                                type="button"
                                                className="moderation-toggle active warning"
                                                onClick={() => {
                                                    setUser({ 
                                                        ...user, 
                                                        isMuted: false,
                                                        muteReason: undefined,
                                                        muteEndDate: undefined
                                                    });
                                                }}
                                            >
                                                <VolumeX size={16} />
                                                <span>Снять мут</span>
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                className="moderation-toggle"
                                                onClick={() => setShowMuteModal(true)}
                                            >
                                                <VolumeX size={16} />
                                                <span>Заглушить</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* FAQ Секция */}
                        <div className="form-section faq-section">
                            <h3 className="section-title">
                                <HelpCircle className="section-icon" size={20} />
                                Руководство по модерации
                            </h3>
                            <div className="form-fields">
                                <div className="faq-content">
                                    <div className="faq-item">
                                        <h4 className="faq-title">🔇 Ограничение комментариев (Мут)</h4>
                                        <p className="faq-description">
                                            <strong>Когда применять:</strong> Только если пользователь себя неприлично вел в комментариях.
                                        </p>
                                        <p className="faq-warning">
                                            <AlertTriangle size={14} />
                                            <strong>Важно:</strong> Не включать вместе с баном!
                                        </p>
                                    </div>

                                    <div className="faq-item">
                                        <h4 className="faq-title">🚫 Блокировка пользователя</h4>
                                        <p className="faq-description">
                                            <strong>Когда применять:</strong> Если пользователь нарушил правила в отзывах и комментариях.
                                        </p>
                                    </div>

                                    <div className="faq-item danger">
                                        <h4 className="faq-title">⚠️ Перманентная блокировка</h4>
                                        <p className="faq-description">
                                            <strong>Когда применять:</strong> Если пользователь нарушил правила площадки:
                                        </p>
                                        <ul className="faq-list">
                                            <li>Оскорбительный ник</li>
                                            <li>Нарушение правил в отзывах и комментах</li>
                                        </ul>
                                        <p className="faq-warning danger">
                                            <AlertTriangle size={14} />
                                            <strong>ПРИМЕНЯТЬ В КРАЙНЕМ СЛУЧАЕ</strong>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Секция верификации и бейджиков */}
                        <div className="form-section">
                            <h3 className="section-title">
                                <CheckCircle2 className="section-icon" size={20} />
                                Верификация и достижения
                            </h3>
                            <div className="form-fields">
                                {/* Верификация */}
                                <div className="verification-container">
                                    <div className="verification-item">
                                        <div className="verification-info">
                                            <div className="verification-title">Верификация пользователя</div>
                                            <div className="verification-description">
                                                Верифицированные пользователи получают галочку в профиле
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            className={`verification-toggle ${user.verified ? 'active verified' : ''}`}
                                            onClick={() => setUser({ ...user, verified: !user.verified })}
                                        >
                                            <div className="toggle-track">
                                                <div className="toggle-thumb"></div>
                                            </div>
                                            <span>{user.verified ? 'Снять верификацию' : 'Верифицировать'}</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Бейджики */}
                                <div className="badges-container">
                                    <div className="badges-header">
                                        <div className="badges-title">Достижения пользователя</div>
                                        <div className="badges-description">
                                            Выберите бейджики, которые будут отображаться в профиле
                                        </div>
                                    </div>
                                    <div className="badges-grid">
                                        {Object.entries(BADGE_META).map(([badgeKey, badgeMeta]) => {
                                            const isActive = user.badges.includes(badgeKey);
                                            const iconMap: Record<string, LucideIcon> = {
                                                Bug,
                                                Cat,
                                                Shield,
                                                ShieldPlus,
                                                Star,
                                                Coffee,
                                                HelpingHand
                                            };
                                            const IconComponent = iconMap[badgeMeta.icon] || Shield;

                                            return (
                                                <button
                                                    key={badgeKey}
                                                    type="button"
                                                    className={`badge-toggle ${isActive ? 'active' : ''}`}
                                                    onClick={() =>
                                                        setUser({
                                                            ...user,
                                                            badges: isActive 
                                                                ? user.badges.filter(b => b !== badgeKey) 
                                                                : [...user.badges, badgeKey]
                                                        })
                                                    }
                                                    title={badgeMeta.description}
                                                >
                                                    <div className="badge-icon">
                                                        <IconComponent size={20} />
                                                    </div>
                                                    <div className="badge-info">
                                                        <span className="badge-name">{badgeMeta.title}</span>
                                                        <span className="badge-description">{badgeMeta.description}</span>
                                                    </div>
                                                    <div className="badge-checkbox">
                                                        {isActive && <CheckCircle size={16} />}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Кнопки действий */}
                    <div className="edit-actions">
                        <button
                            type="button"
                            className="btn-danger"
                            onClick={() => setShowDeleteModal(true)}
                        >
                            <Trash2 size={18} />
                            Удалить пользователя
                        </button>
                        
                        <div className="edit-actions-right">
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => {
                                    if (JSON.stringify(user) !== JSON.stringify(originalUser)) {
                                        showNotification('Имеются несохраненные изменения. Сохраните перед выходом!', 'error');
                                    } else {
                                        router.push(`/admin_panel?admin_panel=${returnTab}`);
                                    }
                                }}
                            >
                                <X size={18} />
                                Отмена
                            </button>
                            <button 
                                type="button"
                                className="btn-primary"
                                onClick={handleSave}
                            >
                                <Save size={18} />
                                Сохранить изменения
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Модальное окно для бана */}
            {showBanModal && (
                <div className="ban-modal-overlay" onClick={() => setShowBanModal(false)}>
                    <div className="ban-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="ban-modal-header">
                            <h3>
                                <Ban size={20} />
                                Заблокировать пользователя
                            </h3>
                            <button className="close-btn" onClick={() => setShowBanModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="ban-modal-content">
                            <div className="ban-user-info">
                                <p>Вы собираетесь заблокировать пользователя:</p>
                                <strong>@{user.username}</strong>
                            </div>

                            <div className="ban-form-group">
                                <label>Срок блокировки</label>
                                <div className="ban-duration-options">
                                    <button 
                                        className={`duration-btn ${banDuration === '1d' ? 'active' : ''}`}
                                        onClick={() => setBanDuration('1d')}
                                    >
                                        1 день
                                    </button>
                                    <button 
                                        className={`duration-btn ${banDuration === '3d' ? 'active' : ''}`}
                                        onClick={() => setBanDuration('3d')}
                                    >
                                        3 дня
                                    </button>
                                    <button 
                                        className={`duration-btn ${banDuration === '7d' ? 'active' : ''}`}
                                        onClick={() => setBanDuration('7d')}
                                    >
                                        7 дней
                                    </button>
                                    <button 
                                        className={`duration-btn ${banDuration === '30d' ? 'active' : ''}`}
                                        onClick={() => setBanDuration('30d')}
                                    >
                                        30 дней
                                    </button>
                                    <button 
                                        className={`duration-btn danger ${banDuration === 'permanent' ? 'active' : ''}`}
                                        onClick={() => setBanDuration('permanent')}
                                    >
                                        Навсегда
                                    </button>
                                </div>
                            </div>

                            <div className="ban-form-group">
                                <label>Причина блокировки <span className="required">*</span></label>
                                <textarea
                                    className="ban-reason-input"
                                    placeholder="Укажите причину блокировки..."
                                    value={banReason}
                                    onChange={(e) => setBanReason(e.target.value)}
                                    rows={4}
                                />
                            </div>

                            {banDuration === 'permanent' && (
                                <div className="warning-message">
                                    <AlertTriangle size={16} />
                                    <p>Внимание! Перманентный бан полностью заблокирует доступ к аккаунту.</p>
                                </div>
                            )}
                        </div>

                        <div className="ban-modal-footer">
                            <button className="btn-cancel" onClick={() => setShowBanModal(false)}>
                                Отмена
                            </button>
                            <button 
                                className="btn-confirm-ban" 
                                onClick={handleApplyBan}
                                disabled={!banReason.trim()}
                            >
                                <Ban size={18} />
                                Заблокировать
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Модальное окно для мута */}
            {showMuteModal && (
                <div className="ban-modal-overlay" onClick={() => setShowMuteModal(false)}>
                    <div className="ban-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="ban-modal-header">
                            <h3>
                                <VolumeX size={20} />
                                Заглушить пользователя
                            </h3>
                            <button className="close-btn" onClick={() => setShowMuteModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="ban-modal-content">
                            <div className="ban-user-info">
                                <p>Вы собираетесь ограничить комментарии пользователя:</p>
                                <strong>@{user.username}</strong>
                            </div>

                            <div className="ban-form-group">
                                <label>Срок ограничения</label>
                                <div className="ban-duration-options">
                                    <button 
                                        className={`duration-btn ${muteDuration === '1h' ? 'active' : ''}`}
                                        onClick={() => setMuteDuration('1h')}
                                    >
                                        1 час
                                    </button>
                                    <button 
                                        className={`duration-btn ${muteDuration === '3h' ? 'active' : ''}`}
                                        onClick={() => setMuteDuration('3h')}
                                    >
                                        3 часа
                                    </button>
                                    <button 
                                        className={`duration-btn ${muteDuration === '1d' ? 'active' : ''}`}
                                        onClick={() => setMuteDuration('1d')}
                                    >
                                        1 день
                                    </button>
                                    <button 
                                        className={`duration-btn ${muteDuration === '7d' ? 'active' : ''}`}
                                        onClick={() => setMuteDuration('7d')}
                                    >
                                        7 дней
                                    </button>
                                </div>
                            </div>

                            <div className="ban-form-group">
                                <label>Причина ограничения <span className="required">*</span></label>
                                <textarea
                                    className="ban-reason-input"
                                    placeholder="Укажите причину ограничения комментариев..."
                                    value={muteReason}
                                    onChange={(e) => setMuteReason(e.target.value)}
                                    rows={4}
                                />
                            </div>

                            <div className="warning-message">
                                <AlertTriangle size={16} />
                                <p>Пользователь не сможет оставлять комментарии и отзывы до окончания срока.</p>
                            </div>
                        </div>

                        <div className="ban-modal-footer">
                            <button className="btn-cancel" onClick={() => setShowMuteModal(false)}>
                                Отмена
                            </button>
                            <button 
                                className="btn-confirm-ban" 
                                onClick={handleApplyMute}
                                disabled={!muteReason.trim()}
                            >
                                <VolumeX size={18} />
                                Заглушить
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Модальное окно для удаления пользователя */}
            {showDeleteModal && (
                <div className="ban-modal-overlay" onClick={() => setShowDeleteModal(false)}>
                    <div className="ban-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="ban-modal-header">
                            <h3>
                                <Trash2 size={20} />
                                Удалить пользователя
                            </h3>
                            <button className="close-btn" onClick={() => setShowDeleteModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="ban-modal-content">
                            <div className="ban-user-info">
                                <p>Вы собираетесь <strong>навсегда</strong> удалить пользователя:</p>
                                <strong>@{user?.username}</strong>
                            </div>

                            <div className="warning-message danger">
                                <AlertTriangle size={16} />
                                <div>
                                    <p><strong>ВНИМАНИЕ! Это действие необратимо!</strong></p>
                                    <p>Будут удалены:</p>
                                    <ul>
                                        <li>Профиль пользователя и все данные</li>
                                        <li>Все комментарии и ответы</li>
                                        <li>Все отзывы и оценки аниме</li>
                                        <li>Коллекции и прогресс просмотра</li>
                                        <li>История активности</li>
                                        <li>Связи с друзьями</li>
                                        <li><strong>Все бейджи пользователя</strong></li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div className="ban-modal-footer">
                            <button className="btn-cancel" onClick={() => setShowDeleteModal(false)}>
                                Отмена
                            </button>
                            <button 
                                className="btn-confirm-ban danger" 
                                onClick={handleDeleteUser}
                                disabled={isDeleting}
                            >
                                {isDeleting ? (
                                    <>
                                        <div className="loading-spinner"></div>
                                        Удаление...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 size={18} />
                                        Удалить навсегда
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminUserEdit;
