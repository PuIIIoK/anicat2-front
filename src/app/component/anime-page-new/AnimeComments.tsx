import React, { useState, useEffect } from 'react';
import { ArrowBigUp, ArrowBigDown } from 'lucide-react';
import CommentsModalNew from './CommentsModalNew';
import { API_SERVER } from '@/hosts/constants';

interface Comment {
    id: number;
    username: string;
    nickname?: string;
    verified?: boolean;
    roles?: string[];
    text: string;
    likes: number;
    dislikes: number;
    userReaction?: 'like' | 'dislike' | null;
    createdAt: string;
}

interface CommentApiResponse {
    id: number;
    animeId: number;
    animeTitle: string;
    text: string;
    userUsername: string;
    nickname?: string;
    roles: string;
    verified: boolean;
    likes: number;
    dislikes: number;
    createdAt: string;
}

interface Props {
    animeId: string;
    isModernDesign?: boolean;
}

const AnimeCommentsSimple: React.FC<Props> = ({ animeId, isModernDesign = false }) => {
    const [showModal, setShowModal] = useState(false);
    const [showAuthFullScreen, setShowAuthFullScreen] = useState(false);
    const [comments, setComments] = useState<Comment[]>([]);
    const [avatars, setAvatars] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [usernameFromToken, setUsernameFromToken] = useState<string | null>(null);

    const openModal = () => setShowModal(true);
    const closeModal = () => setShowModal(false);

    useEffect(() => {
        const match = document.cookie.match(/(?:^|;\s*)token\s*=\s*([^;]+)/);
        const token = match ? match[1] : null;
        if (!token) return;

        fetch(`${API_SERVER}/api/auth/username-from-token`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
            .then(res => {
                if (!res.ok) throw new Error('Ошибка при получении username');
                return res.json();
            })
            .then(data => {
                if (data.username) {
                    setUsernameFromToken(data.username);
                } else {
                    console.warn('Username не найден в ответе', data);
                }
            })
            .catch(err => {
                console.error('Ошибка вызова API:', err);
            });
    }, []);

    useEffect(() => {
        const REACTIONS_KEY = 'anime_comment_reactions';

        const getReactionsFromStorage = (): Record<number, 'like' | 'dislike'> => {
            try {
                return JSON.parse(localStorage.getItem(REACTIONS_KEY) || '{}');
            } catch {
                return {};
            }
        };

        const saveReactionsToStorage = (reactions: Record<number, 'like' | 'dislike'>) => {
            localStorage.setItem(REACTIONS_KEY, JSON.stringify(reactions));
        };

        const fetchComments = async () => {
            try {
                setLoading(true);

                const response = await fetch(`${API_SERVER}/api/comments/top/${animeId}`);
                if (!response.ok) throw new Error('Ошибка при загрузке комментариев');

                const rawComments = await response.json();
                const localReactions = getReactionsFromStorage();
                const updatedReactions: Record<number, 'like' | 'dislike'> = {};

                const formattedComments = rawComments.map((c: CommentApiResponse) => {
                    const id = c.id;
                    const localReaction = localReactions[id];

                    if (c.likes === 0 && c.dislikes === 0 && localReaction) {
                        return {
                            id,
                            username: c.userUsername,
                            nickname: c.nickname,
                            verified: c.verified,
                            roles: c.roles ? c.roles.split(',').map(r => r.trim()) : [],
                            text: c.text,
                            likes: 0,
                            dislikes: 0,
                            userReaction: null,
                            createdAt: c.createdAt
                        };
                    }

                    if (localReaction) {
                        updatedReactions[id] = localReaction;
                    }

                    let adjustedLikes = c.likes - c.dislikes;
                    if (localReaction === 'like') adjustedLikes += 1;
                    else if (localReaction === 'dislike') adjustedLikes -= 1;

                    return {
                        id,
                        username: c.userUsername,
                        nickname: c.nickname,
                        verified: c.verified,
                        roles: c.roles ? c.roles.split(',').map(r => r.trim()) : [],
                        text: c.text,
                        likes: adjustedLikes,
                        dislikes: c.dislikes,
                        userReaction: localReaction || null,
                        createdAt: c.createdAt
                    };
                });

                saveReactionsToStorage(updatedReactions);
                setComments(formattedComments);

                const usernames = new Set<string>();
                for (const c of formattedComments) {
                    if (c.username) usernames.add(c.username);
                }

                const avatarResults = await Promise.all(
                    Array.from(usernames).map(async (username) => {
                        try {
                            const res = await fetch(`${API_SERVER}/api/profiles/avatar?username=${encodeURIComponent(username)}`);
                            if (!res.ok) return { username, url: '' };
                            const json = await res.json();
                            return { username, url: json.url || '' };
                        } catch {
                            return { username, url: '' };
                        }
                    })
                );

                const avatarMap: Record<string, string> = {};
                avatarResults.forEach(({ username, url }) => {
                    avatarMap[username] = url;
                });

                setAvatars(avatarMap);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
            } finally {
                setLoading(false);
            }
        };

        fetchComments();
    }, [animeId]);

    const toggleReaction = async (id: number, type: 'like' | 'dislike') => {
        const tokenMatch = document.cookie.match(/(?:^|;\s*)token\s*=\s*([^;]+)/);
        if (!tokenMatch) {
            setShowAuthFullScreen(true);
            return;
        }
        const localKey = `comment-reaction-${id}`;
        const stored = localStorage.getItem(localKey) as 'like' | 'dislike' | null;

        const isSameReaction = stored === type;
        const isSwitching = stored && stored !== type;

        try {
            if (isSameReaction) {
                await fetch(`${API_SERVER}/api/comments/${id}/remove-reaction`, { method: 'PUT' });
                localStorage.removeItem(localKey);
            } else {
                await fetch(`${API_SERVER}/api/comments/${id}/${type}`, { method: 'PUT' });
                localStorage.setItem(localKey, type);
            }

            setComments(prev => prev.map(comment => {
                if (comment.id !== id) return comment;

                let newLikes = comment.likes;
                let newDislikes = comment.dislikes;

                if (isSameReaction) {
                    if (type === 'like') newLikes -= 1;
                    else newDislikes -= 1;
                    return { ...comment, likes: newLikes, dislikes: newDislikes, userReaction: null };
                } else if (isSwitching) {
                    if (stored === 'like') newLikes -= 1;
                    else newDislikes -= 1;
                    if (type === 'like') newLikes += 1;
                    else newDislikes += 1;
                    return { ...comment, likes: newLikes, dislikes: newDislikes, userReaction: type };
                } else {
                    if (type === 'like') newLikes += 1;
                    else newDislikes += 1;
                    return { ...comment, likes: newLikes, dislikes: newDislikes, userReaction: type };
                }
            }));

        } catch (err) {
            console.error('Ошибка при обновлении реакции:', err);
        }
    };

    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth <= 700);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    const getRoleClass = (roles?: string[]) => {
        if (!roles || roles.length === 0) return '';
        if (roles.includes('ADMIN')) return 'nickname-admin';
        if (roles.includes('MODERATOR')) return 'nickname-moderator';
        if (roles.includes('PREMIUM')) return 'nickname-premium';
        return 'nickname-user';
    };

    return isMobile ? (
        <div className="anime-comments-mobile">
            <div className="anime-comments-mobile-header">
                <span>Комментарии</span>
                <button className={isModernDesign ? "show-all-btn-modern" : "show-all-btn"} onClick={openModal}>
                    Все комментарии
                </button>
            </div>
            <div className="anime-comments-mobile-popular">Популярные</div>
            {loading && <div className="loader">Загрузка...</div>}
            {error && <div className="error">{error}</div>}

            <div className="anime-comments-mobile-list">
                {!loading && comments.length === 0 && (
                    <div className="no-comments">Нет комментариев</div>
                )}
                {!loading && comments.map((c) => (
                    <div key={c.id} className="anime-comments-mobile-item">
                        <div className="mobile-avatar">
                            {avatars[c.username] ? (
                                <img src={avatars[c.username]} alt={`${c.nickname || c.username} avatar`} />
                            ) : (
                                <span className="mobile-avatar-placeholder">
                                    {(c.nickname || c.username)?.[0] || '?'}
                                </span>
                            )}
                        </div>
                        <div className="mobile-comment-content">
                            <div className="mobile-comment-header">
                                <span className={`mobile-username ${getRoleClass(c.roles)}`}>
                                    {c.nickname || c.username}
                                    {c.verified && (
                                        <svg
                                            className="verified-icon"
                                            viewBox="0 0 24 24"
                                            width={14}
                                            height={14}
                                            style={{ marginLeft: 4, verticalAlign: 'middle' }}
                                        >
                                            <g>
                                      <path fillRule="evenodd" clipRule="evenodd"
                                            d="M14.6563 5.24291C15.4743 5.88358 16 6.8804 16 8C16 9.11964 15.4743 10.1165 14.6562 10.7572C14.7816 11.7886 14.4485 12.8652 13.6568 13.6569C12.8651 14.4486 11.7885 14.7817 10.7571 14.6563C10.1164 15.4743 9.1196 16 8 16C6.88038 16 5.88354 15.4743 5.24288 14.6562C4.21141 14.7817 3.13481 14.4485 2.34312 13.6568C1.55143 12.8652 1.2183 11.7886 1.34372 10.7571C0.525698 10.1164 0 9.1196 0 8C0 6.88038 0.525715 5.88354 1.34376 5.24288C1.21834 4.21141 1.55147 3.13481 2.34316 2.34312C3.13485 1.55143 4.21145 1.2183 5.24291 1.34372C5.88358 0.525698 6.8804 0 8 0C9.11964 0 10.1165 0.525732 10.7572 1.3438C11.7886 1.21838 12.8652 1.55152 13.6569 2.3432C14.4486 3.13488 14.7817 4.21146 14.6563 5.24291ZM12.2071 6.20711L10.7929 4.79289L7 8.58579L5.20711 6.79289L3.79289 8.20711L7 11.4142L12.2071 6.20711Z"
                                            fill="#d60000"></path>
                                  </g>
                                        </svg>
                                    )}
                                </span>
                                <div className="mobile-rating">
                                    <ArrowBigUp
                                        size={16}
                                        className={`rating-up ${c.userReaction === 'like' ? 'active' : ''}`}
                                        onClick={() => toggleReaction(c.id, 'like')}
                                    />
                                    <ArrowBigDown
                                        size={16}
                                        className={`rating-down ${c.userReaction === 'dislike' ? 'active' : ''}`}
                                        onClick={() => toggleReaction(c.id, 'dislike')}
                                    />
                                    <span className={c.likes >= 0 ? 'likes-count positive' : 'likes-count negative'}>
                                        {c.likes}
                                    </span>
                                </div>
                            </div>
                            <div className="mobile-comment-text">
                                {c.text
                                    .split(/\n|<br\s*\/?>/gi)
                                    .map((line, idx) => (
                                        <span key={`${c.id}-line-${idx}`}>
                                            {line}
                                            <br />
                                        </span>
                                    ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <CommentsModalNew
                show={showModal}
                onClose={closeModal}
                animeId={animeId}
                myUsername={usernameFromToken}
                onRequireAuth={() => setShowAuthFullScreen(true)}
                isModernDesign={isModernDesign}
            />
            {showAuthFullScreen && (
                <div className="mobile-auth-required-overlay" onClick={() => setShowAuthFullScreen(false)}>
                    <div className="mobile-auth-required" onClick={e => e.stopPropagation()}>
                        <button
                            className="mobile-auth-required-close"
                            aria-label="Закрыть"
                            onClick={() => setShowAuthFullScreen(false)}
                        >
                            ✕
                        </button>
                        <div className="mobile-auth-required-title">Йоу, братишь</div>
                        <div className="mobile-auth-required-text">
                            если ты хочешь такие возможности:
                            <ul>
                                <li>Добавление в коллекцию</li>
                                <li>Добавление в избранное</li>
                                <li>Оставлять свой рейтинг</li>
                                <li>Оставлять свой комментарий</li>
                                <li>Делать свою коллекцию для других пользователей</li>
                                <li>Возможность редактировать свой профиль</li>
                            </ul>
                            То пожалуйста, авторизируйся или зарегистрируйся на сайте, если ты у нас впервые)
                        </div>
                        <div className="mobile-auth-required-actions">
                            <a href="/login" className="mobile-auth-btn primary">Авторизироваться</a>
                            <a href="/register" className="mobile-auth-btn secondary">Зарегистрироваться</a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    ) : (
        <div className={isModernDesign ? "anime-comments-container-modern" : "anime-comments-container"}>
            <div className={isModernDesign ? "comments-header-modern" : "comments-header"}>
                <h2>Комментарии к аниме:</h2>
                <button className={isModernDesign ? "show-all-btn-modern" : "show-all-btn"} onClick={openModal}>
                    Посмотреть все
                </button>
            </div>

            <div className={isModernDesign ? "comments-subtitle-modern" : "comments-subtitle"}>Популярные комментарии</div>

            {loading && <div className="loader">Загрузка...</div>}
            {error && <div className="error">{error}</div>}

            <div className={isModernDesign ? "top-comments-list-old-modern" : "top-comments-list-old"}>
                {!loading && comments.length === 0 && (
                    <div className="no-comments">Нету комментариев к данному аниме :()</div>
                )}
                {!loading && comments.map((c) => (
                    <div key={c.id} className={isModernDesign ? "comment-item-modern" : "comment-item"}>
                        <div className={isModernDesign ? "avatar-modern" : "avatar"}>
                            {avatars[c.username] ? (
                                <img src={avatars[c.username]} alt={`${c.nickname || c.username} avatar`} />
                            ) : (
                                <div>
                                    {(c.nickname || c.username)?.[0]?.toUpperCase() || '?'}
                                </div>
                            )}
                        </div>
                        <div className={isModernDesign ? "comment-content-modern" : "comment-content"}>
                            <div>
                                <span className={`${isModernDesign ? 'username-modern' : 'username'} ${getRoleClass(c.roles)}`}>
                                    {c.nickname || c.username}
                                    {c.verified && (
                                        <svg
                                            className="verified-icon"
                                            viewBox="0 0 16 16"
                                            width={16}
                                            height={16}
                                            style={{ marginLeft: 6, verticalAlign: 'middle' }}
                                        >
                                            <path fillRule="evenodd" clipRule="evenodd"
                                                d="M14.6563 5.24291C15.4743 5.88358 16 6.8804 16 8C16 9.11964 15.4743 10.1165 14.6562 10.7572C14.7816 11.7886 14.4485 12.8652 13.6568 13.6569C12.8651 14.4486 11.7885 14.7817 10.7571 14.6563C10.1164 15.4743 9.1196 16 8 16C6.88038 16 5.88354 15.4743 5.24288 14.6562C4.21141 14.7817 3.13481 14.4485 2.34312 13.6568C1.55143 12.8652 1.2183 11.7886 1.34372 10.7571C0.525698 10.1164 0 9.1196 0 8C0 6.88038 0.525715 5.88354 1.34376 5.24288C1.21834 4.21141 1.55147 3.13481 2.34316 2.34312C3.13485 1.55143 4.21145 1.2183 5.24291 1.34372C5.88358 0.525698 6.8804 0 8 0C9.11964 0 10.1165 0.525732 10.7572 1.3438C11.7886 1.21838 12.8652 1.55152 13.6569 2.3432C14.4486 3.13488 14.7817 4.21146 14.6563 5.24291ZM12.2071 6.20711L10.7929 4.79289L7 8.58579L5.20711 6.79289L3.79289 8.20711L7 11.4142L12.2071 6.20711Z"
                                                fill="#d60000"
                                            />
                                        </svg>
                                    )}
                                </span>
                                <span className={isModernDesign ? "likes-modern" : "likes"}>{c.likes}</span>
                            </div>
                            <div className={isModernDesign ? "text-modern" : "text"}>
                                {c.text}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <CommentsModalNew
                show={showModal}
                onClose={closeModal}
                animeId={animeId}
                myUsername={usernameFromToken}
                isModernDesign={isModernDesign}
            />
        </div>
    );
};

export default AnimeCommentsSimple;