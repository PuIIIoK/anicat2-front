'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCollections, tabMap } from './useCollections';
import YumekoAnimeCard from '../anime-structure/YumekoAnimeCard';
import { getCurrentUser } from '../../utils/auth';
import '@/styles/components/yumeko-collection-service.scss';

const TabIcon = ({ type }: { type: string }) => {
    switch (type) {
        case 'Избранное':
            return (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
            );
        case 'Смотрю':
            return (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <polygon points="10 8 16 12 10 16 10 8" fill="currentColor"/>
                </svg>
            );
        case 'В планах':
            return (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
            );
        case 'Просмотрено':
            return (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
            );
        case 'Отложено':
            return (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="6" y="4" width="4" height="16" rx="1"/>
                    <rect x="14" y="4" width="4" height="16" rx="1"/>
                </svg>
            );
        case 'Брошено':
            return (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="15" y1="9" x2="9" y2="15"/>
                    <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
            );
        default:
            return null;
    }
};

const CollectionsPc: React.FC = () => {
    const { activeTab, setActiveTab, collections, loading } = useCollections();
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [localCollections, setLocalCollections] = useState(collections);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [username, setUsername] = useState<string>('');
    
    // Получаем username из токена
    useEffect(() => {
        const user = getCurrentUser();
        if (user?.username) {
            setUsername(user.username);
        }
    }, []);
    
    // При смене вкладки сбрасываем состояние
    useEffect(() => {
        setIsInitialLoad(true);
    }, [activeTab]);
    
    // Когда loading завершён — убираем флаг начальной загрузки
    useEffect(() => {
        if (!loading) {
            setIsInitialLoad(false);
        }
    }, [loading]);
    
    useEffect(() => {
        setLocalCollections(collections);
    }, [collections]);
    
    // Показывать спиннер пока идёт loading ИЛИ пока это начальная загрузка
    const showLoading = loading || isInitialLoad;
    
    const filteredCollections = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return localCollections;
        return localCollections.filter((item) => {
            const a = item.anime;
            const title = (a?.title || '').toLowerCase();
            const alt = (a?.alttitle || '').toLowerCase();
            return title.includes(q) || alt.includes(q);
        });
    }, [localCollections, searchQuery]);
    
    const tabs = Object.keys(tabMap);

    return (
        <div className="yumeko-collection-service">
            {/* Breadcrumbs */}
            <nav className="yumeko-collection-service-breadcrumbs">
                <Link href="/" className="breadcrumb-link">Главная</Link>
                <span className="breadcrumb-separator">/</span>
                <Link href={username ? `/profile/${username}` : '/profile'} className="breadcrumb-link">Профиль</Link>
                <span className="breadcrumb-separator">/</span>
                <span className="breadcrumb-current">Коллекции</span>
            </nav>

            {/* Header */}
            <div className="yumeko-collection-service-header">
                <div className="yumeko-collection-service-title">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                    </svg>
                    Мои коллекции
                </div>
                
                <div className="yumeko-collection-service-tools">
                    <div className="yumeko-collection-service-count">
                        {localCollections.length} аниме
                    </div>
                    <div className="yumeko-collection-service-search">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8"/>
                            <path d="m21 21-4.35-4.35"/>
                        </svg>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Поиск аниме..."
                        />
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="yumeko-collection-service-tabs">
                {tabs.map((tab) => (
                    <button
                        key={tab}
                        className={`yumeko-collection-service-tab ${tab === activeTab ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab)}
                    >
                        <TabIcon type={tab} />
                        <span>{tab}</span>
                    </button>
                ))}
            </div>

            {/* Grid */}
            <div className="yumeko-collection-service-grid">
                {showLoading ? (
                    <div className="yumeko-collection-service-loading">
                        <div className="yumeko-collection-service-spinner" />
                        <span>Загрузка коллекции...</span>
                    </div>
                ) : localCollections.length === 0 ? (
                    <div className="yumeko-collection-service-empty">
                        <Image 
                            src="/kusti.png" 
                            alt="Пусто" 
                            width={120} 
                            height={120} 
                            className="empty-icon"
                        />
                        <div className="empty-title">Коллекция пуста</div>
                        <div className="empty-text">
                            Добавьте аниме в &laquo;{activeTab}&raquo; чтобы они появились здесь
                        </div>
                    </div>
                ) : filteredCollections.length === 0 ? (
                    <div className="yumeko-collection-service-empty">
                        <div className="empty-title">Ничего не найдено</div>
                        <div className="empty-text">
                            Попробуйте изменить поисковый запрос
                        </div>
                    </div>
                ) : (
                    filteredCollections.map((item) => (
                        <YumekoAnimeCard
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


