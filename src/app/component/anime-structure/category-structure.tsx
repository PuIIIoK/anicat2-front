'use client';
import React from 'react';
import AnimeCard from './anime-cards';
import { AnimeInfo } from './anime-data-info';
import Link from 'next/link';

interface CategoryProps {
    categoryId: string;
    title: string;
    link: string;
    position: number;
    onPositionChange: (categoryId: string, newPosition: number) => void;
    animeList?: AnimeInfo[];
}

const Category: React.FC<CategoryProps> = ({ categoryId, title, animeList = [] }) => {
    return (
        <section className="category">
            <div className="container-wrapper">
                <Link href={`/anime-category/${categoryId}`}>
                    <h2 className="category-title">{title}</h2>
                </Link>

                <div className="anime-line-container-padding">
                    <div className="anime-line-container">
                        {animeList.length > 0 ? (
                            animeList.map((anime) => (
                                <AnimeCard key={anime.id} anime={anime} />
                            ))
                        ) : (
                            <p>Нет аниме для отображения.</p>
                        )}
                    </div>
                </div>

                <Link href={`/anime-category/${categoryId}`}>
                    <div className="view-all-button">Посмотреть все</div>
                </Link>
            </div>
        </section>
    );
};

export default Category;
