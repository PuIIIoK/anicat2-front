import React from 'react';

export default function AnimePlayerPage() {
    // Временная константа для тестирования
    const TEMP_ANIME_ID = '53';

    // Используем animeId из константы
    const currentAnimeId = TEMP_ANIME_ID;

    return (
        <div className="app-container">
            <h1 className="page-title">Плеер для аниме: {currentAnimeId}</h1>
        </div>
    );
}