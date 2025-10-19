'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useCollections, tabMap } from './useCollections';
import GlobalAnimeCard from '../anime-structure/GlobalAnimeCard';

const CollectionsPc: React.FC = () => {
    const { activeTab, setActiveTab, collections, loading } = useCollections();
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [localCollections, setLocalCollections] = useState(collections);
    
    // Синхронизируем локальные коллекции с глобальными
    useEffect(() => {
        setLocalCollections(collections);
    }, [collections]);
    
    const filteredCollections = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        const collectionsToFilter = localCollections;
        if (!q) return collectionsToFilter;
        return collectionsToFilter.filter((item) => {
            const a = item.anime;
            const title = (a?.title || '').toLowerCase();
            const alt = (a?.alttitle || '').toLowerCase();
            const idStr = String(a?.id ?? '');
            return title.includes(q) || alt.includes(q) || idStr.includes(q);
        });
    }, [localCollections, searchQuery]);
    const tabs = Object.keys(tabMap);

    // TODO: добавить функцию для удаления аниме из коллекции при необходимости

    // TODO: добавить обработку изменения коллекции при необходимости

    useEffect(() => {
        const grid = document.querySelector('.collection-grid') as HTMLElement | null;
        const scroll = localStorage.getItem('collectionGridScroll');
        if (grid && scroll) grid.scrollTop = +scroll;
    }, [activeTab]);

    useEffect(() => {
        const grid = document.querySelector('.collection-grid') as HTMLElement | null;
        if (!grid) return;
        const handleTabSwitch = () => {
            if (grid) localStorage.setItem('collectionGridScroll', String(grid.scrollTop));
        };
        tabs.forEach(tab => {
            document.querySelector(`[data-tab="${tab}"]`)?.addEventListener('click', handleTabSwitch);
        });
        return () => {
            tabs.forEach(tab => {
                document.querySelector(`[data-tab="${tab}"]`)?.removeEventListener('click', handleTabSwitch);
            });
        };
    }, [tabs]);

    return (
        <div className="collection-mobile-section-root-pc">
            <div className="collection-mobile-section-header">
                <div className="collection-mobile-section-title">Мои коллекции</div>
            </div>

            <div className="collection-pc-subheader">
                <div className="collection-pc-type">{activeTab}</div>
                <div className="collection-pc-tools">
                    <div className="collection-pc-count">{localCollections.length} аниме</div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="collection-pc-search-input"
                        placeholder="Поиск..."
                    />
                </div>
            </div>

            <div className="collection-mobile-section-tabs" role="tablist" aria-label="Коллекции">
                {tabs.map((tab) => (
                    <button
                        key={tab}
                        className={`collection-mobile-section-tab ${tab === activeTab ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab)}
                        data-tab={tab}
                        role="tab"
                        aria-selected={tab === activeTab}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            <div className="collection-mobile-section-grid collection-grid">
                {loading ? (
                    <div className="collection-mobile-section-loader">
                        <div className="collection-mobile-section-spinner" />
                        <span>Загрузка...</span>
                    </div>
                ) : localCollections.length === 0 ? (
                    <div className="collection-empty-pc">
                        <div className="collection-empty-img-wrap">
                            <Image src="/kusti.png" alt="Аниме кот" width={220} height={220} className="collection-empty-img"/>
                        </div>
                        <div className="collection-empty-text">Вы еще не добавили аниме в эту коллекцию)</div>
                    </div>
                ) : filteredCollections.length === 0 ? (
                    <div className="collection-mobile-section-empty">Ничего не найдено</div>
                ) : (
                    filteredCollections.map((item) => (
                        <GlobalAnimeCard
                            key={item.collectionId}
                            anime={item.anime}
                            collectionType={item.collectionType}
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

export default CollectionsPc;


