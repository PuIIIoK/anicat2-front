'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { WatchingItem } from '../profile-page-old/types';
import { API_SERVER } from '@/hosts/constants';

interface YumekoContinueCardProps {
    item: WatchingItem;
    priority?: boolean;
}

const YumekoContinueCard: React.FC<YumekoContinueCardProps> = ({ item, priority = false }) => {
    const [imageError, setImageError] = useState(false);
    const [animeData, setAnimeData] = useState<{ kodik?: string; alias?: string } | null>(null);

    useEffect(() => {
        fetch(`${API_SERVER}/api/anime/get-anime/${item.id}`)
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                if (data) {
                    setAnimeData({
                        kodik: data.kodik || data.title || item.title,
                        alias: data.alias || ''
                    });
                }
            })
            .catch(() => {});
    }, [item.id, item.title]);

    const lastWatched = item.progressDetails?.[item.progressDetails.length - 1];
    const progress = item.totalEpisodes && item.currentEpisodes
        ? Math.min((item.currentEpisodes / item.totalEpisodes) * 100, 100)
        : 0;

    const formatTime = (seconds?: number) => {
        const num = Number(seconds);
        if (!num || num <= 0 || isNaN(num)) return null;
        const mins = Math.floor(num / 60);
        const secs = Math.floor(num % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const formatVoice = (voice?: string) => {
        if (!voice) return '';
        // Убираем лишние символы и сокращаем
        const cleaned = voice.replace(/[_-]/g, ' ').trim();
        return cleaned.length > 15 ? cleaned.slice(0, 15) + '…' : cleaned;
    };

    const getContinueUrl = () => {
        const params = new URLSearchParams({
            kodik: encodeURIComponent(animeData?.kodik || item.title),
            alias: encodeURIComponent(animeData?.alias || ''),
            title: encodeURIComponent(item.title),
            cover: item.coverUrl || ''
        });
        return `/watch/anime/${item.id}?${params.toString()}`;
    };

    return (
        <div className="yumeko-continue-card">
            <Link href={`/anime-page/${item.id}`} className="yumeko-continue-card-cover">
                {!imageError ? (
                    <Image
                        src={item.coverUrl}
                        alt={item.title}
                        fill
                        priority={priority}
                        className="yumeko-continue-card-image"
                        onError={() => setImageError(true)}
                    />
                ) : (
                    <div className="yumeko-continue-card-placeholder">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <rect x="3" y="3" width="18" height="18" rx="2"/>
                            <circle cx="8.5" cy="8.5" r="1.5"/>
                            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                        </svg>
                    </div>
                )}

                {/* Progress bar */}
                {progress > 0 && (
                    <div className="yumeko-continue-card-progress">
                        <div className="yumeko-continue-card-progress-bar" style={{ width: `${progress}%` }} />
                    </div>
                )}
            </Link>

            <div className="yumeko-continue-card-info">
                <Link href={`/anime-page/${item.id}`} className="yumeko-continue-card-title">
                    {item.title}
                </Link>

                <div className="yumeko-continue-card-meta">
                    {lastWatched && (
                        <span className="yumeko-continue-card-episode">
                            Эп. {lastWatched.episodeId}
                        </span>
                    )}
                    <span className="yumeko-continue-card-series">
                        {item.currentEpisodes || 0}/{item.totalEpisodes || '?'}
                    </span>
                    {(() => {
                        const time = formatTime(lastWatched?.time);
                        return time ? <span className="yumeko-continue-card-time">{time}</span> : null;
                    })()}
                </div>

                {lastWatched?.voice && (
                    <div className="yumeko-continue-card-voice">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
                            <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
                        </svg>
                        {formatVoice(lastWatched.voice)}
                    </div>
                )}

                {lastWatched && (
                    <Link href={getContinueUrl()} className="yumeko-continue-card-btn">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5v14l11-7z"/>
                        </svg>
                        Продолжить
                    </Link>
                )}
            </div>
        </div>
    );
};

export default YumekoContinueCard;
