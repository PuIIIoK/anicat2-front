'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { API_SERVER } from '@/hosts/constants';
import YumekoAnimeCard from './YumekoAnimeCard';
import { AnimeBasicInfo } from './anime-basic-info';

interface YumekoCategorySectionProps {
    categoryId: string;
    title: string;
}

const YumekoCategorySection: React.FC<YumekoCategorySectionProps> = ({ categoryId, title }) => {
    const [animeList, setAnimeList] = useState<AnimeBasicInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchAnime = async () => {
            try {
                // Get anime IDs for category
                const categoryRes = await fetch(`${API_SERVER}/api/anime/category/get-category/${categoryId}`);
                if (!categoryRes.ok) throw new Error('Failed to fetch category');
                
                const categoryData = await categoryRes.json();
                const animeIds: number[] = (categoryData.animeIds || []).map(Number);
                
                if (animeIds.length === 0) {
                    setAnimeList([]);
                    setLoading(false);
                    return;
                }

                // Get anime details (first 20)
                const detailsRes = await fetch(`${API_SERVER}/api/anime/optimized/get-anime-list/basic`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(animeIds.slice(0, 20))
                });

                if (!detailsRes.ok) throw new Error('Failed to fetch anime details');
                
                const animeData: AnimeBasicInfo[] = await detailsRes.json();
                
                // Sort in category order
                const sortedAnime = animeIds.slice(0, 20).map(id => 
                    animeData.find(anime => anime.id === id)
                ).filter(Boolean) as AnimeBasicInfo[];
                
                setAnimeList(sortedAnime);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Error loading anime');
                console.error('Category fetch error:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchAnime();
    }, [categoryId]);

    const scroll = (direction: 'left' | 'right') => {
        if (!scrollRef.current) return;
        const scrollAmount = 400;
        scrollRef.current.scrollBy({
            left: direction === 'left' ? -scrollAmount : scrollAmount,
            behavior: 'smooth'
        });
    };

    if (loading) {
        return (
            <section className="yumeko-category">
                <div className="yumeko-category-header">
                    <h2 className="yumeko-category-title">{title}</h2>
                </div>
                <div className="yumeko-category-loading">
                    <div className="yumeko-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
            </section>
        );
    }

    if (error || animeList.length === 0) {
        return null;
    }

    return (
        <section className="yumeko-category">
            <div className="yumeko-category-header">
                <Link href={`/anime-category/${categoryId}`} className="yumeko-category-title-link">
                    <h2 className="yumeko-category-title">{title}</h2>
                </Link>
                
                <div className="yumeko-category-controls">
                    <button 
                        className="yumeko-scroll-btn"
                        onClick={() => scroll('left')}
                        aria-label="Назад"
                    >
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                        </svg>
                    </button>
                    
                    <button 
                        className="yumeko-scroll-btn"
                        onClick={() => scroll('right')}
                        aria-label="Вперед"
                    >
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                        </svg>
                    </button>
                    
                    <Link href={`/anime-category/${categoryId}`} className="yumeko-view-all">
                        Все аниме
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/>
                        </svg>
                    </Link>
                </div>
            </div>

            <div className="yumeko-category-content" ref={scrollRef}>
                {animeList.map((anime, index) => (
                    <div key={anime.id} className="yumeko-card-item">
                        <YumekoAnimeCard
                            anime={anime}
                            priority={index < 6}
                            showCollectionStatus={true}
                            showRating={true}
                            showType={true}
                        />
                    </div>
                ))}
            </div>
        </section>
    );
};

export default YumekoCategorySection;
