'use client';

import React, { useEffect, useState } from 'react';
import Category from '../component/anime-structure/category-structure';
import { Category as CategoryType, loadCategoriesWithAnime } from '../component/anime-structure/category-data';
import { PropagateLoader } from 'react-spinners';
import CategoryNavBar from '../component/mobile-navigation/CategoryNavBar';
import { API_SERVER } from '../../tools/constants';
import Head from "next/head";

const CategoryList: React.FC = () => {
    const [sortedCategories, setSortedCategories] = useState<CategoryType[]>([]);
    const [loading, setLoading] = useState(true);
    const [progress, setProgress] = useState(0);
    const [loadingStage, setLoadingStage] = useState('Проверка подключения...');
    const [noResponse, setNoResponse] = useState(false);

    const pingServer = async (): Promise<boolean> => {
        try {
            const res = await fetch(`${API_SERVER}/api/anime/category/ping`, { method: 'GET' });
            return res.ok;
        } catch {
            return false;
        }
    };

    const fetchData = async () => {
        setNoResponse(false);
        setProgress(10);
        setLoadingStage('Получение данных...');

        try {
            const categories = await loadCategoriesWithAnime();

            setProgress(20);
            setLoadingStage('Обработка данных...');

            const sorted = categories.sort((a, b) => a.position - b.position);
            setSortedCategories(sorted);

            const processingInterval = setInterval(() => {
                setProgress(prev => {
                    if (prev >= 40) {
                        clearInterval(processingInterval);
                        return 40;
                    }
                    return prev + 4;
                });
            }, 100);

            setTimeout(() => {
                setLoadingStage('Строим интерфейс...');
                const uiInterval = setInterval(() => {
                    setProgress(prev => {
                        if (prev >= 75) {
                            clearInterval(uiInterval);
                            return 75;
                        }
                        return prev + 5;
                    });
                }, 80);
            }, 600);

            setTimeout(() => {
                setProgress(100);
                setLoadingStage('Готово!');
                setTimeout(() => setLoading(false), 300);
            }, 1500);
        } catch (err) {
            console.error('Ошибка при загрузке:', err);
            setNoResponse(true);
            setLoadingStage('Ошибка загрузки. Повторное подключение...');
            retryConnection();
        }
    };

    const retryConnection = async () => {
        const interval = setInterval(async () => {
            const isAvailable = await pingServer();
            if (isAvailable) {
                clearInterval(interval);
                fetchData();
            }
        }, 5000);
    };

    useEffect(() => {
        const start = async () => {
            const isAvailable = await pingServer();
            if (isAvailable) {
                fetchData(); // загружаем только один раз
            } else {
                setNoResponse(true);
                setLoadingStage('Ошибка: Сервер недоступен.');
                retryConnection();
            }
        };

        start();
    }, []);
    useEffect(() => {
        document.title = 'AniCat | Главная | Аниме-платформа';
    }, []);

    const updatePosition = (categoryId: string, newPosition: number) => {
        const updated = sortedCategories.map((c) =>
            c.id === categoryId ? { ...c, position: newPosition } : c
        );
        if (updated.some(c => c.position === undefined)) return;
        setSortedCategories(updated.sort((a, b) => a.position - b.position));
    };
    useEffect(() => {
        const header = document.querySelector('.header');
        const footer = document.querySelector('.footer');
        const mobileOnly = document.querySelector('.mobile-only');

        // Если есть .mobile-only — ничего не делаем
        if (mobileOnly) return;

        // Добавляем скрытие сразу при маунте
        header?.classList.add('hide-while-loading');
        footer?.classList.add('hide-while-loading');

        if (!loading) {
            header?.classList.remove('hide-while-loading');
            footer?.classList.remove('hide-while-loading');
        }

        return () => {
            header?.classList.remove('hide-while-loading');
            footer?.classList.remove('hide-while-loading');
        };
    }, []);

    useEffect(() => {
        // Если есть .mobile-only — ничего не делаем
        if (document.querySelector('.mobile-only')) return;

        // Показываем header/footer, когда загрузка завершена
        if (!loading) {
            const header = document.querySelector('.header');
            const footer = document.querySelector('.footer');
            header?.classList.remove('hide-while-loading');
            footer?.classList.remove('hide-while-loading');
        }
    }, [loading]);



    return (
        <>
            <Head>
                <title>AniCat | Главная | Аниме-платформа</title>
                <meta name="description" content="На данной странице главной вы найдете: Категории, Новые аниме, оцени пользователей, а так-же новости и возможность зайти в свой профиль!" />
                <meta property="og:title" content="AniCat | Главная | Аниме-платформа" />
                <meta property="og:description" content="На данной странице главной вы найдете: Категории, Новые аниме, оцени пользователей, а так-же новости и возможность зайти в свой профиль!" />
                <meta property="og:type" content="website" />
                <meta property="og:url" content="https://anicat.ru/" />
                <meta property="og:image" content="https://anicat.ru/logo-cover.jpg" />
                <meta property="og:image:alt" content="AniCat Главная страница" />
            </Head>

            <div className="category-list-container">

            {/* Mobile */}
            <div className="mobile-only">
                <CategoryNavBar />
            </div>

            {/* Desktop */}
            <div className="desktop-only">
                {loading ? (
                    <div className="loading-container">
                        <div className="loading-box">
                            <PropagateLoader
                                color="#ff0000"
                                size={15}
                                loading={true}
                                cssOverride={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    position: 'relative',
                                    marginBottom: '40px',
                                }}
                            />
                            <div className="progress-status">
                                <p className="progress-title">Загрузка главной страницы</p>

                                <div className="progress-bar-wrapper">
                                    <div className="progress-bar">
                                        <div
                                            className="progress-bar-fill"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                    <span className="progress-percent">{progress}%</span>
                                </div>

                                <p className="progress-detail">{loadingStage}</p>

                                {noResponse && (
                                    <>
                                        <p className="retry-text">Повторное подключение...</p>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    sortedCategories.map((category) => (
                        <Category
                            key={category.id}
                            categoryId={category.id}
                            title={category.name}
                            link={category.link}
                            position={category.position}
                            onPositionChange={updatePosition}
                            animeList={category.animeList}
                        />
                    ))
                )}
            </div>
        </div>
            </>
    );
};

export default CategoryList;
