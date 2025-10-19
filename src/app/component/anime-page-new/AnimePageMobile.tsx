'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, Play, Star, Calendar, Camera, FileText, MessageCircle, AlertTriangle, X, CheckCircle, PlayCircle, Pause, ChevronDown, Clock, Edit, Trash2, ChevronUp, Shield, Crown, Verified, Send, Loader2, ThumbsUp, ThumbsDown, Tv, Film, Hash, Activity } from 'lucide-react';
import ScreenshotItem from './ScreenshotItem';
import { useAnimePageLogic } from '../../hooks/useAnimePageLogic';
import AnimePageSkeleton from './AnimePageSkeleton';
import CommentsModal from './CommentsModal';
import AuthPromptModal from './AuthPromptModal';
import DeleteCommentModal from './DeleteCommentModal';
import DescriptionModal from './DescriptionModal';
import FranchiseSection from './FranchiseSection';
import SimilarAnimeSection from './SimilarAnimeSection';
import TitlesModal from './TitlesModal';
import DiscordStatusTracker from '../DiscordStatusTracker';
import ServerErrorPage from '../common/ServerErrorPage';

const statusOptions = [
    { label: 'Не выбрано', icon: <X size={14} />, value: 'none' },
    { label: 'Запланировано', icon: <Calendar size={14} />, value: 'planned' },
    { label: 'Смотрю', icon: <PlayCircle size={14} />, value: 'watching' },
    { label: 'Просмотрено', icon: <CheckCircle size={14} />, value: 'completed' },
    { label: 'Отложено', icon: <Pause size={14} />, value: 'paused' },
    { label: 'Брошено', icon: <Clock size={14} />, value: 'dropped' },
];

interface AnimePageMobileProps {
    animeId: string;
}

