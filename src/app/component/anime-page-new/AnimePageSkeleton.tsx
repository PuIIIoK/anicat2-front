import React from 'react';

interface AnimePageSkeletonProps {
    isModern?: boolean;
}

const AnimePageSkeleton: React.FC<AnimePageSkeletonProps> = ({ isModern = false }) => {
    return (
        <div className={`anime-page-skeleton ${isModern ? 'anime-page-skeleton-modern' : 'anime-page-skeleton-classic'}`}>
            {/* Баннер */}
            <div className="skeleton-banner">
                <div className="skeleton-banner-gradient"></div>
            </div>

            {/* Основной контент */}
            <div className="skeleton-content">
                {/* Левая часть - постер и кнопки */}
                <div className="skeleton-left">
                    <div className="skeleton-poster skeleton-shimmer"></div>
                    <div className="skeleton-button skeleton-shimmer"></div>
                    <div className="skeleton-button-group">
                        <div className="skeleton-button-small skeleton-shimmer"></div>
                        <div className="skeleton-button-small skeleton-shimmer"></div>
                    </div>
                </div>

                {/* Правая часть - информация */}
                <div className="skeleton-right">
                    <div className="skeleton-title skeleton-shimmer"></div>
                    <div className="skeleton-subtitle skeleton-shimmer"></div>
                    
                    <div className="skeleton-rating skeleton-shimmer"></div>
                    
                    <div className="skeleton-info-grid">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="skeleton-info-item">
                                <div className="skeleton-info-label skeleton-shimmer"></div>
                                <div className="skeleton-info-value skeleton-shimmer"></div>
                            </div>
                        ))}
                    </div>

                    <div className="skeleton-genres">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="skeleton-genre skeleton-shimmer"></div>
                        ))}
                    </div>

                    <div className="skeleton-description">
                        <div className="skeleton-text skeleton-shimmer"></div>
                        <div className="skeleton-text skeleton-shimmer" style={{width: '90%'}}></div>
                        <div className="skeleton-text skeleton-shimmer" style={{width: '80%'}}></div>
                        <div className="skeleton-text skeleton-shimmer" style={{width: '95%'}}></div>
                    </div>
                </div>
            </div>

            {/* Табы */}
            <div className="skeleton-tabs">
                <div className="skeleton-tab skeleton-shimmer"></div>
                <div className="skeleton-tab skeleton-shimmer"></div>
            </div>
        </div>
    );
};

export default AnimePageSkeleton;
