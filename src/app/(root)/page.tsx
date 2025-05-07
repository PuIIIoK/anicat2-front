// src/app/components/category-list.tsx
'use client';

import React, { useState } from 'react';
import Category from '../component/anime-structure/category-structure'; // Подключаем компонент Category
import CategoryData, { Category as CategoryType } from '../component/anime-structure/category-data';
import { PulseLoader } from 'react-spinners'; // Импортируем спиннер

const CategoryList: React.FC = () => {
    const [sortedCategories, setSortedCategories] = useState<CategoryType[]>([]); // Для хранения категорий после сортировки
    const [loading, setLoading] = useState<boolean>(true); // Состояние загрузки

    const handleCategoriesLoaded = (categories: CategoryType[]) => {
        setSortedCategories(
            categories.sort((a, b) => a.position - b.position) // Сортировка по позиции
        );
        setLoading(false); // Устанавливаем состояние загрузки в false, когда данные загружены
    };

    const updatePosition = (categoryId: string, newPosition: number) => {
        const updatedCategories = sortedCategories.map((category) => {
            if (category.id === categoryId) {
                return { ...category, position: newPosition }; // Обновляем позицию
            }
            return category;
        });

        setSortedCategories(updatedCategories.sort((a, b) => a.position - b.position)); // Пересортировка
    };

    return (
        <div className="category-list-container">
            <CategoryData onCategoriesLoaded={handleCategoriesLoaded} /> {/* Загружаем категории с сервера */}

            {loading ? (
                <div className="loading-container">
                    <div className="loading-box">
                        <PulseLoader color="#36d7b7" loading={loading} size={15} />
                        <p>Загрузка главной страницы...</p>
                    </div>
                </div>
            ) : (
                sortedCategories.length > 0 ? (
                    sortedCategories.map((category) => (
                        <Category
                            key={category.id}
                            categoryId={category.id}
                            title={category.name}
                            link={category.link}
                            position={category.position}
                            onPositionChange={updatePosition} // Передаем функцию для обновления позиции
                        />
                    ))
                ) : (
                    <p>Нет категорий для отображения.</p>
                )
            )}
        </div>
    );
};

export default CategoryList;
