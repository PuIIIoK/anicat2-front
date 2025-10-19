'use client';

import React, { useEffect, useState } from 'react';
import { API_SERVER } from '../../../../tools/constants';
import { AnimeInfo } from '../../anime-structure/anime-data-info';
import GlobalAnimeCard from '../../anime-structure/GlobalAnimeCard';

interface AnimeCollectionItem {
    collectionId: number;
    collectionType: string;
    addedAt: string;
    anime: AnimeInfo;
}

interface UserCollectionsProps {
    username?: string;
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

export const UserCollections: React.FC<UserCollectionsProps> = ({ username }) => {
    const tabs = Object.keys(tabMap);
    const [activeTab, setActiveTab] = useState('Просмотрено');
    const [collections, setCollections] = useState<AnimeCollectionItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!username) return;
        fetchCollection(tabMap[activeTab]);
    }, [activeTab, username]);

    const fetchCollection = async (type: string) => {
        if (!username) return;
        
        setLoading(true);
        try {
            const res = await fetch(`${API_SERVER}/api/collection/user/${username}?type=${type}`);

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

    if (!username) {
        return null;
    }

    return (
        <div className="user-collections-block">
            <h2>Коллекции {username}</h2>
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
                    <p className="empty-text">В этой коллекции пока нет аниме</p>
                ) : (
                    collections.map((item) => (
                        <GlobalAnimeCard
                            key={item.collectionId}
                            anime={item.anime}
                            collectionType={collectionTypeMap[item.collectionType] || item.collectionType}
                            showCollectionStatus={true}
                            showRating={true}
                            showType={true}
                        />
                    ))
                )}
            </div>
        </div>
    );
};
