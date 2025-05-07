'use client';

import React, { useState, useEffect, use } from 'react';
import { fetchCategoryById } from '../../../component/anime-structure/category-data';
import { AnimeInfo } from '../../../component/anime-structure/anime-data-info';
import AnimeCard from '../../../component/anime-structure/anime-cards';
import {API_SERVER} from "../../../../tools/constants";

const AnimeCategoryPage = ({ params }: { params: Promise<{ categoryId: string }> }) => {
    const { categoryId } = use(params);
    const [categoryName, setCategoryName] = useState<string | null>(null);
    const [animeInCategory, setAnimeInCategory] = useState<AnimeInfo[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            const category = await fetchCategoryById(categoryId);

            if (!category) {
                setCategoryName('Категория не найдена');
                return;
            }

            setCategoryName(category.name);

            const animeList = await Promise.all(
                category.animeIds.map(async (animeId) => {
                    try {
                        const res = await fetch(`${API_SERVER}/api/anime/get-anime/${animeId}`);
                        if (!res.ok) throw new Error('Ошибка при получении аниме');
                        return await res.json();
                    } catch (err) {
                        console.error(err);
                        return null;
                    }
                })
            );

            setAnimeInCategory(animeList.filter((a): a is AnimeInfo => a !== null));
        };

        fetchData();
    }, [categoryId]);

    return (
        <div className="category-list-container">
            <h1 className="categoryname">{categoryName || 'Загрузка...'}</h1>
            <div className="anime-list">
                {animeInCategory.length > 0 ? (
                    animeInCategory.map((anime) => (
                        <AnimeCard
                            key={anime.id}
                            anime={{
                                ...anime,
                                episodes: anime.episodes,
                            }}
                        />
                    ))
                ) : (
                    <p>Нет аниме в этой категории.</p>
                )}
            </div>
        </div>
    );
};

export default AnimeCategoryPage;
