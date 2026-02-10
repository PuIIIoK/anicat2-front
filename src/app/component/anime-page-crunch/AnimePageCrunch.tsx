'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, Play, Star, Camera, MessageCircle, X, CheckCircle, PlayCircle, Pause, ChevronDown, Clock, ChevronUp, Shield, Crown, Verified, Send, Loader2, Bookmark, Calendar, BookOpen, Link2 } from 'lucide-react';
import '@/styles/components/anime-page-crunch.scss';
import { API_SERVER } from '@/hosts/constants';
import { getEpisodeProgress } from '@/utils/player/progressCache';
import { fetchProgressForAnime } from '@/app/(player)/test-new-player/playerApi';
import { hasToken, getAuthToken } from '../../utils/auth';
import ScreenshotItem from '../anime-page-new/ScreenshotItem';
import { useAnimePageLogic } from '../../hooks/useAnimePageLogic';
import AnimePageCrunchSkeleton from './AnimePageCrunchSkeleton';
import CommentsModal from '../anime-page-new/CommentsModal';
import AuthPromptModal from '../anime-page-new/AuthPromptModal';
import DeleteCommentModal from '../anime-page-new/DeleteCommentModal';
import DiscordStatusTracker from '../DiscordStatusTracker';
import FranchiseSection from '../anime-page-new/FranchiseSection';
import SimilarAnimeSection from '../anime-page-new/SimilarAnimeSection';
import ServerErrorPage from '../common/ServerErrorPage';
import AnimatedMedia from '../../../components/AnimatedMedia';
import SourceSelectionModal from '../anime-page-new/SourceSelectionModal';

const statusOptions = [
    { label: 'Не выбрано', icon: <X size={16} />, value: 'none' },
    { label: 'Запланировано', icon: <Calendar size={16} />, value: 'planned' },
    { label: 'Смотрю', icon: <PlayCircle size={16} />, value: 'watching' },
    { label: 'Просмотрено', icon: <CheckCircle size={16} />, value: 'completed' },
    { label: 'Отложено', icon: <Pause size={16} />, value: 'paused' },
    { label: 'Брошено', icon: <Clock size={16} />, value: 'dropped' },
];

interface AnimePageCrunchProps {
    animeId: string;
}

interface YumekoVoice {
    id: number;
    name: string;
    episodesCount: number;
}

interface YumekoEpisode {
    id: number;
    episodeNumber: number;
    title: string | null;
    maxQuality: string;
    screenshotPath: string | null;
    durationSeconds: number;
}

interface LibriaEpisode {
    id: string;
    name: string | null;
    ordinal: number;
    duration: number;
    hls_480?: string;
    hls_720?: string;
    hls_1080?: string;
    preview?: {
        src: string;
        thumbnail: string;
    };
}

interface FranchiseItem {
    id: number;
    title: string;
    alttitle?: string;
    year?: string | number;
    status?: string;
    type?: string;
    position?: number;
    imageUrl?: string;
}

