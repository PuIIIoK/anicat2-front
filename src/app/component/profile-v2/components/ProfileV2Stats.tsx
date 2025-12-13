'use client';

import React from 'react';
import { YumekoProfileData } from '../../yumeko-anime-profile/hooks/useYumekoProfile';
import * as LucideIcons from 'lucide-react';

interface ProfileV2StatsProps {
    profileData: YumekoProfileData;
}

const ProfileV2Stats: React.FC<ProfileV2StatsProps> = ({ profileData }) => {
    const { 
        watchingAnime, 
        favoriteAnime, 
        userReviews,
        isLoadingStats 
    } = profileData;

    const stats = [
        { 
            label: 'Смотрю', 
            value: watchingAnime?.length || 0, 
            icon: LucideIcons.Play,
            color: '#22c55e'
        },
        { 
            label: 'Избранное', 
            value: favoriteAnime?.length || 0, 
            icon: LucideIcons.Heart,
            color: '#ef4444'
        },
        { 
            label: 'Отзывов', 
            value: userReviews?.length || 0, 
            icon: LucideIcons.MessageSquare,
            color: '#f59e0b'
        },
    ];

    const total = stats.reduce((acc, stat) => acc + stat.value, 0) || 1;

    if (isLoadingStats) {
        return (
            <aside className="profile-v2-stats">
                <div className="stats-card stats-card--loading">
                    <div className="stats-chart-skeleton skeleton-pulse" />
                    <div className="stats-list-skeleton">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="stats-item-skeleton skeleton-pulse" />
                        ))}
                    </div>
                </div>
            </aside>
        );
    }

    return (
        <aside className="profile-v2-stats">
            {/* Круговая диаграмма статистики */}
            <div className="stats-card">
                <div className="stats-card-header">
                    <LucideIcons.PieChart size={18} />
                    <span>Статистика</span>
                </div>

                <div className="stats-chart-container">
                    <svg viewBox="0 0 100 100" className="stats-chart">
                        <defs>
                            {stats.map((stat, idx) => (
                                <linearGradient key={idx} id={`gradient-${idx}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor={stat.color} stopOpacity="1" />
                                    <stop offset="100%" stopColor={stat.color} stopOpacity="0.6" />
                                </linearGradient>
                            ))}
                        </defs>
                        
                        {/* Фоновый круг */}
                        <circle
                            cx="50"
                            cy="50"
                            r="40"
                            fill="none"
                            stroke="rgba(255,255,255,0.05)"
                            strokeWidth="12"
                        />
                        
                        {/* Сегменты */}
                        {(() => {
                            let offset = 0;
                            return stats.map((stat, idx) => {
                                const percentage = (stat.value / total) * 100;
                                const circumference = 2 * Math.PI * 40;
                                const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
                                const strokeDashoffset = -(offset / 100) * circumference;
                                offset += percentage;

                                return (
                                    <circle
                                        key={idx}
                                        cx="50"
                                        cy="50"
                                        r="40"
                                        fill="none"
                                        stroke={`url(#gradient-${idx})`}
                                        strokeWidth="12"
                                        strokeDasharray={strokeDasharray}
                                        strokeDashoffset={strokeDashoffset}
                                        strokeLinecap="round"
                                        transform="rotate(-90 50 50)"
                                        className="stats-chart-segment"
                                        style={{ 
                                            filter: `drop-shadow(0 0 8px ${stat.color}40)`,
                                            transition: 'all 0.5s ease'
                                        }}
                                    />
                                );
                            });
                        })()}

                        {/* Центральный текст */}
                        <text x="50" y="46" textAnchor="middle" className="stats-chart-total">
                            {total - 1 + 1}
                        </text>
                        <text x="50" y="58" textAnchor="middle" className="stats-chart-label">
                            всего
                        </text>
                    </svg>
                </div>

                {/* Легенда */}
                <div className="stats-legend">
                    {stats.map((stat, idx) => (
                        <div key={idx} className="stats-legend-item">
                            <div className="legend-color" style={{ backgroundColor: stat.color }} />
                            <div className="legend-info">
                                <span className="legend-label">{stat.label}</span>
                                <span className="legend-value">{stat.value}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Уровень (Coming Soon) */}
            <div className="stats-card stats-level">
                <div className="stats-card-header">
                    <LucideIcons.TrendingUp size={18} />
                    <span>Уровень</span>
                    <span className="coming-soon-badge">Скоро</span>
                </div>
                <div className="level-content">
                    <div className="level-number">
                        <span>0</span>
                    </div>
                    <div className="level-progress">
                        <div className="level-bar">
                            <div className="level-fill" style={{ width: '5%' }} />
                        </div>
                        <span className="level-xp">0 / 100 XP</span>
                    </div>
                </div>
            </div>

            {/* Достижения */}
            <div className="stats-card stats-achievements">
                <div className="stats-card-header">
                    <LucideIcons.Trophy size={18} />
                    <span>Достижения</span>
                    <span className="coming-soon-badge">Скоро</span>
                </div>
                <div className="achievements-preview">
                    <div className="achievement-placeholder">
                        <LucideIcons.Award size={24} />
                    </div>
                    <div className="achievement-placeholder">
                        <LucideIcons.Star size={24} />
                    </div>
                    <div className="achievement-placeholder">
                        <LucideIcons.Zap size={24} />
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default ProfileV2Stats;
