// src/app/components/anime-data-info.ts
export interface AnimeEpisode {
    title: string; // Название эпизода
    link?: string;  // Ссылка на эпизод
}

export interface AnimeInfo {
    id: number; // Уникальный идентификатор аниме
    status: string; // Статус аниме
    title: string; // Название
    alttitle: string; // Альт. Название
    episode_all: string; // Количество эпизодов
    current_episode: string; // Текущий эпизод
    rating: string; // Рейтинг
    imageUrl: string; // Ссылка на изображение
    type: string; // Тип аниме
    season: string; // Сезон
    genres: string; // Жанры
    year: string; // Год выпуска
    description: string; // Описание
    episodes: AnimeEpisode[]; // Массив эпизодов
    screenshots: string[]; // Скриншоты
    mouth_season: string; // Месяц сезона
    studio: string; // Студия
    realesed_for: string; // Для чего выпущено (например, ранобэ)
}

// Функция для получения всех аниме
export const fetchAllAnime = async (): Promise<AnimeInfo[]> => {
    const response = await fetch('http://localhost:8080/api/anime/get-anime');
    const data = await response.json();
    return data.map((anime: AnimeInfo) => ({
        ...anime,
        episodes: [], // Или можно интегрировать данные о сериях
    }));
};

