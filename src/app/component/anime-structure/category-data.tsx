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

export const fetchAllCategories = async (): Promise<Category[]> => {
    const response = await fetch(`${API_SERVER}/api/anime/category/get-category`);
    if (!response.ok) throw new Error('Не удалось загрузить категории');
    const data = await response.json();
    return data.categories || [];
};

export const fetchCategoryAnimeList = async (animeIds: string[]): Promise<AnimeInfo[]> => {
    const animeData = await Promise.all(
        animeIds.map(async (id) => {
            const res = await fetch(`${API_SERVER}/api/anime/get-anime/${id}`);
            if (!res.ok) return null;
            return await res.json();
        })
    );
    return animeData.filter((item): item is AnimeInfo => item !== null);
};

export const fetchCategoryById = async (categoryId: string): Promise<Category | null> => {
    try {
        const response = await fetch(`${API_SERVER}/api/anime/category/get-category/${categoryId}`);
        if (!response.ok) throw new Error(`Ошибка при загрузке категории ${categoryId}`);
        return await response.json();
    } catch (error) {
        console.error('Ошибка при загрузке категории:', error);
        return null;
    }
};


export const loadCategoriesWithAnime = async (): Promise<Category[]> => {
    const cached = sessionStorage.getItem('anicat_categories');
    if (cached) {
        return JSON.parse(cached);
    }

    const baseCategories = await fetchAllCategories();
    const categoriesWithAnime = await Promise.all(
        baseCategories.map(async (cat) => {
            const animeList = await fetchCategoryAnimeList(cat.animeIds);
            return { ...cat, animeList };
        })
    );

    sessionStorage.setItem('anicat_categories', JSON.stringify(categoriesWithAnime));
    return categoriesWithAnime;
};