const AnimePageCrunch: React.FC<AnimePageCrunchProps> = ({ animeId }) => {
    const {
        anime, isLoading, error, activeTab, showStatusDropdown,
        showCommentsModal, showAuthPrompt, favorites, selectedStatus, averageRating, isSavingStatus,
        screenshotUrls, screenshotsLoading, comments, reviews, commentsLoading, reviewsLoading, totalReviews,
        userReview, isEditingReview,
        handleTabChange, toggleFavorite, handleStatusSelect, handleWatchClick,
        handleToggleStatusDropdown, setShowCommentsModal, setShowAuthPrompt,
        loadComments, handleSubmitComment, handleLikeComment, handleDislikeComment, handleReplyComment,
        handleSubmitReview, handleDeleteReview, handleEditReview, handleCancelEditReview,
        visibleComments, showAllComments, handleToggleShowAllComments,
        visibleReviews, showAllReviews, handleToggleShowAllReviews,
        expandedComments, handleToggleReplies, replyingTo, handleStartReply, handleCancelReply,
        replyText, handleReplyTextChange, handleSubmitReply, handleLikeReply, handleDislikeReply,
        editingCommentId, editingReplyId, editText, setEditText,
        handleEditComment, handleEditReply, handleCancelEdit,
        handleSaveEditComment, handleSaveEditReply,
        handleDeleteComment, handleDeleteReply,
        showDeleteModal, deleteTarget, closeDeleteModal, confirmDelete,
        currentUserProfile,
        isAccessible,
        zametka_blocked,
        showSourceModal,
        setShowSourceModal,
        handleSourceSelect,
    } = useAnimePageLogic(animeId);

    // Состояние для выбранного рейтинга
    const [selectedRating, setSelectedRating] = useState<number>(0);
    const [hoverRating, setHoverRating] = useState<number>(0);

    // Состояние для описания
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

    // Состояние для эпизодов Yumeko
    const [yumekoVoices, setYumekoVoices] = useState<YumekoVoice[]>([]);
    const [yumekoEpisodes, setYumekoEpisodes] = useState<YumekoEpisode[]>([]);
    const [selectedVoice, setSelectedVoice] = useState<YumekoVoice | null>(null);
    const [episodesLoading, setEpisodesLoading] = useState(false); // Только для начальной загрузки
    const [voiceChanging, setVoiceChanging] = useState(false); // Для переключения озвучки
    const [episodeProgress, setEpisodeProgress] = useState<Record<number, { time: number; ratio: number }>>({});

    // State for replying to a nested reply (shows form under specific reply)
    const [activeReplyId, setActiveReplyId] = useState<number | string | null>(null);

    // Libria Episodes State
    const [libriaEpisodes, setLibriaEpisodes] = useState<LibriaEpisode[]>([]);
    const [isLibriaAvailable, setIsLibriaAvailable] = useState(false);
    const [libriaLoading, setLibriaLoading] = useState(false);
    const [episodeSource, setEpisodeSource] = useState<'libria' | 'yumeko'>('libria');
    const [libriaAlias, setLibriaAlias] = useState<string>('');
    const [isYumekoAvailable, setIsYumekoAvailable] = useState(false);
    const [libriaProgress, setLibriaProgress] = useState<Record<number, { time: number; ratio: number }>>({});

    // Franchise/Season State
    const [hasFranchise, setHasFranchise] = useState(false);
    const [franchiseItems, setFranchiseItems] = useState<FranchiseItem[]>([]);
    const [selectedSeasonId, setSelectedSeasonId] = useState<number>(parseInt(animeId));

    // Store original (current anime) episodes for quick restore
    const [originalLibriaEpisodes, setOriginalLibriaEpisodes] = useState<LibriaEpisode[]>([]);
    const [originalYumekoVoices, setOriginalYumekoVoices] = useState<YumekoVoice[]>([]);
    const [originalYumekoEpisodes, setOriginalYumekoEpisodes] = useState<YumekoEpisode[]>([]);
    const [originalLibriaAvailable, setOriginalLibriaAvailable] = useState(false);
    const [originalYumekoAvailable, setOriginalYumekoAvailable] = useState(false);

    // Per-season collection override
    const [seasonFavorites, setSeasonFavorites] = useState<boolean | null>(null);
    const [seasonSelectedStatus, setSeasonSelectedStatus] = useState<string | null>(null);

    // Функция загрузки прогресса для эпизодов Yumeko
    const loadEpisodeProgress = (episodes: YumekoEpisode[], voiceName: string, targetAnimeId?: string) => {
        const id = targetAnimeId || animeId;
        const progressMap: Record<number, { time: number; ratio: number }> = {};
        episodes.forEach(ep => {
            const prog = getEpisodeProgress({
                animeId: id,
                source: 'yumeko',
                voice: voiceName,
                episodeId: ep.episodeNumber
            });
            if (prog && prog.duration > 0) {
                const ratio = Math.max(0, Math.min(1, prog.time / prog.duration));
                progressMap[ep.episodeNumber] = { time: prog.time, ratio };
            }
        });
        setEpisodeProgress(progressMap);
    };

    // Функция загрузки прогресса для эпизодов Libria с сервера
    const loadLibriaProgress = async (episodes: LibriaEpisode[], targetAnimeId?: string) => {
        try {
            const id = targetAnimeId || animeId;
            const serverProgress = await fetchProgressForAnime(id);
            const progressMap: Record<number, { time: number; ratio: number }> = {};

            episodes.forEach(ep => {
                // Ищем прогресс для этого эпизода из источника libria
                const prog = serverProgress.find(
                    p => p.source === 'libria' && p.episodeId === ep.ordinal
                );
                if (prog && prog.duration && prog.duration > 0) {
                    const time = prog.time || 0;
                    const ratio = Math.max(0, Math.min(1, time / prog.duration));
                    progressMap[ep.ordinal] = { time, ratio };
                }
            });

            setLibriaProgress(progressMap);
        } catch (err) {
            console.error('Ошибка загрузки прогресса Libria:', err);
        }
    };

    // Загрузка озвучек при переключении на вкладку эпизодов
    useEffect(() => {
        if (activeTab === 'episodes') {
            // Загрузка Yumeko
            if (yumekoVoices.length === 0) {
                setEpisodesLoading(true);
                let voiceName = '';
                fetch(`${API_SERVER}/api/yumeko/anime/${animeId}/voices`)
                    .then(res => res.ok ? res.json() : [])
                    .then((voices: YumekoVoice[]) => {
                        setYumekoVoices(voices);
                        setOriginalYumekoVoices(voices);
                        if (voices.length > 0) {
                            setIsYumekoAvailable(true);
                            setOriginalYumekoAvailable(true);
                            setSelectedVoice(voices[0]);
                            voiceName = voices[0].name;
                            return fetch(`${API_SERVER}/api/yumeko/voices/${voices[0].id}/episodes`);
                        }
                        setIsYumekoAvailable(false);
                        setOriginalYumekoAvailable(false);
                        return null;
                    })
                    .then(res => res?.ok ? res.json() : [])
                    .then((episodes: YumekoEpisode[]) => {
                        if (episodes) {
                            setYumekoEpisodes(episodes);
                            setOriginalYumekoEpisodes(episodes);
                            loadEpisodeProgress(episodes, voiceName);
                        }
                    })
                    .catch(console.error)
                    .finally(() => setEpisodesLoading(false));
            }

            // Загрузка Libria
            if (libriaEpisodes.length === 0) {
                setLibriaLoading(true);
                fetch(`${API_SERVER}/api/libria/episodes/${animeId}`)
                    .then(res => res.ok ? res.json() : null)
                    .then(async (data) => {
                        if (data?.apiUrl && data?.alias) {
                            setLibriaAlias(data.alias);
                            const libriaRes = await fetch(data.apiUrl);
                            const libriaData = await libriaRes.json();
                            if (libriaData.episodes && Array.isArray(libriaData.episodes)) {
                                setLibriaEpisodes(libriaData.episodes);
                                setOriginalLibriaEpisodes(libriaData.episodes);
                                setIsLibriaAvailable(true);
                                setOriginalLibriaAvailable(true);
                                setEpisodeSource('libria');
                                loadLibriaProgress(libriaData.episodes);
                            } else {
                                setOriginalLibriaAvailable(false);
                            }
                        } else {
                            setOriginalLibriaAvailable(false);
                        }
                    })
                    .catch(() => {
                        setIsLibriaAvailable(false);
                        setOriginalLibriaAvailable(false);
                    })
                    .finally(() => setLibriaLoading(false));
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, animeId, yumekoVoices.length, libriaEpisodes.length]);

    // Franchise Check and Load on mount
    useEffect(() => {
        fetch(`${API_SERVER}/api/anime/franchise-chain/anime/${animeId}`)
            .then(res => res.ok ? res.json() : [])
            .then((data: FranchiseItem[]) => {
                if (Array.isArray(data) && data.length > 0) {
                    setHasFranchise(true);
                    const sorted = [...data].sort((a, b) => {
                        if (a.position !== undefined && b.position !== undefined) {
                            return a.position - b.position;
                        }
                        return 0;
                    });
                    setFranchiseItems(sorted);
                } else {
                    setHasFranchise(false);
                    setFranchiseItems([]);
                }
            })
            .catch(() => {
                setHasFranchise(false);
                setFranchiseItems([]);
            });
    }, [animeId]);

    // Load episodes when season changes (franchise browsing)
    useEffect(() => {
        const seasonId = selectedSeasonId.toString();
        if (seasonId !== animeId) {
            // Сбрасываем прогресс перед загрузкой нового сезона
            setLibriaProgress({});
            setEpisodeProgress({});

            // Reload Libria episodes for new season
            setLibriaLoading(true);
            fetch(`${API_SERVER}/api/libria/episodes/${selectedSeasonId}`)
                .then(res => res.ok ? res.json() : null)
                .then(async (data) => {
                    if (data?.apiUrl && data?.alias) {
                        setLibriaAlias(data.alias);
                        const libriaRes = await fetch(data.apiUrl);
                        const libriaData = await libriaRes.json();
                        if (libriaData.episodes && Array.isArray(libriaData.episodes)) {
                            setLibriaEpisodes(libriaData.episodes);
                            setIsLibriaAvailable(true);
                            loadLibriaProgress(libriaData.episodes, seasonId);
                        } else {
                            setIsLibriaAvailable(false);
                            setLibriaEpisodes([]);
                        }
                    } else {
                        setIsLibriaAvailable(false);
                        setLibriaEpisodes([]);
                    }
                })
                .catch(() => {
                    setIsLibriaAvailable(false);
                    setLibriaEpisodes([]);
                })
                .finally(() => setLibriaLoading(false));

            // Reload Yumeko voices/episodes for new season
            fetch(`${API_SERVER}/api/yumeko/anime/${selectedSeasonId}/voices`)
                .then(res => res.ok ? res.json() : [])
                .then((voices: YumekoVoice[]) => {
                    if (voices.length > 0) {
                        setIsYumekoAvailable(true);
                        setYumekoVoices(voices);
                        setSelectedVoice(voices[0]);
                        return fetch(`${API_SERVER}/api/yumeko/voices/${voices[0].id}/episodes`)
                            .then(res => res?.ok ? res.json() : [])
                            .then((episodes: YumekoEpisode[]) => {
                                if (episodes && episodes.length > 0) {
                                    setYumekoEpisodes(episodes);
                                    loadEpisodeProgress(episodes, voices[0].name, seasonId);
                                }
                            });
                    } else {
                        setIsYumekoAvailable(false);
                        setYumekoVoices([]);
                        setYumekoEpisodes([]);
                        return null;
                    }
                })
                .catch(() => {
                    setIsYumekoAvailable(false);
                    setYumekoVoices([]);
                    setYumekoEpisodes([]);
                });
        } else if (originalLibriaEpisodes.length > 0 || originalYumekoVoices.length > 0 || originalLibriaAvailable || originalYumekoAvailable) {
            // Restore original episodes when returning to current season
            setLibriaEpisodes(originalLibriaEpisodes);
            setYumekoVoices(originalYumekoVoices);
            setYumekoEpisodes(originalYumekoEpisodes);
            setIsLibriaAvailable(originalLibriaAvailable);
            setIsYumekoAvailable(originalYumekoAvailable);
            if (originalYumekoVoices.length > 0) {
                setSelectedVoice(originalYumekoVoices[0]);
            }
            // Восстанавливаем прогресс для оригинального сезона
            if (originalLibriaEpisodes.length > 0) {
                loadLibriaProgress(originalLibriaEpisodes, animeId);
            }
            if (originalYumekoVoices.length > 0 && originalYumekoEpisodes.length > 0) {
                loadEpisodeProgress(originalYumekoEpisodes, originalYumekoVoices[0].name, animeId);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedSeasonId, animeId]);

    // Fetch collection status when season changes
    useEffect(() => {
        const seasonId = selectedSeasonId.toString();
        if (seasonId !== animeId) {
            const token = localStorage.getItem('token');
            if (token) {
                Promise.all([
                    fetch(`${API_SERVER}/api/anime/optimized/get-anime/${selectedSeasonId}/collection-status`, {
                        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
                    }),
                    fetch(`${API_SERVER}/api/collection/favorites`, {
                        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
                    })
                ]).then(async ([collectionRes, favoritesRes]) => {
                    if (collectionRes.ok) {
                        const collectionData = await collectionRes.json();
                        setSeasonSelectedStatus(collectionData.hasStatus === 'true' ? collectionData.status.toLowerCase() : 'none');
                    } else {
                        setSeasonSelectedStatus('none');
                    }
                    if (favoritesRes.ok) {
                        const favoritesData = await favoritesRes.json();
                        const isFav = favoritesData.some((item: Record<string, unknown>) => (item.anime as Record<string, unknown>)?.id === selectedSeasonId);
                        setSeasonFavorites(isFav);
                    } else {
                        setSeasonFavorites(false);
                    }
                }).catch(() => {
                    setSeasonSelectedStatus('none');
                    setSeasonFavorites(false);
                });
            } else {
                setSeasonSelectedStatus('none');
                setSeasonFavorites(false);
            }
        } else {
            setSeasonSelectedStatus(null);
            setSeasonFavorites(null);
        }
    }, [selectedSeasonId, animeId]);

    const displayFavorites = seasonFavorites !== null ? seasonFavorites : favorites;
    const displaySelectedStatus = seasonSelectedStatus !== null ? seasonSelectedStatus : selectedStatus;
    const currentStatus = statusOptions.find(opt => opt.value === selectedStatus);

    const handleSeasonToggleFavorite = async () => {
        if (!hasToken()) {
            setShowAuthPrompt(true);
            return;
        }
        const newFavorite = !displayFavorites;
        if (seasonFavorites !== null) setSeasonFavorites(newFavorite);
        try {
            const token = getAuthToken();
            const res = await fetch(`${API_SERVER}/api/collection/${newFavorite ? 'set' : 'remove'}?animeId=${selectedSeasonId}&type=FAVORITE`, {
                method: newFavorite ? 'POST' : 'DELETE',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            });
            if (!res.ok) throw new Error('Error');
            console.log(`"${anime?.title}" ${newFavorite ? 'added to' : 'removed from'} favorites`);
            if (selectedSeasonId.toString() === animeId) toggleFavorite();
        } catch (error) {
            console.error(error);
            console.error(error);
            if (seasonFavorites !== null) setSeasonFavorites(!newFavorite);
        }
    };

    const handleSeasonStatusSelect = async (value: string) => {
        if (!hasToken()) {
            setShowAuthPrompt(true);
            return;
        }
        handleToggleStatusDropdown();
        try {
            const token = getAuthToken();
            const endpoint = value === 'none' ? `${API_SERVER}/api/collection/remove?animeId=${selectedSeasonId}` : `${API_SERVER}/api/collection/set?animeId=${selectedSeasonId}&type=${value.toUpperCase()}`;
            const method = value === 'none' ? 'DELETE' : 'POST';
            const res = await fetch(endpoint, { method, headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } });
            if (!res.ok) throw new Error('Error');
            if (seasonSelectedStatus !== null) setSeasonSelectedStatus(value);
            console.log(`Status updated`);
            if (selectedSeasonId.toString() === animeId) handleStatusSelect(value);
        } catch (error) {
            console.error(error);
            console.error(error);
        }
    };

    // Загрузка эпизодов при смене озвучки (без полной перезагрузки блока)
    const handleVoiceChange = async (voice: YumekoVoice) => {
        if (voice.id === selectedVoice?.id) return;
        setSelectedVoice(voice);
        setVoiceChanging(true);
        try {
            const res = await fetch(`${API_SERVER}/api/yumeko/voices/${voice.id}/episodes`);
            if (res.ok) {
                const episodes: YumekoEpisode[] = await res.json();
                setYumekoEpisodes(episodes);
                loadEpisodeProgress(episodes, voice.name);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setVoiceChanging(false);
        }
    };

    // При редактировании - устанавливаем рейтинг из отзыва
    useEffect(() => {
        if (isEditingReview && userReview?.rating) {
            setSelectedRating(userReview.rating);
        } else if (!isEditingReview) {
            setSelectedRating(0);
        }
    }, [isEditingReview, userReview?.rating]);

    const isCommentOwner = (comment: { realUsername?: string; username?: string }) => {
        if (!currentUserProfile?.username) return false;
        return currentUserProfile.username.toLowerCase() === String(comment.realUsername || comment.username).toLowerCase();
    };

    const getRoleColor = (roleString: string) => {
        if (!roleString) return 'var(--text-primary)';
        const roles = roleString.split(',').map(r => r.trim().toLowerCase());
        if (roles.includes('admin')) return '#ff4444';
        if (roles.includes('moderator')) return '#ffa500';
        if (roles.includes('premium')) return '#ffd700';
        if (roles.includes('verified')) return '#00ff88';
        return 'var(--text-primary)';
    };

    const getRoleIcon = (roleString: string, verified?: boolean) => {
        if (verified) return <Verified size={18} className="verification-icon" />;
        if (!roleString) return null;
        const roles = roleString.split(',').map(r => r.trim().toLowerCase());
        if (roles.includes('admin')) return <Shield size={14} className="role-icon admin" />;
        if (roles.includes('moderator')) return <Shield size={14} className="role-icon moderator" />;
        if (roles.includes('premium')) return <Crown size={14} className="role-icon premium" />;
        return null;
    };


    useEffect(() => {
        if (!anime) {
            document.title = 'Yumeko';
            return;
        }
        const seasonText = anime.season
            ? (anime.season.toLowerCase().includes('сезон') ? ` ${anime.season}` : ` ${anime.season}`)
            : (anime.mouthSeason ? ` ${anime.mouthSeason}` : '');
        document.title = `${anime.title}${seasonText} | Yumeko`;
    }, [anime]);

    if (isLoading) return <AnimePageCrunchSkeleton />;
    if (error || !anime) {
        return (
            <ServerErrorPage
                title="Внутренняя ошибка сервера!"
                message={error || "Не удалось загрузить страницу аниме.\nПожалуйста, попробуйте позже"}
                onRetry={() => window.location.reload()}
            />
        );
    }

    return (
        <div className="cr-page">
            <DiscordStatusTracker status={`На странице аниме ${anime.title}`} />

            {/* Hero секция - Crunchyroll стиль */}
            <div className="cr-hero">
                <div className="cr-hero-bg">
                    {anime.bannerUrl ? (
                        <Image src={anime.bannerUrl} alt="Баннер" fill className="cr-hero-image" unoptimized style={{ objectFit: 'cover' }} priority />
                    ) : (
                        <div className="cr-hero-dark" />
                    )}
                </div>


                <div className="cr-hero-content">
                    {/* Постер слева */}
                    <div className="cr-poster">
                        {anime.coverUrl ? (
                            <Image src={anime.coverUrl} alt="Постер" fill unoptimized style={{ objectFit: 'cover' }} />
                        ) : (
                            <div className="cr-poster-placeholder">Нет постера</div>
                        )}
                    </div>

                    {/* Информация */}
                    <div className="cr-hero-left">
                        {/* 1. Мета-бейджи: рейтинг, тип, жанры */}
                        <div className="cr-meta-line">
                            {anime.rating && <span className="cr-badge age">{anime.rating}</span>}
                            {anime.type && (
                                <>
                                    <span className="cr-separator">•</span>
                                    <span className="cr-badge type">{anime.type}</span>
                                </>
                            )}
                            {anime.genres && (
                                <>
                                    <span className="cr-separator">•</span>
                                    <div className="cr-genres-inline">
                                        {anime.genres.split(',').map((g, i) => (
                                            <span key={i} className="cr-genre-tag">{g.trim()}</span>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* 2. Заголовок и альт. название */}
                        <h1 className="cr-title">{anime.title}</h1>
                        {anime.alttitle && <p className="cr-subtitle">{anime.alttitle}</p>}

                        {/* 2.5. Эпизоды и статус */}
                        <div className="cr-quick-info">
                            {anime.status !== 'Анонс' && (
                                <div className="cr-quick-item">
                                    <PlayCircle size={16} />
                                    <span>{anime.status === 'Завершен' || anime.status === 'Завершён'
                                        ? `${anime.episodeAll || '?'} эп.`
                                        : anime.currentEpisode
                                            ? `${anime.currentEpisode} / ${anime.episodeAll || '?'} эп.`
                                            : `${anime.episodeAll || '—'} эп.`
                                    }</span>
                                </div>
                            )}
                            <div className={`cr-quick-item status ${anime.status === 'Онгоинг' ? 'ongoing' : anime.status === 'Анонс' ? 'announced' : (anime.status === 'Завершен' || anime.status === 'Завершён') ? 'completed' : ''}`}>
                                {(anime.status === 'Завершен' || anime.status === 'Завершён') ? (
                                    <CheckCircle size={16} />
                                ) : anime.status === 'Анонс' ? (
                                    <Calendar size={16} />
                                ) : (
                                    <Clock size={16} />
                                )}
                                <span>{anime.status}</span>
                            </div>
                        </div>

                        {/* 3. Рейтинг со звёздами */}
                        {averageRating !== null && anime.status !== 'Скоро' && anime.status !== 'Анонс' && (
                            <div className="cr-rating-row">
                                <div className="cr-stars">
                                    {Array.from({ length: 5 }, (_, i) => i + 1).map((starIndex) => (
                                        <Star
                                            key={starIndex}
                                            size={18}
                                            className={starIndex <= Math.round(averageRating) ? 'star-filled' : 'star-empty'}
                                        />
                                    ))}
                                </div>
                                <span className="cr-rating-text">
                                    Средний рейтинг: <strong>{averageRating.toFixed(1)}</strong>
                                </span>
                            </div>
                        )}

                        {/* 4. Кнопки: Смотреть, Избранное, Коллекции */}
                        <div className="cr-actions">
                            <button
                                className="cr-btn-watch"
                                onClick={handleWatchClick}
                                disabled={!anime.opened || isAccessible === false}
                            >
                                <Play size={18} fill="#fff" />
                                {anime.opened ? 'СМОТРЕТЬ' : (anime.anons || 'СКОРО')}
                            </button>

                            <button
                                className={`cr-btn-icon ${favorites ? 'active' : ''}`}
                                onClick={toggleFavorite}
                                title={favorites ? 'Убрать из избранного' : 'В избранное'}
                            >
                                <Bookmark size={20} fill={favorites ? 'currentColor' : 'none'} />
                            </button>

                            <div className="crunch-dropdown">
                                <button
                                    className={`cr-btn-status ${selectedStatus ? `status-${selectedStatus}` : ''}`}
                                    onClick={handleToggleStatusDropdown}
                                    disabled={isSavingStatus}
                                    title="Добавить в список"
                                >
                                    {isSavingStatus ? <Loader2 size={18} className="spinning" /> : currentStatus?.icon || <PlayCircle size={18} />}
                                    <span>{currentStatus?.label || 'Добавить'}</span>
                                    <ChevronDown size={16} />
                                </button>
                                {showStatusDropdown && (
                                    <div className="dropdown-menu">
                                        {statusOptions.map(option => (
                                            <div
                                                key={option.value}
                                                className={`dropdown-item item-${option.value} ${selectedStatus === option.value ? 'active' : ''}`}
                                                onClick={() => handleStatusSelect(option.value)}
                                            >
                                                {option.icon}
                                                <span>{option.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Заметка и заметка о блокировке */}
                        {(anime.zametka || zametka_blocked) && (
                            <div className="cr-notices">
                                {anime.zametka && (
                                    <div className="cr-notice info">
                                        <MessageCircle size={16} />
                                        <span>{anime.zametka}</span>
                                    </div>
                                )}
                                {zametka_blocked && (
                                    <div className="cr-notice blocked">
                                        <Shield size={16} />
                                        <span>{zametka_blocked}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 5. Информация об аниме */}
                        <div className="cr-info-card">
                            {anime.studio && (
                                <div className="cr-info-item">
                                    <div className="cr-info-icon"><Camera size={16} /></div>
                                    <div className="cr-info-text">
                                        <span className="cr-info-label">Студия</span>
                                        <span className="cr-info-value">{anime.studio}</span>
                                    </div>
                                </div>
                            )}
                            {anime.year && (
                                <div className="cr-info-item">
                                    <div className="cr-info-icon"><Calendar size={16} /></div>
                                    <div className="cr-info-text">
                                        <span className="cr-info-label">Год</span>
                                        <span className="cr-info-value">{anime.year}</span>
                                    </div>
                                </div>
                            )}
                            {anime.mouthSeason && (
                                <div className="cr-info-item">
                                    <div className="cr-info-icon"><Calendar size={16} /></div>
                                    <div className="cr-info-text">
                                        <span className="cr-info-label">Сезон</span>
                                        <span className="cr-info-value">{anime.mouthSeason}</span>
                                    </div>
                                </div>
                            )}
                            {anime.realesedFor && (
                                <div className="cr-info-item">
                                    <div className="cr-info-icon"><BookOpen size={16} /></div>
                                    <div className="cr-info-text">
                                        <span className="cr-info-label">Первоисточник</span>
                                        <span className="cr-info-value">{anime.realesedFor}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 6. Описание */}
                        {anime.description && (
                            <div className="cr-description-wrapper">
                                <p className={`cr-description ${isDescriptionExpanded ? 'expanded' : ''}`}>
                                    {anime.description}
                                </p>
                                {anime.description.length > 200 && (
                                    <button
                                        className="cr-description-toggle"
                                        onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                                    >
                                        {isDescriptionExpanded ? 'Скрыть' : 'Показать больше...'}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Табы с контентом */}
            <div className="crunch-tabs-section">
                <div className="crunch-container">
                    <div className="crunch-tabs">
                        <button
                            className={`crunch-tab ${activeTab === 'episodes' ? 'active' : ''}`}
                            onClick={() => handleTabChange('episodes')}
                            disabled={anime.status === 'Анонс'}
                        >
                            <PlayCircle size={18} />
                            Эпизоды
                        </button>
                        <button
                            className={`crunch-tab ${activeTab === 'screenshots' ? 'active' : ''}`}
                            onClick={() => handleTabChange('screenshots')}
                        >
                            <Camera size={18} />
                            Скриншоты {anime.screenshotsCount > 0 && `(${anime.screenshotsCount})`}
                        </button>
                        <button
                            className={`crunch-tab ${activeTab === 'reviews' ? 'active' : ''}`}
                            onClick={() => handleTabChange('reviews')}
                            disabled={anime.status === 'Скоро' || anime.status === 'Анонс'}
                        >
                            <Star size={18} />
                            Отзывы {totalReviews > 0 && `(${totalReviews})`}
                        </button>
                        <button
                            className={`crunch-tab ${activeTab === 'comments' ? 'active' : ''}`}
                            onClick={() => handleTabChange('comments')}
                        >
                            <MessageCircle size={18} />
                            Комментарии {comments.length > 0 && `(${comments.length})`}
                        </button>
                        {hasFranchise && (
                            <button
                                className={`crunch-tab ${activeTab === 'related' ? 'active' : ''}`}
                                onClick={() => handleTabChange('related')}
                            >
                                <Link2 size={18} />
                                Связанное
                            </button>
                        )}
                        <button
                            className={`crunch-tab ${activeTab === 'similar' ? 'active' : ''}`}
                            onClick={() => handleTabChange('similar')}
                        >
                            <Heart size={18} />
                            Похожее
                        </button>
                    </div>

                    <div className="crunch-tab-content">
                        {activeTab === 'episodes' && (
                            <div className="crunch-episodes">
                                {(libriaLoading || episodesLoading) ? (
                                    <div className="loading-state">
                                        <Loader2 size={32} className="spinning" />
                                        <span>Загрузка эпизодов...</span>
                                    </div>
                                ) : (isLibriaAvailable || isYumekoAvailable) ? (
                                    <div className="episodes-content">
                                        {/* Season Selector (franchise) */}
                                        {franchiseItems.length > 1 && (
                                            <div className="source-tabs" style={{ marginBottom: '8px' }}>
                                                {franchiseItems.map((item, idx) => (
                                                    <button
                                                        key={item.id}
                                                        className={`source-tab ${selectedSeasonId === item.id ? 'active' : ''}`}
                                                        onClick={() => setSelectedSeasonId(item.id)}
                                                    >
                                                        Сезон {idx + 1}
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {/* Source Sub-tabs */}
                                        {isLibriaAvailable && isYumekoAvailable && (
                                            <div className="source-tabs">
                                                <button
                                                    className={`source-tab ${episodeSource === 'libria' ? 'active' : ''}`}
                                                    onClick={() => setEpisodeSource('libria')}
                                                >
                                                    Libria
                                                </button>
                                                <button
                                                    className={`source-tab ${episodeSource === 'yumeko' ? 'active' : ''}`}
                                                    onClick={() => setEpisodeSource('yumeko')}
                                                >
                                                    Yumeko
                                                </button>
                                            </div>
                                        )}

                                        {/* Source label if only one source */}
                                        {isLibriaAvailable && !isYumekoAvailable && (
                                            <div className="source-label">источник Libria</div>
                                        )}
                                        {!isLibriaAvailable && isYumekoAvailable && (
                                            <div className="source-label">источник Yumeko</div>
                                        )}

                                        {/* Libria Episodes */}
                                        {((episodeSource === 'libria' && isLibriaAvailable) || (!isYumekoAvailable && isLibriaAvailable)) && (
                                            <div className="episodes-grid">
                                                {libriaEpisodes.map(episode => {
                                                    const progress = libriaProgress[episode.ordinal];
                                                    const watchedMin = progress ? Math.floor(progress.time / 60) : 0;
                                                    return (
                                                        <Link
                                                            key={episode.id}
                                                            href={`/watch/anime/${selectedSeasonId}?source=libria&alias=${encodeURIComponent(libriaAlias)}&episode=${episode.ordinal}&title=${encodeURIComponent(anime.title || '')}&cover=${anime.coverUrl || ''}`}
                                                            className="episode-card"
                                                        >
                                                            <div className="episode-thumbnail">
                                                                {episode.preview?.src ? (
                                                                    <Image
                                                                        src={`https://aniliberty.top${episode.preview.src}`}
                                                                        alt={`Эпизод ${episode.ordinal}`}
                                                                        fill
                                                                        style={{ objectFit: 'cover' }}
                                                                        unoptimized
                                                                    />
                                                                ) : (
                                                                    <div className="episode-placeholder">
                                                                        <PlayCircle size={32} />
                                                                    </div>
                                                                )}
                                                                {/* Duration badge */}
                                                                {episode.duration && (
                                                                    <div className="episode-duration-badge">
                                                                        {Math.floor(episode.duration / 60)}:{String(episode.duration % 60).padStart(2, '0')}
                                                                    </div>
                                                                )}
                                                                {/* Progress bar - показываем только если есть прогресс */}
                                                                {progress && progress.ratio > 0 && (
                                                                    <div className="episode-progress-bar">
                                                                        <div
                                                                            className="episode-progress-fill"
                                                                            style={{ width: `${progress.ratio * 100}%` }}
                                                                        />
                                                                    </div>
                                                                )}
                                                                {/* Info overlay */}
                                                                <div className="episode-info-overlay">
                                                                    {progress && progress.time > 0 ? (
                                                                        <span className="episode-name">{watchedMin} мин просмотрено</span>
                                                                    ) : (
                                                                        episode.name && <span className="episode-name">{episode.name}</span>
                                                                    )}
                                                                    <span className="episode-number">{episode.ordinal} эпизод</span>
                                                                </div>
                                                            </div>
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* Yumeko Episodes */}
                                        {((episodeSource === 'yumeko' && isYumekoAvailable) || (!isLibriaAvailable && isYumekoAvailable)) && (
                                            <>
                                                {/* Voice selector */}
                                                {yumekoVoices.length > 1 && (
                                                    <div className="voice-selector">
                                                        <span className="voice-label">Озвучка:</span>
                                                        <div className="voice-buttons">
                                                            {yumekoVoices.map(voice => (
                                                                <button
                                                                    key={voice.id}
                                                                    className={`voice-btn ${selectedVoice?.id === voice.id ? 'active' : ''}`}
                                                                    onClick={() => handleVoiceChange(voice)}
                                                                >
                                                                    {voice.name}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Episodes Grid */}
                                                <div className={`episodes-grid ${voiceChanging ? 'loading' : ''}`}>
                                                    {voiceChanging && (
                                                        <div className="episodes-loading-overlay">
                                                            <Loader2 size={24} className="spinning" />
                                                        </div>
                                                    )}
                                                    {yumekoEpisodes.map(episode => {
                                                        const progress = episodeProgress[episode.episodeNumber];
                                                        const watchedMin = progress ? Math.floor(progress.time / 60) : 0;
                                                        return (
                                                            <Link
                                                                key={episode.id}
                                                                href={`/watch/anime/${selectedSeasonId}?source=yumeko&voiceId=${selectedVoice?.id}&voiceName=${encodeURIComponent(selectedVoice?.name || '')}&episodeId=${episode.id}&episodeNumber=${episode.episodeNumber}&title=${encodeURIComponent(anime.title || '')}&cover=${anime.coverUrl || ''}`}
                                                                className="episode-card"
                                                            >
                                                                <div className="episode-thumbnail">
                                                                    {episode.screenshotPath ? (
                                                                        <Image
                                                                            src={`${API_SERVER}/api/video/screenshot/${episode.screenshotPath}`}
                                                                            alt={`Эпизод ${episode.episodeNumber}`}
                                                                            fill
                                                                            style={{ objectFit: 'cover' }}
                                                                        />
                                                                    ) : (
                                                                        <div className="episode-placeholder">
                                                                            <PlayCircle size={32} />
                                                                        </div>
                                                                    )}
                                                                    <div className="episode-quality">{episode.maxQuality}</div>
                                                                    {progress && progress.ratio > 0 && (
                                                                        <div className="episode-progress-bar">
                                                                            <div
                                                                                className="episode-progress-fill"
                                                                                style={{ width: `${progress.ratio * 100}%` }}
                                                                            />
                                                                        </div>
                                                                    )}
                                                                    {/* Info overlay */}
                                                                    <div className="episode-info-overlay">
                                                                        {progress && progress.time > 0 && (
                                                                            <span className="episode-name">{watchedMin} мин просмотрено</span>
                                                                        )}
                                                                        <span className="episode-number">{episode.episodeNumber} эпизод</span>
                                                                    </div>
                                                                </div>
                                                            </Link>
                                                        );
                                                    })}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    <div className="empty-state">
                                        <PlayCircle size={48} strokeWidth={1.5} />
                                        <h3>Эпизоды недоступны</h3>
                                        <p>Для этого аниме пока нет эпизодов.</p>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '8px' }}>
                                            Воспользуйтесь внешними источниками при нажатии на кнопку «Смотреть»
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'screenshots' && (
                            <div className="crunch-screenshots">
                                {screenshotsLoading ? (
                                    <div className="loading-state">
                                        <Loader2 size={32} className="spinning" />
                                        <span>Загрузка скриншотов...</span>
                                    </div>
                                ) : screenshotUrls.length > 0 ? (
                                    <div className="screenshots-grid">
                                        {screenshotUrls.map((screenshot, index) => (
                                            <ScreenshotItem
                                                key={screenshot.id || index}
                                                screenshot={screenshot}
                                                index={index}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="empty-state">
                                        <Camera size={48} strokeWidth={1.5} />
                                        <h3>Скриншоты отсутствуют</h3>
                                        <p>Для этого аниме пока нет скриншотов</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'reviews' && (
                            <div className="crunch-reviews">
                                {/* Форма отзыва или отображение своего отзыва */}
                                {userReview && !isEditingReview ? (
                                    <div className="my-review-card" style={{ marginBottom: '24px', padding: '16px', border: '1px solid var(--primary-color)', borderRadius: '12px', background: 'rgba(var(--primary-rgb), 0.05)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                            <div>
                                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Ваш отзыв</span>
                                                <div style={{ display: 'flex', gap: '2px', marginTop: '4px' }}>
                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                        <Star key={star} size={16} style={{ color: star <= (userReview.rating || 0) ? '#f5a623' : 'var(--text-muted)', fill: star <= (userReview.rating || 0) ? '#f5a623' : 'transparent' }} />
                                                    ))}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button onClick={handleEditReview} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.85rem' }}>Изменить</button>
                                                <button onClick={handleDeleteReview} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid #ef4444', borderRadius: '6px', color: '#ef4444', cursor: 'pointer', fontSize: '0.85rem' }}>Удалить</button>
                                            </div>
                                        </div>
                                        <p style={{ margin: 0, color: 'var(--text-primary)', fontSize: '0.95rem', lineHeight: 1.5 }}>{userReview.content}</p>
                                    </div>
                                ) : (
                                    <div style={{ marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid var(--border-color)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '22px' }}>{isEditingReview ? 'Изменить оценку:' : 'Ваша оценка:'}</span>
                                            <div
                                                style={{ display: 'flex', gap: '4px', alignItems: 'center', height: '22px', marginTop: '5px' }}
                                                className="cr-stars-select"
                                                onMouseLeave={() => setHoverRating(0)}
                                            >
                                                {[1, 2, 3, 4, 5].map((rating) => {
                                                    const isActive = rating <= (hoverRating || selectedRating);
                                                    return (
                                                        <div
                                                            key={rating}
                                                            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px' }}
                                                            onMouseEnter={() => setHoverRating(rating)}
                                                            onClick={() => setSelectedRating(rating)}
                                                        >
                                                            <Star
                                                                size={22}
                                                                style={{
                                                                    display: 'block',
                                                                    transition: 'all 0.15s',
                                                                    color: isActive ? '#f5a623' : 'var(--text-muted)',
                                                                    fill: isActive ? '#f5a623' : 'transparent'
                                                                }}
                                                            />
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            {isEditingReview && (
                                                <button onClick={handleCancelEditReview} style={{ marginLeft: 'auto', padding: '4px 10px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem' }}>Отмена</button>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                                            <textarea
                                                placeholder={isEditingReview ? 'Измените ваш отзыв...' : 'Напишите ваш отзыв... (Enter — отправить)'}
                                                defaultValue={isEditingReview ? (userReview?.content || '') : ''}
                                                style={{ flex: 1, padding: '12px 16px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '0.9rem', fontFamily: 'inherit', resize: 'none', minHeight: '44px', maxHeight: '200px', overflow: 'hidden' }}
                                                onInput={(e) => {
                                                    const textarea = e.target as HTMLTextAreaElement;
                                                    textarea.style.height = 'auto';
                                                    textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                        e.preventDefault();
                                                        const textarea = e.target as HTMLTextAreaElement;
                                                        if (!selectedRating) { alert('Выберите оценку!'); return; }
                                                        if (textarea.value.trim()) {
                                                            handleSubmitReview(selectedRating, '', textarea.value);
                                                            textarea.value = '';
                                                            textarea.style.height = '44px';
                                                            setSelectedRating(0);
                                                        }
                                                    }
                                                }}
                                            />
                                            <button
                                                type="button"
                                                style={{ width: '44px', height: '44px', minWidth: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--primary-color)', border: 'none', borderRadius: '10px', color: '#fff', cursor: 'pointer' }}
                                                onClick={() => {
                                                    const textarea = document.querySelector('.crunch-reviews textarea') as HTMLTextAreaElement;
                                                    if (!selectedRating) { alert('Выберите оценку!'); return; }
                                                    if (textarea?.value.trim()) {
                                                        handleSubmitReview(selectedRating, '', textarea.value);
                                                        textarea.value = '';
                                                        textarea.style.height = '44px';
                                                        setSelectedRating(0);
                                                    }
                                                }}
                                            >
                                                <Send size={18} />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Список отзывов */}
                                {reviewsLoading ? (
                                    <div className="loading-state">
                                        <Loader2 size={32} className="spinning" />
                                        <span>Загрузка отзывов...</span>
                                    </div>
                                ) : reviews.length > 0 ? (
                                    <div className="reviews-list">
                                        {visibleReviews.map((review) => (
                                            <div key={review.id} className="review-card">
                                                <div className="review-header">
                                                    <Link href={`/profile/${review.realUsername || review.username}`} className="review-author">
                                                        <div className="author-avatar">
                                                            {review.avatarUrl ? (
                                                                <AnimatedMedia src={review.avatarUrl} alt={review.username || 'Аноним'} fill objectFit="cover" />
                                                            ) : (
                                                                <span>{(review.username || 'A').charAt(0).toUpperCase()}</span>
                                                            )}
                                                        </div>
                                                        <span className="author-name" style={{ color: getRoleColor(review.role || '') }}>
                                                            {review.nickname || review.username || 'Аноним'}
                                                        </span>
                                                        {getRoleIcon(review.role || '', review.verified)}
                                                    </Link>
                                                    <div className="review-rating">
                                                        {Array.from({ length: 5 }, (_, i) => (
                                                            <Star key={i} size={16} fill={i < review.rating ? '#f5a623' : 'transparent'} color="#f5a623" />
                                                        ))}
                                                    </div>
                                                </div>
                                                {review.content && <p className="review-text">{review.content}</p>}
                                            </div>
                                        ))}

                                        {reviews.length > 5 && handleToggleShowAllReviews && (
                                            <button className="show-more-btn" onClick={handleToggleShowAllReviews}>
                                                {showAllReviews ? 'Скрыть' : `Показать ещё (${reviews.length - 3})`}
                                                {showAllReviews ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="empty-state">
                                        <Star size={48} strokeWidth={1.5} />
                                        <h3>Отзывов пока нет</h3>
                                        <p>Станьте первым!</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'comments' && (
                            <div className="crunch-comments">
                                {/* Форма комментария */}
                                <div style={{ marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid var(--border-color)' }}>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                                        <textarea
                                            placeholder="Напишите комментарий... (Enter — отправить)"
                                            style={{ flex: 1, padding: '12px 16px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '0.9rem', fontFamily: 'inherit', resize: 'none', minHeight: '44px', maxHeight: '150px', overflow: 'hidden' }}
                                            onInput={(e) => {
                                                const textarea = e.target as HTMLTextAreaElement;
                                                textarea.style.height = 'auto';
                                                textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    const textarea = e.target as HTMLTextAreaElement;
                                                    if (textarea.value.trim()) {
                                                        handleSubmitComment(textarea.value);
                                                        textarea.value = '';
                                                        textarea.style.height = '44px';
                                                    }
                                                }
                                            }}
                                        />
                                        <button
                                            type="button"
                                            style={{ width: '44px', height: '44px', minWidth: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--primary-color)', border: 'none', borderRadius: '10px', color: '#fff', cursor: 'pointer' }}
                                            onClick={() => {
                                                const textarea = document.querySelector('.crunch-comments textarea') as HTMLTextAreaElement;
                                                if (textarea?.value.trim()) {
                                                    handleSubmitComment(textarea.value);
                                                    textarea.value = '';
                                                    textarea.style.height = '44px';
                                                }
                                            }}
                                        >
                                            <Send size={18} />
                                        </button>
                                    </div>
                                </div>

                                {/* Список комментариев */}
                                {commentsLoading ? (
                                    <div className="loading-state">
                                        <Loader2 size={32} className="spinning" />
                                        <span>Загрузка комментариев...</span>
                                    </div>
                                ) : comments.length > 0 ? (
                                    <div className="comments-list">
                                        {visibleComments.map((comment) => (
                                            <div key={comment.id} className="comment-card">
                                                <div className="comment-header">
                                                    <Link href={`/profile/${comment.realUsername || comment.username}`} className="comment-author">
                                                        <div className="author-avatar">
                                                            {comment.avatarUrl ? (
                                                                <AnimatedMedia src={comment.avatarUrl} alt={comment.username || 'Аноним'} fill objectFit="cover" />
                                                            ) : (
                                                                <span>{(comment.username || 'A').charAt(0).toUpperCase()}</span>
                                                            )}
                                                        </div>
                                                        <span className="author-name" style={{ color: getRoleColor(comment.role || '') }}>
                                                            {comment.nickname || comment.username || 'Аноним'}
                                                        </span>
                                                        {getRoleIcon(comment.role || '', comment.verified)}
                                                    </Link>
                                                </div>

                                                {/* Режим редактирования */}
                                                {editingCommentId === comment.id ? (
                                                    <div style={{ marginTop: '8px' }}>
                                                        <textarea
                                                            value={editText}
                                                            onChange={(e) => setEditText(e.target.value)}
                                                            style={{ width: '100%', padding: '10px 12px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.9rem', fontFamily: 'inherit', resize: 'none', minHeight: '60px' }}
                                                        />
                                                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                                            <button onClick={handleSaveEditComment} style={{ padding: '6px 12px', background: 'var(--primary-color)', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '0.8rem', cursor: 'pointer' }}>Сохранить</button>
                                                            <button onClick={handleCancelEdit} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-muted)', fontSize: '0.8rem', cursor: 'pointer' }}>Отмена</button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className="comment-text">{comment.text}</p>
                                                )}

                                                <div className="comment-actions">
                                                    <button
                                                        className={`action-btn ${comment.isLiked ? 'active' : ''}`}
                                                        onClick={() => handleLikeComment(comment.id)}
                                                    >
                                                        <Heart size={16} fill={comment.isLiked ? '#e50914' : 'none'} />
                                                        {comment.likes || 0}
                                                    </button>
                                                    <button
                                                        className={`action-btn ${comment.isDisliked ? 'active' : ''}`}
                                                        onClick={() => handleDislikeComment(comment.id)}
                                                        style={{ color: comment.isDisliked ? '#3b82f6' : undefined }}
                                                    >
                                                        <Heart size={16} fill={comment.isDisliked ? '#3b82f6' : 'none'} style={{ transform: 'rotate(180deg)' }} />
                                                        {comment.dislikes || 0}
                                                    </button>
                                                    <button
                                                        className={`action-btn ${expandedComments.has(comment.id) ? 'active' : ''}`}
                                                        onClick={() => handleToggleReplies(comment.id)}
                                                    >
                                                        <MessageCircle size={16} />
                                                        {comment.replies?.length || 0}
                                                    </button>
                                                    <button
                                                        className="action-btn"
                                                        onClick={() => {
                                                            if (activeReplyId === comment.id) {
                                                                setActiveReplyId(null);
                                                                handleCancelReply();
                                                            } else {
                                                                handleStartReply(comment.id);
                                                                setActiveReplyId(comment.id);
                                                            }
                                                        }}
                                                    >
                                                        Ответить
                                                    </button>

                                                    {/* Редактировать/Удалить только для своих комментов */}
                                                    {isCommentOwner(comment) && editingCommentId !== comment.id && (
                                                        <>
                                                            <button
                                                                className="action-btn"
                                                                onClick={() => handleEditComment(comment.id, comment.text)}
                                                            >
                                                                Изменить
                                                            </button>
                                                            <button
                                                                className="action-btn"
                                                                onClick={() => handleDeleteComment(comment.id, comment.text)}
                                                                style={{ color: '#ef4444' }}
                                                            >
                                                                Удалить
                                                            </button>
                                                        </>
                                                    )}
                                                </div>

                                                {/* Форма ответа */}
                                                {activeReplyId === comment.id && (
                                                    <div style={{ marginTop: '12px' }}>
                                                        <textarea
                                                            placeholder={`Ответить ${comment.nickname || comment.username}...`}
                                                            value={replyText}
                                                            onChange={(e) => handleReplyTextChange(e.target.value)}
                                                            style={{ width: '100%', padding: '10px 12px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.85rem', fontFamily: 'inherit', resize: 'none', minHeight: '60px' }}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                                    e.preventDefault();
                                                                    if (replyText.trim()) {
                                                                        handleSubmitReply(comment.id);
                                                                        setActiveReplyId(null);
                                                                    }
                                                                }
                                                            }}
                                                            autoFocus
                                                            onFocus={(e) => {
                                                                const val = e.target.value;
                                                                e.target.setSelectionRange(val.length, val.length);
                                                            }}
                                                        />
                                                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                                            <button
                                                                onClick={() => {
                                                                    setActiveReplyId(null);
                                                                    handleCancelReply();
                                                                }}
                                                                style={{ padding: '6px 14px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-muted)', fontSize: '0.85rem', cursor: 'pointer' }}
                                                            >
                                                                Отмена
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    handleSubmitReply(comment.id);
                                                                    setActiveReplyId(null);
                                                                }}
                                                                style={{ padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--primary-color)', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer', fontSize: '0.85rem' }}
                                                            >
                                                                <Send size={14} /> Отправить
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Ответы на комментарий */}
                                                {comment.replies && comment.replies.length > 0 && expandedComments.has(comment.id) && (
                                                    <div style={{ marginTop: '16px', marginLeft: '40px' }}>
                                                        {comment.replies.map((reply: { id: number; username?: string; nickname?: string; realUsername?: string; avatarUrl?: string; text: string; role?: string; verified?: boolean; likes?: number; isLiked?: boolean; dislikes?: number; isDisliked?: boolean }) => (
                                                            <div key={reply.id} style={{ marginBottom: '16px', position: 'relative', paddingLeft: '20px' }}>
                                                                {/* Изогнутая линия ответа */}
                                                                <svg style={{ position: 'absolute', left: '-2px', top: '-2px', width: '16px', height: '28px' }} viewBox="0 0 20 28">
                                                                    <path d="M4 0 L4 18 Q4 24, 12 24 L20 24" fill="none" stroke="var(--border-color)" strokeWidth="1.5" strokeLinecap="round" />
                                                                </svg>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                                                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', overflow: 'hidden', position: 'relative', background: 'var(--bg-secondary)' }}>
                                                                        {reply.avatarUrl ? (
                                                                            <AnimatedMedia src={reply.avatarUrl} alt={reply.username || 'Аноним'} fill objectFit="cover" />
                                                                        ) : (
                                                                            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', fontSize: '12px' }}>{(reply.username || 'A').charAt(0).toUpperCase()}</span>
                                                                        )}
                                                                    </div>
                                                                    <Link href={`/profile/${reply.realUsername || reply.username}`} style={{ color: getRoleColor(reply.role || ''), fontWeight: 500, fontSize: '0.85rem' }}>
                                                                        {reply.nickname || reply.username || 'Аноним'}
                                                                    </Link>
                                                                    {getRoleIcon(reply.role || '', reply.verified)}
                                                                </div>
                                                                {/* Режим редактирования ответа */}
                                                                {editingReplyId === reply.id ? (
                                                                    <div style={{ margin: '8px 0' }}>
                                                                        <textarea
                                                                            value={editText}
                                                                            onChange={(e) => setEditText(e.target.value)}
                                                                            style={{ width: '100%', padding: '8px 10px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.85rem', fontFamily: 'inherit', resize: 'none', minHeight: '50px' }}
                                                                        />
                                                                        <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                                                                            <button onClick={handleSaveEditReply} style={{ padding: '4px 10px', background: 'var(--primary-color)', border: 'none', borderRadius: '5px', color: '#fff', fontSize: '0.75rem', cursor: 'pointer' }}>Сохранить</button>
                                                                            <button onClick={handleCancelEdit} style={{ padding: '4px 10px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '5px', color: 'var(--text-muted)', fontSize: '0.75rem', cursor: 'pointer' }}>Отмена</button>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <p style={{ margin: '0 0 8px 0', color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                                                                        {reply.text.split(/(@\S+(?:\s*\[[^\]]+\])?)/g).map((part, i) =>
                                                                            part.startsWith('@') ? (
                                                                                <span key={i} style={{ color: 'var(--primary-color)', fontWeight: 500 }}>{part}</span>
                                                                            ) : part
                                                                        )}
                                                                    </p>
                                                                )}
                                                                <div className="comment-actions" style={{ marginTop: '4px' }}>
                                                                    <button
                                                                        className={`action-btn ${reply.isLiked ? 'active' : ''}`}
                                                                        onClick={() => handleLikeReply(reply.id)}
                                                                    >
                                                                        <Heart size={14} fill={reply.isLiked ? '#e50914' : 'none'} />
                                                                        {reply.likes || 0}
                                                                    </button>
                                                                    <button
                                                                        className={`action-btn ${reply.isDisliked ? 'active' : ''}`}
                                                                        onClick={() => handleDislikeReply(reply.id)}
                                                                        style={{ color: reply.isDisliked ? '#3b82f6' : undefined }}
                                                                    >
                                                                        <Heart size={14} fill={reply.isDisliked ? '#3b82f6' : 'none'} style={{ transform: 'rotate(180deg)' }} />
                                                                        {reply.dislikes || 0}
                                                                    </button>
                                                                    <button
                                                                        className="action-btn"
                                                                        onClick={() => {
                                                                            handleStartReply(comment.id);
                                                                            handleReplyTextChange(`@${reply.nickname || reply.username} `);
                                                                            setActiveReplyId(reply.id);
                                                                        }}
                                                                    >
                                                                        <MessageCircle size={14} />
                                                                        Ответить
                                                                    </button>

                                                                    {/* Редактировать/Удалить только для своих ответов */}
                                                                    {isCommentOwner(reply) && editingReplyId !== reply.id && (
                                                                        <>
                                                                            <button
                                                                                className="action-btn"
                                                                                onClick={() => handleEditReply(reply.id, reply.text)}
                                                                            >
                                                                                Изменить
                                                                            </button>
                                                                            <button
                                                                                className="action-btn"
                                                                                onClick={() => handleDeleteReply(reply.id, reply.text)}
                                                                                style={{ color: '#ef4444' }}
                                                                            >
                                                                                Удалить
                                                                            </button>
                                                                        </>
                                                                    )}
                                                                </div>

                                                                {/* Inline Reply Form for Nested Reply using activeReplyId */}
                                                                {activeReplyId === reply.id && (
                                                                    <div style={{ marginTop: '12px', paddingLeft: '20px' }}>
                                                                        <textarea
                                                                            value={replyText}
                                                                            onChange={(e) => handleReplyTextChange(e.target.value)}
                                                                            style={{ width: '100%', padding: '10px 12px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.85rem', fontFamily: 'inherit', resize: 'none', minHeight: '60px' }}
                                                                            onKeyDown={(e) => {
                                                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                                                    e.preventDefault();
                                                                                    if (replyText.trim()) {
                                                                                        handleSubmitReply(comment.id);
                                                                                        setActiveReplyId(null);
                                                                                    }
                                                                                }
                                                                            }}
                                                                            autoFocus
                                                                            onFocus={(e) => {
                                                                                const val = e.target.value;
                                                                                e.target.setSelectionRange(val.length, val.length);
                                                                            }}
                                                                        />
                                                                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                                                            <button
                                                                                onClick={() => {
                                                                                    setActiveReplyId(null);
                                                                                    handleCancelReply();
                                                                                }}
                                                                                style={{ padding: '6px 14px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-muted)', fontSize: '0.85rem', cursor: 'pointer' }}
                                                                            >
                                                                                Отмена
                                                                            </button>
                                                                            <button
                                                                                onClick={() => {
                                                                                    handleSubmitReply(comment.id);
                                                                                    setActiveReplyId(null);
                                                                                }}
                                                                                style={{ padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--primary-color)', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer', fontSize: '0.85rem' }}
                                                                            >
                                                                                <Send size={14} /> Отправить
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                            </div>
                                        ))}

                                        {comments.length > 5 && (
                                            <button className="show-more-btn" onClick={handleToggleShowAllComments}>
                                                {showAllComments ? 'Скрыть' : `Показать ещё (${comments.length - 5})`}
                                                {showAllComments ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="empty-state">
                                        <MessageCircle size={48} strokeWidth={1.5} />
                                        <h3>Комментариев пока нет</h3>
                                        <p>Станьте первым!</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Related Tab (Franchise) */}
                        {activeTab === 'related' && (
                            <div className="crunch-related">
                                <FranchiseSection animeId={Number(animeId)} />
                            </div>
                        )}

                        {/* Similar Tab */}
                        {activeTab === 'similar' && (
                            <div className="crunch-similar">
                                <SimilarAnimeSection animeId={Number(animeId)} genres={anime.genres || ''} />
                            </div>
                        )}
                    </div>
                </div>
            </div>



            {/* Модальные окна */}
            <CommentsModal
                show={showCommentsModal}
                onClose={() => setShowCommentsModal(false)}
                isModern={true}
                animeTitle={anime.title}
                comments={comments}
                onSubmitComment={handleSubmitComment}
                onLikeComment={handleLikeComment}
                onReplyComment={handleReplyComment}
                onOpen={loadComments}
                loading={commentsLoading}
            />
            <AuthPromptModal show={showAuthPrompt} onClose={() => setShowAuthPrompt(false)} />

            <DeleteCommentModal
                isOpen={showDeleteModal}
                onClose={closeDeleteModal}
                onConfirm={confirmDelete}
                commentText={deleteTarget?.text || ''}
                isReply={deleteTarget?.type === 'reply'}
            />

            <SourceSelectionModal
                isOpen={showSourceModal}
                onClose={() => setShowSourceModal(false)}
                animeId={animeId}
                animeTitle={anime.title}
                animeCover={anime.coverUrl}
                onSourceSelect={handleSourceSelect}
            />
        </div>
    );
};

export default AnimePageCrunch;
