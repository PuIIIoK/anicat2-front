'use client';

import React from 'react';
import './AnimePageCrunchSkeleton.scss';

const AnimePageCrunchSkeleton: React.FC = () => {
    return (
        <div className="crunch-skeleton-page">
            {/* Hero секция */}
            <div className="skeleton-hero">
                <div className="skeleton-hero-content">
                    {/* Постер */}
                    <div className="skeleton-poster pulse" />
                    
                    {/* Инфо */}
                    <div className="skeleton-info">
                        {/* Теги */}
                        <div className="skeleton-tags">
                            <div className="skeleton-tag pulse" />
                            <div className="skeleton-tag pulse" />
                            <div className="skeleton-tag pulse" />
                            <div className="skeleton-tag pulse" />
                        </div>
                        
                        {/* Заголовок */}
                        <div className="skeleton-title pulse" />
                        <div className="skeleton-subtitle pulse" />
                        
                        {/* Статус */}
                        <div className="skeleton-status-row">
                            <div className="skeleton-badge pulse" />
                            <div className="skeleton-badge pulse" />
                        </div>
                        
                        {/* Рейтинг */}
                        <div className="skeleton-rating pulse" />
                        
                        {/* Кнопки */}
                        <div className="skeleton-actions">
                            <div className="skeleton-btn-main pulse" />
                            <div className="skeleton-btn-icon pulse" />
                            <div className="skeleton-btn-status pulse" />
                        </div>
                        
                        {/* Инфо карточки */}
                        <div className="skeleton-info-grid">
                            <div className="skeleton-info-item pulse" />
                            <div className="skeleton-info-item pulse" />
                            <div className="skeleton-info-item pulse" />
                            <div className="skeleton-info-item pulse" />
                        </div>
                        
                        {/* Описание */}
                        <div className="skeleton-description">
                            <div className="skeleton-line pulse" />
                            <div className="skeleton-line pulse" style={{ width: '90%' }} />
                            <div className="skeleton-line pulse" style={{ width: '75%' }} />
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Табы */}
            <div className="skeleton-tabs-section">
                <div className="skeleton-tabs">
                    <div className="skeleton-tab pulse" />
                    <div className="skeleton-tab pulse" />
                    <div className="skeleton-tab pulse" />
                    <div className="skeleton-tab pulse" />
                </div>
                
                {/* Контент табов */}
                <div className="skeleton-content-grid">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="skeleton-card pulse" />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AnimePageCrunchSkeleton;
