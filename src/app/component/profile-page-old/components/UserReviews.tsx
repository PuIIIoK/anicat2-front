'use client';

import React, { useState } from 'react';
import type { UserReview } from '../types';

interface UserReviewsProps {
  reviews: UserReview[];
  userName: string;
  isOwnProfile: boolean;
  onReviewDeleted?: (reviewId: number) => void;
}

export const UserReviews: React.FC<UserReviewsProps> = ({ 
  reviews, 
  userName, 
  isOwnProfile, 
  onReviewDeleted 
}) => {
  const [visibleCount, setVisibleCount] = useState(2);
  const [deletingReview, setDeletingReview] = useState<number | null>(null);
  
  // Инвертируем порядок отзывов (новые сверху)
  const reversedReviews = [...reviews].reverse();

  const handleDeleteReview = async (reviewId: number) => {
    if (!confirm('Вы уверены, что хотите удалить этот отзыв?')) return;
    
    setDeletingReview(reviewId);
    try {
      const tokenMatch = document.cookie.match(/token=([^;]+)/);
      const token = tokenMatch ? tokenMatch[1] : '';
      
      if (!token) {
        alert('Необходимо авторизоваться для удаления отзыва');
        return;
      }

      const response = await fetch(`/api/reviews/${reviewId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        onReviewDeleted?.(reviewId);
      } else {
        alert('Ошибка при удалении отзыва');
      }
    } catch (error) {
      console.error('Ошибка при удалении отзыва:', error);
      alert('Произошла ошибка при удалении отзыва');
    } finally {
      setDeletingReview(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (reversedReviews.length === 0) {
    return (
      <div className="user-reviews-block">
        <h2>Отзывы {userName}</h2>
        <div className="no-reviews-message">
          <p>У этого пользователя еще нет отзывов к аниме</p>
          {isOwnProfile && (
            <p className="hint">Начните оставлять отзывы к просмотренным аниме!</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="user-reviews-block">
      <h2>Отзывы {userName}</h2>
      <div className="reviews-list">
        {reversedReviews.slice(0, visibleCount).map((review) => (
          <div key={review.id} className="review-card">
            <div className="anime-header-review">
              <img src={review.coverUrl} alt={review.animeTitle} />
              <div className="anime-info-review">
                <h3>{review.animeTitle}</h3>
                <div className="review-meta">
                  <span className="rating">Оценка: {review.score}/10</span>
                  {isOwnProfile && (
                    <button
                      className="delete-review-btn"
                      onClick={() => handleDeleteReview(review.id)}
                      disabled={deletingReview === review.id}
                      title="Удалить отзыв"
                    >
                      {deletingReview === review.id ? 'Удаление...' : '🗑️'}
                    </button>
                  )}
                </div>
              </div>
            </div>
            {review.comment && (
              <p className="review-text">{review.comment}</p>
            )}
            <span className="timestamp">
              {formatDate(review.createdAt)}
            </span>
          </div>
        ))}
      </div>

      {reversedReviews.length > visibleCount && (
        <div className="load-more-reviews" onClick={() => setVisibleCount(prev => prev + 2)}>
          Загрузить ещё
        </div>
      )}
    </div>
  );
};
