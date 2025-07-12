'use client';

import React, { useEffect, useState } from 'react';
import { API_SERVER } from '../../../../tools/constants';
import { AnimeInfo } from '../../../component/anime-structure/anime-data-info';
import AnimeCard from '../../../component/anime-structure/anime-cards';

interface AnimeCollectionItem {
    collectionId: number;
    collectionType: string;
    addedAt: string;
    anime: AnimeInfo;
}

const tabMap: { [key: string]: string } = {
    'Избранное': 'FAVORITE',
    'Смотрю': 'WATCHING',
    'В планах': 'PLANNED',
    'Просмотрено': 'COMPLETED',
    'Отложено': 'PAUSED',
    'Брошено': 'DROPPED',
};

const collectionTypeMap: { [key: string]: string } = {
    FAVORITE: 'Избранное',
    WATCHING: 'Смотрю',
    PLANNED: 'В планах',
    COMPLETED: 'Просмотрено',
    PAUSED: 'Отложено',
    DROPPED: 'Брошено',
};


const CollectionPage = () => {
    const tabs = Object.keys(tabMap);
    const [activeTab, setActiveTab] = useState('Просмотрено');
    const [collections, setCollections] = useState<AnimeCollectionItem[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchCollection = async (type: string) => {
        setLoading(true);
        try {
            const res = await fetch(`${API_SERVER}/api/collection/my?type=${type}`, {
                headers: {
                    Authorization: `Bearer ${document.cookie.replace(/(?:(?:^|.*;\s*)token\s*=\s*([^;]*).*$)|^.*$/, "$1")}`,
                },
            });

            if (!res.ok) throw new Error(`Ошибка ${res.status}`);

            const data: AnimeCollectionItem[] = await res.json();
            setCollections(data);
        } catch (err) {
            console.error('Ошибка загрузки:', err);
            setCollections([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCollection(tabMap[activeTab]);
    }, [activeTab]);

    return (
        <div className="collection-page">
            <div className="tabs-container">
                {tabs.map((tab) => (
                    <button
                        key={tab}
                        className={`tab-button ${tab === activeTab ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            <div className="collection-grid">
                {loading ? (
                    <p className="loading-text">Загрузка...</p>
                ) : collections.length === 0 ? (
                    <p className="empty-text">Вы еще не добавили аниме в эту коллекцию)</p>
                ) : (
                    collections.map((item) => (
                        <AnimeCard
                            key={item.collectionId}
                            anime={item.anime}
                            collectionType={collectionTypeMap[item.collectionType] || item.collectionType}
                        />
                    ))
                )}
            </div>
        </div>
    );
};

export default CollectionPage;
