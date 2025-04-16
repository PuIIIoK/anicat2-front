'use client';

import React, { useState, useEffect } from 'react';

interface Anime {
    id: number;
    title: string;
    alttitle: string;
    year: number;
    type: string;
}

const AdminPanelPage = () => {
    const [activeTab, setActiveTab] = useState<'users' | 'anime' | 'categories'>('anime');
    const [animeList, setAnimeList] = useState<Anime[]>([]);

    useEffect(() => {
        if (activeTab === 'anime') {
            fetchAnimeList();
        }
    }, [activeTab]);

    const fetchAnimeList = async () => {
        try {
            const response = await fetch('http://localhost:8080/api/anime/get-anime');
            if (!response.ok) throw new Error('Ошибка при получении аниме');
            const data = await response.json();
            setAnimeList(data);
        } catch (error) {
            console.error('Ошибка при получении списка аниме:', error);
        }
    };

    return (
        <div className="admin-panel">
            <aside className="admin-sidebar">
                <h1 className="admin-title">Админ Панель</h1>
                <button className={activeTab === 'users' ? 'active' : ''} onClick={() => setActiveTab('users')}>
                    Пользователи
                </button>
                <button className={activeTab === 'anime' ? 'active' : ''} onClick={() => setActiveTab('anime')}>
                    Аниме
                </button>
                <button className={activeTab === 'categories' ? 'active' : ''} onClick={() => setActiveTab('categories')}>
                    Категории
                </button>
            </aside>

            <main className="admin-content">
                {activeTab === 'anime' && (
                    <section className="admin-section">
                        <h2>🎬 Аниме</h2>
                        <button className="add-button">+ Добавить аниме</button>

                        <div className="admin-table-header">
                            <span>ID</span>
                            <span>Название</span>
                            <span>Тип</span>
                            <span>Год</span>
                            <span>Действия</span>
                        </div>

                        {animeList.map((anime) => (
                            <div className="admin-table-row" key={anime.id}>
                                <span>{anime.id}</span>
                                <span>{anime.title}</span>
                                <span>{anime.type}</span>
                                <span>{anime.year}</span>
                                <span>
                                    <button>Редактировать</button>
                                    <button>Посмотреть</button>
                                    <button className="danger">Удалить</button>
                                </span>
                            </div>
                        ))}
                    </section>
                )}
            </main>
        </div>
    );
};

export default AdminPanelPage;
