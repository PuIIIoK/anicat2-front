'use client';

import React from 'react';
import { useEffect, useState } from 'react';
import {API_SERVER} from "../../../tools/constants";

export interface Category {
    name: string;
    id: string;
    animeIds: string[];
    link: string;
    position: number;
}

// ✅ Первый запрос — получить все категории
export const fetchAllCategories = async (): Promise<Category[]> => {
    try {
        const response = await fetch(`${API_SERVER}/api/anime/category/get-category`);
        if (!response.ok) throw new Error('Не удалось загрузить категории');

        const data = await response.json();
        return data.categories || [];
    } catch (error) {
        console.error('Ошибка при загрузке категорий:', error);
        return [];
    }
};

// ✅ Второй запрос — получить подробности одной категории
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

// Компонент (если нужен)
const CategoryData = ({ onCategoriesLoaded }: { onCategoriesLoaded: (categories: Category[]) => void }) => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                setLoading(true);

                const baseCategories = await fetchAllCategories();

                const detailedCategories = await Promise.all(
                    baseCategories.map(async (cat) => {
                        const detail = await fetchCategoryById(cat.id);
                        return detail ? { ...cat, ...detail } : cat;
                    })
                );

                setCategories(detailedCategories);
                onCategoriesLoaded(detailedCategories);
            } catch {
                setError('Ошибка при загрузке данных');
            } finally {
                setLoading(false);
            }
        };

        if (categories.length === 0) {
            fetchCategories();
        }
    }, [categories, onCategoriesLoaded]);

    if (loading) return <p>Загрузка...</p>;
    if (error) return <p>{error}</p>;
    return null;
};

export default CategoryData;
