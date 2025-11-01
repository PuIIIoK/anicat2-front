'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { API_SERVER } from '../../tools/constants';
import { getAuthToken, getCurrentUser, hasToken } from '../utils/auth';
import { useNotifications } from '../component/notifications/NotificationManager';

// Расширяем интерфейс Window для notificationManager
declare global {
    interface Window {
        notificationManager?: {
            show: (message: string, type?: string) => void;
        };
    }
}

interface AnimeData {
    id: number;
    title: string;
    alttitle?: string;
    description?: string;
    type: string;
    episodeAll?: string;
    currentEpisode?: string;
    status: string;
    rating?: string;
    officialRating?: number;
    studio?: string;
    genres?: string;
    year?: string;
    season?: string;
    mouthSeason?: string;
    realesedFor?: string;
    coverUrl: string;
    bannerUrl?: string;
    screenshotsCount: number;
    opened: boolean;
    age_limit?: number;
    anons?: string;
    zametka?: string;
    kodik?: string;
    alias?: string;
    blockedCountries?: string;
    note?: string;
    blocked_note?: string;
}

interface Comment {
    id: number;
    username: string; // Отображаемое имя (nickname или userUsername)
    realUsername?: string; // Реальный username для проверки владельца
    nickname?: string;
    text: string;
    timestamp: string;
    likes: number;
    dislikes?: number;
    isLiked: boolean;
    isDisliked?: boolean;
    replies?: Comment[];
    role?: string;
    verified?: boolean;
    avatarUrl?: string;
    isPending?: boolean; // Флаг для оптимистичных обновлений
}

interface Review {
    id: number;
    username: string;
    realUsername?: string; // Реальный логин для ссылки
    nickname?: string;
    rating: number;
    title: string;
    content: string;
    timestamp: string;
    helpful: number;
    unhelpful: number;
    isHelpful?: boolean;
    role?: string;
    verified?: boolean;
    avatarUrl?: string;
    userId?: number;
    isOwn?: boolean;
}

