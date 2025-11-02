'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AnimeInfo } from './anime-data-info';
import { AnimeBasicInfo } from './anime-basic-info';
import { API_SERVER } from '@/hosts/constants';

interface GlobalAnimeCardProps {
    anime: AnimeInfo | AnimeBasicInfo;
    collectionType?: string;
    showCollectionStatus?: boolean;
    showRating?: boolean;
    showType?: boolean;
    className?: string;
    priority?: boolean;
}


const GlobalAnimeCard: React.FC<GlobalAnimeCardProps> = ({ 
    anime, 
    collectionType: propsCollectionType, 
    showCollectionStatus = true,
    showRating = true,
    showType = true,
    className = '',
    priority = false
}) => {
    const [coverUrl, setCoverUrl] = useState<string>('');
    const [animeRating, setAnimeRating] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [imageError, setImageError] = useState(false);
    const [userCollectionType, setUserCollectionType] = useState<string>(propsCollectionType || '');
    const [isLoadingCollection, setIsLoadingCollection] = useState(false);

    // Получение статуса коллекции на русском
    const getCollectionStatusText = (type: string) => {
        switch (type?.toUpperCase()) {
            case 'WATCHING': return 'Смотрю';
            case 'COMPLETED': return 'Просмотрено';
            case 'PLAN_TO_WATCH':
            case 'PLANNED': return 'В планах';
            case 'DROPPED': return 'Брошено';
            case 'ON_HOLD': 
            case 'PAUSED': return 'Отложено';
            case 'REWATCHING': return 'Пересматриваю';
            case 'FAVORITE': return 'Избранное';
            default: return type || '';
        }
    };

    // Получение CSS класса для статуса
    const getCollectionStatusClass = (type: string) => {
        switch (type?.toUpperCase()) {
            case 'WATCHING': return 'watching';
            case 'COMPLETED': return 'completed';
            case 'PLAN_TO_WATCH':
            case 'PLANNED': return 'planned';
            case 'DROPPED': return 'dropped';
            case 'ON_HOLD': 
            case 'PAUSED': return 'on-hold';
            case 'REWATCHING': return 'rewatching';
            case 'FAVORITE': return 'favorite';
            default: return 'default';
        }
    };

    // Функция для обработки типа аниме
    const cleanAnimeType = (type: string) => {
        if (!type) return '';
        
        // Если есть цифры - оставляем как есть
        if (/\d/.test(type)) {
            return type.trim();
        }
        
        // Если цифр нет - оставляем только основное слово (Фильм, Сезон, и т.д.)
        const lowerType = type.toLowerCase().trim();
        
        if (lowerType.includes('фильм')) return 'Фильм';
        if (lowerType.includes('сезон')) return 'Сезон';
        if (lowerType.includes('ova')) return 'OVA';
        if (lowerType.includes('ona')) return 'ONA';
        if (lowerType.includes('special')) return 'Special';
        if (lowerType.includes('тв') || lowerType.includes('tv')) return 'ТВ';
        
        // Если не распознали - возвращаем как есть
        return type.trim();
    };

    // Универсальная функция для получения куки
    const getCookie = (name: string): string | null => {
        if (typeof document !== 'undefined') {
            const cookies = document.cookie.split(';');
            for (const cookie of cookies) {
                const [cookieName, cookieValue] = cookie.trim().split('=');
                if (cookieName === name) {
                    return decodeURIComponent(cookieValue);
                }
            }
        }
        return null;
    };

    // Получение токена авторизации
    const getToken = () => {
        // Проверяем разные варианты названий куки для токена
        const tokenNames = ['token', 'authToken', 'access_token', 'jwt', 'auth'];
        
        for (const tokenName of tokenNames) {
            const token = getCookie(tokenName);
            if (token) {
                return token;
            }
        }
        
        // Fallback на localStorage если куки нет
        if (typeof window !== 'undefined') {
            return localStorage.getItem('token');
        }
        
        return null;
    };

    // Загрузка статуса коллекции конкретного аниме для авторизованного пользователя
    const fetchUserCollectionStatus = async () => {
        if (!showCollectionStatus || propsCollectionType) {
            console.log('🚫 Пропускаем загрузку коллекций:', { showCollectionStatus, propsCollectionType });
            return;
        }
        
        const token = getToken();
        if (!token) {
            console.log('🚫 Токен не найден для аниме:', anime.id, anime.title);
            return;
        }

        try {
            console.log('🔄 Загружаем статус коллекции для аниме:', anime.id, anime.title);
            console.log('🔑 Найден токен:', token ? 'Да' : 'Нет');
            
            setIsLoadingCollection(true);
            const res = await fetch(`${API_SERVER}/api/anime/optimized/get-anime/${anime.id}/collection-status`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            
            if (!res.ok) {
                console.warn('❌ Ошибка ответа сервера коллекций:', res.status);
                if (res.status === 401) {
                    console.warn('🔐 Проблема с авторизацией - токен недействителен или просрочен');
                }
                return;
            }
            
            const data = await res.json();
            console.log('📋 Получен ответ статуса коллекции:', data);
            
            if (data.hasStatus === 'true' && data.status) {
                console.log('✅ Найден статус коллекции для аниме', anime.id, ':', data.status);
                setUserCollectionType(data.status);
            } else {
                console.log('🔍 Статус коллекции не найден для аниме:', anime.id);
                setUserCollectionType('');
            }
        } catch (error) {
            console.warn('💥 Ошибка загрузки статуса коллекции:', error);
        } finally {
            setIsLoadingCollection(false);
        }
    };

    // Загрузка обложки через оптимизированные endpoints
    useEffect(() => {
        const fetchCover = async () => {
            try {
                setIsLoading(true);
                setImageError(false);
                
                // 1. Проверяем coverUrl из props (приоритет S3 URL)
                if (anime.coverUrl && anime.coverUrl.trim() && !anime.coverUrl.includes('placeholder')) {
                    setCoverUrl(anime.coverUrl);
                    setIsLoading(false);
                    return;
                }
                
                // 2. Проверяем image_url (старый формат)
                if ('image_url' in anime && anime.image_url?.url && anime.image_url.url.trim()) {
                    setCoverUrl(anime.image_url.url);
                    setIsLoading(false);
                    return;
                }
                
                // 3. Пробуем получить обложку через оптимизированный endpoint
                try {
                    const response = await fetch(`${API_SERVER}/api/anime/optimized/get-anime/${anime.id}/basic`);
                    if (response.ok) {
                        const data = await response.json();
                        if (data.coverUrl && data.coverUrl.trim() && !data.coverUrl.includes('placeholder')) {
                            setCoverUrl(data.coverUrl);
                            setIsLoading(false);
                            return;
                        }
                    }
                } catch (error) {
                    console.warn('Не удалось получить данные через оптимизированный endpoint:', error);
                }

                // 4. Устанавливаем плейсхолдер
                setImageError(true);
            } catch (error) {
                console.error('Ошибка загрузки обложки:', error);
                setImageError(true);
            } finally {
                setIsLoading(false);
            }
        };

        if (anime?.id) {
            fetchCover();
        }

        // Cleanup function для освобождения URL
        return () => {
            if (coverUrl && coverUrl.startsWith('blob:')) {
                try {
                    URL.revokeObjectURL(coverUrl);
                } catch (error) {
                    console.warn('Ошибка при освобождении URL:', error);
                }
            }
        };
    }, [
        anime?.id, 
        anime?.coverUrl, 
        'image_url' in anime ? anime.image_url?.url : null
    ]);

    // Загрузка рейтинга (только если нужно показывать)
    useEffect(() => {
        if (!showRating || !anime?.id) return;
        
        const fetchRating = async () => {
            try {
                const response = await fetch(`${API_SERVER}/api/anime/ratings/${anime.id}/rating`);
                if (response.ok) {
                    const data = await response.json();
                    setAnimeRating(data.average ?? null);
                }
            } catch (error) {
                console.warn('Ошибка загрузки рейтинга:', error);
                setAnimeRating(null);
            }
        };

        fetchRating();
    }, [anime.id, showRating]);

    // Загрузка статуса коллекции пользователя
    useEffect(() => {
        if (!showCollectionStatus || !anime?.id) return;
        fetchUserCollectionStatus();
    }, [anime.id, showCollectionStatus]);

    // Обработка ошибки загрузки изображения
    const handleImageError = () => {
        if (!imageError) {
            setImageError(true);
            setCoverUrl('/anime-placeholder.svg');
        }
        setIsLoading(false);
    };

    // Обработка успешной загрузки изображения
    const handleImageLoad = () => {
        setIsLoading(false);
        // Не сбрасываем imageError если загружается плейсхолдер
        if (!coverUrl?.includes('placeholder')) {
            setImageError(false);
        }
    };

    return (
        <>
            {/* Desktop версия */}
            <Link
                href={`/anime-page/${anime.id}`}
                prefetch={true}
                className={`global-anime-card desktop-only ${className}`}
            >
            <div className="global-anime-card-image-container">
                {isLoading && (
                    <div className="global-anime-card-image-placeholder">
                        <div className="global-anime-card-loading-spinner"></div>
                    </div>
                )}
                
                {imageError ? (
                    <div className="global-anime-card-no-image">
                        <div className="global-anime-card-no-image-icon">🎬</div>
                        <span>Нет изображения</span>
                    </div>
                ) : (
                <Image
                    src={imageError ? '/anime-placeholder.svg' : (coverUrl || '/anime-placeholder.svg')}
                    alt={anime.title || 'Аниме обложка'}
                    width={220}
                    height={260}
                    className="global-anime-card-image"
                    onLoad={handleImageLoad}
                    onError={handleImageError}
                    style={{
                        objectFit: 'cover',
                        objectPosition: 'center',
                        display: isLoading ? 'none' : 'block',
                        width: '220px',
                        height: '260px',
                        minWidth: '220px',
                        minHeight: '260px',
                        maxWidth: '220px',
                        maxHeight: '260px'
                    }}
                    priority={priority}
                    loading={priority ? 'eager' : 'lazy'}
                    sizes="220px"
                />
                )}

                {/* Статус коллекции */}
                {showCollectionStatus && (userCollectionType || propsCollectionType) && !isLoadingCollection && (
                    <div className={`global-anime-card-status ${getCollectionStatusClass(userCollectionType || propsCollectionType || '')}`}>
                        {getCollectionStatusText(userCollectionType || propsCollectionType || '')}
                    </div>
                )}

                {/* Рейтинг или анонс для скоро выходящих аниме */}
                {(() => {
                    const status = anime.status?.toUpperCase() || '';
                    const anons = 'anons' in anime ? anime.anons : '';
                    const isUpcoming = status === 'UPCOMING' || status === 'NOT_YET_AIRED' || status === 'SOON' || status === 'АНОНС' || status === 'СКОРО';

                    if (isUpcoming) {
                        // Для скоро выходящих аниме показываем анонс или "СКОРО"
                        return (
                            <div className="global-anime-card-anons">
                                {anons && anons.trim() ? anons.toUpperCase() : 'СКОРО'}
                            </div>
                        );
                    }

                    // Для остальных статусов показываем рейтинг
                    return showRating && animeRating && animeRating > 0 ? (
                        <div className="global-anime-card-rating">
                            ⭐ {animeRating.toFixed(1)}
                        </div>
                    ) : null;
                })()}

                {/* Тип аниме */}
                {showType && anime.type && (
                    <div className="global-anime-card-type">
                        {cleanAnimeType(anime.type)}
                    </div>
                )}
            </div>

            <div className="global-anime-card-info">
                <h3 className="global-anime-card-title">
                    {anime.title || 'Без названия'}
                </h3>
                
                <div className="global-anime-card-meta">
                    <div 
                        className="global-anime-card-episodes" 
                        data-status={(() => {
                            const status = anime.status?.toUpperCase() || '';
                            const currentEp = anime.current_episode || 
                                ('currentEpisode' in anime ? (anime as { currentEpisode?: string }).currentEpisode : '') || '';
                            const totalEp = anime.episode_all || 
                                ('episodeAll' in anime ? (anime as { episodeAll?: string }).episodeAll : '') || '';
                            
                            if (status === 'UPCOMING' || status === 'NOT_YET_AIRED' || status === 'SOON' || status === 'АНОНС' || status === 'СКОРО') {
                                return 'upcoming';
                            }
                            
                            // Считаем завершенным если статус завершен ИЛИ если current_episode равен episode_all
                            const isCompleted = status === 'COMPLETED' || status === 'FINISHED' || status === 'ЗАВЕРШЕН' || status === 'ВЫШЕЛ' ||
                                               (currentEp && totalEp && currentEp === totalEp);
                            if (isCompleted) {
                                return 'completed';
                            }
                            
                            if (status === 'ONGOING' || status === 'AIRING' || status === 'ОНГОИНГ' || status === 'ВЫХОДИТ') {
                                return 'ongoing';
                            }
                            return 'unknown';
                        })()}
                    >
                        {(() => {
                            // Поддержка разных форматов полей
                            const currentEp = anime.current_episode || 
                                ('currentEpisode' in anime ? (anime as { currentEpisode?: string }).currentEpisode : '') || '';
                            const totalEp = anime.episode_all || 
                                ('episodeAll' in anime ? (anime as { episodeAll?: string }).episodeAll : '') || '';
                            const status = anime.status?.toUpperCase() || '';
                            const anons = 'anons' in anime ? anime.anons : '';
                            
                            // Для скоро выходящих аниме - показываем дату или "СКОРО"
                            if (status === 'UPCOMING' || status === 'NOT_YET_AIRED' || status === 'SOON' || status === 'АНОНС' || status === 'СКОРО') {
                                if (anons && anons.trim()) {
                                    return anons.toUpperCase();
                                }
                                return 'СКОРО';
                            }
                            
                            // Для завершенных аниме - показываем только общее количество эпизодов
                            // Также считаем завершенным если current_episode равен episode_all
                            const isCompleted = status === 'COMPLETED' || status === 'FINISHED' || status === 'ЗАВЕРШЕН' || status === 'ВЫШЕЛ' ||
                                               (currentEp && totalEp && currentEp === totalEp);
                            
                            if (isCompleted) {
                                if (totalEp) {
                                    return `${totalEp} эп.`;
                                }
                                return 'Просмотрено';
                            }
                            
                            // Для онгоинга - показываем current/total
                            if (status === 'ONGOING' || status === 'AIRING' || status === 'ОНГОИНГ' || status === 'ВЫХОДИТ') {
                                if (currentEp && totalEp) {
                                    return `${currentEp}/${totalEp} эп.`;
                                }
                                if (totalEp) {
                                    return `${totalEp} эп.`;
                                }
                                if (currentEp) {
                                    return `${currentEp} / ? эп.`;
                                }
                                return '1 / ? эп.';
                            }
                            
                            // Fallback для других статусов
                            if (currentEp && totalEp) {
                                return `${currentEp}/${totalEp} эп.`;
                            }
                            if (totalEp) {
                                return `${totalEp} эп.`;
                            }
                            return 'Неизвестно';
                        })()}
                    </div>
                    
                    {/* Для скоро выходящих аниме не показываем сезон/год, так как это место занято датой */}
                    {(() => {
                        const status = anime.status?.toUpperCase() || '';
                        const isUpcoming = status === 'UPCOMING' || status === 'NOT_YET_AIRED' || status === 'SOON' || status === 'АНОНС' || status === 'СКОРО';
                        
                        return !isUpcoming && (anime.year || anime.season) && (
                            <div className="global-anime-card-season">
                                {anime.season && anime.year 
                                    ? `${anime.season} ${anime.year}`
                                    : anime.year || anime.season || ''
                                }
                            </div>
                        );
                    })()}
                </div>
            </div>
            </Link>

            {/* Mobile версия */}
            <Link
                href={`/anime-page/${anime.id}`}
                prefetch={true}
                className={`global-anime-card-mobile mobile-only ${className}`}
            >
                <div className="mobile-card-image-container">
                    {isLoading && (
                        <div className="mobile-card-loading">
                            <div className="mobile-card-spinner"></div>
                        </div>
                    )}

                    {imageError ? (
                        <div className="mobile-card-placeholder">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2" fill="none"/>
                                <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
                                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" stroke="currentColor" strokeWidth="2" fill="none"/>
                            </svg>
                        </div>
                    ) : (
                    <Image
                        src={imageError ? '/anime-placeholder.svg' : (coverUrl || '/anime-placeholder.svg')}
                        alt={anime.title || 'Аниме обложка'}
                        width={120}
                        height={160}
                        className="mobile-card-image"
                        onLoad={handleImageLoad}
                        onError={handleImageError}
                        style={{
                            objectFit: 'cover',
                            objectPosition: 'center',
                            display: isLoading ? 'none' : 'block'
                        }}
                        priority={priority}
                        loading={priority ? 'eager' : 'lazy'}
                        sizes="120px"
                    />
                    )}

                    {/* Статус коллекции на обложке */}
                    {showCollectionStatus && (userCollectionType || propsCollectionType) && !isLoadingCollection && (
                        <div className={`mobile-card-status ${getCollectionStatusClass(userCollectionType || propsCollectionType || '')}`}>
                            {getCollectionStatusText(userCollectionType || propsCollectionType || '')}
                        </div>
                    )}
                </div>

                <div className="mobile-card-info">
                    <h3 className="mobile-card-title">
                        {anime.title || 'Без названия'}
                    </h3>
                    
                    <div className="mobile-card-bottom">
                        {(() => {
                            const status = anime.status?.toUpperCase() || '';
                            const isUpcoming = status === 'UPCOMING' || status === 'NOT_YET_AIRED' || status === 'SOON' || status === 'АНОНС' || status === 'СКОРО';
                            
                            // Для скоро выходящих аниме не показываем эпизоды
                            if (isUpcoming) {
                                return null;
                            }
                            
                            // Для остальных показываем эпизоды
                            const currentEp = anime.current_episode || 
                                ('currentEpisode' in anime ? (anime as { currentEpisode?: string }).currentEpisode : '') || '';
                            const totalEp = anime.episode_all || 
                                ('episodeAll' in anime ? (anime as { episodeAll?: string }).episodeAll : '') || '';
                            
                            // Для завершенных аниме - показываем только общее количество эпизодов
                            const isCompleted = status === 'COMPLETED' || status === 'FINISHED' || status === 'ЗАВЕРШЕН' || status === 'ВЫШЕЛ' ||
                                               (currentEp && totalEp && currentEp === totalEp);
                            
                            let episodeText = '';
                            if (isCompleted) {
                                if (totalEp) {
                                    episodeText = `${totalEp} эп.`;
                                } else {
                                    episodeText = 'Просмотрено';
                                }
                            } else if (status === 'ONGOING' || status === 'AIRING' || status === 'ОНГОИНГ' || status === 'ВЫХОДИТ') {
                                if (currentEp && totalEp) {
                                    episodeText = `${currentEp}/${totalEp} эп.`;
                                } else if (totalEp) {
                                    episodeText = `${totalEp} эп.`;
                                } else if (currentEp) {
                                    episodeText = `${currentEp} / ? эп.`;
                                } else {
                                    episodeText = '1 / ? эп.';
                                }
                            } else {
                                // Fallback для других статусов
                                if (currentEp && totalEp) {
                                    episodeText = `${currentEp}/${totalEp} эп.`;
                                } else if (totalEp) {
                                    episodeText = `${totalEp} эп.`;
                                } else {
                                    episodeText = 'Неизвестно';
                                }
                            }
                            
                            return (
                                <div className="mobile-card-episodes">
                                    {episodeText}
                                </div>
                            );
                        })()}

                        {(() => {
                            const status = anime.status?.toUpperCase() || '';
                            const anons = 'anons' in anime ? anime.anons : '';
                            const isUpcoming = status === 'UPCOMING' || status === 'NOT_YET_AIRED' || status === 'SOON' || status === 'АНОНС' || status === 'СКОРО';

                            // Показываем анонс только для скоро выходящих аниме
                            if (isUpcoming) {
                                return (
                                    <div className="mobile-card-anons">
                                        {anons && anons.trim() ? anons.toUpperCase() : 'СКОРО'}
                                    </div>
                                );
                            }

                            // Для всех остальных статусов показываем рейтинг
                            return showRating && animeRating && animeRating > 0 ? (
                                <div className="mobile-card-rating">
                                    ⭐ {animeRating.toFixed(1)}
                                </div>
                            ) : null;
                        })()}
                    </div>
                </div>
            </Link>
        </>
    );
};

export default GlobalAnimeCard;
