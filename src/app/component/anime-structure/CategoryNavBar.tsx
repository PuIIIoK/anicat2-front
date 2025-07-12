'use client';
import React, {useEffect, useState} from 'react';
import {API_SERVER} from '../../../tools/constants';
import {AnimeInfo} from './anime-data-info';
import AnimeCard from './anime-cards';

interface Category {
    id: string;
    name: string;
    animeIds: string[];
    position: number;
    animeList?: AnimeInfo[]; // ← добавлено
}

const STORAGE_KEY = 'anicat_categories';

const CategoryNavBar: React.FC = () => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [animeList, setAnimeList] = useState<AnimeInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);


    useEffect(() => {
        const loadFromCache = () => {
            const cached = localStorage.getItem(STORAGE_KEY);
            if (cached) {
                try {
                    const parsed: Category[] = JSON.parse(cached);
                    if (parsed.length > 0) {
                        setCategories(parsed);
                        setSelectedCategoryId(parsed[0].id);
                        setAnimeList(parsed[0].animeList || []);
                        setLoading(false);
                        return true;
                    }
                } catch (e) {
                    console.error('Ошибка при чтении из localStorage', e);
                }
            }
            return false;
        };

        const fetchAndCache = async () => {
            try {
                const res = await fetch(`${API_SERVER}/api/anime/category/get-category`);
                const data = await res.json();
                const fetched: Category[] = data.categories || [];

                const sorted = fetched.sort((a, b) => a.position - b.position);

                // Загружаем данные animeList для каждой категории
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

                // Кэшируем
                localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));

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

        const loadedFromCache = loadFromCache();
        if (!loadedFromCache) {
            fetchAndCache();
        }
    }, []);

    const handleCategoryClick = (id: string) => {
        const category = categories.find((c) => c.id === id);
        if (!category) return;
        setSelectedCategoryId(id);
        setAnimeList(category.animeList || []);
    };

    if (loading && categories.length === 0) return null;

    return (
        <div className="category-navbar">
            {error && <div className="error-message">{error}</div>}

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
                {loading ? (
                    <p>Загрузка...</p>
                ) : animeList.length > 0 ? (
                    animeList.map((anime) => (
                        <AnimeCard key={anime.id} anime={anime} />
                    ))
                ) : (
                    <p>Нет аниме для отображения.</p>
                )}
            </div>
        </div>
    );
};

export default CategoryNavBar;
