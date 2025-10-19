'use client';

    import React, { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, Play, Star, Calendar, Camera, FileText, MessageCircle, AlertTriangle, X, CheckCircle, PlayCircle, Pause, ChevronDown, Clock, Edit, Trash2, Award, BookOpen, ChevronUp, Shield, Crown, Verified, Send, Loader2 } from 'lucide-react';
// getCurrentUser больше не нужен - используем API профиль
import ScreenshotItem from './ScreenshotItem';
import { useAnimePageLogic } from '../../hooks/useAnimePageLogic';
import AnimePageSkeleton from './AnimePageSkeleton';
import CommentsModal from './CommentsModal';
import AuthPromptModal from './AuthPromptModal';
import DeleteCommentModal from './DeleteCommentModal';
import DiscordStatusTracker from '../DiscordStatusTracker';
import FranchiseSection from './FranchiseSection';
import SimilarAnimeSection from './SimilarAnimeSection';
import ServerErrorPage from '../common/ServerErrorPage';
import AnimatedMedia from '../../../components/AnimatedMedia';

const statusOptions = [
    { label: 'Не выбрано', icon: <X size={16} />, value: 'none' },
    { label: 'Запланировано', icon: <Calendar size={16} />, value: 'planned' },
    { label: 'Смотрю', icon: <PlayCircle size={16} />, value: 'watching' },
    { label: 'Просмотрено', icon: <CheckCircle size={16} />, value: 'completed' },
    { label: 'Отложено', icon: <Pause size={16} />, value: 'paused' },
    { label: 'Брошено', icon: <Clock size={16} />, value: 'dropped' },
];

interface AnimePagePCProps {
    animeId: string;
}