const AnimePageMobile: React.FC<AnimePageMobileProps> = ({ animeId }) => {
    const {
        anime, isLoading, error, activeTab,
        showCommentsModal, showAuthPrompt, favorites, selectedStatus, averageRating, isSavingStatus,
        screenshotUrls, screenshotsLoading, comments, reviews, commentsLoading, reviewsLoading,
        userReview, isEditingReview,
        handleTabChange, toggleFavorite, handleStatusSelect, handleWatchClick,
        setShowCommentsModal, setShowAuthPrompt,
        handleSubmitComment, handleLikeComment, handleDislikeComment, handleReplyComment,
        handleSubmitReview, handleDeleteReview, handleEditReview, handleCancelEditReview,
        visibleComments, showAllComments, handleToggleShowAllComments,
        visibleReviews, showAllReviews, handleToggleShowAllReviews,
        likingComments,
        
        
        // Модалка удаления
        showDeleteModal, deleteTarget, closeDeleteModal, confirmDelete,

        // Доступность и блокировки
        isAccessible,
        zametka_blocked,
    } = useAnimePageLogic(animeId);

    // Локальные состояния для модалок
    const [showDescriptionModal, setShowDescriptionModal] = useState(false);
    const [showTitlesModal, setShowTitlesModal] = useState(false);
    const [showCollectionModal, setShowCollectionModal] = useState(false);

    const currentStatus = statusOptions.find(option => option.value === selectedStatus);

    // Функция для обрезания текста
    const truncateText = (text: string, maxLength: number) => {
        if (!text || text.length <= maxLength) return text;
        return text.slice(0, maxLength).trim() + '...';
    };

    // Функция для получения иконки типа аниме
    const getTypeIcon = (type: string) => {
        const lowerType = type?.toLowerCase();
        if (lowerType === 'tv' || lowerType === 'сериал') return <Tv size={16} />;
        if (lowerType === 'movie' || lowerType === 'фильм') return <Film size={16} />;
        return <Tv size={16} />; // по умолчанию
    };

    // Функция для получения иконки статуса
    const getStatusIcon = (status: string) => {
        const lowerStatus = status?.toLowerCase();
        if (lowerStatus === 'завершён' || lowerStatus === 'завершено') return <CheckCircle size={16} />;
        if (lowerStatus === 'онгоинг' || lowerStatus === 'выходит') return <Activity size={16} />;
        if (lowerStatus === 'скоро' || lowerStatus === 'анонсировано') return <Clock size={16} />;
        return <PlayCircle size={16} />; // по умолчанию
    };


    const getRoleColor = (roleString: string) => {
        if (!roleString) return 'var(--text-primary)';
        
        // Разделяем роли по запятой и приводим к нижнему регистру
        const roles = roleString.split(',').map(r => r.trim().toLowerCase());
        console.log('🎭 Обработка ролей (mobile):', roleString, '→', roles);
        
        // Приоритет ролей (самая высокая роль определяет цвет)
        if (roles.includes('admin')) return '#ff4444';
        if (roles.includes('moderator')) return '#ffa500';
        if (roles.includes('premium')) return '#ffd700';
        if (roles.includes('verified')) return '#00ff88';
        
        return 'var(--text-primary)';
    };

    const getRoleIcon = (roleString: string, verified?: boolean) => {
        console.log('🏅 Значки для (mobile):', roleString, 'verified:', verified);
        
        if (verified) return <Verified size={16} className="verification-icon" />;
        
        if (!roleString) return null;
        
        const roles = roleString.split(',').map(r => r.trim().toLowerCase());
        
        if (roles.includes('admin')) return <Crown size={16} className="role-icon admin" />;
        if (roles.includes('moderator')) return <Shield size={16} className="role-icon moderator" />;
        if (roles.includes('premium')) return <Star size={16} className="role-icon premium" />;
        
        return null;
    };

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

    if (isLoading) {
        return <AnimePageSkeleton />;
    }

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
        <div className="mobile-anime-page">
            <DiscordStatusTracker status={`На странице аниме ${anime.title}`} />

            <div className="mobile-anime-container">
                {/* Мобильный баннер */}
                <div className="mobile-anime-banner">
                    {anime.bannerUrl ? (
                        <Image src={anime.bannerUrl} alt="Баннер" fill className="banner-image" unoptimized style={{ objectFit: 'cover' }} priority />
                    ) : (
                        <div className="banner-placeholder" />
                    )}
                    <div className="banner-gradient" />
                </div>

                {/* Мобильный контент */}
                <div className="mobile-anime-content">
                    {/* Постер и основная информация */}
                    <div className="mobile-anime-header">
                        <div className="mobile-poster">
                            {anime.coverUrl ? (
                                <Image src={anime.coverUrl} alt="Постер" fill unoptimized style={{ objectFit: 'cover' }} />
                            ) : (
                                <div className="poster-placeholder">Постер недоступен</div>
                            )}
                        </div>

                        <div className="mobile-info">
                            <div className="mobile-title-section">
                                <h1 
                                    className="mobile-anime-title clickable"
                                    onClick={() => setShowTitlesModal(true)}
                                >
                                    {truncateText(anime.title, 50)}
                                </h1>
                                {(anime.currentEpisode || anime.episodeAll) && anime.status !== 'Скоро' && anime.status !== 'Анонс' && (
                                    <div className="mobile-episode-count">
                                        {anime.currentEpisode ? `${anime.currentEpisode}/${anime.episodeAll || '?'}` : anime.episodeAll} эп.
                                    </div>
                                )}
                            </div>
                            
                            <div className="mobile-anime-badges">
                                {averageRating !== null && anime.status !== 'Скоро' && anime.status !== 'Анонс' && (
                                    <div className={`mobile-rating ${averageRating >= 4 ? 'rating-high' : averageRating >= 3 ? 'rating-medium' : 'rating-low'}`}>
                                        <Star size={14} fill="currentColor" />
                                        {averageRating.toFixed(1)}
                                    </div>
                                )}
                                <div className={`mobile-age-rating age-rating-${anime.rating || '16+'}`}>
                                    <Shield size={14} fill="currentColor" />
                                    {anime.rating || '16+'}
                                </div>
                                {isAccessible === false && (
                                    <div className="mobile-blocked-badge">
                                        <AlertTriangle size={12} fill="currentColor" />
                                        Заблокировано
                                    </div>
                                )}
                            </div>

                            <div className="mobile-anime-meta">
                                <span>{anime.type}</span>
                                <span>•</span>
                                <span>{anime.year}</span>
                                <span>•</span>
                                <span>{anime.status}</span>
                            </div>
                        </div>
                    </div>

                    {/* Мобильные действия */}
                    <div className="mobile-actions">
                        <div className="mobile-actions-row">
                            <div className="mobile-collection-dropdown">
                                <button 
                                    className={`mobile-dropdown-trigger ${isSavingStatus ? 'saving' : ''}`} 
                                    onClick={() => setShowCollectionModal(true)}
                                    disabled={isSavingStatus}
                                >
                                    {isSavingStatus ? (
                                        <Loader2 size={12} className="spinning" />
                                    ) : (
                                        <>
                                            <span className="mobile-status-text">{currentStatus?.label}</span>
                                    <ChevronDown size={12} />
                                        </>
                                    )}
                                </button>
                            </div>

                            <button className={`mobile-action-btn ${favorites ? 'active' : ''}`} onClick={toggleFavorite}>
                                <Heart size={14} fill={favorites ? '#e50914' : 'none'} />
                            </button>
                        </div>

                        <button 
                            className={`mobile-watch-button ${!anime.opened || isAccessible === false ? 'disabled' : ''}`} 
                            onClick={handleWatchClick} 
                            disabled={!anime.opened || isAccessible === false}
                        >
                            {anime.opened ? (<><Play size={16} />Смотреть</>) : (anime.anons || 'Скоро')}
                        </button>
                    </div>

                    {/* Мобильная информация */}
                    <div className="mobile-info-section">
                        <div className="mobile-info-grid">
                            <div className="mobile-info-item">
                                <div className="mobile-info-icon">
                                    {getTypeIcon(anime.type)}
                                </div>
                                <div className="mobile-info-content">
                                    <span className="mobile-info-label">ТИП</span>
                                    <span className="mobile-info-value">{anime.type}</span>
                                </div>
                            </div>
                            <div className="mobile-info-item">
                                <div className="mobile-info-icon">
                                    <Calendar size={16} />
                                </div>
                                <div className="mobile-info-content">
                                    <span className="mobile-info-label">ГОД</span>
                                    <span className="mobile-info-value">{anime.year}</span>
                                </div>
                            </div>
                            <div className="mobile-info-item">
                                <div className="mobile-info-icon">
                                    {getStatusIcon(anime.status)}
                                </div>
                                <div className="mobile-info-content">
                                    <span className="mobile-info-label">СТАТУС</span>
                                    <span className="mobile-info-value">{anime.status}</span>
                                </div>
                            </div>
                            <div className="mobile-info-item">
                                <div className="mobile-info-icon">
                                    <Hash size={16} />
                                </div>
                                <div className="mobile-info-content">
                                    <span className="mobile-info-label">ЭПИЗОДЫ</span>
                                    <span className="mobile-info-value">{anime.episodeAll || '?'}</span>
                                </div>
                            </div>
                        </div>

                        {anime.genres && (
                            <div className="mobile-genres">
                                {anime.genres.split(',').map((genre, index) => (
                                    <span key={index} className="mobile-genre-tag">{genre.trim()}</span>
                                ))}
                        </div>
                    )}

                        {anime.zametka && (
                            <div className="mobile-anime-note">
                                <div className="mobile-note-content">
                                    {anime.zametka}
                    </div>
                </div>
                        )}

                        {isAccessible === false && zametka_blocked && (
                            <div className="mobile-anime-blocked-note">
                                <div className="mobile-blocked-note-content">
                                    {zametka_blocked}
                                </div>
                            </div>
                        )}

                        <div className="mobile-description">
                            <h3>Описание</h3>
                            {anime.description ? (
                                <div>
                                    <p className="mobile-description-text">
                                        {truncateText(anime.description, 200)}
                                    </p>
                                    {anime.description.length > 200 && (
                                        <button 
                                            className="mobile-show-more-btn"
                                            onClick={() => setShowDescriptionModal(true)}
                                        >
                                            Показать полное описание
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <p className="mobile-no-description">Для данного аниме нету описание.</p>
                            )}
                        </div>
                    </div>

                    {/* Мобильные табы */}
                    <div className="mobile-tabs">
                        <div className="mobile-tabs-navigation">
                            <button className={`mobile-tab-button ${activeTab === 'screenshots' ? 'active' : ''}`} onClick={() => handleTabChange('screenshots')}>
                                <Camera size={14} />
                                <span>Скриншоты</span>
                        </button>
                            <button className={`mobile-tab-button ${activeTab === 'details' ? 'active' : ''}`} onClick={() => handleTabChange('details')}>
                                <FileText size={14} />
                                <span>Детали</span>
                        </button>
                            <button 
                                className={`mobile-tab-button ${activeTab === 'reviews' ? 'active' : ''} ${(anime.status === 'Скоро' || anime.status === 'Анонс') ? 'disabled' : ''}`} 
                                onClick={() => anime.status !== 'Скоро' && anime.status !== 'Анонс' && handleTabChange('reviews')}
                                disabled={anime.status === 'Скоро' || anime.status === 'Анонс'}
                            >
                                <Star size={14} />
                                <span>Отзывы</span>
                        </button>
                            <button className={`mobile-tab-button ${activeTab === 'comments' ? 'active' : ''}`} onClick={() => handleTabChange('comments')}>
                                <MessageCircle size={14} />
                                <span>Комментарии</span>
                        </button>
                    </div>

                        <div className="mobile-tab-content">
                        {activeTab === 'screenshots' && (
                                <div className="mobile-tab-screenshots">
                                    <div className="mobile-screenshots-grid">
                                    {screenshotsLoading ? (
                                            <div className="mobile-tab-loading">
                                                <div className="mobile-tab-spinner"></div>
                                            <span>Загрузка скриншотов...</span>
                                        </div>
                                    ) : screenshotUrls.length > 0 ? (
                                            screenshotUrls.map((screenshot, index) => (
                                                <ScreenshotItem key={index} screenshot={screenshot} index={index} />
                                            ))
                                        ) : (
                                            <div className="mobile-tab-empty">
                                                <div className="mobile-tab-empty-icon">📷</div>
                                            <h3>Скриншоты отсутствуют</h3>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'details' && (
                                <div className="mobile-tab-details">
                                    <div className="mobile-details-list">
                                        <div className="mobile-detail-item">
                                        <strong>Тип:</strong> 
                                        <span>{anime.type}</span>
                                    </div>
                                        <div className="mobile-detail-item">
                                        <strong>Эпизодов:</strong> 
                                        <span>{anime.episodeAll || 'Неизвестно'}</span>
                                    </div>
                                        <div className="mobile-detail-item">
                                        <strong>Статус:</strong> 
                                        <span>{anime.status}</span>
                                    </div>
                                        <div className="mobile-detail-item">
                                        <strong>Год:</strong> 
                                        <span>{anime.year}</span>
                                    </div>
                                        <div className="mobile-detail-item">
                                        <strong>Сезон:</strong> 
                                        <span>{anime.mouthSeason || 'Не указан'}</span>
                                    </div>
                                        <div className="mobile-detail-item">
                                        <strong>Студия:</strong> 
                                        <span>{anime.studio || 'Не указана'}</span>
                                    </div>
                                    {anime.realesedFor && (
                                            <div className="mobile-detail-item">
                                            <strong>Снято по:</strong> 
                                            <span>{anime.realesedFor}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'reviews' && (
                                <div className="mobile-tab-reviews">
                                {userReview && !isEditingReview ? (
                                        <div className="mobile-user-review-display">
                                            <div className="mobile-user-review-header">
                                            <h3>Ваш отзыв</h3>
                                                <div className="mobile-user-review-actions">
                                                    <button onClick={handleEditReview}>
                                                        <Edit size={14} />
                                                </button>
                                                    <button onClick={handleDeleteReview}>
                                                        <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                            <div className="mobile-user-review-content">
                                                <div className="mobile-user-review-rating">
                                                    <div className="mobile-rating-display">
                                                        {[1, 2, 3, 4, 5].map((star) => (
                                                        <Star
                                                                key={star}
                                                            size={16}
                                                                fill={star <= (userReview.rating || 0) ? 'var(--primary-color)' : 'none'}
                                                                color={star <= (userReview.rating || 0) ? 'var(--primary-color)' : 'var(--text-muted)'}
                                                        />
                                                    ))}
                                                        <span className="mobile-rating-score">{userReview.rating}/5</span>
                                                </div>
                                            </div>
                                                {userReview.content && (
                                                    <div className="mobile-user-review-text">
                                                        <p>{userReview.content}</p>
                                                    </div>
                                                )}
                                        </div>
                                    </div>
                                ) : (
                                        <form className="mobile-reviews-form" onSubmit={(e) => { 
                                            e.preventDefault(); 
                                            const formData = new FormData(e.target as HTMLFormElement);
                                            const rating = formData.get('rating') as string;
                                            const text = formData.get('text') as string;
                                            
                                            if (!rating) {
                                                alert('Пожалуйста, поставьте оценку');
                                                return;
                                            }
                                            
                                            handleSubmitReview(
                                                parseInt(rating), 
                                                '', // title - пустой, так как не используется в форме
                                                text.trim() || ''
                                            ); 
                                        }}>
                                            <div className="mobile-reviews-form-header">
                                            <h3>{isEditingReview ? 'Редактировать отзыв' : 'Оставить отзыв'}</h3>
                                            {isEditingReview && (
                                                    <button type="button" className="mobile-cancel-edit-btn" onClick={handleCancelEditReview}>
                                                        <X size={14} />
                                                </button>
                                            )}
                                        </div>
                                            <div className="mobile-review-input-group">
                                                <div className="mobile-rating-input">
                                                    <label>Ваша оценка</label>
                                                    <div className="mobile-rating-stars">
                                                        {[5, 4, 3, 2, 1].map((star) => (
                                                            <label key={star} className="mobile-star-label">
                                                                <input 
                                                                    type="radio" 
                                                                    name="rating" 
                                                                    value={star}
                                                                    defaultChecked={isEditingReview ? userReview?.rating === star : false}
                                                                />
                                                                <Star size={18} />
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                                <textarea
                                                    name="text" 
                                                    className="mobile-review-textarea" 
                                                    placeholder="Поделитесь впечатлениями о данном аниме..."
                                                    rows={4}
                                                                    defaultValue={isEditingReview ? userReview?.content || '' : ''}
                                                />
                                                <button type="submit" className="mobile-review-submit-btn">
                                                    {isEditingReview ? 'Обновить отзыв' : 'Отправить отзыв'}
                                                    <Send size={14} />
                                                </button>
                                            </div>
                                        </form>
                                )}

                                    <div className="mobile-reviews-section">
                                    {reviewsLoading ? (
                                            <div className="mobile-tab-loading">
                                                <div className="mobile-tab-spinner"></div>
                                            <span>Загрузка отзывов...</span>
                                        </div>
                                    ) : reviews.length > 0 ? (
                                            <div className="mobile-reviews-section-content">
                                                <div className="mobile-reviews-list">
                                                    {visibleReviews.map((review, index) => (
                                                        <div key={index} className="mobile-review-item">
                                                            <div className="mobile-review-user-info">
                                                                <Link 
                                                                    href={`/profile/${review.username}`} 
                                                                    style={{ textDecoration: 'none', display: 'flex', alignItems: 'flex-start', gap: '10px' }}
                                                                >
                                                                    <div className="mobile-review-avatar">
                                                                        {review.avatarUrl ? (
                                                                            <img src={review.avatarUrl} alt="Аватар" />
                                                                        ) : (
                                                                            <span className="mobile-avatar-fallback">
                                                                                {review.username ? review.username.charAt(0).toUpperCase() : '?'}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="mobile-review-user-details">
                                                                        <div className="mobile-review-username-row">
                                                            <span className="mobile-review-username" style={{color: getRoleColor(review.role || '')}}>
                                                                {review.username}
                                                                            </span>
                                                                            {getRoleIcon(review.role || '', review.verified)}
                                                                        </div>
                                                                    </div>
                                                                </Link>
                                                            </div>
                                                        
                                                            {review.content ? (
                                                                <div className="mobile-review-content">
                                                                    {review.content}
                                                                </div>
                                                            ) : (
                                                                <div className="mobile-review-no-content">
                                                                    Отзыв без текста
                                                                </div>
                                                            )}
                                                        
                                                            <div className="mobile-review-rating">
                                                                {[1, 2, 3, 4, 5].map((star) => (
                                                                <Star
                                                                        key={star}
                                                                    size={14}
                                                                        fill={star <= (review.rating || 0) ? 'var(--primary-color)' : 'none'}
                                                                        color={star <= (review.rating || 0) ? 'var(--primary-color)' : 'var(--text-muted)'}
                                                                />
                                                            ))}
                                                                <span className="mobile-review-score">{review.rating}/5</span>
                                                        </div>
                                                    </div>
                                                    ))}
                                            </div>
                                            
                                                {handleToggleShowAllReviews && (
                                                    <div className="mobile-reviews-show-more">
                                                        <button className="mobile-show-more-btn" onClick={handleToggleShowAllReviews}>
                                                            {showAllReviews ? 'Скрыть' : 'Показать еще'}
                                                            {showAllReviews ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                            <div className="mobile-tab-empty">
                                                <div className="mobile-tab-empty-icon">⭐</div>
                                            <h3>Отзывов пока нет</h3>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'comments' && (
                                <div className="mobile-tab-comments">
                                    <form className="mobile-comments-form" onSubmit={(e) => { 
                                        e.preventDefault(); 
                                        const formData = new FormData(e.target as HTMLFormElement);
                                        const content = formData.get('comment') as string;
                                        if (content.trim()) {
                                            handleSubmitComment(content.trim());
                                        (e.target as HTMLFormElement).reset();
                                        }
                                    }}>
                                        <h3>Оставить комментарий</h3>
                                        <div className="mobile-comment-input-group">
                                            <textarea
                                                name="comment"
                                                className="mobile-comment-textarea"
                                                placeholder="Поделитесь мнением о данном аниме..."
                                                rows={3}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                        e.preventDefault();
                                                        const form = e.currentTarget.form;
                                                        if (form) {
                                                            form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                                                        }
                                                    }
                                                }}
                                            />
                                            <button type="submit" className="mobile-comment-submit-btn">
                                                Отправить
                                                <Send size={14} />
                                            </button>
                                        </div>
                                    </form>

                                    <div className="mobile-comments-section">
                                    {commentsLoading ? (
                                            <div className="mobile-tab-loading">
                                                <div className="mobile-tab-spinner"></div>
                                            <span>Загрузка комментариев...</span>
                                        </div>
                                    ) : comments.length > 0 ? (
                                            <div className="mobile-comments-section-content">
                                                <div className="mobile-comments-list">
                                                {visibleComments.map((comment) => (
                                                        <div key={comment.id} className={`mobile-comment-item ${comment.isPending ? 'pending' : ''}`}>
                                                            <div className="mobile-comment-user-info">
                                                                <Link 
                                                                    href={`/profile/${comment.realUsername || comment.username}`} 
                                                                    style={{ textDecoration: 'none', display: 'flex', alignItems: 'flex-start', gap: '10px', flex: 1 }}
                                                                >
                                                                    <div className="mobile-comment-avatar">
                                                                    {comment.avatarUrl ? (
                                                                            <img src={comment.avatarUrl} alt="Аватар" />
                                                                        ) : (
                                                                            <span className="mobile-avatar-fallback">
                                                                                {comment.username ? comment.username.charAt(0).toUpperCase() : '?'}
                                                                            </span>
                                                                    )}
                                                                </div>
                                                                    <div className="mobile-comment-user-details">
                                                                        <div className="mobile-comment-username-row">
                                                                            <span className="mobile-comment-username" style={{color: getRoleColor(comment.role || '')}}>
                                                                                {comment.username}
                                                                            </span>
                                                                        {getRoleIcon(comment.role || '', comment.verified)}
                                                                    </div>
                                                                        {comment.timestamp && (
                                                                            <div className="mobile-comment-timestamp">
                                                                                {new Date(comment.timestamp).toLocaleString('ru-RU', {
                                                                                    year: 'numeric',
                                                                                    month: 'short',
                                                                                    day: 'numeric',
                                                                                    hour: '2-digit',
                                                                                    minute: '2-digit'
                                                                                })}
                                                                </div>
                                                                        )}
                                                            </div>
                                                                </Link>
                                                            </div>

                                                            <div className="mobile-comment-content">
                                                                {comment.text}
                                                            </div>

                                                            <div className="mobile-comment-actions">
                                                            <button 
                                                                    className={`mobile-comment-like-btn ${comment.isLiked ? 'liked' : ''} ${likingComments.has(comment.id) ? 'loading' : ''}`}
                                                                onClick={() => handleLikeComment(comment.id)}
                                                                    disabled={likingComments.has(comment.id)}
                                                                >
                                                                    {likingComments.has(comment.id) ? (
                                                                        <div className="spinner" />
                                                                    ) : (
                                                                        <ThumbsUp size={12} />
                                                                    )}
                                                                    {comment.likes || 0}
                                                                </button>
                                                                    <button 
                                                                    className={`mobile-comment-dislike-btn ${comment.isDisliked ? 'disliked' : ''} ${likingComments.has(comment.id) ? 'loading' : ''}`}
                                                                    onClick={() => handleDislikeComment(comment.id)}
                                                                    disabled={likingComments.has(comment.id)}
                                                                >
                                                                    {likingComments.has(comment.id) ? (
                                                                        <div className="spinner" />
                                                                    ) : (
                                                                        <ThumbsDown size={12} />
                                                                    )}
                                                                    {comment.dislikes || 0}
                                                                                                </button>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>

                                                {!showAllComments && comments.length > 5 && (
                                                    <div className="mobile-comments-show-more">
                                                        <button className="mobile-show-more-btn" onClick={handleToggleShowAllComments}>
                                                            Показать еще комментарии
                                                                <ChevronDown size={14} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                            <div className="mobile-tab-empty">
                                                <div className="mobile-tab-empty-icon">
                                                    <MessageCircle size={40} strokeWidth={1.5} />
                                                </div>
                                            <h3>Здесь пока тишина</h3>
                                            <p>Станьте первым, кто поделится своими впечатлениями!</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                </div>
            
                {/* Новые секции: Франшиза и Похожее */}
                <FranchiseSection animeId={Number(animeId)} className="mobile" />
                <SimilarAnimeSection animeId={Number(animeId)} genres={anime.genres || ''} className="mobile" />
            </div>

            {/* Модалки */}
            {showCommentsModal && (
                <CommentsModal 
                    show={showCommentsModal} 
                    onClose={() => setShowCommentsModal(false)}
                    animeTitle={anime.title}
                    comments={comments}
                    onSubmitComment={handleSubmitComment}
                    onLikeComment={handleLikeComment}
                    onReplyComment={handleReplyComment}
                />
            )}

            {showAuthPrompt && (
                <AuthPromptModal 
                    show={showAuthPrompt} 
                    onClose={() => setShowAuthPrompt(false)} 
                />
            )}

            {showDeleteModal && (
                <DeleteCommentModal
                    isOpen={showDeleteModal}
                    onClose={closeDeleteModal}
                    onConfirm={confirmDelete}
                    commentText={deleteTarget?.text || ''}
                    isReply={deleteTarget?.type === 'reply'}
                />
            )}

            {/* Модалка описания */}
            <DescriptionModal
                isOpen={showDescriptionModal}
                onClose={() => setShowDescriptionModal(false)}
                title={anime.title}
                description={anime.description || ''}
            />

            {/* Модалка названий */}
            <TitlesModal
                isOpen={showTitlesModal}
                onClose={() => setShowTitlesModal(false)}
                mainTitle={anime.title}
                altTitle={anime.alttitle}
            />

            {/* Модалка выбора коллекций */}
            {showCollectionModal && (
                <div className="collection-modal-overlay" onClick={() => setShowCollectionModal(false)}>
                    <div className="collection-modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="collection-modal-header">
                            <h3>Выберите статус просмотра</h3>
                            <button className="collection-modal-close" onClick={() => setShowCollectionModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="collection-modal-body">
                            {statusOptions.map(option => (
                                <div 
                                    key={option.value} 
                                    className={`collection-modal-item ${selectedStatus === option.value ? 'active' : ''}`} 
                                    onClick={() => {
                                        handleStatusSelect(option.value);
                                        setShowCollectionModal(false);
                                    }}
                                >
                                    <span className="collection-modal-icon">{option.icon}</span>
                                    <span className="collection-modal-label">{option.label}</span>
                                    {selectedStatus === option.value && <CheckCircle size={16} className="collection-modal-check" />}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AnimePageMobile;