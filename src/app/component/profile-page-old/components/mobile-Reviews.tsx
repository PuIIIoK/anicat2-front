'use client';

import * as LucideIcons from 'lucide-react';
import { ClipLoader } from 'react-spinners';

interface ReviewItem {
  id: number;
  animeTitle: string;
  coverUrl: string;
  score: number;
  comment?: string;
}

interface MobileReviewsProps {
  userName: string;
  userReviews: ReviewItem[];
  isLoading?: boolean;
}

const MobileReviews: React.FC<MobileReviewsProps> = ({ userName, userReviews, isLoading = false }) => {
  // Инвертируем порядок отзывов (новые сверху)
  const reversedReviews = [...userReviews].reverse();

  // Рендер звезд на основе оценки
  const renderStars = (score: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <LucideIcons.Star
          key={i}
          size={14}
          fill={i <= score ? '#f59e0b' : 'none'}
          stroke={i <= score ? '#f59e0b' : '#4b5563'}
          strokeWidth={2}
        />
      );
    }
    return stars;
  };

  // Получение цвета для рейтинга
  const getRatingColor = (score: number) => {
    if (score >= 4.5) return '#10b981';
    if (score >= 3.5) return '#3b82f6';
    if (score >= 2.5) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="user-reviews-block-mobile">
      <div className="reviews-section-header">
        <LucideIcons.MessageSquare size={20} />
        <h2>Отзывы {userName}</h2>
      </div>
      <div className="reviews-list">
        {isLoading ? (
          <div className="loading-spinner-container">
            <ClipLoader color="var(--primary-color)" size={32} />
          </div>
        ) : reversedReviews.length === 0 ? (
          <div className="reviews-empty">
            <LucideIcons.FileText size={32} style={{ opacity: 0.3 }} />
            <span>Нет отзывов</span>
          </div>
        ) : (
          reversedReviews.map((review) => (
            <div key={review.id} className="review-card">
              <div className="anime-header-review">
                <div className="review-cover-wrapper">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={review.coverUrl} alt={review.animeTitle} />
                </div>
                <div className="anime-info-review">
                  <h3>{review.animeTitle}</h3>
                  <div className="rating-container">
                    <div className="stars-wrapper">
                      {renderStars(review.score)}
                    </div>
                    <div className="rating-badge" style={{ backgroundColor: getRatingColor(review.score) + '20', color: getRatingColor(review.score) }}>
                      <LucideIcons.Star size={12} fill={getRatingColor(review.score)} stroke={getRatingColor(review.score)} />
                      <span>{review.score.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              </div>
              {review.comment && (
                <div className="review-text-wrapper">
                  <div className="review-quote-icon">
                    <LucideIcons.Quote size={16} />
                  </div>
                  <p className="review-text">{review.comment}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MobileReviews;