const AnimePagePC: React.FC<AnimePagePCProps> = ({ animeId }) => {
    const {
        anime, isLoading, error, activeTab, showStatusDropdown,
        showCommentsModal, showAuthPrompt, favorites, selectedStatus, averageRating, isSavingStatus,
        screenshotUrls, screenshotsLoading, comments, reviews, commentsLoading, reviewsLoading, totalReviews,
        userReview, isEditingReview,
        handleTabChange, toggleFavorite, handleStatusSelect, handleWatchClick, handleGoToComments,
        handleToggleStatusDropdown, setShowCommentsModal, setShowAuthPrompt,
        loadComments, handleSubmitComment, handleLikeComment, handleDislikeComment, handleReplyComment,
        handleSubmitReview, handleDeleteReview, handleEditReview, handleCancelEditReview,
        visibleComments, showAllComments, handleToggleShowAllComments,
        visibleReviews, showAllReviews, handleToggleShowAllReviews,
        expandedComments, handleToggleReplies, replyingTo, handleStartReply, handleCancelReply,
        replyText, handleReplyTextChange, handleSubmitReply, handleLikeReply, handleDislikeReply,
        likingComments, likingReplies,
        
        // Редактирование и удаление
        editingCommentId, editingReplyId, editText, setEditText,
        handleEditComment, handleEditReply, handleCancelEdit,
        handleSaveEditComment, handleSaveEditReply,
        handleDeleteComment, handleDeleteReply,
        
        // Модалка удаления
        showDeleteModal, deleteTarget, closeDeleteModal, confirmDelete,
        
        currentUserProfile,

        // Доступность и блокировки
        isAccessible,
        zametka_blocked,
    } = useAnimePageLogic(animeId);

    // Локальные состояния для отзывов и комментариев перенесены в useAnimePageLogic

    // Функция проверки владельца комментария (из localStorage + API)
    const isCommentOwner = (comment: Record<string, unknown>) => {
        if (!currentUserProfile?.username) {
            console.log('❌ currentUserProfile.username не загружен из API');
            return false;
        }
        
        // Сравнение username из API профиля с реальным username комментария
        const isOwner = currentUserProfile.username.toLowerCase() === String(comment.realUsername || comment.username).toLowerCase();
        console.log('👤 Проверка владельца (API):', {
            myUsername: currentUserProfile.username,
            commentDisplayName: comment.username,
            commentRealUsername: comment.realUsername,
            isOwner: isOwner
        });
        return isOwner;
    };

    const getRoleColor = (roleString: string) => {
        if (!roleString) return 'var(--text-primary)';
        
        // Разделяем роли по запятой и приводим к нижнему регистру
        const roles = roleString.split(',').map(r => r.trim().toLowerCase());
        console.log('🎭 Обработка ролей:', roleString, '→', roles);
        
        // Приоритет ролей (самая высокая роль определяет цвет)
        if (roles.includes('admin')) return '#ff4444';
        if (roles.includes('moderator')) return '#ffa500';
        if (roles.includes('premium')) return '#ffd700';
        if (roles.includes('verified')) return '#00ff88';
        
        return 'var(--text-primary)';
    };

    const getRoleIcon = (roleString: string, verified?: boolean) => {
        console.log('🏅 Значки для:', roleString, 'verified:', verified);
        
        if (verified) return <Verified size={18} className="verification-icon" />;
        
        if (!roleString) return null;
        
        // Разделяем роли по запятой и приводим к нижнему регистру
        const roles = roleString.split(',').map(r => r.trim().toLowerCase());
        
        // Приоритет ролей (самая высокая роль определяет иконку)
        if (roles.includes('admin')) return <Shield size={14} className="role-icon admin" />;
        if (roles.includes('moderator')) return <Shield size={14} className="role-icon moderator" />;
        if (roles.includes('premium')) return <Crown size={14} className="role-icon premium" />;
        
        return null;
    };


    const currentStatus = statusOptions.find(opt => opt.value === selectedStatus);

    // Устанавливаем title и meta теги через useEffect (всегда вызываем до early return)
    useEffect(() => {
        if (!anime) {
            document.title = 'AniCat';
            return;
        }

        // Формируем данные для SEO
        // Если в anime.season уже есть слово "сезон", не дублируем его
        const seasonText = anime.season 
            ? (anime.season.toLowerCase().includes('сезон') ? ` ${anime.season}` : ` ${anime.season}`)
            : (anime.mouthSeason ? ` ${anime.mouthSeason}` : '');
        const pageTitle = `${anime.title}${seasonText} | AniCat`;
        
        const pageDescription = [
            `${anime.title}${seasonText}${anime.year ? `, ${anime.year}` : ''}${anime.type ? `, ${anime.type}` : ''}`,
            anime.description || '',
            anime.genres ? `Жанры: ${anime.genres}` : '',
            'Смотреть на AniCat!'
        ].filter(Boolean).join('. ');

        const ogTitle = `${anime.title}${seasonText}`;
        const ogDescription = [
            `${anime.year || ''} ${anime.type || ''}`.trim(),
            anime.description || '',
            anime.genres ? `Жанры: ${anime.genres}` : '',
            'Смотреть на AniCat!'
        ].filter(Boolean).join('\n');

        // Устанавливаем title
        document.title = pageTitle;
        
        // Устанавливаем meta description
        let metaDescription = document.querySelector('meta[name="description"]');
        if (!metaDescription) {
            metaDescription = document.createElement('meta');
            metaDescription.setAttribute('name', 'description');
            document.head.appendChild(metaDescription);
        }
        metaDescription.setAttribute('content', pageDescription);
        
        // Устанавливаем Open Graph теги
        const setMetaTag = (property: string, content: string) => {
            let meta = document.querySelector(`meta[property="${property}"]`);
            if (!meta) {
                meta = document.createElement('meta');
                meta.setAttribute('property', property);
                document.head.appendChild(meta);
            }
            meta.setAttribute('content', content);
        };
        
        setMetaTag('og:title', ogTitle);
        setMetaTag('og:description', ogDescription);
        setMetaTag('og:type', 'video.tv_show');
        setMetaTag('og:url', `https://anicat.fun/anime-page/${anime.id}`);
        if (anime.coverUrl) setMetaTag('og:image', anime.coverUrl);
        setMetaTag('og:site_name', 'AniCat');
        
        // Twitter Card
        const setTwitterTag = (name: string, content: string) => {
            let meta = document.querySelector(`meta[name="${name}"]`);
            if (!meta) {
                meta = document.createElement('meta');
                meta.setAttribute('name', name);
                document.head.appendChild(meta);
            }
            meta.setAttribute('content', content);
        };
        
        setTwitterTag('twitter:card', 'summary_large_image');
        setTwitterTag('twitter:title', ogTitle);
        setTwitterTag('twitter:description', ogDescription);
        if (anime.coverUrl) setTwitterTag('twitter:image', anime.coverUrl);
    }, [anime]);

    if (isLoading) return <AnimePageSkeleton isModern={true} />;
    if (error || !anime) {
        return (
            <ServerErrorPage 
                title="Внутренняя ошибка сервера!"
                message={error || "Не удалось загрузить страницу аниме.\nПожалуйста, попробуйте позже"}
                onRetry={() => window.location.reload()}
            />
        );
    }

    return (
        <div>
            <DiscordStatusTracker status={`На странице аниме ${anime.title}`} />

            <div className="anime-page-container modern">
                {/* Баннер */}
                <div className="anime-banner">
                    {anime.bannerUrl ? (
                        <Image src={anime.bannerUrl} alt="Баннер" fill className="banner-image" unoptimized style={{ objectFit: 'cover' }} priority />
                    ) : (
                        <div className="banner-placeholder" />
                    )}
                    <div className="banner-gradient" />
                </div>

                {/* Основной контент */}
                <div className="anime-content">
                    {/* Левая колонка */}
                    <div className="anime-sidebar">
                        <div className="anime-poster">
                            {anime.coverUrl ? (
                                <Image src={anime.coverUrl} alt="Постер" fill unoptimized style={{ objectFit: 'cover' }} />
                            ) : (
                                <div className="poster-placeholder">Постер недоступен</div>
                            )}
                        </div>

                        <button 
                            className={`watch-button ${!anime.opened || isAccessible === false ? 'disabled' : ''}`} 
                            onClick={handleWatchClick} 
                            disabled={!anime.opened || isAccessible === false}
                        >
                            {anime.opened ? (<><Play size={20} />Смотреть</>) : (anime.anons || 'Скоро')}
                        </button>

                        <div className="action-buttons">
                            <button className={`action-btn ${favorites ? 'active' : ''}`} onClick={toggleFavorite}>
                                <Heart size={18} fill={favorites ? '#e50914' : 'none'} />
                                {favorites ? 'В избранном' : 'В избранное'}
                            </button>
                            <button className="action-btn" onClick={handleGoToComments}>
                                <MessageCircle size={18} />
                                Комментарии
                            </button>
                        </div>

                        <div className="collection-dropdown">
                            <button 
                                className={`dropdown-trigger ${isSavingStatus ? 'saving' : ''}`} 
                                onClick={handleToggleStatusDropdown}
                                disabled={isSavingStatus}
                            >
                                <span className="status-label">
                                    {isSavingStatus ? (
                                        <>
                                            <Loader2 size={16} className="spinning" />
                                            <span className="status-text">Сохранение...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="status-icon">{currentStatus?.icon}</span>
                                            <span className="status-text">{currentStatus?.label}</span>
                                        </>
                                    )}
                                </span>
                                {!isSavingStatus && <ChevronDown size={16} />}
                            </button>
                            {showStatusDropdown && (
                                <div className="dropdown-menu">
                                    {statusOptions.map(option => (
                                        <div key={option.value} className={`dropdown-item ${selectedStatus === option.value ? 'active' : ''}`} onClick={() => handleStatusSelect(option.value)}>
                                            <span className="dropdown-item-icon">{option.icon}</span>
                                            <span className="dropdown-item-label">{option.label}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Правая колонка */}
                    <div className="anime-main">
                        <div className="anime-header">
                            <div className="title-section">
                                <h1 className="anime-title">{anime.title}</h1>
                                {(anime.currentEpisode || anime.episodeAll) && anime.status !== 'Скоро' && anime.status !== 'Анонс' && (
                                    <div className="episode-count">
                                        {anime.currentEpisode ? `${anime.currentEpisode}/${anime.episodeAll || '?'}` : anime.episodeAll} эп.
                                    </div>
                                )}
                            </div>
                            {anime.alttitle && <div className="anime-subtitle">{anime.alttitle}</div>}
                            <div className="anime-badges">
                                {averageRating !== null && anime.status !== 'Скоро' && anime.status !== 'Анонс' && (
                                    <div className={`anime-rating ${averageRating >= 4 ? 'rating-high' : averageRating >= 3 ? 'rating-medium' : 'rating-low'}`}>
                                        <Star size={16} fill="currentColor" />
                                        {averageRating.toFixed(1)}
                                    </div>
                                )}
                                <div className={`age-rating age-rating-${anime.rating || '16+'}`}>
                                    <Shield size={16} fill="currentColor" />
                                    {anime.rating || '16+'}
                                </div>
                                {isAccessible === false && (
                                    <div className="blocked-badge">
                                        <AlertTriangle size={14} fill="currentColor" />
                                        Заблокировано
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="anime-info-grid">
                            <div className="info-item"><div className="info-label">Тип</div><div className="info-value">{anime.type}</div></div>
                            <div className="info-item"><div className="info-label">Эпизодов</div><div className="info-value">{anime.episodeAll || 'Неизвестно'}</div></div>
                            <div className="info-item"><div className="info-label">Статус</div><div className="info-value">{anime.status}</div></div>
                            <div className="info-item"><div className="info-label">Год</div><div className="info-value">{anime.year}</div></div>
                            <div className="info-item"><div className="info-label">Сезон</div><div className="info-value">{anime.mouthSeason || 'Не указан'}</div></div>
                            <div className="info-item"><div className="info-label">Студия</div><div className="info-value">{anime.studio || 'Не указана'}</div></div>
                        </div>

                        {anime.genres && (
                            <div className="anime-genres">
                                {anime.genres.split(',').map((genre, index) => (
                                    <span key={index} className="genre-tag">{genre.trim()}</span>
                                ))}
                            </div>
                        )}

                        {anime.zametka && (
                            <div className="anime-note">
                                <div className="note-content">
                                    {anime.zametka}
                                </div>
                            </div>
                        )}

                        {isAccessible === false && zametka_blocked && (
                            <div className="anime-blocked-note">
                                <div className="blocked-note-content">
                                    {zametka_blocked}
                                </div>
                            </div>
                        )}

                        <div className="anime-description">
                            <h3>Описание</h3>
                            {anime.description ? (
                                <p>{anime.description}</p>
                            ) : (
                                <p className="no-description">Для данного аниме нету описание.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Контейнер табов */}
                <div className="anime-page-container-tabs">
                    <div className="anime-page-container-tabs-navigation">
                        <button className={`anime-page-container-tab-button ${activeTab === 'screenshots' ? 'active' : ''}`} onClick={() => handleTabChange('screenshots')}>
                            <Camera size={18} />
                            <span>Скриншоты {anime.screenshotsCount > 0 && `(${anime.screenshotsCount})`}</span>
                        </button>
                        <button className={`anime-page-container-tab-button ${activeTab === 'details' ? 'active' : ''}`} onClick={() => handleTabChange('details')}>
                            <FileText size={18} />
                            <span>Подробности</span>
                        </button>
                        <button 
                            className={`anime-page-container-tab-button ${activeTab === 'reviews' ? 'active' : ''} ${(anime.status === 'Скоро' || anime.status === 'Анонс') ? 'disabled' : ''}`} 
                            onClick={() => anime.status !== 'Скоро' && anime.status !== 'Анонс' && handleTabChange('reviews')}
                            disabled={anime.status === 'Скоро' || anime.status === 'Анонс'}
                        >
                            <Star size={18} />
                            <span>Отзывы {totalReviews > 0 && `(${totalReviews})`}</span>
                        </button>
                        <button className={`anime-page-container-tab-button ${activeTab === 'comments' ? 'active' : ''}`} onClick={() => handleTabChange('comments')}>
                            <MessageCircle size={18} />
                            <span>Комментарии {comments.length > 0 && `(${comments.length})`}</span>
                        </button>
                    </div>

                    <div className="anime-page-container-tab-content">
                        {activeTab === 'screenshots' && (
                            <div className="anime-page-container-tab-screenshots">
                                <div className="anime-screenshots-grid">
                                    {screenshotsLoading ? (
                                        <div className="anime-page-container-tab-loading">
                                            <div className="anime-page-container-tab-spinner"></div>
                                            <span>Загрузка скриншотов...</span>
                                        </div>
                                    ) : screenshotUrls.length > 0 ? (
                                        screenshotUrls.map((screenshot, index) => {
                                            console.log('🖼️ Рендерим скриншот:', screenshot);
                                            return (
                                                <ScreenshotItem 
                                                    key={screenshot.id || index} 
                                                    screenshot={screenshot} 
                                                    index={index} 
                                                />
                                            );
                                        })
                                    ) : (
                                        <div className="anime-page-container-tab-empty">
                                            <div className="anime-page-container-tab-empty-icon">📷</div>
                                            <h3>Скриншоты отсутствуют</h3>
                                            <p>Для этого аниме пока нет скриншотов</p>
                                            <small>Ожидалось: {anime.screenshotsCount} скриншотов</small>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'details' && (
                            <div className="anime-page-container-tab-details">
                                <div className="anime-page-container-details-grid">
                                    {anime.description && (
                                        <div className="anime-page-container-detail-item description-item">
                                            <div className="anime-page-container-detail-content">
                                                <div className="anime-page-container-detail-label">Описание</div>
                                                <div className="anime-page-container-detail-value">{anime.description}</div>
                                            </div>
                                        </div>
                                    )}
                                    <div className="anime-page-container-detail-item">
                                        <div className="anime-page-container-detail-content">
                                            <div className="anime-page-container-detail-label">Тип</div>
                                            <div className="anime-page-container-detail-value">{anime.type}</div>
                                        </div>
                                    </div>
                                    <div className="anime-page-container-detail-item">
                                        <div className="anime-page-container-detail-content">
                                            <div className="anime-page-container-detail-label">Жанры</div>
                                            <div className="anime-page-container-detail-value">
                                                {anime.genres ? anime.genres.split(',').map((genre, index) => (
                                                    <span key={index} className="genre-tag">{genre.trim()}</span>
                                                )) : 'Не указано'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="anime-page-container-detail-item">
                                        <div className="anime-page-container-detail-content">
                                            <div className="anime-page-container-detail-label">Студия</div>
                                            <div className="anime-page-container-detail-value">{anime.studio || 'Не указано'}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'reviews' && (
                            <div className="anime-page-container-tab-reviews">
                                {userReview && !isEditingReview ? (
                                    <div className="user-review-display">
                                        <div className="user-review-header">
                                            <h3>Ваш отзыв</h3>
                                            <div className="user-review-actions">
                                                <button 
                                                    className="edit-review-btn" 
                                                    onClick={handleEditReview}
                                                    title="Редактировать отзыв"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button 
                                                    className="delete-review-btn" 
                                                    onClick={handleDeleteReview}
                                                    title="Удалить отзыв"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                        
                                        <div className="user-review-notice">
                                            <div className="notice-icon">
                                                <CheckCircle size={20} />
                                            </div>
                                            <span>Вы уже оставили отзыв!</span>
                                        </div>
                                        
                                        <div className="user-review-content">
                                            <div className="user-review-rating">
                                                <div className="rating-label">
                                                    <Award size={16} />
                                                    <span>Ваша оценка:</span>
                                                </div>
                                                <div className="rating-display">
                                                    {Array.from({ length: 5 }, (_, i) => (
                                                        <Star
                                                            key={i}
                                                            size={18}
                                                            fill={i < userReview.rating ? 'var(--primary-color)' : 'var(--primary-color)'}
                                                            color={i < userReview.rating ? 'var(--primary-color)' : 'var(--primary-color)'}
                                                            style={{
                                                                opacity: i < userReview.rating ? 1 : 0.3
                                                            }}
                                                        />
                                                    ))}
                                                    <span className="rating-score">{userReview.rating}/5</span>
                                                </div>
                                            </div>
                                            
                                            <div className="user-review-text">
                                                <div className="review-label">
                                                    <BookOpen size={16} />
                                                    <span>Ваш отзыв:</span>
                                                </div>
                                                <p>{userReview.content}</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="reviews-form">
                                        <div className="reviews-form-header">
                                            <h3>{isEditingReview ? 'Редактировать отзыв' : 'Оставить отзыв'}</h3>
                                            {isEditingReview && (
                                                <button 
                                                    className="cancel-edit-btn" 
                                                    onClick={handleCancelEditReview}
                                                    title="Отменить редактирование"
                                                >
                                                    <X size={20} />
                                                </button>
                                            )}
                                        </div>
                                        
                                        <form onSubmit={(e) => { 
                                            e.preventDefault(); 
                                            const formData = new FormData(e.target as HTMLFormElement);
                                            const reviewText = formData.get('review') as string;
                                            const ratingValue = formData.get('rating') as string;
                                            
                                            if (!ratingValue && !(isEditingReview && userReview)) {
                                                alert('Пожалуйста, выберите рейтинг!');
                                                return;
                                            }
                                            
                                            const rating = parseInt(ratingValue) || (isEditingReview && userReview ? userReview.rating : 1);
                                            handleSubmitReview(rating, '', reviewText);
                                            (e.target as HTMLFormElement).reset();
                                        }}>
                                            <div className="review-input-group">
                                                <div className="rating-input">
                                                    <label>Ваша оценка:</label>
                                                    <div className="rating-stars">
                                                        {[5, 4, 3, 2, 1].map((rating) => (
                                                            <label key={rating} className="star-label">
                                                                <input 
                                                                    type="radio" 
                                                                    name="rating" 
                                                                    value={rating}
                                                                    defaultChecked={isEditingReview && userReview ? rating === userReview.rating : false}
                                                                />
                                                                <Star size={20} />
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                                <textarea
                                                    name="review"
                                                    placeholder="Ваш отзыв о данном аниме..."
                                                    className="review-textarea"
                                                    rows={4}
                                                    required
                                                    defaultValue={isEditingReview && userReview ? userReview.content : ''}
                                                />
                                                <button type="submit" className="review-submit-btn">
                                                    <Star size={16} />
                                                    {isEditingReview ? 'Сохранить изменения' : 'Отправить отзыв'}
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                )}

                                <div className="reviews-section">
                                    {reviewsLoading ? (
                                        <div className="anime-page-container-tab-loading">
                                            <div className="anime-page-container-tab-spinner"></div>
                                            <span>Загрузка отзывов...</span>
                                        </div>
                                    ) : reviews.length > 0 ? (
                                        <div className="reviews-section-content">
                                            <div className="reviews-list">
                                                {visibleReviews.map((review) => {
                                                    console.log('🎯 Рендер отзыва:', {
                                                        id: review.id,
                                                        username: review.username,
                                                        role: review.role,
                                                        verified: review.verified,
                                                        avatarUrl: review.avatarUrl,
                                                        colorResult: getRoleColor(review.role || ''),
                                                        iconResult: !!getRoleIcon(review.role || '', review.verified)
                                                    });
                                                    
                                                    return (
                                                        <div key={review.id} className="review-item">
                                                            <div className="review-user-info">
                                                                <Link 
                                                                    href={`/profile/${review.realUsername || review.username}`} 
                                                                    style={{ textDecoration: 'none', display: 'flex', alignItems: 'flex-start', gap: '12px' }}
                                                                >
                                                                    <div className="review-avatar">
                                                                        {review.avatarUrl ? (
                                                                            <AnimatedMedia
                                                                                src={review.avatarUrl}
                                                                                alt={review.username || 'Аноним'}
                                                                                className="review-avatar-img"
                                                                                fill
                                                                                objectFit="cover"
                                                                                style={{
                                                                                    borderRadius: '50%'
                                                                                }}
                                                                            />
                                                                        ) : (
                                                                            <span className="avatar-fallback">{(review.username || 'A').charAt(0).toUpperCase()}</span>
                                                                        )}
                                                                    </div>
                                                                    <div className="review-user-details">
                                                                        <div className="review-username-row">
                                                                            <span 
                                                                                className="review-username" 
                                                                                style={{ color: getRoleColor(review.role || '') }}
                                                                            >
                                                                                {review.nickname || review.username || 'Аноним'}
                                                                            </span>
                                                                            {getRoleIcon(review.role || '', review.verified)}
                                                                        </div>
                                                                    </div>
                                                                </Link>
                                                            </div>
                                                        
                                                   {review.content && review.content.trim() && (
                                                       <div className="review-content">
                                                           {review.content}
                                                       </div>
                                                   )}
                                                   
                                                   {(!review.content || !review.content.trim()) && (
                                                       <div className="review-no-content">
                                                           <em>Пользователь оставил только оценку</em>
                                                       </div>
                                                   )}
                                                        
                                                        <div className="review-rating">
                                                            {Array.from({ length: 5 }, (_, i) => (
                                                                <Star
                                                                    key={i}
                                                                    size={16}
                                                                    fill={i < review.rating ? 'var(--primary-color)' : 'var(--primary-color)'}
                                                                    color={i < review.rating ? 'var(--primary-color)' : 'var(--primary-color)'}
                                                                    style={{
                                                                        opacity: i < review.rating ? 1 : 0.3
                                                                    }}
                                                                />
                                                            ))}
                                                            <span className="review-score">{review.rating}/5</span>
                                                        </div>
                                                    </div>
                                                    );
                                                })}
                                            </div>
                                            
                                            {handleToggleShowAllReviews && reviews.length > 5 && (
                                                <div className="reviews-show-more">
                                                    <button 
                                                        className="show-more-btn"
                                                            onClick={handleToggleShowAllReviews}
                                                    >
                                                        {showAllReviews ? (
                                                            <>
                                                                <ChevronUp size={16} />
                                                                Скрыть
                                                            </>
                                                        ) : (
                                                            <>
                                                                <ChevronDown size={16} />
                                                                Показать еще ({reviews.length - 3})
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="anime-page-container-tab-empty">
                                            <div className="anime-page-container-tab-empty-icon">⭐</div>
                                            <h3>Отзывов пока нет</h3>
                                            <p>Станьте первым, кто оставит отзыв об этом аниме</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'comments' && (
                            <div className="anime-page-container-tab-comments">
                                <div className="comments-form">
                                    <h3>Оставить комментарий</h3>
                                    <form onSubmit={(e) => { 
                                        e.preventDefault(); 
                                        const formData = new FormData(e.target as HTMLFormElement);
                                        const commentText = formData.get('comment') as string;
                                        handleSubmitComment(commentText);
                                        (e.target as HTMLFormElement).reset();
                                    }}>
                                        <div className="comment-input-group">
                                            <textarea
                                                name="comment"
                                                placeholder="Ваш комментарий..."
                                                className="comment-textarea"
                                                rows={4}
                                                required
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                        e.preventDefault();
                                                        const commentText = e.currentTarget.value.trim();
                                                        if (commentText) {
                                                            handleSubmitComment(commentText);
                                                            e.currentTarget.value = '';
                                                        }
                                                    }
                                                }}
                                            />
                                            <button type="submit" className="comment-submit-btn">
                                                <MessageCircle size={16} />
                                                Отправить
                                            </button>
                                        </div>
                                    </form>
                                </div>

                                <div className="comments-section">
                                    {commentsLoading ? (
                                        <div className="anime-page-container-tab-loading">
                                            <div className="anime-page-container-tab-spinner"></div>
                                            <span>Загрузка комментариев...</span>
                                        </div>
                                    ) : comments.length > 0 ? (
                                        <div className="comments-section-content">
                                            <div className="comments-list">
                                                {visibleComments.map((comment) => {
                                                    console.log('🎯 Рендер комментария:', {
                                                        id: comment.id,
                                                        username: comment.username,
                                                        role: comment.role,
                                                        verified: comment.verified,
                                                        avatarUrl: comment.avatarUrl,
                                                        colorResult: getRoleColor(comment.role || ''),
                                                        iconResult: !!getRoleIcon(comment.role || '', comment.verified)
                                                    });
                                                    
                                                                        return (
                                                                            <div key={comment.id} className={`comment-item ${comment.isPending ? 'pending' : ''}`}>
                                                            <div className="comment-user-info">
                                                                <Link 
                                                                    href={`/profile/${comment.realUsername || comment.username}`} 
                                                                    style={{ textDecoration: 'none', display: 'flex', alignItems: 'flex-start', gap: '12px' }}
                                                                >
                                                                    <div className="comment-avatar">
                                                                        {comment.avatarUrl ? (
                                                                            <AnimatedMedia
                                                                                src={comment.avatarUrl}
                                                                                alt={comment.username || 'Аноним'}
                                                                                className="comment-avatar-img"
                                                                                fill
                                                                                objectFit="cover"
                                                                                style={{
                                                                                    borderRadius: '50%'
                                                                                }}
                                                                            />
                                                                        ) : (
                                                                            <span className="avatar-fallback">{(comment.username || 'A').charAt(0).toUpperCase()}</span>
                                                                        )}
                                                                    </div>
                                                                    <div className="comment-user-details">
                                                                        <div className="comment-username-row">
                                                                            <span 
                                                                                className="comment-username" 
                                                                                style={{ color: getRoleColor(comment.role || '') }}
                                                                            >
                                                                                {comment.nickname || comment.username || 'Аноним'}
                                                                            </span>
                                                                            {getRoleIcon(comment.role || '', comment.verified)}
                                                                        </div>
                                                                    </div>
                                                                </Link>
                                                            </div>
                                                            <div className="comment-content">
                                                                {editingCommentId === comment.id ? (
                                                                    <div className="comment-edit-form">
                                                                        <textarea 
                                                                            value={editText}
                                                                            onChange={(e) => setEditText(e.target.value)}
                                                                            className="comment-edit-textarea"
                                                                        />
                                                                        <div className="comment-edit-actions">
                                                                            <button 
                                                                                className="comment-save-btn"
                                                                                onClick={handleSaveEditComment}
                                                                            >
                                                                                Сохранить
                                                                            </button>
                                                                            <button 
                                                                                className="comment-cancel-btn"
                                                                                onClick={handleCancelEdit}
                                                                            >
                                                                                Отмена
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    comment.text
                                                                )}
                                                            </div>
                                                                <div className="comment-actions">
                                                                    <button 
                                                                        className={`comment-action-btn comment-like-btn ${comment.isLiked ? 'liked' : ''} ${likingComments.has(comment.id) ? 'loading' : ''}`}
                                                                        onClick={() => handleLikeComment(comment.id)}
                                                                        disabled={likingComments.has(comment.id)}
                                                                    >
                                                                        {likingComments.has(comment.id) ? (
                                                                            <div className="spinner" />
                                                                        ) : (
                                                                            <Heart size={16} />
                                                                        )}
                                                                        <span>{comment.likes || 0}</span>
                                                                    </button>
                                                                    <button 
                                                                        className={`comment-action-btn comment-dislike-btn ${comment.isDisliked ? 'disliked' : ''} ${likingComments.has(comment.id) ? 'loading' : ''}`}
                                                                        onClick={() => handleDislikeComment(comment.id)}
                                                                        disabled={likingComments.has(comment.id)}
                                                                    >
                                                                        {likingComments.has(comment.id) ? (
                                                                            <div className="spinner" />
                                                                        ) : (
                                                                            <Heart size={16} style={{transform: 'rotate(180deg)'}} />
                                                                        )}
                                                                        <span>{comment.dislikes || 0}</span>
                                                                    </button>

                                                                    {comment.replies && comment.replies.length > 0 ? (
                                                                        <button 
                                                                            className="comment-action-btn comment-show-replies-btn"
                                                                            onClick={() => handleToggleReplies(comment.id)}
                                                                        >
                                                                            {expandedComments.has(comment.id) ? (
                                                                                <>
                                                                                    <ChevronUp size={16} />
                                                                                    <span>Скрыть ответы</span>
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                    <ChevronDown size={16} />
                                                                                    <span>Посмотреть ответы ({comment.replies.length})</span>
                                                                                </>
                                                                            )}
                                                                        </button>
                                                                    ) : (
                                                                        <button 
                                                                            className="comment-action-btn comment-show-replies-btn"
                                                                            onClick={() => {
                                                                                handleToggleReplies(comment.id);
                                                                                handleStartReply(comment.id);
                                                                            }}
                                                                        >
                                                                            <MessageCircle size={16} />
                                                                            <span>Ответить</span>
                                                                        </button>
                                                                    )}

                                                                    {/* Кнопки редактирования и удаления для владельца комментария */}
                                                                    {isCommentOwner(comment as unknown as Record<string, unknown>) && (
                                                                        <>
                                                                            <button 
                                                                                className="comment-action-btn comment-edit-btn"
                                                                                onClick={() => handleEditComment(comment.id, comment.text)}
                                                                            >
                                                                                <Edit size={16} />
                                                                                <span>Редактировать</span>
                                                                            </button>
                                                                            <button 
                                                                                className="comment-action-btn comment-delete-btn"
                                                                                onClick={() => handleDeleteComment(comment.id, comment.text)}
                                                                            >
                                                                                <Trash2 size={16} />
                                                                                <span>Удалить</span>
                                                                            </button>
                                                                        </>
                                                                    )}
                                                                </div>


                                                                {/* Ответы на комментарий и форма ответа */}
                                                                {expandedComments.has(comment.id) && (
                                                                    <div className="comment-replies">
                                                                        {/* Список ответов */}
                                                                        {comment.replies && comment.replies.length > 0 && (
                                                                            <div className="replies-list">
                                                                                {comment.replies.map((reply) => (
                                                                                    <div key={reply.id} className={`comment-reply-item ${reply.isPending ? 'pending' : ''}`}>
                                                                                        <div className="reply-user-info">
                                                                                            <Link 
                                                                                                href={`/profile/${reply.realUsername || reply.username}`} 
                                                                                                style={{ textDecoration: 'none', display: 'flex', alignItems: 'flex-start', gap: '8px' }}
                                                                                            >
                                                                                                <div className="reply-avatar">
                                                                                                    {reply.avatarUrl ? (
                                                                                                        <img 
                                                                                                            src={reply.avatarUrl} 
                                                                                                            alt={reply.username || 'Аноним'}
                                                                                                            onError={(e) => {
                                                                                                                const target = e.target as HTMLImageElement;
                                                                                                                target.style.display = 'none';
                                                                                                                const parent = target.parentElement;
                                                                                                                if (parent) {
                                                                                                                    parent.innerHTML = `<span class="avatar-fallback">${(reply.username || 'A').charAt(0).toUpperCase()}</span>`;
                                                                                                                }
                                                                                                            }}
                                                                                                        />
                                                                                                    ) : (
                                                                                                        <span className="avatar-fallback">{(reply.username || 'A').charAt(0).toUpperCase()}</span>
                                                                                                    )}
                                                                                                </div>
                                                                                                <div className="reply-user-details">
                                                                                                    <span 
                                                                                                        className="reply-username"
                                                                                                        style={{ color: getRoleColor(reply.role || '') }}
                                                                                                    >
                                                                                                        {reply.nickname || reply.username || 'Аноним'}
                                                                                                    </span>
                                                                                                    {getRoleIcon(reply.role || '', reply.verified)}
                                                                                                </div>
                                                                                            </Link>
                                                                                        </div>
                                                                                        <div className="reply-text">
                                                                                            {editingReplyId === reply.id ? (
                                                                                                <div className="reply-edit-form">
                                                                                                    <textarea 
                                                                                                        value={editText}
                                                                                                        onChange={(e) => setEditText(e.target.value)}
                                                                                                        className="reply-edit-textarea"
                                                                                                    />
                                                                                                    <div className="reply-edit-actions">
                                                                                                        <button 
                                                                                                            className="reply-save-btn"
                                                                                                            onClick={handleSaveEditReply}
                                                                                                        >
                                                                                                            Сохранить
                                                                                                        </button>
                                                                                                        <button 
                                                                                                            className="reply-cancel-btn"
                                                                                                            onClick={handleCancelEdit}
                                                                                                        >
                                                                                                            Отмена
                                                                                                        </button>
                                                                                                    </div>
                                                                                                </div>
                                                                                            ) : (
                                                                                                reply.text
                                                                                            )}
                                                                                        </div>
                                                                                        <div className="reply-actions">
                                                                                            <button 
                                                                                                className={`reply-action-btn reply-like-btn ${reply.isLiked ? 'liked' : ''} ${likingReplies.has(reply.id) ? 'loading' : ''}`}
                                                                                                onClick={() => handleLikeReply(reply.id)}
                                                                                                disabled={likingReplies.has(reply.id)}
                                                                                            >
                                                                                                {likingReplies.has(reply.id) ? (
                                                                                                    <div className="spinner" />
                                                                                                ) : (
                                                                                                    <Heart size={12} />
                                                                                                )}
                                                                                                <span>{reply.likes || 0}</span>
                                                                                            </button>
                                                                                            <button 
                                                                                                className={`reply-action-btn reply-dislike-btn ${reply.isDisliked ? 'disliked' : ''} ${likingReplies.has(reply.id) ? 'loading' : ''}`}
                                                                                                onClick={() => handleDislikeReply(reply.id)}
                                                                                                disabled={likingReplies.has(reply.id)}
                                                                                            >
                                                                                                {likingReplies.has(reply.id) ? (
                                                                                                    <div className="spinner" />
                                                                                                ) : (
                                                                                                    <Heart size={12} style={{transform: 'rotate(180deg)'}} />
                                                                                                )}
                                                                                                <span>{reply.dislikes || 0}</span>
                                                                                            </button>
                                                                                            
                                                                                            <button 
                                                                                                className="reply-action-btn"
                                                                                                onClick={() => {
                                                                                                    const replyToText = `@${reply.username || 'Аноним'}, `;
                                                                                                    handleStartReply(comment.id);
                                                                                                    handleReplyTextChange(replyToText);
                                                                                                }}
                                                                                                >
                                                                                                    <MessageCircle size={12} />
                                                                                                    Ответить
                                                                                                </button>

                                                                                                {/* Кнопки редактирования и удаления для владельца ответа */}
                                                                                                {isCommentOwner(reply as unknown as Record<string, unknown>) && (
                                                                                                    <>
                                                                                                        <button 
                                                                                                            className="reply-action-btn reply-edit-btn"
                                                                                                            onClick={() => handleEditReply(reply.id, reply.text)}
                                                                                                        >
                                                                                                            <Edit size={12} />
                                                                                                            Редактировать
                                                                                                        </button>
                                                                                                        <button 
                                                                                                            className="reply-action-btn reply-delete-btn"
                                                                                                            onClick={() => handleDeleteReply(reply.id, reply.text)}
                                                                                                        >
                                                                                                            <Trash2 size={12} />
                                                                                                            Удалить
                                                                                                        </button>
                                                                                                    </>
                                                                                                )}
                                                                                            </div>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        )}

                                                                        {/* Форма для ответа внизу */}
                                                                        <div className="comment-reply-form bottom-form">
                                                                            <textarea
                                                                                placeholder={`Ответить ${comment.username || 'пользователю'}...`}
                                                                                className="reply-textarea enhanced"
                                                                                value={replyingTo === comment.id ? replyText : ''}
                                                                                onChange={(e) => {
                                                                                    if (replyingTo !== comment.id) {
                                                                                        handleStartReply(comment.id);
                                                                                    }
                                                                                    handleReplyTextChange(e.target.value);
                                                                                }}
                                                                                onKeyDown={(e) => {
                                                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                                                        e.preventDefault();
                                                                                        if (replyText.trim()) {
                                                                                            handleSubmitReply(comment.id);
                                                                                        }
                                                                                    }
                                                                                }}
                                                                            />
                                                                            {replyingTo === comment.id && replyText.trim() && (
                                                                                <div className="reply-form-actions">
                                                                                    <button 
                                                                                        className="reply-submit-btn"
                                                                                        onClick={() => handleSubmitReply(comment.id)}
                                                                                    >
                                                                                        <Send size={14} />
                                                                                        Ответить
                                                                                    </button>
                                                                                    <button 
                                                                                        className="reply-cancel-btn"
                                                                                        onClick={handleCancelReply}
                                                                                    >
                                                                                        Отмена
                                                                                    </button>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            
                                            {comments.length > 5 && (
                                                <div className="comments-show-more">
                                                    <button 
                                                        className="show-more-btn"
                                                            onClick={handleToggleShowAllComments}
                                                    >
                                                        {showAllComments ? (
                                                            <>
                                                                <ChevronUp size={16} />
                                                                Скрыть
                                                            </>
                                                        ) : (
                                                            <>
                                                                <ChevronDown size={16} />
                                                                Показать еще ({comments.length - 5})
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="anime-page-container-tab-empty">
                                            <div className="anime-page-container-tab-empty-icon">
                                                <MessageCircle size={48} strokeWidth={1.5} />
                                            </div>
                                            <h3>Здесь пока тишина</h3>
                                            <p>Станьте первым, кто поделится своими впечатлениями об этом аниме!</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Новые секции: Франшиза и Похожее */}
                <FranchiseSection animeId={Number(animeId)} />
                <SimilarAnimeSection animeId={Number(animeId)} genres={anime.genres || ''} />

            </div>

            {/* Модальные окна */}
            <CommentsModal 
                show={showCommentsModal} 
                onClose={() => setShowCommentsModal(false)} 
                isModern={true} 
                animeTitle={anime.title} 
                comments={comments} 
                onSubmitComment={handleSubmitComment} 
                onLikeComment={handleLikeComment} 
                onReplyComment={handleReplyComment}
                onOpen={loadComments}
                loading={commentsLoading}
            />
            <AuthPromptModal show={showAuthPrompt} onClose={() => setShowAuthPrompt(false)} />
            
            <DeleteCommentModal
                isOpen={showDeleteModal}
                onClose={closeDeleteModal}
                onConfirm={confirmDelete}
                commentText={deleteTarget?.text || ''}
                isReply={deleteTarget?.type === 'reply'}
            />
        </div>
    );
};

export default AnimePagePC;