'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { X, Star, ThumbsUp, ThumbsDown, Filter } from 'lucide-react';

interface Review {
    id: number;
    username: string;
    rating: number;
    title: string;
    content: string;
    timestamp: string;
    helpful: number;
    unhelpful: number;
    isHelpful?: boolean;
}

interface ReviewsModalProps {
    show: boolean;
    onClose: () => void;
    isModern?: boolean;
    animeTitle: string;
    reviews: Review[];
    averageRating: number;
    totalReviews: number;
    onSubmitReview: (rating: number, title: string, content: string) => void;
    onVoteHelpful: (reviewId: number, isHelpful: boolean) => void;
    onOpen?: () => void;
    loading?: boolean;
}

const ReviewsModal: React.FC<ReviewsModalProps> = ({
    show,
    onClose,
    isModern = false,
    animeTitle,
    reviews,
    averageRating,
    totalReviews,
    onSubmitReview,
    onVoteHelpful,
    onOpen,
}) => {
    const [showForm, setShowForm] = useState(false);
    const [userRating, setUserRating] = useState(0);
    const [reviewTitle, setReviewTitle] = useState('');
    const [reviewContent, setReviewContent] = useState('');
    const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'rating' | 'helpful'>('newest');

    // Загрузка отзывов при открытии
    React.useEffect(() => {
        if (show && onOpen) {
            onOpen();
        }
    }, [show, onOpen]);

    if (!show) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (userRating === 0 || !reviewTitle.trim() || !reviewContent.trim()) return;
        
        onSubmitReview(userRating, reviewTitle.trim(), reviewContent.trim());
        setShowForm(false);
        setUserRating(0);
        setReviewTitle('');
        setReviewContent('');
    };

    const renderStars = (rating: number, interactive = false, onRate?: (rating: number) => void) => {
        return (
            <div className={`stars-container ${interactive ? 'interactive' : ''}`}>
                {[1, 2, 3, 4, 5].map(star => (
                    <button
                        key={star}
                        className={`star ${star <= rating ? 'filled' : ''}`}
                        onClick={() => interactive && onRate && onRate(star)}
                        disabled={!interactive}
                    >
                        <Star size={interactive ? 24 : 16} fill={star <= rating ? '#ffd700' : 'none'} />
                    </button>
                ))}
            </div>
        );
    };

    const getRatingColor = (rating: number) => {
        if (rating >= 4) return 'rating-high';
        if (rating >= 3) return 'rating-medium';
        return 'rating-low';
    };

    return (
        <div className={`reviews-modal-overlay ${isModern ? 'modern' : 'classic'}`}>
            <div className="reviews-modal" onClick={e => e.stopPropagation()}>
                {/* Заголовок */}
                <div className="modal-header">
                    <div className="header-content">
                        <h2>Отзывы</h2>
                        <p className="anime-title">{animeTitle}</p>
                    </div>
                    <button className="close-button" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                {/* Статистика рейтинга */}
                <div className="rating-summary">
                    <div className="average-rating">
                        <div className={`rating-badge ${getRatingColor(averageRating)}`}>
                            <span className="rating-value">{averageRating.toFixed(1)}</span>
                            {renderStars(Math.round(averageRating))}
                        </div>
                        <div className="rating-info">
                            <p className="total-reviews">{totalReviews} отзывов</p>
                            <p className="rating-text">Средняя оценка</p>
                        </div>
                    </div>
                    
                    <div className="rating-actions">
                        <button 
                            className="write-review-button"
                            onClick={() => setShowForm(!showForm)}
                        >
                            <Star size={18} />
                            Написать отзыв
                        </button>
                    </div>
                </div>

                {/* Форма написания отзыва */}
                {showForm && (
                    <div className="review-form">
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Ваша оценка:</label>
                                {renderStars(userRating, true, setUserRating)}
                            </div>
                            
                            <div className="form-group">
                                <label>Заголовок отзыва:</label>
                                <input
                                    type="text"
                                    value={reviewTitle}
                                    onChange={(e) => setReviewTitle(e.target.value)}
                                    placeholder="Кратко опишите ваше впечатление"
                                    className="review-title-input"
                                    maxLength={100}
                                />
                            </div>
                            
                            <div className="form-group">
                                <label>Ваш отзыв:</label>
                                <textarea
                                    value={reviewContent}
                                    onChange={(e) => setReviewContent(e.target.value)}
                                    placeholder="Расскажите подробнее о ваших впечатлениях..."
                                    className="review-content-input"
                                    rows={4}
                                    maxLength={1000}
                                />
                            </div>
                            
                            <div className="form-actions">
                                <button 
                                    type="button"
                                    className="cancel-button"
                                    onClick={() => setShowForm(false)}
                                >
                                    Отмена
                                </button>
                                <button 
                                    type="submit" 
                                    className="submit-button"
                                    disabled={userRating === 0 || !reviewTitle.trim() || !reviewContent.trim()}
                                >
                                    Опубликовать отзыв
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Фильтры */}
                <div className="reviews-filters">
                    <div className="filter-group">
                        <Filter size={16} />
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'rating' | 'helpful')}
                            className="sort-select"
                        >
                            <option value="newest">Сначала новые</option>
                            <option value="oldest">Сначала старые</option>
                            <option value="rating">По рейтингу</option>
                            <option value="helpful">По полезности</option>
                        </select>
                    </div>
                </div>

                {/* Список отзывов */}
                <div className="reviews-list">
                    {reviews.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">⭐</div>
                            <h3>Пока нет отзывов</h3>
                            <p>Станьте первым, кто оставит отзыв об этом аниме!</p>
                        </div>
                    ) : (
                        reviews.map((review, index) => (
                            <div key={`review-${review.id || index}`} className="review-item">
                                <div className="review-header">
                                    <div className="user-info">
                                        <Link href={`/profile/${review.username}`} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div className="user-avatar">
                                                {(review.username || 'A').charAt(0).toUpperCase()}
                                            </div>
                                            <div className="user-details">
                                                <span className="username">{review.username}</span>
                                                <div className="review-meta">
                                                    {renderStars(review.rating)}
                                                    <span className="timestamp">{review.timestamp}</span>
                                                </div>
                                            </div>
                                        </Link>
                                    </div>
                                    <div className={`user-rating ${getRatingColor(review.rating)}`}>
                                        {review.rating.toFixed(1)}
                                    </div>
                                </div>

                                <div className="review-content">
                                    <h4 className="review-title">{review.title}</h4>
                                    <p className="review-text">{review.content}</p>
                                </div>

                                <div className="review-actions">
                                    <div className="helpfulness">
                                        <span className="helpfulness-label">Был ли отзыв полезен?</span>
                                        <div className="vote-buttons">
                                            <button 
                                                className={`vote-button helpful ${review.isHelpful === true ? 'active' : ''}`}
                                                onClick={() => onVoteHelpful(review.id, true)}
                                            >
                                                <ThumbsUp size={16} />
                                                <span>{review.helpful}</span>
                                            </button>
                                            <button 
                                                className={`vote-button unhelpful ${review.isHelpful === false ? 'active' : ''}`}
                                                onClick={() => onVoteHelpful(review.id, false)}
                                            >
                                                <ThumbsDown size={16} />
                                                <span>{review.unhelpful}</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReviewsModal;
