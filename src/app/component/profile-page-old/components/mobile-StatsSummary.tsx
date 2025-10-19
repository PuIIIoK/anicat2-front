'use client';

interface MobileStatsSummaryProps {
  yearsOnSite: number | null;
  sinceYear: number | null;
  friendsCount: number;
  completedCount: number;
  reviewsCount: number;
}

const MobileStatsSummary: React.FC<MobileStatsSummaryProps> = ({
  yearsOnSite,
  sinceYear,
  friendsCount,
  completedCount,
  reviewsCount,
}) => {
  return (
    <div className="profile-stats-block-mobile">
      <div className="profile-stat-item">
        <span className="stat-title">Лет на сайте</span>
        <span className="stat-value">
          {yearsOnSite ?? '—'}{sinceYear ? ` (${sinceYear})` : ''}
        </span>
      </div>
      <div className="profile-stat-item">
        <span className="stat-title">Друзья</span>
        <span className="stat-value">{friendsCount}</span>
      </div>
      <div className="profile-stat-item">
        <span className="stat-title">Аниме просмотрено</span>
        <span className="stat-value">{completedCount}</span>
      </div>
      <div className="profile-stat-item">
        <span className="stat-title">Отзывов</span>
        <span className="stat-value">{reviewsCount}</span>
      </div>
    </div>
  );
};

export default MobileStatsSummary;


