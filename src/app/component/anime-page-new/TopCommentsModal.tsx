'use client';

import React, { useState } from 'react';
import { X, Trophy, TrendingUp, Flame, Award, Heart, MessageCircle } from 'lucide-react';

interface TopComment {
    id: number;
    username: string;
    text: string;
    timestamp: string;
    likes: number;
    replies: number;
    rank: number;
    trend: 'up' | 'down' | 'stable';
    isLiked?: boolean;
}

interface TopCommentsModalProps {
    show: boolean;
    onClose: () => void;
    isModern?: boolean;
    animeTitle: string;
    topComments: TopComment[];
    onLikeComment: (commentId: number) => void;
    onViewReplies: (commentId: number) => void;
}

const TopCommentsModal: React.FC<TopCommentsModalProps> = ({
    show,
    onClose,
    isModern = false,
    animeTitle,
    topComments,
    onLikeComment,
    onViewReplies
}) => {
    const [timeFilter, setTimeFilter] = useState<'day' | 'week' | 'month' | 'all'>('week');

    if (!show) return null;

    const getRankIcon = (rank: number) => {
        switch (rank) {
            case 1:
                return <Trophy className="rank-icon gold" size={20} />;
            case 2:
                return <Award className="rank-icon silver" size={20} />;
            case 3:
                return <Award className="rank-icon bronze" size={20} />;
            default:
                return <span className="rank-number">#{rank}</span>;
        }
    };

    const getTrendIcon = (trend: string) => {
        switch (trend) {
            case 'up':
                return <TrendingUp className="trend-icon trend-up" size={16} />;
            case 'down':
                return <TrendingUp className="trend-icon trend-down" size={16} style={{ transform: 'rotate(180deg)' }} />;
            default:
                return <div className="trend-icon trend-stable" />;
        }
    };

    const getTimeFilterLabel = (filter: string) => {
        const labels = {
            day: 'За день',
            week: 'За неделю',
            month: 'За месяц',
            all: 'За все время'
        };
        return labels[filter as keyof typeof labels];
    };

    return (
        <div className={`top-comments-modal-overlay ${isModern ? 'modern' : 'classic'}`}>
            <div className="top-comments-modal" onClick={e => e.stopPropagation()}>
                {/* Заголовок */}
                <div className="modal-header">
                    <div className="header-content">
                        <div className="header-title">
                            <Flame className="header-icon" size={24} />
                            <div>
                                <h2>Топ комментарии</h2>
                                <p className="anime-title">{animeTitle}</p>
                            </div>
                        </div>
                    </div>
                    <button className="close-button" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                {/* Фильтры времени */}
                <div className="time-filters">
                    <div className="filter-buttons">
                        {(['day', 'week', 'month', 'all'] as const).map(filter => (
                            <button
                                key={filter}
                                className={`filter-button ${timeFilter === filter ? 'active' : ''}`}
                                onClick={() => setTimeFilter(filter)}
                            >
                                {getTimeFilterLabel(filter)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Статистика */}
                <div className="stats-summary">
                    <div className="stat-item">
                        <div className="stat-icon">
                            <MessageCircle size={18} />
                        </div>
                        <div className="stat-info">
                            <span className="stat-value">{topComments.length}</span>
                            <span className="stat-label">топ комментариев</span>
                        </div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-icon">
                            <Heart size={18} />
                        </div>
                        <div className="stat-info">
                            <span className="stat-value">
                                {topComments.reduce((sum, comment) => sum + comment.likes, 0)}
                            </span>
                            <span className="stat-label">общих лайков</span>
                        </div>
                    </div>
                </div>

                {/* Список топ комментариев */}
                <div className="top-comments-list">
                    {topComments.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">🏆</div>
                            <h3>Пока нет топ комментариев</h3>
                            <p>Комментарии появятся здесь после получения достаточного количества лайков</p>
                        </div>
                    ) : (
                        topComments.map((comment, index) => (
                            <div key={`top-comment-${comment.id || index}`} className={`top-comment-item rank-${comment.rank}`}>
                                <div className="comment-rank">
                                    {getRankIcon(comment.rank)}
                                    {getTrendIcon(comment.trend)}
                                </div>

                                <div className="comment-content">
                                    <div className="comment-header">
                                        <div className="user-info">
                                            <div className="user-avatar">
                                                {(comment.username || 'A').charAt(0).toUpperCase()}
                                            </div>
                                            <div className="user-details">
                                                <span className="username">{comment.username}</span>
                                                <span className="timestamp">{comment.timestamp}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="comment-text">
                                        <p>{comment.text}</p>
                                    </div>

                                    <div className="comment-stats">
                                        <div className="stats-left">
                                            <button 
                                                className={`stat-button ${comment.isLiked ? 'liked' : ''}`}
                                                onClick={() => onLikeComment(comment.id)}
                                            >
                                                <Heart size={16} fill={comment.isLiked ? '#e50914' : 'none'} />
                                                <span className="stat-count">{comment.likes}</span>
                                            </button>
                                            
                                            {comment.replies > 0 && (
                                                <button 
                                                    className="stat-button"
                                                    onClick={() => onViewReplies(comment.id)}
                                                >
                                                    <MessageCircle size={16} />
                                                    <span className="stat-count">{comment.replies}</span>
                                                    <span className="stat-label">ответов</span>
                                                </button>
                                            )}
                                        </div>

                                        <div className="rank-badge">
                                            <span className="rank-text">#{comment.rank}</span>
                                            <span className="rank-label">в топе</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Информация */}
                <div className="modal-footer">
                    <div className="footer-info">
                        <p className="info-text">
                            💡 Топ комментарии обновляются каждые 15 минут на основе лайков и активности
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TopCommentsModal;
