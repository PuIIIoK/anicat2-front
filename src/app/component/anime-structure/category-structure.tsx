'use client';
import React, { useEffect, useState } from 'react';
import AnimeCard from './anime-cards';
import { AnimeInfo } from './anime-data-info';
import Link from 'next/link';
import {API_SERVER} from "../../../tools/constants";

interface Category {
    id: string;
    name: string;
    animeIds: string[];
    link: string;
    position: number;
}

interface CategoryProps {
    categoryId: string;
    title: string;
    link: string;
    position: number;
    onPositionChange: (categoryId: string, newPosition: number) => void;
}

const Category: React.FC<CategoryProps> = ({ categoryId, title }) => {
    const [localAnimeData, setLocalAnimeData] = useState<AnimeInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchCategoryAnime = async () => {
            try {
                const categoryRes = await fetch(`${API_SERVER}/api/anime/category/get-category/${categoryId}`);
                const categoryData = await categoryRes.json();

                const animePromises = categoryData.animeIds.map(async (animeId: string) => {
                    const response = await fetch(`${API_SERVER}/api/anime/get-anime/${animeId}`);
                    if (!response.ok) return null;
                    return await response.json();
                });

                const results = await Promise.all(animePromises);
                const validAnime = results.filter((anime): anime is AnimeInfo => anime !== null);

                setLocalAnimeData(validAnime);
            } catch (err) {
                setError('Ошибка загрузки категории');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchCategoryAnime();
    }, [categoryId]);

    return (
        <section className="category">
            <div className="container-wrapper">
                <Link href={`/anime-category/${categoryId}`}>
                    <h2 className="category-title">{title}</h2>
                </Link>

                <div className="anime-line-container-padding">
                    <div className="anime-line-container">
                        {loading ? (
                            <p>Загрузка...</p>
                        ) : error ? (
                            <p>{error}</p>
                        ) : localAnimeData.length > 0 ? (
                            localAnimeData.map((anime) => (
                                <AnimeCard key={anime.id} anime={anime} />
                            ))
                        ) : (
                            <p>Нет аниме для отображения.</p>
                        )}
                    </div>
                </div>

                <Link href={`/anime-category/${categoryId}`}>
                    <div className="view-all-button">
                        Посмотреть все
                    </div>
                </Link>
            </div>
        </section>
    );
};

export default Category;
