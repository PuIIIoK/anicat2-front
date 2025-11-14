'use client';

import React from 'react';

interface SkeletonLoaderProps {
    type?: 'friends' | 'activity' | 'history' | 'profile-header' | 'tabs' | 'stats';
    count?: number;
    grid?: boolean;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ type = 'friends', count = 3, grid = false }) => {
    if (type === 'friends') {
        return (
            <div className={`yumeko-skeleton-container${grid ? ' grid' : ''}`}>
                {Array.from({ length: count }).map((_, index) => (
                    <div key={index} className="yumeko-skeleton-friend-card">
                        <div className="yumeko-skeleton-banner" />
                        <div className="yumeko-skeleton-friend-info">
                            <div className="yumeko-skeleton-text short" />
                            <div className="yumeko-skeleton-avatar" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (type === 'activity') {
        return (
            <div className="yumeko-skeleton-activity">
                {Array.from({ length: count }).map((_, index) => (
                    <div key={index} className="yumeko-skeleton-activity-item">
                        <div className="yumeko-skeleton-avatar-small" />
                        <div className="yumeko-skeleton-activity-content">
                            <div className="yumeko-skeleton-text medium" />
                        </div>
                        <div className="yumeko-skeleton-activity-time" />
                    </div>
                ))}
            </div>
        );
    }

    if (type === 'history') {
        return (
            <div className="yumeko-skeleton-history">
                {Array.from({ length: count }).map((_, index) => (
                    <div key={index} className="yumeko-skeleton-episode">
                        <div className="yumeko-skeleton-text short" />
                        <div className="yumeko-skeleton-progress-bar" />
                    </div>
                ))}
            </div>
        );
    }

    if (type === 'profile-header') {
        return (
            <div className="yumeko-skeleton-profile-header">
                <div className="yumeko-skeleton-header-banner" />
                <div className="yumeko-skeleton-header-content">
                    <div className="yumeko-skeleton-header-avatar" />
                    <div className="yumeko-skeleton-header-info">
                        <div className="yumeko-skeleton-text medium" />
                        <div className="yumeko-skeleton-text long" />
                    </div>
                </div>
            </div>
        );
    }

    if (type === 'tabs') {
        return (
            <div className="yumeko-skeleton-tabs">
                {Array.from({ length: count || 4 }).map((_, index) => (
                    <div key={index} className="yumeko-skeleton-tab" />
                ))}
            </div>
        );
    }

    if (type === 'stats') {
        return (
            <div className="yumeko-skeleton-stats">
                <div className="yumeko-skeleton-stats-chart" />
                <div className="yumeko-skeleton-stats-list">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <div key={index} className="yumeko-skeleton-stat-item">
                            <div className="yumeko-skeleton-stat-color" />
                            <div className="yumeko-skeleton-text short" />
                            <div className="yumeko-skeleton-stat-value" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return null;
};

export default SkeletonLoader;
