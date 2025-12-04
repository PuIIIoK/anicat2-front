import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import StarRating from '@/component/StarRating';
import { API_SERVER } from '@/hosts/constants';
import { useNotifications } from '../notifications/NotificationManager';

interface UserRating {
    userId: number;
    username: string;
    nickname: string | null;
    avatarUrl: string | null;
    score: number;
    comment?: string;
    roles?: string[];
    verified?: boolean;
}

const roleColors: Record<string, string> = {
    admin: '#ff4500',
    moderator: '#1e90ff',
    vip: '#ffb800',
    user: '#f0f0f0',
};

const REVIEWS_PER_PAGE = 5;

const AnimeRatingSection: React.FC<{ animeId: string; onRequireAuth?: () => void; isModernDesign?: boolean }> = ({ animeId, onRequireAuth, isModernDesign = false }) => {
    const { addNotification } = useNotifications();
    const [averageRating, setAverageRating] = useState<number | null>(null);
    const [ratingCounts, setRatingCounts] = useState<{ [key: number]: number }>({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
    const [userRating, setUserRating] = useState<number | null>(null);
    const [userComment, setUserComment] = useState<string>('');
    const [otherRatings, setOtherRatings] = useState<UserRating[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [visibleDesktopCount, setVisibleDesktopCount] = useState(4);
    const [pendingDesktopIncrement, setPendingDesktopIncrement] = useState(0);
    const [isLoadMore, setIsLoadMore] = useState(false);

    useEffect(() => {
        if (showModal) {
            // Сохраняем текущий стиль, чтобы вернуть потом
            const originalStyle = window.getComputedStyle(document.body).overflow;
            document.body.style.overflow = 'hidden';
            // Возвращаем скролл при размонтировании или закрытии модалки
            return () => { document.body.style.overflow = originalStyle; };
        }
    }, [showModal]);
    async function loadRatings(pageToLoad = 1) {
        setLoading(true);
        try {
            const token = document.cookie.replace(/(?:^|.*;\s*)token\s*=\s*([^;]*).*$|^.*$/, "$1");
            const res = await fetch(`${API_SERVER}/api/anime/ratings/${animeId}/all?page=${pageToLoad}&limit=${REVIEWS_PER_PAGE}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (!res.ok) throw new Error('Ошибка загрузки рейтинга');
            const data = await res.json();

            setAverageRating(data.averageRating ?? null);

            const allRatings: UserRating[] = data.userRatings ?? [];

            // Загружаем аватарки
            const avatarPromises = allRatings.map(async (r) => {
                try {
                    const avatarRes = await fetch(`${API_SERVER}/api/profiles/avatar?username=${encodeURIComponent(r.username)}`);
                    if (!avatarRes.ok) return null;
                    const avatarJson = await avatarRes.json();
                    // Prefer staticUrl for images, fallback to url if not webm
                    return avatarJson.staticUrl || (avatarJson.url && !avatarJson.url.endsWith('.webm') ? avatarJson.url : null);
                } catch {
                    return null;
                }
            });
            const avatarUrls = await Promise.all(avatarPromises);

            const allRatingsWithAvatars = allRatings.map((r, idx) => ({
                ...r,
                avatarUrl: avatarUrls[idx] ?? null,
            }));

            // Получаем username из токена
            let currentUsername: string | null = null;
            if (token) {
                try {
                    const payloadBase64 = token.split('.')[1];
                    const decodedPayload = JSON.parse(atob(payloadBase64));
                    currentUsername = decodedPayload?.username ?? null;
                } catch {
                    currentUsername = null;
                }
            }

            if (pageToLoad === 1) {
                setOtherRatings(allRatingsWithAvatars);
            } else {
                // Добавляем только новые отзывы, избегая дублей по userId
                setOtherRatings(prev => {
                    const existingIds = new Set(prev.map(p => p.userId));
                    const uniqueNew = allRatingsWithAvatars.filter(r => !existingIds.has(r.userId));
                    return [...prev, ...uniqueNew];
                });
            }

            const myReview = allRatingsWithAvatars.find(r => r.username === currentUsername);

            setUserRating(myReview?.score ?? data.myRating ?? null);
            setUserComment(myReview?.comment ?? data.myComment ?? '');
            setIsEditing(!(myReview?.comment ?? data.myComment));

            const counts: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
            allRatings.forEach(r => {
                counts[r.score] = (counts[r.score] ?? 0) + 1;
            });
            setRatingCounts(counts);

            // Если отзывов меньше чем лимит - значит больше нет страниц
            setHasMore(allRatings.length === REVIEWS_PER_PAGE);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setIsLoadMore(false);
        }
    }

    useEffect(() => {
        setPage(1); // При смене animeId сбрасываем страницу на 1
        setVisibleDesktopCount(4);
    }, [animeId]);

    useEffect(() => {
        loadRatings(page);
    }, [page, animeId]);

    const getToken = () => document.cookie.replace(/(?:^|.*;\s*)token\s*=\s*([^;]*).*$|^.*$/, "$1");

    // Отсортированные отзывы (новые первыми)
    const sortedOtherRatings = React.useMemo(() => {
        return [...otherRatings].slice().reverse();
    }, [otherRatings]);

    // После догрузки на ПК увеличиваем видимое количество на заданный инкремент
    useEffect(() => {
        if (pendingDesktopIncrement > 0) {
            setVisibleDesktopCount(prev => Math.min(prev + pendingDesktopIncrement, otherRatings.length));
            setPendingDesktopIncrement(0);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [otherRatings]);

    const submitRating = async () => {
        if (userRating === null || userRating === 0) return;
        setIsSubmitting(true);
        try {
            const token = getToken();
            if (!token) {
                onRequireAuth?.();
                setIsSubmitting(false);
                return;
            }
            const res = await fetch(`${API_SERVER}/api/anime/ratings/${animeId}/rate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ score: userRating, comment: userComment }),
            });
            if (!res.ok) throw new Error('Ошибка отправки рейтинга');

            setPage(1); // Сброс страницы на первую
            await loadRatings(); // 🔁 Повторный fetch отзывов
            addNotification({
                message: 'Рейтинг успешно сохранён!',
                type: 'success',
                duration: 3500
            });
            setIsEditing(false);
            setVisibleDesktopCount(4);
        } catch (e) {
            addNotification({
                message: 'Ошибка при отправке рейтинга',
                type: 'error',
                duration: 4000
            });
            console.error(e);
        } finally {
            setIsSubmitting(false);
        }
    };


    async function deleteRating() {
        if (!animeId) return;
        setIsSubmitting(true);
        try {
            const token = getToken();
            if (!token) {
                onRequireAuth?.();
                setIsSubmitting(false);
                return;
            }
            await fetch(`${API_SERVER}/api/anime/ratings/${animeId}/rate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    score: null,
                    comment: '',
                }),
            });

            setUserRating(null);
            setUserComment('');
            setIsEditing(true);
            setPage(1);
            setVisibleDesktopCount(4);
            loadRatings(); // обновим список оценок
        } catch (error) {
            console.error('Ошибка при удалении отзыва', error);
        } finally {
            setIsSubmitting(false);
        }
    }

    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth <= 700);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);


    function getNicknameColor(roles: string[] | undefined): string {
        if (!roles || roles.length === 0) return roleColors.user;
        const normalizedRoles = roles.map(r => r.toLowerCase());
        if (normalizedRoles.includes('admin')) return roleColors.admin;
        if (normalizedRoles.includes('moderator')) return roleColors.moderator;
        if (normalizedRoles.includes('vip')) return roleColors.vip;
        return roleColors.user;
    }

    const maxCount = Math.max(...Object.values(ratingCounts), 1);

    const handleStarChange = (newRating: number) => {
        const token = getToken();
        if (!token) {
            onRequireAuth?.();
            return;
        }
        setUserRating(newRating);
    };

    const handleDesktopLoadMore = () => {
        const increment = 5;
        const total = otherRatings.length;

        // Если все страницы уже загружены (hasMore === false) и мы в «свернутом» состоянии,
        // то показываем сразу все без дополнительных запросов
        if (!hasMore && visibleDesktopCount <= 4) {
            setVisibleDesktopCount(total);
            return;
        }

        if (visibleDesktopCount < total) {
            setVisibleDesktopCount(Math.min(visibleDesktopCount + increment, total));
        } else if (hasMore && !loading) {
            // Догружаем следующую страницу и после загрузки увеличиваем видимое на 5
            setPendingDesktopIncrement(increment);
            setIsLoadMore(true);
            setPage(prev => prev + 1);
        }
    };

    // Скролл для мобильной модалки: при достижении низа догружаем ещё 5
    const modalListRef = useRef<HTMLDivElement | null>(null);
    const handleMobileModalScroll = () => {
        const el = modalListRef.current;
        if (!el) return;
        const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 32;
        if (nearBottom && hasMore && !loading) {
            setPage(prev => prev + 1);
        }
    };

    return isMobile ? (
        <div className="mobile-rating-section">
            {/* Средняя оценка и количество отзывов */}
            <div className="mobile-rating-average-wrapper">
                <div className="mobile-rating-average-number-row">
    <span className="mobile-rating-average-number">
      {averageRating !== null ? averageRating.toFixed(1) : '—'}
    </span>
                </div>
                <div className="mobile-rating-pentagram">
                    {[5, 4, 3, 2, 1].map(star => {
                        const count = ratingCounts[star] || 0;
                        const total = Object.values(ratingCounts).reduce((a, b) => a + b, 0) || 1;
                        const percent = Math.round((count / total) * 100);

                        return (
                            <div className="mobile-pentagram-row" key={star}>
                                <span className="mobile-pentagram-star">{star}</span>
                                <div className="mobile-pentagram-bar-bg">
                                    <div
                                        className="mobile-pentagram-bar"
                                        style={{width: `${percent}%`}}
                                    />
                                </div>
                                <span className="mobile-pentagram-count">{count}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Личное голосование */}
            <div className="mobile-rating-userbox-minimal">
                <div className="mobile-rating-stars-row">
                    <StarRating
                        rating={userRating || 0}
                        onChange={handleStarChange}
                        disabled={userRating !== null && !isEditing}
                    />
                </div>
                {!isEditing && userComment ? (
                    <div className="mobile-rating-owncomment-minimal">
                        <div className="mobile-rating-owncomment-text">{userComment}</div>
                        <div className="mobile-rating-owncomment-actions-row">
                            <button
                                onClick={() => setIsEditing(true)}
                                disabled={isSubmitting}
                                className="mobile-btn-rating-minimal"
                            >
                                <svg width="17" height="17" viewBox="0 0 17 17"
                                     style={{marginRight: 3, verticalAlign: 'middle'}}>
                                    <path d="M13.7 5.42L11.59 3.3a1 1 0 00-1.41 0l-7 7V14h3.71l7-7a1 1 0 000-1.41z"
                                          fill="#ffb800"/>
                                </svg>
                                Изм.
                            </button>
                            <button
                                onClick={deleteRating}
                                disabled={isSubmitting}
                                className="mobile-btn-del-rating-minimal"
                            >
                                <svg width="15" height="15" viewBox="0 0 15 15"
                                     style={{marginRight: 2, verticalAlign: 'middle'}}>
                                    <path d="M3.5 4.5l8 8M11.5 4.5l-8 8" stroke="#fff" strokeWidth="1.5"
                                          strokeLinecap="round"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="mobile-rating-write-minimal">
            <textarea
                value={userComment}
                onChange={e => setUserComment(e.target.value)}
                rows={2}
                disabled={isSubmitting}
                placeholder="Комментарий (необязательно)"
            />
                        <button
                            onClick={submitRating}
                            disabled={isSubmitting || !userRating}
                            className="mobile-btn-rating-minimal"
                            style={{marginLeft: 4}}
                        >
                            {isSubmitting ? '...' : 'Оценить'}
                        </button>
                    </div>
                )}
            </div>

            {/* Список отзывов других пользователей */}
            <div className="mobile-rating-list">
                {otherRatings.length === 0 && (
                    <div className="mobile-noreviews">Пока нет отзывов.</div>
                )}

                {otherRatings.length > 0 && (
                    <>
                        {!showModal && (
                            <button
                                className="mobile-btn-open-reviews"
                                onClick={() => setShowModal(true)}
                            >
                                Открыть отзывы других пользователей
                            </button>
                        )}

                        {showModal && (
                            <div className="mobile-reviews-modal">
                                <div className="mobile-reviews-modal-header">
                                    <span>Отзывы пользователей</span>
                                    <button
                                        className="mobile-reviews-modal-close"
                                        onClick={() => setShowModal(false)}
                                    >✕
                                    </button>
                                </div>
                                <div className="mobile-reviews-modal-list" style={{maxHeight: '70vh', overflowY: 'auto'}} ref={modalListRef} onScroll={handleMobileModalScroll}>
                        {sortedOtherRatings.map((r, i) => (
                            <div className="mobile-rating-item" key={`m-rating-${r.userId}-${i}`}>
                                            <div className="mobile-rating-item-row">
                                                <div className="mobile-rating-avatar">
                                                    {r.avatarUrl ? (
                                                        <Image src={r.avatarUrl} alt="avatar" width={30} height={30} style={{objectFit: 'cover'}}/>
                                                    ) : (
                                                        <div className="mobile-avatar-fake">
                                                            {(r.nickname?.charAt(0) ?? r.username?.charAt(0) ?? '?').toUpperCase()}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="mobile-rating-meta">
                                                    <div className="mobile-rating-nickstars">
                      <span className="mobile-rating-nick" style={{color: getNicknameColor(r.roles)}}>
                        {r.nickname?.trim() ? r.nickname : r.username}
                          {r.verified && (
                              <svg className="mobile-verified-icon" width={12} height={12} viewBox="0 0 16 16"
                                   style={{marginLeft: 4, verticalAlign: 'middle'}}>
                                  <g>
                                      <path fillRule="evenodd" clipRule="evenodd"
                                            d="M14.6563 5.24291C15.4743 5.88358 16 6.8804 16 8C16 9.11964 15.4743 10.1165 14.6562 10.7572C14.7816 11.7886 14.4485 12.8652 13.6568 13.6569C12.8651 14.4486 11.7885 14.7817 10.7571 14.6563C10.1164 15.4743 9.1196 16 8 16C6.88038 16 5.88354 15.4743 5.24288 14.6562C4.21141 14.7817 3.13481 14.4485 2.34312 13.6568C1.55143 12.8652 1.2183 11.7886 1.34372 10.7571C0.525698 10.1164 0 9.1196 0 8C0 6.88038 0.525715 5.88354 1.34376 5.24288C1.21834 4.21141 1.55147 3.13481 2.34316 2.34312C3.13485 1.55143 4.21145 1.2183 5.24291 1.34372C5.88358 0.525698 6.8804 0 8 0C9.11964 0 10.1165 0.525732 10.7572 1.3438C11.7886 1.21838 12.8652 1.55152 13.6569 2.3432C14.4486 3.13488 14.7817 4.21146 14.6563 5.24291ZM12.2071 6.20711L10.7929 4.79289L7 8.58579L5.20711 6.79289L3.79289 8.20711L7 11.4142L12.2071 6.20711Z"
                                            fill="#d60000"></path>
                                  </g>
                              </svg>
                          )}
                      </span>
                                                        <span className="mobile-rating-stars">
                        {Array.from({length: 5}).map((_, idx) => (
                            <span key={idx} style={{color: idx < r.score ? '#ffb800' : '#eee'}}>★</span>
                        ))}
                      </span>
                                                    </div>
                                                    <div className="mobile-rating-comment">
                                                        {r.comment?.trim() ? r.comment :
                                                            <span className="mobile-rating-nocomment">—</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {/* На мобильном догрузка происходит по скроллу, кнопка скрыта */}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    ) : (
        <div className={isModernDesign ? "anime-rating-section-modern" : "anime-rating-section"}>
            <h2>Рейтинг аниме</h2>
            <div className={isModernDesign ? "user-rating-input-modern" : "user-rating-input"}>
                <label>Ваша оценка:</label>
                <StarRating
                    rating={userRating || 0}
                    onChange={setUserRating}
                    disabled={userRating !== null && !isEditing}
                />

                {!isEditing && userComment ? (
                    <>
                        <label>Ваш комментарий:</label>
                        <p style={{whiteSpace: 'pre-wrap', marginBottom: 8}}>{userComment}</p>
                        <div style={{display: 'flex', gap: '8px'}}>
                            <button onClick={() => setIsEditing(true)} disabled={isSubmitting}>
                                Изменить свой отзыв
                            </button>
                            <button
                                onClick={deleteRating}
                                disabled={isSubmitting}
                                style={{color: 'red'}}
                            >
                                Удалить отзыв
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <label>Комментарий</label>
                        <textarea
                            value={userComment}
                            onChange={e => setUserComment(e.target.value)}
                            rows={3}
                            disabled={isSubmitting}
                            placeholder="Ваш комментарий (необязательно)"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    if (!isSubmitting && userRating) {
                                        submitRating();
                                    }
                                }
                            }}
                        />
                        <button onClick={submitRating} disabled={isSubmitting || !userRating}>
                            {isSubmitting ? 'Отправка...' : 'Отправить'}
                        </button>
                    </>
                )}
            </div>

            <div className={isModernDesign ? "rating-summary-modern" : "rating-summary"}>
                <div className={isModernDesign ? "average-rating-modern" : "average-rating"}>
                    {averageRating !== null ? averageRating.toFixed(1) : '—'}
                </div>

                <div className={isModernDesign ? "rating-bars-modern" : "rating-bars"}>
                    {[5, 4, 3, 2, 1].map(star => {
                        const count = ratingCounts[star] || 0;
                        const widthPercent = (count / maxCount) * 100;
                        return (
                            <div key={star} className={isModernDesign ? "rating-row-modern" : "rating-row"}>
                                <span>{star}</span>
                                <div>
                                    <div style={{width: `${widthPercent}%`}}
                                         aria-label={`${count} пользователей оценили в ${star} звезд`}/>
                                </div>
                                <span>{count}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            <h3>Отзывы других пользователей</h3>

            {otherRatings.length > 0 ? (
                <>
                    <div className={isModernDesign ? "user-reviews-modern" : "user-reviews"}>
                        {sortedOtherRatings.slice(0, visibleDesktopCount).map((r: UserRating, i) => (
                            <div key={`d-rating-${r.userId}-${i}`} className={isModernDesign ? "user-review-modern" : "user-review"}>
                                <div className={isModernDesign ? "review-header-modern" : "review-header"}>
                                    <div className={isModernDesign ? "avatar-modern" : "avatar"}>
                                        {r.avatarUrl ? (
                                            <Image
                                                src={r.avatarUrl}
                                                alt={`${r.username} avatar`}
                                                width={52}
                                                height={52}
                                                style={{objectFit: 'cover'}}
                                            />
                                        ) : (
                                            <div>{(r.nickname?.charAt(0) ?? r.username?.charAt(0) ?? '?').toUpperCase()}</div>
                                        )}
                                    </div>
                                    <div className={isModernDesign ? "review-meta-modern" : "review-meta"}>
                                        <strong style={{
                                            color: getNicknameColor(r.roles),
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}>
                                            {r.nickname?.trim() ? r.nickname : r.username}
                                            {r.verified && (
                                                <svg className="verified-icon" viewBox="0 0 24 24">
                                                    <svg viewBox="-1.6 -1.6 19.20 19.20" fill="none"
                                                         xmlns="http://www.w3.org/2000/svg" stroke="#000000"
                                                         strokeWidth="0.00016">
                                                        <g>
                                                            <path fillRule="evenodd" clipRule="evenodd"
                                                                  d="M14.6563 5.24291C15.4743 5.88358 16 6.8804 16 8C16 9.11964 15.4743 10.1165 14.6562 10.7572C14.7816 11.7886 14.4485 12.8652 13.6568 13.6569C12.8651 14.4486 11.7885 14.7817 10.7571 14.6563C10.1164 15.4743 9.1196 16 8 16C6.88038 16 5.88354 15.4743 5.24288 14.6562C4.21141 14.7817 3.13481 14.4485 2.34312 13.6568C1.55143 12.8652 1.2183 11.7886 1.34372 10.7571C0.525698 10.1164 0 9.1196 0 8C0 6.88038 0.525715 5.88354 1.34376 5.24288C1.21834 4.21141 1.55147 3.13481 2.34316 2.34312C3.13485 1.55143 4.21145 1.2183 5.24291 1.34372C5.88358 0.525698 6.8804 0 8 0C9.11964 0 10.1165 0.525732 10.7572 1.3438C11.7886 1.21838 12.8652 1.55152 13.6569 2.3432C14.4486 3.13488 14.7817 4.21146 14.6563 5.24291ZM12.2071 6.20711L10.7929 4.79289L7 8.58579L5.20711 6.79289L3.79289 8.20711L7 11.4142L12.2071 6.20711Z"
                                                                  fill="#d60000"></path>
                                                        </g>
                                                    </svg>
                                                </svg>
                                            )}
                                        </strong>
                                        <div className={isModernDesign ? "rating-stars-modern" : "rating-stars"}>
                                            {Array.from({length: 5}).map((_, idx) => (
                                                <span key={idx} style={{color: idx < r.score ? '#fbbf24' : '#666'}}>
                                                    ★
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className={isModernDesign ? "review-content-modern" : "review-content"}>
                                    <p className={isModernDesign ? "review-text-modern" : "review-text"}>{r.comment || 'Комментарий отсутствует'}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    {(() => {
                        const total = sortedOtherRatings.length;
                        const showControls = !loading && total > 4;
                        if (!showControls) return null;

                        const allShown = visibleDesktopCount >= total && !hasMore;
                        const showMoreVisible = !allShown; // если всё показано и больше страниц нет — кнопка скрывается

                        return (
                            <div style={{marginTop: '1em', display: 'flex', gap: 8, alignItems: 'center'}}>
                                {showMoreVisible && (
                                    <button
                                        onClick={handleDesktopLoadMore}
                                        className={isModernDesign ? "rating-btn-load-more-more-modern" : "rating-btn-load-more-more"}
                                        disabled={loading || isLoadMore}
                                    >
                                        {isLoadMore ? <span className={isModernDesign ? "rating-btn-load-more-spinner-modern" : "rating-btn-load-more-spinner"} aria-hidden="true"/> : 'Загрузить ещё'}
                                    </button>
                                )}
                                {visibleDesktopCount > 4 && (
                                    <button
                                        onClick={() => setVisibleDesktopCount(4)}
                                        className={isModernDesign ? "rating-btn-load-more-collapse-all-modern" : "rating-btn-load-more-collapse-all"}
                                        disabled={loading}
                                    >
                                        Скрыть все открытые комментарии
                                    </button>
                                )}
                                {allShown && (
                                    <span className={isModernDesign ? "rating-btn-load-more-end-modern" : "rating-btn-load-more-end"}>Больше нету отзывов</span>
                                )}
                            </div>
                        );
                    })()}
                    {loading && page > 1 && (
                        <div className={isModernDesign ? "rating-btn-load-more-inline-spinner-modern" : "rating-btn-load-more-inline-spinner"} aria-label="loading"/>
                    )}
                </>
            ) : (
                <p>Пока нет отзывов.</p>
            )}
        </div>
    );
};

export default AnimeRatingSection;
