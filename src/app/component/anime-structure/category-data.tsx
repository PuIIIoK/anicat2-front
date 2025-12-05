// category-data.tsx
import { API_SERVER } from '@/hosts/constants';
import { AnimeInfo } from './anime-data-info';

export interface Category {
    id: string;
    name: string;
    animeIds: string[];
    link: string;
    position: number;
    animeList?: AnimeInfo[];
}

export const fetchAllCategories = async (signal?: AbortSignal): Promise<Category[]> => {
    const response = await fetch(`${API_SERVER}/api/anime/category/get-category`, { signal });
    if (!response.ok) throw new Error('Не удалось загрузить категории');

    const data = await response.json();
    console.log('[fetchAllCategories] Загружены категории:', data.categories);
    return data.categories || [];
};

export const fetchCategoryAnimeList = async (animeIds: string[], signal?: AbortSignal, token?: string | null): Promise<AnimeInfo[]> => {
    console.log('[fetchCategoryAnimeList] Загрузка аниме по ID (POST):', animeIds);
    
    if (animeIds.length === 0) return [];

    try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`${API_SERVER}/api/anime/get-anime`, {
            method: 'POST',
            headers,
            body: JSON.stringify(animeIds.map(Number)),
            signal
        });

        if (!res.ok) {
            console.warn('[fetchCategoryAnimeList] Ошибка запроса:', res.status);
            return [];
        }

        const animeData: AnimeInfo[] = await res.json();
        console.log(`[fetchCategoryAnimeList] Загружено ${animeData.length} аниме`);

        // Сортируем в порядке исходного списка ID
        const sortedAnime = animeIds.map(id => 
            animeData.find(anime => anime.id === Number(id))
        ).filter((item): item is AnimeInfo => item !== null && item !== undefined);

        return sortedAnime;
    } catch (error) {
        console.error('[fetchCategoryAnimeList] Ошибка:', error);
        return [];
    }
};

export const fetchCategoryById = async (categoryId: string, signal?: AbortSignal): Promise<Category | null> => {
    try {
        const response = await fetch(`${API_SERVER}/api/anime/category/get-category/${categoryId}`, { signal });
        if (!response.ok) throw new Error(`Ошибка при загрузке категории ${categoryId}`);
        const data = await response.json();
        console.log(`[fetchCategoryById] Категория ${categoryId}:`, data);
        return data;
    } catch (error) {
        console.error(`[fetchCategoryById] Ошибка:`, error);
        return null;
    }
};