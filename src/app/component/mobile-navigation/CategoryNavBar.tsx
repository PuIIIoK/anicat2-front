'use client';
import React, {useEffect, useState} from 'react';
import {API_SERVER} from '../../../tools/constants';
import {AnimeInfo} from '../anime-structure/anime-data-info';
import AnimeCard from '../anime-structure/anime-cards';

interface Category {
    id: string;
    name: string;
    animeIds: string[];
    position: number;
    animeList?: AnimeInfo[];
}

const STORAGE_KEY = 'anicat_categories';
const CACHE_EXPIRATION_HOURS = 4;

interface CachedData {
    timestamp: number;
    categories: Category[];
}

const CategoryNavBar: React.FC = () => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [animeList, setAnimeList] = useState<AnimeInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const isCacheValid = (timestamp: number): boolean => {
            const now = Date.now();
            const diffHours = (now - timestamp) / (1000 * 60 * 60);
            return diffHours < CACHE_EXPIRATION_HOURS;
        };

        const loadFromCache = () => {
            const cachedRaw = localStorage.getItem(STORAGE_KEY);
            if (!cachedRaw) return false;

            try {
                const cached: CachedData = JSON.parse(cachedRaw);
                if (cached.categories.length === 0) return false;

                if (isCacheValid(cached.timestamp)) {
                    setCategories(cached.categories);
                    setSelectedCategoryId(cached.categories[0].id);
                    setAnimeList(cached.categories[0].animeList || []);
                    setLoading(false);
                    return true;
                } else {
                    localStorage.removeItem(STORAGE_KEY);
                }
            } catch (e) {
                console.error('Ошибка чтения кэша', e);
            }

            return false;
        };

        const fetchAndCache = async () => {
            try {
                const res = await fetch(`${API_SERVER}/api/anime/category/get-category`);
                const data = await res.json();
                const fetched: Category[] = data.categories || [];

                const sorted = fetched.sort((a, b) => a.position - b.position);

                for (const category of sorted) {
                    const animePromises = category.animeIds.map(async (animeId) => {
                        const res = await fetch(`${API_SERVER}/api/anime/get-anime/${animeId}`);
                        if (!res.ok) return null;
                        return await res.json();
                    });

                    const result = await Promise.all(animePromises);
                    const filtered = result.filter((a): a is AnimeInfo => a !== null);
                    category.animeList = Array.from(new Map(filtered.map(item => [item.id, item])).values());
                }

                const cachePayload: CachedData = {
                    timestamp: Date.now(),
                    categories: sorted,
                };

                localStorage.setItem(STORAGE_KEY, JSON.stringify(cachePayload));

                setCategories(sorted);
                setSelectedCategoryId(sorted[0].id);
                setAnimeList(sorted[0].animeList || []);
            } catch (err) {
                console.error(err);
                setError('Ошибка загрузки категорий');
            } finally {
                setLoading(false);
            }
        };

        const loaded = loadFromCache();
        if (!loaded) fetchAndCache();
    }, []);

    const handleCategoryClick = (id: string) => {
        const category = categories.find((c) => c.id === id);
        if (!category) return;
        setSelectedCategoryId(id);
        setAnimeList(category.animeList || []);
    };

    return (
        <div className="category-navbar">
            {error && <div className="error-message">{error}</div>}

            {loading ? (
                <div className="spinner-container">
                    <div className="spinner" />
                    <div className="spinner-text">
                        Обновление категорий...<br />
                        <span className="spinner-subtext">
                Это процедура нужна, чтобы обновить категории, пожалуйста, подождите.
            </span>
                    </div>
                </div>
            ) : (
                <>
                    <div className="category-navbar-items">
                        {categories.map((cat) => (
                            <div
                                key={cat.id}
                                className={`category-navbar-item ${selectedCategoryId === cat.id ? 'active' : ''}`}
                                onClick={() => handleCategoryClick(cat.id)}
                            >
                                {cat.name}
                            </div>
                        ))}
                    </div>

                    <div className="anime-grid">
                        {animeList.length > 0 ? (
                            animeList.map((anime) => (
                                <AnimeCard key={anime.id} anime={anime} />
                            ))
                        ) : (
                            <p>Нет аниме для отображения.</p>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default CategoryNavBar;
