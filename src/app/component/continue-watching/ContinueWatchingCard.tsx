'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Play } from 'lucide-react';
import type { WatchingItem } from '../profile-page-old/types';
import { API_SERVER } from '@/hosts/constants';

interface ContinueWatchingCardProps {
    item: WatchingItem;
    priority?: boolean;
}

const ContinueWatchingCard: React.FC<ContinueWatchingCardProps> = ({ item, priority = false }) => {
    const [imageError, setImageError] = useState(false);
    const [finalCoverUrl, setFinalCoverUrl] = useState<string>(item.coverUrl || '');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [animeData, setAnimeData] = useState<{ kodik?: string; alias?: string } | null>(null);

    // Load anime data using optimized API for cover and details
    useEffect(() => {
        const fetchAnimeData = async () => {
            try {
                // First, try to get the optimized basic info which includes the correct cover
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

                // Still fetch regular data for kodik/alias if needed for the link
                const response = await fetch(`${API_SERVER}/api/anime/get-anime/${item.id}`);
                if (response.ok) {
                    const data = await response.json();
                    setAnimeData({
                        kodik: data.kodik || data.title || item.title,
                        alias: data.alias || ''
                    });
                }
            } catch (error) {
                console.error('[ContinueWatchingCard] Error fetching anime data:', error);
            }
        };

        fetchAnimeData();
    }, [item.id, item.title]);

    // Calculate progress
    const progress = item.totalEpisodes && item.currentEpisodes
        ? (item.currentEpisodes / item.totalEpisodes) * 100
        : 0;

    // Generate continue link
    const continueLink = (() => {
        const baseParams = new URLSearchParams({
            kodik: encodeURIComponent(animeData?.kodik || item.title),
            alias: encodeURIComponent(animeData?.alias || ''),
            title: encodeURIComponent(item.title),
            cover: finalCoverUrl || item.coverUrl || ''
        });

        return `/watch/anime/${item.id}?${baseParams.toString()}`;
    })();

    const handleImageError = () => {
        setImageError(true);
    };

    return (
        <div className="continue-watching-card">
            {/* Cover Section */}
            <Link href={`/anime-page/${item.id}`} className="continue-card-cover">
                {!imageError ? (
                    <Image
                        src={finalCoverUrl || item.coverUrl || '/anime-placeholder.svg'}
                        alt={item.title}
                        fill
                        priority={priority}
                        className="continue-card-image"
                        onError={handleImageError}
                        sizes="(max-width: 768px) 150px, 200px"
                    />
                ) : (
                    <div className="continue-card-image" style={{ background: '#2a2a2a', width: '100%', height: '100%' }} />
                )}

                {/* Play Icon Overlay */}
                <Play className="play-icon" size={48} fill="white" />

                {/* Progress Bar on Cover */}
                {progress > 0 && (
                    <div className="continue-card-progress">
                        <div
                            className="progress-fill"
                            style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                    </div>
                )}
            </Link>

            {/* Info Section */}
            <div className="continue-card-info">
                <Link href={`/anime-page/${item.id}`} className="continue-card-title" title={item.title}>
                    {item.title}
                </Link>

                <Link href={continueLink} className="continue-card-button">
                    <Play size={14} fill="currentColor" />
                    Продолжить
                </Link>
            </div>
        </div>
    );
};

export default ContinueWatchingCard;
