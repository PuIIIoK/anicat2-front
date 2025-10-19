// category-data.tsx
import { API_SERVER } from "../../../tools/constants";
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

export const fetchCategoryAnimeList = async (animeIds: string[], signal?: AbortSignal): Promise<AnimeInfo[]> => {
    console.log('[fetchCategoryAnimeList] Загрузка аниме по ID:', animeIds);

    const animeData = await Promise.all(
        animeIds.map(async (id) => {
            try {
                const res = await fetch(`${API_SERVER}/api/anime/get-anime/${id}`, { signal });
                if (!res.ok) {
                    console.warn(`[fetchCategoryAnimeList] Аниме ID ${id} не найден (res.ok = false)`);
                    return null;
                }

                const data = await res.json();
                console.log(`[fetchCategoryAnimeList] Загружено аниме ID ${id}:`, data);
                return data;
            } catch (error) {
                console.error(`[fetchCategoryAnimeList] Ошибка при загрузке аниме ID ${id}:`, error);
                return null;
            }
        })
    );

    const filtered = animeData.filter((item): item is AnimeInfo => item !== null);
    console.log('[fetchCategoryAnimeList] Отфильтрованный список аниме:', filtered);

    return filtered;
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