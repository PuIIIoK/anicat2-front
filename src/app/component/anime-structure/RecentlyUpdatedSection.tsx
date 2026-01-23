'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { API_SERVER } from '@/hosts/constants';

interface RecentUpdate {
    animeId: number;
    animeTitle: string;
    timestamp: string;
    updateSource: string; // KODIK_AUTO, MANUAL, NEW
    newEpisodeCount: string;
}

interface AnimeData {
    id: number;
    title: string;
    type?: string;
    year?: string;
    current_episode?: string;
    episode_all?: string;
    coverUrl?: string;
}

const RecentlyUpdatedSection: React.FC = () => {
    const [updates, setUpdates] = useState<RecentUpdate[]>([]);
    const [animeData, setAnimeData] = useState<Map<number, AnimeData>>(new Map());
    const [loading, setLoading] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch recent updates
                const res = await fetch(`${API_SERVER}/api/anime/recent-updates?limit=15`);
                if (!res.ok) throw new Error('Failed to fetch recent updates');
                const data: RecentUpdate[] = await res.json();
                setUpdates(data);

                // Fetch anime details for each
                if (data.length > 0) {
                    const animeIds = data.map(u => u.animeId);
                    const detailsRes = await fetch(`${API_SERVER}/api/anime/optimized/get-anime-list/basic`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(animeIds)
                    });

                    if (detailsRes.ok) {
                        const animeList = await detailsRes.json();
                        const map = new Map<number, AnimeData>();
                        for (const anime of animeList) {
                            map.set(anime.id, anime);
                        }
                        setAnimeData(map);
                    }
                }
            } catch (error) {
                console.error('Error fetching recent updates:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const scrollAmount = 320;
            scrollRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    const getUpdateLabel = (update: RecentUpdate) => {
        if (update.updateSource === 'NEW') {
            return { text: 'Новое', class: 'update-new' };
        }
        return { text: `+ ${update.newEpisodeCount} эп.`, class: 'update-episode' };
    };

    if (loading) {
        return (
            <section className="recently-updated-section">
                <div className="recently-updated-header">
                    <h2 className="recently-updated-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                        </svg>
                        Недавно добавлено / Обновлено
                    </h2>
                </div>
                <div className="recently-updated-loading">
                    <div className="loading-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
            </section>
        );
    }

    if (updates.length === 0) return null;

    return (
        <section className="recently-updated-section">
            <div className="recently-updated-header">
                <h2 className="recently-updated-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                    </svg>
                    Недавно добавлено / Обновлено
                </h2>

                <div className="recently-updated-controls">
                    <button
                        className="recently-updated-scroll-btn"
                        onClick={() => scroll('left')}
                        aria-label="Назад"
                    >
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
                        </svg>
                    </button>

                    <button
                        className="recently-updated-scroll-btn"
                        onClick={() => scroll('right')}
                        aria-label="Вперед"
                    >
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                        </svg>
                    </button>
                </div>
            </div>

            <div className="recently-updated-content" ref={scrollRef}>
                {updates.map((update, index) => {
                    const anime = animeData.get(update.animeId);
                    const label = getUpdateLabel(update);

                    return (
                        <Link
                            key={`${update.animeId}-${index}`}
                            href={`/anime-page/${update.animeId}`}
                            className="recently-updated-card"
                        >
                            <div className="recently-updated-cover">
                                {anime?.coverUrl ? (
                                    <Image
                                        src={anime.coverUrl}
                                        alt={update.animeTitle}
                                        fill
                                        sizes="160px"
                                        className="recently-updated-image"
                                    />
                                ) : (
                                    <div className="recently-updated-placeholder">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                            <rect x="3" y="3" width="18" height="18" rx="2" />
                                            <circle cx="8.5" cy="8.5" r="1.5" />
                                            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                                        </svg>
                                    </div>
                                )}

                                <span className={`recently-updated-label ${label.class}`}>
                                    {label.text}
                                </span>

                                {anime?.type && (
                                    <span className="recently-updated-type">{anime.type}</span>
                                )}
                            </div>

                            <div className="recently-updated-info">
                                <h3 className="recently-updated-anime-title">{update.animeTitle}</h3>
                                <div className="recently-updated-meta">
                                    {anime?.current_episode && anime?.episode_all && (
                                        <span className="recently-updated-episodes">
                                            {anime.current_episode} / {anime.episode_all} эп.
                                        </span>
                                    )}
                                    {anime?.year && (
                                        <span className="recently-updated-year">{anime.year}</span>
                                    )}
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </section>
    );
};

export default RecentlyUpdatedSection;
