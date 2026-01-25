'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { API_SERVER } from '@/hosts/constants';
import type { WatchingItem } from '../profile-page-old/types';

interface YumekoContinueCardProps {
    item: WatchingItem;
    priority?: boolean;
    animeData?: { kodik?: string; alias?: string };
}

const YumekoContinueCard: React.FC<YumekoContinueCardProps> = ({ item, priority = false, animeData }) => {
    const [imageError, setImageError] = useState(false);
    const [finalCoverUrl, setFinalCoverUrl] = useState<string>(item.coverUrl || '');

    // Load optimized cover
    React.useEffect(() => {
        const fetchCover = async () => {
            try {
                const basicResponse = await fetch(`${API_SERVER}/api/anime/optimized/get-anime/${item.id}/basic`);
                if (basicResponse.ok) {
                    const basicData = await basicResponse.json();
                    if (basicData.coverUrl && !basicData.coverUrl.includes('placeholder')) {
                        setFinalCoverUrl(
                            basicData.coverUrl.startsWith('/')
                                ? `${API_SERVER}${basicData.coverUrl}`
                                : basicData.coverUrl
                        );
                    }
                }
            } catch (e) {
                console.error('Error fetching cover:', e);
            }
        };
        fetchCover();
    }, [item.id]);

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
        const cleaned = voice.replace(/[_-]/g, ' ').trim();
        return cleaned.length > 20 ? cleaned.slice(0, 20) + '…' : cleaned;
    };

    const getContinueUrl = () => {
        const params = new URLSearchParams({
            kodik: encodeURIComponent(animeData?.kodik || item.title),
            alias: encodeURIComponent(animeData?.alias || ''),
            title: encodeURIComponent(item.title),
            cover: finalCoverUrl || item.coverUrl || ''
        });
        return `/watch/anime/${item.id}?${params.toString()}`;
    };

    return (
        <div className="yumeko-continue-card">
            <Link href={`/anime-page/${item.id}`} className="yumeko-continue-card-cover">
                {!imageError ? (
                    <Image
                        src={finalCoverUrl || item.coverUrl}
                        alt={item.title}
                        fill
                        priority={priority}
                        className="yumeko-continue-card-image"
                        onError={() => setImageError(true)}
                        sizes="(max-width: 768px) 150px, 200px"
                    />
                ) : (
                    <div className="yumeko-continue-card-placeholder">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                        </svg>
                    </div>
                )}

                <div className="yumeko-continue-card-play-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="white" stroke="none">
                        <path d="M8 5v14l11-7z" />
                    </svg>
                </div>

                {/* Progress bar */}
                {progress > 0 && (
                    <div className="yumeko-continue-card-progress">
                        <div className="yumeko-continue-card-progress-bar" style={{ width: `${progress}%` }} />
                    </div>
                )}
            </Link>

            <div className="yumeko-continue-card-info">
                <Link href={`/anime-page/${item.id}`} className="yumeko-continue-card-title" title={item.title}>
                    {item.title}
                </Link>

                {lastWatched && (
                    <div className="yumeko-continue-card-meta-list">
                        <div className="meta-row">
                            <span className="episode-badge">Эпизод {lastWatched.episodeId}</span>
                            {(() => {
                                const t1 = formatTime(lastWatched.time);
                                const t2 = formatTime(lastWatched.duration);
                                if (t1 && t2) return <span className="time-badge">{t1} / {t2}</span>;
                                return null;
                            })()}
                        </div>

                        {(lastWatched.voice || lastWatched.source) && (
                            <div className="meta-details">
                                {lastWatched.voice && (
                                    <span className="meta-text" title={lastWatched.voice}>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                                            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                            <line x1="12" y1="19" x2="12" y2="23" />
                                            <line x1="8" y1="23" x2="16" y2="23" />
                                        </svg>
                                        {formatVoice(lastWatched.voice)}
                                    </span>
                                )}
                                {lastWatched.source && (
                                    <span className="meta-text source">
                                        {lastWatched.source}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {lastWatched && (
                    <Link href={getContinueUrl()} className="yumeko-continue-card-btn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M5 3l14 9-14 9V3z" />
                        </svg>
                        Смотреть
                    </Link>
                )}
            </div>
        </div>
    );
};

export default YumekoContinueCard;
