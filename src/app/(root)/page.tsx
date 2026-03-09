'use client';

import React, { useEffect, useState } from 'react';
import Head from 'next/head';

import YumekoCategorySection from '@/component/anime-structure/YumekoCategorySection';
import YumekoCategorySkeleton from '@/component/anime-structure/YumekoCategorySkeleton';
import RecentlyUpdatedSection from '@/component/anime-structure/RecentlyUpdatedSection';
import YumekoMobileIndex from '@/component/mobile-navigation/YumekoMobileIndex';
import ServerErrorPage from '@/component/common/ServerErrorPage';
import ContinueWatchingSection from '@/component/continue-watching/ContinueWatchingSection';
import { API_SERVER } from '@/hosts/constants';
import '@/styles/components/recently-updated-section.scss';

interface CategoryWithAnimeIds {
    id: string;
    name: string;
    position: number;
    animeIds: string[];
}

interface CategoriesApiResponse {
    categories: CategoryWithAnimeIds[];
}

const CategoryList: React.FC = () => {
    const [categories, setCategories] = useState<CategoryWithAnimeIds[]>([]);
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
                    content="Yumeko - смотрите аниме онлайн. Категории, новинки, рейтинги и многое другое!"
                />
                <meta property="og:title" content="Yumeko | Главная | Аниме-платформа" />
                <meta
                    property="og:description"
                    content="Yumeko - смотрите аниме онлайн. Категории, новинки, рейтинги и многое другое!"
                />
                <meta property="og:type" content="website" />
                <meta property="og:url" content="https://yumeko.ru/" />
                <meta property="og:image" content="https://yumeko.ru/logo-cover.jpg" />
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

            <div className="yumeko-home">
                {/* Mobile Index */}
                <div className="mobile-only">
                    <YumekoMobileIndex />
                </div>

                {/* Секция "Продолжить просмотр" - Desktop */}
                <div className="desktop-only">
                    <ContinueWatchingSection />
                </div>

                {/* Секция "Недавно добавлено / Обновлено" - Desktop */}
                <div className="desktop-only">
                    <RecentlyUpdatedSection />
                </div>

                {/* Categories grid */}
                <div className="yumeko-categories-grid desktop-only">
                    {loadingCategories ? (
                        <>
                            <YumekoCategorySkeleton />
                            <YumekoCategorySkeleton />
                            <YumekoCategorySkeleton />
                            <YumekoCategorySkeleton />
                        </>
                    ) : categories.length > 0 ? (
                        categories.map(category => (
                            <YumekoCategorySection
                                key={category.id}
                                categoryId={category.id}
                                title={category.name}
                                animeIds={category.animeIds}
                            />
                        ))
                    ) : (
                        <div className="yumeko-empty-state">
                            <span className="empty-icon">📺</span>
                            <span className="empty-text">Категории не найдены</span>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default CategoryList;
