'use client';

import React, { useEffect, useState } from 'react';
import Head from 'next/head';

import OptimizedCategorySection from '@/component/anime-structure/optimized-category-section';
import { Category as CategoryType } from '@/component/anime-structure/category-data';
import CategoryNavBar from '@/component/mobile-navigation/CategoryNavBar';
import ServerErrorPage from '@/component/common/ServerErrorPage';
import ContinueWatchingSection from '@/component/continue-watching/ContinueWatchingSection';
import { API_SERVER } from '../../tools/constants';

interface CategoriesApiResponse {
    categories: Omit<CategoryType, 'animeList'>[];
}

const CategoryList: React.FC = () => {
    const [categories, setCategories] = useState<Omit<CategoryType, 'animeList'>[]>([]);
    const [loadingCategories, setLoadingCategories] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [adminAccessMessage, setAdminAccessMessage] = useState<string | null>(null);

    // Установка title при заходе на страницу, чтобы точно обновить вкладку браузера
    useEffect(() => {
        document.title = 'Yumeko | Главная Страница';
        
        // Проверяем сообщение о блокировке доступа к админке
        const adminAccessDenied = sessionStorage.getItem('adminAccessDenied');
        if (adminAccessDenied) {
            try {
                const deniedData = JSON.parse(adminAccessDenied);
                setAdminAccessMessage(deniedData.message);
                // Очищаем сообщение после показа
                sessionStorage.removeItem('adminAccessDenied');
                // Автоматически скрываем через 5 секунд
                setTimeout(() => {
                    setAdminAccessMessage(null);
                }, 5000);
            } catch (error) {
                console.error('Ошибка при парсинге сообщения о блокировке доступа:', error);
            }
        }
    }, []);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await fetch(`${API_SERVER}/api/anime/category/get-category`);
                if (!res.ok) throw new Error(`Ошибка загрузки категорий: статус ${res.status}`);

                const data: CategoriesApiResponse = await res.json();

                if (!data.categories || !Array.isArray(data.categories)) {
                    throw new Error('В ответе сервера нет поля categories или оно не массив');
                }

                const cats = data.categories.sort((a, b) => a.position - b.position);
                setCategories(cats);
            } catch (err) {
                if (err instanceof Error) {
                    setError(err.message);
                } else {
                    setError('Неизвестная ошибка');
                }
            } finally {
                setLoadingCategories(false);
            }
        };

        fetchCategories();
    }, []);

    // Спиннер для загрузки
    if (loadingCategories) {
        return (
            <div className="loader-container-category">
                <div className="loader-category"></div>
            </div>
        );
    }

    if (error) {
        return (
            <ServerErrorPage 
                title="Внутренняя ошибка сервера!"
                message="Не удалось загрузить категории аниме.\nПожалуйста, попробуйте позже"
                onRetry={() => window.location.reload()}
            />
        );
    }

    return (
        <>
            <Head>
                <title>Yumeko | Главная | Аниме-платформа</title>
                <meta
                    name="description"
                    content="На данной странице главной вы найдете: Категории, Новые аниме, оцени пользователей, а так-же новости и возможность зайти в свой профиль!"
                />
                <meta property="og:title" content="Yumeko | Главная | Аниме-платформа" />
                <meta
                    property="og:description"
                    content="На данной странице главной вы найдете: Категории, Новые аниме, оцени пользователей, а так-же новости и возможность зайти в свой профиль!"
                />
                <meta property="og:type" content="website" />
                <meta property="og:url" content="https://anicat.ru/" />
                <meta property="og:image" content="https://anicat.ru/logo-cover.jpg" />
                <meta property="og:image:alt" content="Yumeko Главная страница" />
            </Head>

            {adminAccessMessage && (
                <div className="admin-access-notification">
                    <div className="admin-access-content">
                        <div className="admin-access-icon">🔒</div>
                        <div className="admin-access-text">{adminAccessMessage}</div>
                        <button 
                            className="admin-access-close"
                            onClick={() => setAdminAccessMessage(null)}
                        >
                            ×
                        </button>
                    </div>
                </div>
            )}

            <div className="category-list-container crunchyroll-container">
                {/* Секция "Продолжить просмотр" */}
                <div className="desktop-only">
                    <ContinueWatchingSection />
                </div>
                
                <div className="mobile-only">
                    <CategoryNavBar />
                </div>

                <div className="desktop-only">
                    {categories.length > 0 ? (
                        categories.map(category => (
                            <OptimizedCategorySection
                                key={category.id}
                                categoryId={category.id}
                                title={category.name}
                                link={category.link}
                                position={category.position}
                            />
                        ))
                    ) : (
                        <div className="no-categories-message">Категории не найдены.</div>
                    )}
                </div>
            </div>
        </>
    );
};

export default CategoryList;