export const useAnimePageLogic = (animeId: string) => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { showCollectionNotification } = useNotifications();

    // Основные данные состояния
    const [anime, setAnime] = useState<AnimeData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Состояние для дизайна

    // UI состояния
    const [activeTab, setActiveTab] = useState<'screenshots' | 'details' | 'reviews' | 'comments'>(() => {
        const tabFromUrl = searchParams.get('tab') as 'screenshots' | 'details' | 'reviews' | 'comments' | null;
        return tabFromUrl && ['screenshots', 'details', 'reviews', 'comments'].includes(tabFromUrl) 
            ? tabFromUrl 
            : 'screenshots';
    });
    const [showStatusDropdown, setShowStatusDropdown] = useState(false);
    const [showCommentsModal, setShowCommentsModal] = useState(false);
    const [showAuthPrompt, setShowAuthPrompt] = useState(false);
    const [showSourceModal, setShowSourceModal] = useState(false);

    // Коллекции и избранное
    const [favorites, setFavorites] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState('none');
    const [isSavingStatus, setIsSavingStatus] = useState(false);

    // Рейтинг
    const [averageRating, setAverageRating] = useState<number | null>(null);
    const [officialRating, setOfficialRating] = useState<number | null>(null);

    // Доступность и блокировки
    const [isAccessible, setIsAccessible] = useState<boolean>(true);
    const [zametka_blocked, setZametka_blocked] = useState<string>('');

    // Комментарии и отзывы
    const [comments, setComments] = useState<Comment[]>([]);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [commentsLoading, setCommentsLoading] = useState(false);
    const [reviewsLoading, setReviewsLoading] = useState(false);
    const [liveUpdatesEnabled, setLiveUpdatesEnabled] = useState(true);
    const [lastUpdateTimestamp] = useState<Date>(new Date());
    const [totalReviews, setTotalReviews] = useState(0);
    const [userReview, setUserReview] = useState<Review | null>(null);
    const [isEditingReview, setIsEditingReview] = useState(false);
    const [visibleReviewsCount, setVisibleReviewsCount] = useState(5);
    const [showAllReviews, setShowAllReviews] = useState(false);
    const [visibleCommentsCount, setVisibleCommentsCount] = useState(5);
    const [showAllComments, setShowAllComments] = useState(false);
    const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set());
    const [replyingTo, setReplyingTo] = useState<number | null>(null);
    const [replyText, setReplyText] = useState<string>('');
    
    // Состояния для редактирования
    const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
    const [editingReplyId, setEditingReplyId] = useState<number | null>(null);
    const [editText, setEditText] = useState<string>('');
    const [currentUserProfile, setCurrentUserProfile] = useState<{username: string, nickname?: string, role?: string, verified?: boolean, avatarUrl?: string} | null>(null);
    
    // Состояния для защиты от спама кликов
    const [likingComments, setLikingComments] = useState<Set<number>>(new Set());
    const [likingReplies, setLikingReplies] = useState<Set<number>>(new Set());
    
    // Состояния для модалки удаления
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<{type: 'comment' | 'reply', id: number, text: string} | null>(null);

    // Скриншоты
    const [screenshotUrls, setScreenshotUrls] = useState<{id: number, url: string, name: string}[]>([]);
    const [screenshotsLoaded, setScreenshotsLoaded] = useState(false);
    const [screenshotsLoading, setScreenshotsLoading] = useState(false);

    // Пользователь
    const [usernameFromToken, setUsernameFromToken] = useState<string | null>(null);

    // Проверка доступности аниме
    useEffect(() => {
        if (!animeId) return;

        const checkAvailability = async () => {
            try {
                console.log('🔍 Проверяем доступность аниме:', animeId);
                const response = await fetch(`${API_SERVER}/api/admin/avaibility/check-avaibility/${animeId}`);
                const data = await response.json();
                
                console.log('📋 Данные доступности:', data);
                
                // Устанавливаем доступность
                setIsAccessible(data.accessible !== false);
                
                // Устанавливаем заметку блокировки
                if (data.zametka_blocked && data.zametka_blocked.trim() !== '') {
                    setZametka_blocked(data.zametka_blocked);
                } else {
                    setZametka_blocked('');
                }
                
                console.log('✅ Установлена доступность:', data.accessible !== false, 'заметка:', data.zametka_blocked);
                
            } catch (error) {
                console.error('❌ Ошибка проверки доступности:', error);
                setIsAccessible(true); // По умолчанию доступно при ошибке
                setZametka_blocked('');
            }
        };

        checkAvailability();
    }, [animeId]);

    // Проверка токена - импортирована из auth utils

    // Загрузка выбранного дизайна из localStorage

    // Загрузка данных аниме
    useEffect(() => {
        const loadAnimeData = async () => {
            if (!animeId) return;

            setIsLoading(true);
            setError(null);

            try {
                const response = await fetch(`${API_SERVER}/api/anime/optimized/get-anime-page/${animeId}`);
                
                if (!response.ok) {
                    if (response.status === 404) {
                        throw new Error('Аниме не найдено');
                    } else if (response.status === 500) {
                        throw new Error('Ошибка сервера. Попробуйте позже');
                    } else {
                        throw new Error(`Ошибка ${response.status}: ${response.statusText}`);
                    }
                }

                const data = await response.json();
                setAnime(data);

                // Установка официального рейтинга из основных данных
                if (data.officialRating) {
                    setOfficialRating(data.officialRating);
                } else if (data.rating && !isNaN(parseFloat(data.rating))) {
                    setOfficialRating(parseFloat(data.rating));
                }

                // Получение пользовательского рейтинга
                if (data.status !== 'Скоро') {
                    try {
                        const ratingResponse = await fetch(`${API_SERVER}/api/anime/ratings/${animeId}/rating`);
                        if (ratingResponse.ok) {
                            const ratingData = await ratingResponse.json();
                            setAverageRating(ratingData.average);
                        }
                    } catch (err) {
                        console.error('Ошибка загрузки пользовательского рейтинга:', err);
                    }
                }

                // Загрузка статуса коллекции если пользователь авторизован
                if (hasToken()) {
                    try {
                        const token = getAuthToken();
                        // Проверяем статус коллекции через оптимизированный endpoint
                        const collectionsResponse = await fetch(`${API_SERVER}/api/anime/optimized/get-anime/${animeId}/collection-status`, {
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json',
                            },
                        });

                        if (collectionsResponse.ok) {
                            const collectionsData = await collectionsResponse.json();
                            if (collectionsData.hasStatus === 'true') {
                                setSelectedStatus(collectionsData.status.toLowerCase());
                            }
                        }

                        // Проверяем избранное отдельно
                        const favoritesResponse = await fetch(`${API_SERVER}/api/collection/favorites`, {
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json',
                            },
                        });

                        if (favoritesResponse.ok) {
                            const favoritesData = await favoritesResponse.json();
                            const isFavorite = favoritesData.some((item: Record<string, unknown>) => (item.anime as Record<string, unknown>)?.id === parseInt(animeId || '0'));
                            setFavorites(isFavorite);
                        }

                        // Получение имени пользователя
                        const userResponse = await fetch(`${API_SERVER}/api/user/profile`, {
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json',
                            },
                        });

                        if (userResponse.ok) {
                            const userData = await userResponse.json();
                            setUsernameFromToken(userData.username);
                        }
                    } catch (err) {
                        console.error('Ошибка загрузки коллекций:', err);
                    }
                }
            } catch (error) {
                console.error('Ошибка при загрузке данных аниме:', error);
                if (error instanceof Error) {
                    setError(error.message);
                } else {
                    setError('Внутренняя ошибка сервера!\nПожалуйста, попробуйте позже');
                }
            } finally {
                setIsLoading(false);
            }
        };

        loadAnimeData();
    }, [animeId]);

    // Загрузка скриншотов (ленивая)
    const loadScreenshots = useCallback(async () => {
        console.log('🚀 loadScreenshots вызван с условиями:', {
            screenshotsLoaded,
            screenshotsLoading,
            screenshotsCount: anime?.screenshotsCount,
            animeId,
            animeTitle: anime?.title
        });

        if (screenshotsLoaded || screenshotsLoading || !anime?.screenshotsCount) {
            console.log('⏹️ Прерываем загрузку скриншотов:', {
                screenshotsLoaded: screenshotsLoaded ? 'уже загружены' : 'не загружены',
                screenshotsLoading: screenshotsLoading ? 'в процессе' : 'не загружаются',
                screenshotsCount: anime?.screenshotsCount || 'отсутствует'
            });
            return;
        }

        console.log('📡 Начинаем загрузку скриншотов для аниме ID:', animeId);
        setScreenshotsLoading(true);
        
        try {
            const apiUrl = `${API_SERVER}/api/anime/optimized/get-anime/${animeId}/screenshots-urls`;
            console.log('📡 Отправляем запрос на:', apiUrl);
            
            const res = await fetch(apiUrl);
            console.log('📡 Ответ сервера:', res.status, res.statusText);
            
            if (res.ok) {
                const data = await res.json();
                console.log('📸 === ПОЛНЫЙ ОТВЕТ API СКРИНШОТОВ ===');
                console.log('📸 Данные:', data);
                console.log('📸 Тип данных:', typeof data);
                console.log('📸 Является массивом:', Array.isArray(data));
                console.log('📸 Длина массива:', data?.length);
                
                // Проверяем разные варианты структуры ответа
                let screenshots = [];
                if (Array.isArray(data)) {
                    screenshots = data;
                    console.log('📸 Использована структура: прямой массив');
                } else if (data.screenshots && Array.isArray(data.screenshots)) {
                    screenshots = data.screenshots;
                    console.log('📸 Использована структура: data.screenshots');
                } else if (data.data && Array.isArray(data.data)) {
                    screenshots = data.data;
                    console.log('📸 Использована структура: data.data');
                } else {
                    console.error('❌ Неизвестная структура данных скриншотов:', data);
                }
                
                console.log('📸 === ОБРАБОТАННЫЕ СКРИНШОТЫ ===');
                console.log('📸 Количество скриншотов:', screenshots.length);
                console.log('📸 Данные скриншотов:', screenshots);
                
                // Проверяем каждый URL скриншота
                screenshots.forEach((screenshot: {id: number, url: string, name: string}, index: number) => {
                    console.log(`📸 Скриншот ${index + 1}:`, {
                        id: screenshot.id,
                        url: screenshot.url,
                        name: screenshot.name,
                        urlValid: screenshot.url && screenshot.url.startsWith('http'),
                        urlLength: screenshot.url?.length || 0
                    });
                });
                
                setScreenshotUrls(screenshots);
                setScreenshotsLoaded(true);
                console.log('✅ Скриншоты успешно установлены в состояние');
            } else {
                console.warn('⚠️ Ошибка ответа сервера:', res.status, res.statusText);
                const errorText = await res.text();
                console.warn('⚠️ Текст ошибки:', errorText);
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки скриншотов:', error);
        } finally {
            setScreenshotsLoading(false);
            console.log('🏁 Загрузка скриншотов завершена');
        }
    }, [animeId, anime?.screenshotsCount, anime?.title, screenshotsLoaded, screenshotsLoading]);

    // Загрузка скриншотов при переключении на соответствующую вкладку
    useEffect(() => {
        console.log('🔄 Переключение вкладки:', activeTab);
        console.log('🔄 Состояние скриншотов:', {
            screenshotsCount: anime?.screenshotsCount,
            screenshotsLoaded,
            screenshotsLoading,
            screenshotUrls: screenshotUrls.length,
            animeData: anime ? 'есть' : 'нет'
        });
        
        if (activeTab === 'screenshots' && anime) {
            console.log('🎯 Начинаем загрузку скриншотов для аниме:', anime.title);
            loadScreenshots();
        } else if (activeTab === 'reviews' && anime) {
            console.log('🎯 Начинаем загрузку отзывов для аниме:', anime.title);
            loadReviews();
        } else if (activeTab === 'comments' && anime) {
            console.log('🎯 Начинаем загрузку комментариев для аниме:', anime.title);
            loadComments();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, loadScreenshots, anime, screenshotUrls.length, screenshotsLoaded, screenshotsLoading]);

    // Загрузка профиля текущего пользователя для проверки владельца комментариев
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            const loadUserProfile = async () => {
                try {
                    const response = await fetch(`${API_SERVER}/api/auth/get-profile`, {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    if (response.ok) {
                        const profileData = await response.json();
                        
                        // Загружаем аватарку
                        let avatarUrl = '';
                        if (profileData.username) {
                            try {
                                const avatarResponse = await fetch(`${API_SERVER}/api/profiles/avatar?username=${profileData.username}`);
                                if (avatarResponse.ok) {
                                    const avatarData = await avatarResponse.json();
                                    avatarUrl = avatarData.url || '';
                                }
                            } catch (error) {
                                console.log('Не удалось загрузить аватарку:', error);
                            }
                        }

                        setCurrentUserProfile({
                            username: profileData.username,
                            nickname: profileData.nickname,
                            role: Array.isArray(profileData.roles) ? profileData.roles.join(', ') : (profileData.roles || ''),
                            verified: profileData.verified || false,
                            avatarUrl: avatarUrl
                        });
                        
                        console.log('✅ Профиль пользователя загружен из localStorage:', {
                            username: profileData.username,
                            nickname: profileData.nickname,
                            role: Array.isArray(profileData.roles) ? profileData.roles.join(', ') : (profileData.roles || ''),
                            verified: profileData.verified || false,
                            avatarUrl: avatarUrl,
                            token: token ? 'есть' : 'нет'
                        });
                    } else {
                        console.log('❌ Ошибка загрузки профиля:', response.status);
                    }
                } catch (error) {
                    console.error('❌ Ошибка загрузки профиля пользователя:', error);
                }
            };
            loadUserProfile();
        } else {
            console.log('❌ Токен не найден в localStorage');
        }
    }, []); // Убрал зависимость от hasToken

    // Переключение избранного
    const toggleFavorite = async () => {
        if (!hasToken()) {
            setShowAuthPrompt(true);
            return;
        }

        const newFavorite = !favorites;
        setFavorites(newFavorite);

        try {
            const token = getAuthToken();
            const res = await fetch(`${API_SERVER}/api/collection/${newFavorite ? 'set' : 'remove'}?animeId=${animeId}${newFavorite ? '&type=FAVORITE' : ''}`, {
                method: newFavorite ? 'POST' : 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!res.ok) throw new Error('Ошибка при изменении избранного');
            
            if (newFavorite) {
                showCollectionNotification(`"${anime?.title}" добавлено в избранное`);
            } else {
                showCollectionNotification(`"${anime?.title}" удалено из избранного`);
            }
        } catch (error) {
            console.error('Ошибка избранного:', error);
            showCollectionNotification('Ошибка при изменении избранного', 'error');
            setFavorites(!newFavorite);
        }
    };

    // Обработка выбора статуса
    const handleStatusSelect = async (value: string) => {
        if (!hasToken()) {
            setShowAuthPrompt(true);
            return;
        }

        setShowStatusDropdown(false);
        setIsSavingStatus(true);

        try {
            const token = getAuthToken();
            let endpoint, method;
            if (value === 'none') {
                // Удаляем из коллекции
                endpoint = `${API_SERVER}/api/collection/remove?animeId=${animeId}`;
                method = 'DELETE';
            } else {
                // Устанавливаем статус коллекции
                endpoint = `${API_SERVER}/api/collection/set?animeId=${animeId}&type=${value.toUpperCase()}`;
                method = 'POST';
            }

            const res = await fetch(endpoint, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!res.ok) throw new Error('Ошибка при изменении статуса');

            setSelectedStatus(value);
            // Убираем автоматическое изменение избранного - оно должно быть независимым

            const statusLabels: Record<string, string> = {
                none: 'убрано из коллекций',
                planned: 'добавлено в "Запланировано"',
                watching: 'добавлено в "Смотрю"',
                completed: 'добавлено в "Просмотрено"',
                paused: 'добавлено в "Отложено"',
                dropped: 'добавлено в "Брошено"',
                favorites: 'добавлено в "Избранное"'
            };

            showCollectionNotification(`"${anime?.title}" ${statusLabels[value]}`);
        } catch (error) {
            console.error('Ошибка изменения статуса:', error);
            showCollectionNotification('Ошибка при изменении статуса', 'error');
        } finally {
            setIsSavingStatus(false);
        }
    };


    // Переход к просмотру
    const handleWatchClick = () => {
        if (!anime?.opened) return;
        
        // Открываем модальное окно выбора источника
        setShowSourceModal(true);
    };

    // Обработчик выбора источника из модального окна
    const handleSourceSelect = (url: string) => {
        console.log('[handleSourceSelect] Navigating to:', url);
        router.push(url);
    };


    // Функция для обновления URL с табом
    const updateUrlWithTab = (tab: 'screenshots' | 'details' | 'reviews' | 'comments') => {
        const currentUrl = new URL(window.location.href);
        if (tab === 'screenshots') {
            // Убираем параметр tab если это вкладка по умолчанию
            currentUrl.searchParams.delete('tab');
        } else {
            currentUrl.searchParams.set('tab', tab);
        }
        
        // Обновляем URL без перезагрузки страницы
        window.history.replaceState({}, '', currentUrl.toString());
    };

    // Функция для скроллинга к табам
    const scrollToTabs = () => {
        const tabsContainer = document.querySelector('.anime-page-container-tabs');
        if (tabsContainer) {
            tabsContainer.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
        }
    };

    // Обработчики для UI
    const handleTabChange = (tab: 'screenshots' | 'details' | 'reviews' | 'comments') => {
        setActiveTab(tab);
        updateUrlWithTab(tab);
    };

    const handleCommentsClick = () => {
        setShowCommentsModal(true);
    };

    // Новая функция для перехода к комментариям с скроллингом
    const handleGoToComments = () => {
        setActiveTab('comments');
        updateUrlWithTab('comments');
        // Небольшая задержка для обновления UI перед скроллингом
        setTimeout(() => {
            scrollToTabs();
        }, 100);
    };

    const handleToggleStatusDropdown = () => {
        setShowStatusDropdown(prev => !prev);
    };

    // Загрузка комментариев
    const loadComments = useCallback(async () => {
        if (commentsLoading) return;
        
        setCommentsLoading(true);
        try {
                            // Добавляем заголовок авторизации если пользователь авторизован
                            const headers: Record<string, string> = {};
                            if (hasToken()) {
                                headers['Authorization'] = `Bearer ${getAuthToken()}`;
                            }
                            
                            const response = await fetch(`${API_SERVER}/api/comments/all/${animeId}`, {
                                headers
                            });
            if (response.ok) {
                const data = await response.json();
                console.log('📝 Загруженные комментарии:', data);
                
                // Правильно маппим данные с сервера
                const processedComments = (data || []).map((comment: Record<string, unknown>, index: number) => {
                    console.log(`🔍 Комментарий #${index}:`, {
                        id: comment.id,
                        userUsername: comment.userUsername,
                        nickname: comment.nickname,
                        roles: comment.roles,
                        verified: comment.verified,
                        avatarUrl: comment.avatarUrl,
                        isLiked: comment.isLiked,
                        isDisliked: comment.isDisliked,
                        likes: comment.likes,
                        dislikes: comment.dislikes,
                        text: String(comment.text || '').substring(0, 50) + '...'
                    });

                    return {
                        id: comment.id || `comment-${index}-${Date.now()}`,
                        username: comment.userUsername || 'Аноним', // Всегда используем userUsername для отображения
                        realUsername: comment.userUsername || 'Аноним', // Реальный username для проверки владельца
                        nickname: comment.nickname || null,
                        text: comment.text || '',
                        timestamp: comment.createdAt || new Date().toISOString(),
                        likes: comment.likes || 0,
                        dislikes: comment.dislikes || 0,
                        isLiked: Boolean(comment.isLiked),
                        isDisliked: Boolean(comment.isDisliked),
                        role: comment.roles || '',
                        verified: comment.verified || false,
                        avatarUrl: comment.avatarUrl || '',
                        replies: ((comment.replies as Record<string, unknown>[]) || []).map((reply: Record<string, unknown>, replyIndex: number) => {
                            console.log(`  🔍 Ответ #${replyIndex}:`, {
                                replyId: reply.replyId,
                                username: reply.username,
                                nickname: reply.nickname,
                                roles: reply.roles,
                                verified: reply.verified,
                                isLiked: reply.isLiked,
                                isDisliked: reply.isDisliked,
                                likes: reply.likes,
                                dislikes: reply.dislikes,
                                avatarUrl: reply.avatarUrl
                            });

                            return {
                                id: reply.replyId || `reply-${index}-${replyIndex}-${Date.now()}`,
                                username: reply.username || 'Аноним', // Всегда используем username для отображения
                                realUsername: reply.username || 'Аноним', // Реальный username для проверки владельца
                                nickname: reply.nickname || null,
                                text: reply.text || '',
                                timestamp: reply.createdAt || new Date().toISOString(),
                                likes: reply.likes || 0,
                                dislikes: reply.dislikes || 0,
                                isLiked: Boolean(reply.isLiked),
                                isDisliked: Boolean(reply.isDisliked),
                                role: Array.isArray(reply.roles) ? reply.roles.join(', ') : (reply.roles || ''),
                                verified: reply.verified || false,
                                avatarUrl: reply.avatarUrl || '',
                            };
                        })
                    };
                });
                
                console.log('✅ Обработанные комментарии:', processedComments);
                
                // Сортируем комментарии по дате (новые сверху)
                const sortedComments = processedComments.sort((a: Comment, b: Comment) => 
                    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                );
                
                setComments(sortedComments);
            }
        } catch (error) {
            console.error('Ошибка загрузки комментариев:', error);
        } finally {
            setCommentsLoading(false);
        }
    }, [animeId, commentsLoading]);

    // Удалили неиспользуемую функцию loadUserAvatar

    // Загрузка отзывов (используем рейтинги с комментариями)
    const loadReviews = useCallback(async () => {
        if (reviewsLoading) return;
        
        setReviewsLoading(true);
        try {
            const response = await fetch(`${API_SERVER}/api/anime/ratings/${animeId}/all`);
            if (response.ok) {
                const data = await response.json();
                console.log('🔍 Данные отзывов:', data);
                
                // Преобразуем рейтинги в формат отзывов с правильным маппингом из API
                const reviewsData = await Promise.all(
                    (data.userRatings || []).map(async (rating: Record<string, unknown>, index: number) => {
                        console.log(`🔍 Рейтинг #${index}:`, {
                            userId: rating.userId,
                            username: rating.username,
                            nickname: rating.nickname,
                            roles: rating.roles,
                            verified: rating.verified,
                            avatarId: rating.avatarId,
                            score: rating.score,
                            comment: String(rating.comment || '').substring(0, 50) + '...'
                        });

                        // Получение реального URL аватарки
                        let avatarUrl = '';
                        if (rating.username) {
                            try {
                                const avatarResponse = await fetch(`${API_SERVER}/api/profiles/avatar?username=${rating.username}`);
                                if (avatarResponse.ok) {
                                    const avatarData = await avatarResponse.json();
                                    avatarUrl = avatarData.url || '';
                                    console.log('✅ Получен URL аватарки для отзыва:', avatarUrl);
                                } else {
                                    console.log('❌ Не удалось получить URL аватарки для отзыва, статус:', avatarResponse.status);
                                }
                            } catch (error) {
                                console.error('❌ Ошибка получения аватарки для отзыва:', error);
                            }
                        }

                        // Преобразование массива ролей в строку
                        let roleString = '';
                        if (rating.roles && Array.isArray(rating.roles) && rating.roles.length > 0) {
                            roleString = rating.roles.join(', ');
                        }

                        return {
                            id: rating.userId || `review-${index}-${Date.now()}`,
                            username: rating.nickname || rating.username || 'Аноним', // Для отображения
                            realUsername: rating.username || '', // Реальный логин для ссылки
                            nickname: rating.nickname || '', // Никнейм
                            rating: rating.score || 0,
                            title: '', // У рейтингов нет заголовка
                            content: rating.comment || '',
                            timestamp: new Date().toISOString(), // Нет timestamp в API
                            helpful: 0,
                            unhelpful: 0,
                            isHelpful: false,
                            role: roleString, // Преобразуем массив ролей в строку
                            verified: rating.verified || false,
                            avatarUrl: avatarUrl,
                            userId: rating.userId
                        };
                    })
                );
                
                // Показываем ВСЕ отзывы, включая те что без комментариев (только рейтинг)
                const filteredReviewsData = reviewsData;
                
                console.log('✅ Обработанные отзывы с API:', filteredReviewsData);
                
                // Найдем отзыв текущего пользователя
                const currentUser = getCurrentUser();
                let currentUserReview = null;
                
                if (data.myRating && data.myComment) {
                    // Создаем отзыв из myRating/myComment если его нет в списке
                    const existingUserReview = filteredReviewsData.find((review: Record<string, unknown>) => 
                        currentUser && (review.userId === currentUser.id || review.username === currentUser.username)
                    );
                    
                    if (!existingUserReview) {
                        currentUserReview = {
                            id: 0,
                            username: currentUser?.username || 'Вы',
                            rating: data.myRating,
                            title: '',
                            content: data.myComment,
                            timestamp: new Date().toISOString(),
                            helpful: 0,
                            unhelpful: 0,
                            isHelpful: false,
                            userId: currentUser?.id,
                            isOwn: true,
                            role: '',
                            verified: false,
                            avatarUrl: ''
                        };
                        // Добавляем собственный отзыв в начало списка
                        filteredReviewsData.unshift(currentUserReview);
                    }
                }
                
                // Помечаем собственный отзыв в списке
                if (currentUser) {
                    filteredReviewsData.forEach((review: Record<string, unknown>) => {
                        if (review.userId === currentUser.id || review.username === currentUser.username) {
                            review.isOwn = true;
                            currentUserReview = review;
                        }
                    });
                }
                
                console.log('👤 Отзыв текущего пользователя:', currentUserReview);
                setUserReview(currentUserReview);
                
                console.log('📝 Все отзывы (включая собственный):', filteredReviewsData);
                
                // Сортируем отзывы по дате - новые сверху
                const sortedReviews = filteredReviewsData.sort((a, b) => {
                    const dateA = new Date(a.timestamp || 0);
                    const dateB = new Date(b.timestamp || 0);
                    return dateB.getTime() - dateA.getTime();
                });
                
                setReviews(sortedReviews);
                setTotalReviews(sortedReviews.length);
            }
        } catch (error) {
            console.error('Ошибка загрузки отзывов:', error);
        } finally {
            setReviewsLoading(false);
        }
    }, [animeId, reviewsLoading]);


    // Обработчики для комментариев
    const handleSubmitComment = async (text: string) => {
        if (!hasToken()) {
            setShowAuthPrompt(true);
            return;
        }

        const currentUser = getCurrentUser();
        const tempId = Date.now(); // Временный ID для оптимистичного обновления
        
        // Создаем оптимистичный комментарий с данными из профиля
        const optimisticComment: Comment = {
            id: tempId,
            username: currentUserProfile?.nickname || currentUser?.username || 'Вы',
            realUsername: currentUser?.username || 'user',
            nickname: currentUserProfile?.nickname || undefined,
            text: text,
            timestamp: new Date().toISOString(),
            likes: 0,
            dislikes: 0,
            isLiked: false,
            isDisliked: false,
            role: currentUserProfile?.role || '',
            verified: currentUserProfile?.verified || false,
            avatarUrl: currentUserProfile?.avatarUrl || '',
            replies: [],
            isPending: true // Флаг для отображения состояния загрузки
        };

        // Добавляем комментарий сверху списка оптимистично
        setComments(prevComments => [optimisticComment, ...prevComments]);

        try {
            const token = getAuthToken();
            const response = await fetch(`${API_SERVER}/api/comments`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    text, 
                    animeId: parseInt(animeId || '0'),
                    username: getCurrentUser()?.username || 'user'
                }),
            });

            if (response.ok) {
                const newComment = await response.json();
                console.log('✅ Комментарий отправлен успешно:', newComment);
                
                // Заменяем временный комментарий на реальный
                setComments(prevComments => 
                    prevComments.map(comment => 
                        comment.id === tempId 
                            ? {
                                ...optimisticComment,
                                id: newComment.id || newComment.commentId || tempId,
                                timestamp: newComment.createdAt || optimisticComment.timestamp,
                                isPending: false
                              }
                            : comment
                    )
                );
                
                return newComment;
            } else {
                throw new Error('Ошибка отправки комментария');
            }
        } catch (error) {
            console.error('Ошибка отправки комментария:', error);
            
            // Убираем неудачный комментарий из списка
            setComments(prevComments => 
                prevComments.filter(comment => comment.id !== tempId)
            );
            
            throw error;
        }
    };

    const handleLikeComment = async (commentId: number) => {
        if (!hasToken()) {
            setShowAuthPrompt(true);
            return;
        }

        // Проверяем, не обрабатывается ли уже запрос для этого комментария
        if (likingComments.has(commentId)) {
            console.log('⏳ Запрос уже обрабатывается для комментария:', commentId);
            return;
        }

        // Находим текущий комментарий
        const currentComment = comments.find(comment => comment.id === commentId);
        if (!currentComment) return;

        const wasLiked = currentComment.isLiked;
        const wasDisliked = currentComment.isDisliked;

        // Добавляем комментарий в список обрабатываемых
        setLikingComments(prev => new Set([...prev, commentId]));

        // Оптимистично обновляем UI согласно серверной логике
        setComments(prevComments => 
            prevComments.map(comment => 
                comment.id === commentId 
                    ? {
                        ...comment,
                        isLiked: !wasLiked, // Toggle лайк
                        isDisliked: !wasLiked && wasDisliked ? false : wasDisliked, // Если ставим лайк и есть дизлайк, убираем дизлайк
                        likes: wasLiked ? comment.likes - 1 : comment.likes + 1,
                        dislikes: !wasLiked && wasDisliked ? (comment.dislikes || 0) - 1 : (comment.dislikes || 0) // Убираем дизлайк если ставим лайк
                    }
                    : comment
            )
        );

        try {
            const token = getAuthToken();
            const response = await fetch(`${API_SERVER}/api/comments/${commentId}/like`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                const errorMessage = errorData?.message || 'Ошибка при обработке лайка';
                
            // Откатываем изменения при ошибке
            setComments(prevComments => 
                prevComments.map(comment => 
                    comment.id === commentId 
                        ? {
                            ...comment,
                            isLiked: wasLiked,
                            isDisliked: wasDisliked,
                            likes: wasLiked ? comment.likes + 1 : comment.likes - 1,
                            dislikes: !wasLiked && wasDisliked ? (comment.dislikes || 0) + 1 : (comment.dislikes || 0)
                          }
                        : comment
                )
            );

                // Показываем уведомление об ошибке
                if (typeof window !== 'undefined' && window.notificationManager) {
                    window.notificationManager.show(errorMessage, 'error');
                }
                
                throw new Error(errorMessage);
            }

            await response.json().catch(() => null);
            
            // Показываем успешное уведомление
            if (typeof window !== 'undefined' && window.notificationManager) {
                const message = wasLiked ? 'Лайк убран' : 'Лайк поставлен';
                window.notificationManager.show(message, 'success');
            }

        } catch (error) {
            console.error('Ошибка лайка комментария:', error);
        } finally {
            // Убираем комментарий из списка обрабатываемых
            setLikingComments(prev => {
                const newSet = new Set(prev);
                newSet.delete(commentId);
                return newSet;
            });
        }
    };

    const handleDislikeComment = async (commentId: number) => {
        if (!hasToken()) {
            setShowAuthPrompt(true);
            return;
        }

        // Проверяем, не обрабатывается ли уже запрос для этого комментария
        if (likingComments.has(commentId)) {
            console.log('⏳ Запрос уже обрабатывается для комментария:', commentId);
            return;
        }

        // Находим текущий комментарий
        const currentComment = comments.find(comment => comment.id === commentId);
        if (!currentComment) return;

        const wasLiked = currentComment.isLiked;
        const wasDisliked = currentComment.isDisliked;

        // Добавляем комментарий в список обрабатываемых
        setLikingComments(prev => new Set([...prev, commentId]));

        // Оптимистично обновляем UI согласно серверной логике
        setComments(prevComments => 
            prevComments.map(comment => 
                comment.id === commentId 
                    ? {
                        ...comment,
                        isDisliked: !wasDisliked, // Toggle дизлайк
                        isLiked: !wasDisliked && wasLiked ? false : wasLiked, // Если ставим дизлайк и есть лайк, убираем лайк
                        dislikes: wasDisliked ? (comment.dislikes || 1) - 1 : (comment.dislikes || 0) + 1,
                        likes: !wasDisliked && wasLiked ? comment.likes - 1 : comment.likes // Убираем лайк если ставим дизлайк
                    }
                    : comment
            )
        );

        try {
            const token = getAuthToken();
            const response = await fetch(`${API_SERVER}/api/comments/${commentId}/dislike`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                const errorMessage = errorData?.message || 'Ошибка при обработке дизлайка';
                
                // Откатываем изменения при ошибке
                setComments(prevComments => 
                    prevComments.map(comment => 
                        comment.id === commentId 
                            ? {
                                ...comment,
                                isDisliked: wasDisliked,
                                isLiked: wasLiked,
                                dislikes: wasDisliked ? (comment.dislikes || 0) + 1 : (comment.dislikes || 1) - 1,
                                likes: !wasDisliked && wasLiked ? comment.likes + 1 : comment.likes
                            }
                            : comment
                    )
                );

                // Показываем уведомление об ошибке
                if (typeof window !== 'undefined' && window.notificationManager) {
                    window.notificationManager.show(errorMessage, 'error');
                }
                
                throw new Error(errorMessage);
            }

            await response.json().catch(() => null);
            
            // Показываем успешное уведомление
            if (typeof window !== 'undefined' && window.notificationManager) {
                const message = wasDisliked ? 'Дизлайк убран' : 'Дизлайк поставлен';
                window.notificationManager.show(message, 'success');
            }

        } catch (error) {
            console.error('Ошибка дизлайка комментария:', error);
        } finally {
            // Убираем комментарий из списка обрабатываемых
            setLikingComments(prev => {
                const newSet = new Set(prev);
                newSet.delete(commentId);
                return newSet;
            });
        }
    };

    const handleToggleShowAllComments = () => {
        setShowAllComments(!showAllComments);
        if (!showAllComments) {
            setVisibleCommentsCount(comments.length);
        } else {
            setVisibleCommentsCount(5);
        }
    };

    const handleToggleShowAllReviews = () => {
        setShowAllReviews(!showAllReviews);
        if (!showAllReviews) {
            setVisibleReviewsCount(reviews.length);
        } else {
            setVisibleReviewsCount(5);
        }
    };

    const handleToggleReplies = (commentId: number) => {
        const newExpanded = new Set(expandedComments);
        if (expandedComments.has(commentId)) {
            newExpanded.delete(commentId);
            // Если закрываем, убираем форму ответа для этого комментария
            if (replyingTo === commentId) {
                setReplyingTo(null);
                setReplyText('');
            }
        } else {
            newExpanded.add(commentId);
        }
        setExpandedComments(newExpanded);
    };

    const handleStartReply = (commentId: number) => {
        setReplyingTo(commentId);
        setReplyText('');
    };

    const handleCancelReply = () => {
        setReplyingTo(null);
        setReplyText('');
    };

    const handleReplyTextChange = (text: string) => {
        setReplyText(text);
    };

    const handleSubmitReply = async (commentId: number) => {
        if (!replyText.trim()) return;
        
        const currentUser = getCurrentUser();
        const tempId = Date.now();
        
        // Создаем оптимистичный ответ с данными из профиля
        const optimisticReply = {
            id: tempId,
            username: currentUserProfile?.nickname || currentUser?.username || 'Вы',
            realUsername: currentUser?.username || 'user',
            nickname: currentUserProfile?.nickname || undefined,
            text: replyText.trim(),
            timestamp: new Date().toISOString(),
            likes: 0,
            dislikes: 0,
            isLiked: false,
            isDisliked: false,
            role: currentUserProfile?.role || '',
            verified: currentUserProfile?.verified || false,
            avatarUrl: currentUserProfile?.avatarUrl || '',
            isPending: true
        };

        // Добавляем ответ к соответствующему комментарию
        setComments(prevComments => 
            prevComments.map(comment => 
                comment.id === commentId 
                    ? {
                        ...comment,
                        replies: [...(comment.replies || []), optimisticReply]
                    }
                    : comment
            )
        );

        try {
            await handleReplyComment(commentId, replyText);
            console.log('✅ Ответ отправлен успешно');
            
            // Убираем флаг pending с ответа (реальный ID будет получен при следующей загрузке)
            setComments(prevComments => 
                prevComments.map(comment => 
                    comment.id === commentId 
                        ? {
                            ...comment,
                            replies: comment.replies?.map(reply =>
                                reply.id === tempId
                                    ? {
                                        ...reply,
                                        isPending: false
                                    }
                                    : reply
                            )
                        }
                        : comment
                )
            );

            setReplyText('');
            setReplyingTo(null);
        } catch (error) {
            console.error('Ошибка отправки ответа:', error);
            // Удаляем неудачный ответ из UI
            setComments(prevComments => 
                prevComments.map(comment => 
                    comment.id === commentId 
                        ? {
                            ...comment,
                            replies: comment.replies?.filter(reply => reply.id !== tempId)
                        }
                        : comment
                )
            );
        }
    };

    const handleLikeReply = async (replyId: number) => {
        if (!hasToken()) {
            setShowAuthPrompt(true);
            return;
        }

        // Проверяем, не обрабатывается ли уже запрос для этого ответа
        if (likingReplies.has(replyId)) {
            console.log('⏳ Запрос уже обрабатывается для ответа:', replyId);
            return;
        }

        // Находим текущий ответ
        let currentReply: Comment | null = null;
        for (const comment of comments) {
            const reply = comment.replies?.find(r => r.id === replyId);
            if (reply) {
                currentReply = reply;
                break;
            }
        }

        if (!currentReply) return;

        const wasLiked = currentReply.isLiked;
        const wasDisliked = currentReply.isDisliked;

        // Добавляем ответ в список обрабатываемых
        setLikingReplies(prev => new Set([...prev, replyId]));

        // Оптимистично обновляем UI
        setComments(prevComments => 
            prevComments.map(comment => ({
                ...comment,
                replies: comment.replies?.map(reply => 
                    reply.id === replyId 
                        ? { 
                            ...reply, 
                            isLiked: !wasLiked, // Toggle лайк
                            isDisliked: !wasLiked && wasDisliked ? false : wasDisliked, // Если ставим лайк и есть дизлайк, убираем дизлайк
                            likes: wasLiked ? reply.likes - 1 : reply.likes + 1,
                            dislikes: !wasLiked && wasDisliked ? (reply.dislikes || 0) - 1 : (reply.dislikes || 0) // Убираем дизлайк если ставим лайк
                        }
                        : reply
                )
            }))
        );

        try {
            const response = await fetch(`${API_SERVER}/api/comments/reply/${replyId}/like`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                const errorMessage = errorData?.message || 'Ошибка при обработке лайка ответа';
                
                // Откатываем изменения при ошибке
                setComments(prevComments => 
                    prevComments.map(comment => ({
                        ...comment,
                        replies: comment.replies?.map(reply => 
                            reply.id === replyId 
                                ? { 
                                    ...reply, 
                                    isLiked: wasLiked,
                                    isDisliked: wasDisliked,
                                    likes: wasLiked ? reply.likes + 1 : reply.likes - 1,
                                    dislikes: !wasLiked && wasDisliked ? (reply.dislikes || 0) + 1 : (reply.dislikes || 0)
                                }
                                : reply
                        )
                    }))
                );

                // Показываем уведомление об ошибке
                if (typeof window !== 'undefined' && window.notificationManager) {
                    window.notificationManager.show(errorMessage, 'error');
                }
                
                throw new Error(errorMessage);
            }

            await response.json().catch(() => null);
            
            // Показываем успешное уведомление
            if (typeof window !== 'undefined' && window.notificationManager) {
                const message = wasLiked ? 'Лайк убран' : 'Лайк поставлен';
                window.notificationManager.show(message, 'success');
            }

        } catch (error) {
            console.error('Ошибка при лайке ответа:', error);
        } finally {
            // Убираем ответ из списка обрабатываемых
            setLikingReplies(prev => {
                const newSet = new Set(prev);
                newSet.delete(replyId);
                return newSet;
            });
        }
    };

    const handleDislikeReply = async (replyId: number) => {
        if (!hasToken()) {
            setShowAuthPrompt(true);
            return;
        }

        // Проверяем, не обрабатывается ли уже запрос для этого ответа
        if (likingReplies.has(replyId)) {
            console.log('⏳ Запрос уже обрабатывается для ответа:', replyId);
            return;
        }

        // Находим текущий ответ
        let currentReply: Comment | null = null;
        for (const comment of comments) {
            const reply = comment.replies?.find(r => r.id === replyId);
            if (reply) {
                currentReply = reply;
                break;
            }
        }

        if (!currentReply) return;

        const wasLiked = currentReply.isLiked;
        const wasDisliked = currentReply.isDisliked;

        // Добавляем ответ в список обрабатываемых
        setLikingReplies(prev => new Set([...prev, replyId]));

        // Оптимистично обновляем UI согласно серверной логике
        setComments(prevComments => 
            prevComments.map(comment => ({
                ...comment,
                replies: comment.replies?.map(reply => 
                    reply.id === replyId 
                        ? { 
                            ...reply, 
                            isDisliked: !wasDisliked, // Toggle дизлайк
                            isLiked: !wasDisliked && wasLiked ? false : wasLiked, // Если ставим дизлайк и есть лайк, убираем лайк
                            dislikes: wasDisliked ? (reply.dislikes || 1) - 1 : (reply.dislikes || 0) + 1,
                            likes: !wasDisliked && wasLiked ? reply.likes - 1 : reply.likes // Убираем лайк если ставим дизлайк
                        }
                        : reply
                )
            }))
        );

        try {
            const response = await fetch(`${API_SERVER}/api/comments/reply/${replyId}/dislike`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                const errorMessage = errorData?.message || 'Ошибка при обработке дизлайка ответа';
                
                // Откатываем изменения при ошибке
                setComments(prevComments => 
                    prevComments.map(comment => ({
                        ...comment,
                        replies: comment.replies?.map(reply => 
                            reply.id === replyId 
                                ? { 
                                    ...reply, 
                                    isDisliked: wasDisliked,
                                    isLiked: wasLiked,
                                    dislikes: wasDisliked ? (reply.dislikes || 0) + 1 : (reply.dislikes || 1) - 1,
                                    likes: !wasDisliked && wasLiked ? reply.likes + 1 : reply.likes
                                }
                                : reply
                        )
                    }))
                );

                // Показываем уведомление об ошибке
                if (typeof window !== 'undefined' && window.notificationManager) {
                    window.notificationManager.show(errorMessage, 'error');
                }
                
                throw new Error(errorMessage);
            }

            await response.json().catch(() => null);
            
            // Показываем успешное уведомление
            if (typeof window !== 'undefined' && window.notificationManager) {
                const message = wasDisliked ? 'Дизлайк убран' : 'Дизлайк поставлен';
                window.notificationManager.show(message, 'success');
            }

        } catch (error) {
            console.error('Ошибка при дизлайке ответа:', error);
        } finally {
            // Убираем ответ из списка обрабатываемых
            setLikingReplies(prev => {
                const newSet = new Set(prev);
                newSet.delete(replyId);
                return newSet;
            });
        }
    };

    // Функции для редактирования и удаления комментариев
    const handleEditComment = (commentId: number, currentText: string) => {
        setEditingCommentId(commentId);
        setEditText(currentText);
    };

    const handleEditReply = (replyId: number, currentText: string) => {
        setEditingReplyId(replyId);
        setEditText(currentText);
    };

    const handleCancelEdit = () => {
        setEditingCommentId(null);
        setEditingReplyId(null);
        setEditText('');
    };

    const handleSaveEditComment = async () => {
        if (!editingCommentId || !editText.trim()) return;

        try {
            const response = await fetch(
                `${API_SERVER}/api/comments/edit?commentId=${editingCommentId}&username=${getCurrentUser()?.username}&text=${encodeURIComponent(editText)}`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${getAuthToken()}`
                    }
                }
            );

            if (response.ok) {
                const updatedComment = await response.json();
                setComments(prevComments => 
                    prevComments.map(comment => 
                        comment.id === editingCommentId 
                            ? { ...comment, text: updatedComment.text }
                            : comment
                    )
                );
                handleCancelEdit();
                console.log('✅ Комментарий обновлен успешно');
            } else {
                throw new Error('Ошибка обновления комментария');
            }
        } catch (error) {
            console.error('Ошибка при редактировании комментария:', error);
        }
    };

    const handleSaveEditReply = async () => {
        if (!editingReplyId || !editText.trim()) return;

        try {
            const response = await fetch(`${API_SERVER}/api/replies/${editingReplyId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: editText,
                    username: getCurrentUser()?.username
                })
            });

            if (response.ok) {
                const updatedReply = await response.json();
                setComments(prevComments => 
                    prevComments.map(comment => ({
                        ...comment,
                        replies: comment.replies?.map(reply =>
                            reply.id === editingReplyId 
                                ? { ...reply, text: updatedReply.text }
                                : reply
                        )
                    }))
                );
                handleCancelEdit();
                console.log('✅ Ответ обновлен успешно');
            } else {
                throw new Error('Ошибка обновления ответа');
            }
        } catch (error) {
            console.error('Ошибка при редактировании ответа:', error);
        }
    };

    const handleDeleteComment = async (commentId: number, commentText: string) => {
        setDeleteTarget({ type: 'comment', id: commentId, text: commentText });
        setShowDeleteModal(true);
    };

    const confirmDeleteComment = async () => {
        if (!deleteTarget || deleteTarget.type !== 'comment') return;

        try {
            const response = await fetch(`${API_SERVER}/api/comments/${deleteTarget.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`
                }
            });

            if (response.ok) {
                setComments(prevComments => 
                    prevComments.filter(comment => comment.id !== deleteTarget.id)
                );
                console.log('✅ Комментарий удален успешно');
            } else {
                throw new Error('Ошибка удаления комментария');
            }
        } catch (error) {
            console.error('Ошибка при удалении комментария:', error);
        }
    };

    const handleDeleteReply = async (replyId: number, replyText: string) => {
        setDeleteTarget({ type: 'reply', id: replyId, text: replyText });
        setShowDeleteModal(true);
    };

    const confirmDeleteReply = async () => {
        if (!deleteTarget || deleteTarget.type !== 'reply') return;

        try {
            const response = await fetch(
                `${API_SERVER}/api/replies/${deleteTarget.id}?username=${getCurrentUser()?.username}`,
                {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${getAuthToken()}`
                    }
                }
            );

            if (response.ok) {
                setComments(prevComments => 
                    prevComments.map(comment => ({
                        ...comment,
                        replies: comment.replies?.filter(reply => reply.id !== deleteTarget.id)
                    }))
                );
                console.log('✅ Ответ удален успешно');
            } else {
                throw new Error('Ошибка удаления ответа');
            }
        } catch (error) {
            console.error('Ошибка при удалении ответа:', error);
        }
    };

    const closeDeleteModal = () => {
        setShowDeleteModal(false);
        setDeleteTarget(null);
    };

    const confirmDelete = () => {
        if (deleteTarget?.type === 'comment') {
            confirmDeleteComment();
        } else if (deleteTarget?.type === 'reply') {
            confirmDeleteReply();
        }
        closeDeleteModal();
    };

    const handleReplyComment = async (commentId: number, text: string) => {
        if (!hasToken()) {
            setShowAuthPrompt(true);
            return;
        }

        try {
            const response = await fetch(`${API_SERVER}/api/replies`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    parentCommentId: commentId,
                    username: getCurrentUser()?.username || 'user',
                    text: text
                })
            });

            if (response.ok) {
                loadComments();
            }
        } catch (error) {
            console.error('Ошибка ответа на комментарий:', error);
        }
    };

    // Обработчики для отзывов (используем API рейтингов)
    const handleSubmitReview = async (rating: number, title: string, content: string) => {
        if (!hasToken()) {
            setShowAuthPrompt(true);
            return;
        }

        try {
            const token = getAuthToken();
            const response = await fetch(`${API_SERVER}/api/anime/ratings/${animeId}/rate`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    score: rating, 
                    comment: content 
                }),
            });

            if (response.ok) {
                setIsEditingReview(false);
                loadReviews();
                
                // Обновляем средний рейтинг после отправки отзыва
                try {
                    const ratingResponse = await fetch(`${API_SERVER}/api/anime/ratings/${animeId}/rating`);
                    if (ratingResponse.ok) {
                        const ratingData = await ratingResponse.json();
                        setAverageRating(ratingData.average);
                        console.log('✅ Рейтинг обновлен:', ratingData.average);
                    }
                } catch (ratingError) {
                    console.error('❌ Ошибка обновления рейтинга:', ratingError);
                }
            }
        } catch (error) {
            console.error('Ошибка отправки отзыва:', error);
        }
    };

    const handleDeleteReview = async () => {
        if (!hasToken()) {
            setShowAuthPrompt(true);
            return;
        }

        try {
            const token = getAuthToken();
            const response = await fetch(`${API_SERVER}/api/anime/ratings/${animeId}/delete`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                setUserReview(null);
                setIsEditingReview(false);
                loadReviews();
                
                // Обновляем средний рейтинг после удаления отзыва
                try {
                    const ratingResponse = await fetch(`${API_SERVER}/api/anime/ratings/${animeId}/rating`);
                    if (ratingResponse.ok) {
                        const ratingData = await ratingResponse.json();
                        setAverageRating(ratingData.average);
                        console.log('✅ Рейтинг обновлен после удаления:', ratingData.average);
                    }
                } catch (ratingError) {
                    console.error('❌ Ошибка обновления рейтинга:', ratingError);
                }
            }
        } catch (error) {
            console.error('Ошибка удаления отзыва:', error);
        }
    };

    const handleEditReview = () => {
        setIsEditingReview(true);
    };

    const handleCancelEditReview = () => {
        setIsEditingReview(false);
    };

    // Удалили неиспользуемую функцию handleVoteHelpful

    return {
        // Данные
        anime,
        isLoading,
        error,
        animeId,
        usernameFromToken,
        
        // UI состояния
        activeTab,
        showStatusDropdown,
        showCommentsModal,
        showAuthPrompt,
        favorites,
        selectedStatus,
        isSavingStatus,
        averageRating,
        officialRating,
        screenshotUrls,
        screenshotsLoading,
        
        // Комментарии и отзывы
        comments,
        reviews,
        commentsLoading,
        reviewsLoading,
        totalReviews,
        userReview,
        isEditingReview,
        loadComments,
        loadReviews,
        
        // Обработчики
        handleTabChange,
        toggleFavorite,
        handleStatusSelect,
        handleWatchClick,
        handleCommentsClick,
        handleGoToComments,
        handleToggleStatusDropdown,
        setShowCommentsModal,
        setShowAuthPrompt,
        handleSubmitComment,
        handleLikeComment,
        handleDislikeComment,
        visibleReviews: reviews.slice(0, visibleReviewsCount),
        showAllReviews,
        handleToggleShowAllReviews: reviews.length > 5 ? handleToggleShowAllReviews : null,
        visibleComments: comments.slice(0, visibleCommentsCount),
        showAllComments,
        handleToggleShowAllComments,
        expandedComments,
        handleToggleReplies,
        replyingTo,
        handleStartReply,
        handleCancelReply,
        replyText,
        handleReplyTextChange,
        handleSubmitReply,
        handleLikeReply,
        handleDislikeReply,
        handleReplyComment,
        
        // Редактирование и удаление
        editingCommentId,
        editingReplyId,
        editText,
        setEditText,
        handleEditComment,
        handleEditReply,
        handleCancelEdit,
        handleSaveEditComment,
        handleSaveEditReply,
        handleDeleteComment,
        handleDeleteReply,

        // Модалка удаления
        showDeleteModal,
        deleteTarget,
        closeDeleteModal,
        confirmDelete,

        // Профиль пользователя
        currentUserProfile,
        handleSubmitReview,
        handleDeleteReview,
        handleEditReview,

        // Состояния загрузки лайков
        likingComments,
        likingReplies,
        handleCancelEditReview,
        
        // Утилиты
        hasToken,
        liveUpdatesEnabled,
        setLiveUpdatesEnabled,
        lastUpdateTimestamp,

        // Доступность и блокировки
        isAccessible,
        zametka_blocked,

        // Модальное окно выбора источника
        showSourceModal,
        setShowSourceModal,
        handleSourceSelect,
    };
};
