'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
    Heart, Play, Star, Calendar, Camera, MessageCircle, AlertTriangle,
    X, CheckCircle, PlayCircle, Pause, ChevronDown, Clock, Edit, Trash2,
    ChevronUp, Shield, Crown, Verified, Send, Loader2, ThumbsUp, ThumbsDown, Link2,
    Bookmark, Eye, ListPlus
} from 'lucide-react';
import { API_SERVER } from '@/hosts/constants';
import { getEpisodeProgress } from '@/utils/player/progressCache';
import ScreenshotItem from './ScreenshotItem';
import { useAnimePageLogic } from '../../hooks/useAnimePageLogic';
import AnimePageSkeleton from './AnimePageSkeleton';
import CommentsModal from './CommentsModal';
import AuthPromptModal from './AuthPromptModal';
import DeleteCommentModal from './DeleteCommentModal';
import DiscordStatusTracker from '../DiscordStatusTracker';
import FranchiseSection from './FranchiseSection';
import SimilarAnimeSection from './SimilarAnimeSection';
import ServerErrorPage from '../common/ServerErrorPage';
import AnimatedMedia from '../../../components/AnimatedMedia';
import SourceSelectionModal from './SourceSelectionModal';

const statusOptions = [
    { label: 'Не выбрано', icon: <X size={16} />, value: 'none' },
    { label: 'Запланировано', icon: <Calendar size={16} />, value: 'planned' },
    { label: 'Смотрю', icon: <PlayCircle size={16} />, value: 'watching' },
    { label: 'Просмотрено', icon: <CheckCircle size={16} />, value: 'completed' },
    { label: 'Отложено', icon: <Pause size={16} />, value: 'paused' },
    { label: 'Брошено', icon: <Clock size={16} />, value: 'dropped' },
];

interface AnimePageModernProps {
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

const AnimePageModern: React.FC<AnimePageModernProps> = ({ animeId }) => {
    const {
        anime, isLoading, error, activeTab, showStatusDropdown,
        showCommentsModal, showAuthPrompt, favorites, selectedStatus, averageRating, isSavingStatus,
        screenshotUrls, screenshotsLoading, comments, reviews, commentsLoading, reviewsLoading, totalReviews,
        userReview, isEditingReview,
        handleTabChange, toggleFavorite, handleStatusSelect, handleWatchClick, handleGoToComments,
        handleToggleStatusDropdown, setShowCommentsModal, setShowAuthPrompt,
        loadComments, handleSubmitComment, handleLikeComment, handleDislikeComment,
        handleSubmitReview, handleDeleteReview, handleEditReview, handleCancelEditReview,
        visibleComments, showAllComments, handleToggleShowAllComments,
        visibleReviews, showAllReviews, handleToggleShowAllReviews,
        expandedComments, handleToggleReplies, replyingTo, handleStartReply, handleCancelReply,
        replyText, handleReplyTextChange, handleSubmitReply, handleLikeReply, handleDislikeReply,
        likingComments, likingReplies,
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

    const [isSourceWarningOpen, setIsSourceWarningOpen] = useState(false);
    const [selectedRating, setSelectedRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);

    // Yumeko Episodes State
    const [yumekoVoices, setYumekoVoices] = useState<YumekoVoice[]>([]);
    const [yumekoEpisodes, setYumekoEpisodes] = useState<YumekoEpisode[]>([]);
    const [selectedVoice, setSelectedVoice] = useState<YumekoVoice | null>(null);
    const [episodesLoading, setEpisodesLoading] = useState(false);
    const [voiceChanging, setVoiceChanging] = useState(false);
    const [episodeProgress, setEpisodeProgress] = useState<Record<number, { time: number; ratio: number }>>({});
    const [hasCheckedSource, setHasCheckedSource] = useState(false);
    const [isYumekoAvailable, setIsYumekoAvailable] = useState(false);
    const [hasFranchise, setHasFranchise] = useState(false);

    // Libria Episodes State
    const [libriaEpisodes, setLibriaEpisodes] = useState<LibriaEpisode[]>([]);
    const [isLibriaAvailable, setIsLibriaAvailable] = useState(false);
    const [libriaLoading, setLibriaLoading] = useState(false);
    const [episodeSource, setEpisodeSource] = useState<'libria' | 'yumeko'>('libria');
    const [libriaAlias, setLibriaAlias] = useState<string>('');

    // Franchise/Season State
    const [franchiseItems, setFranchiseItems] = useState<FranchiseItem[]>([]);
    const [selectedSeasonId, setSelectedSeasonId] = useState<number>(parseInt(animeId));
    const [showCollectionDropdown, setShowCollectionDropdown] = useState(false);
    const [isMarkingWatched, setIsMarkingWatched] = useState(false);

    // Store original (current anime) episodes for quick restore
    const [originalLibriaEpisodes, setOriginalLibriaEpisodes] = useState<LibriaEpisode[]>([]);
    const [originalYumekoVoices, setOriginalYumekoVoices] = useState<YumekoVoice[]>([]);
    const [originalYumekoEpisodes, setOriginalYumekoEpisodes] = useState<YumekoEpisode[]>([]);
    const [originalLibriaAvailable, setOriginalLibriaAvailable] = useState(false);
    const [originalYumekoAvailable, setOriginalYumekoAvailable] = useState(false);

    // State for replying to a nested reply (shows form under specific reply)
    const [activeReplyId, setActiveReplyId] = useState<number | string | null>(null);

    // Initial load tracking
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    const loadEpisodeProgress = (episodes: YumekoEpisode[], voiceName: string) => {
        const progressMap: Record<number, { time: number; ratio: number }> = {};
        episodes.forEach(ep => {
            const prog = getEpisodeProgress({
                animeId,
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

    // Check availability on mount
    useEffect(() => {
        // Yumeko Voices
        fetch(`${API_SERVER}/api/yumeko/anime/${animeId}/voices`)
            .then(res => res.ok ? res.json() : [])
            .then((voices: YumekoVoice[]) => {
                setHasCheckedSource(true);
                if (voices.length > 0) {
                    setIsYumekoAvailable(true);
                    setOriginalYumekoAvailable(true);
                    setYumekoVoices(voices);
                    setOriginalYumekoVoices(voices);
                } else {
                    setIsYumekoAvailable(false);
                    setOriginalYumekoAvailable(false);
                }
            })
            .catch(() => {
                setHasCheckedSource(true);
                setIsYumekoAvailable(false);
                setOriginalYumekoAvailable(false);
            });

        // Libria Episodes
        setLibriaLoading(true);
        fetch(`${API_SERVER}/api/libria/episodes/${animeId}`)
            .then(res => res.ok ? res.json() : null)
            .then(async (data) => {
                if (data?.apiUrl && data?.alias) {
                    setLibriaAlias(data.alias);
                    // Fetch episodes from Libria
                    const libriaRes = await fetch(data.apiUrl);
                    const libriaData = await libriaRes.json();
                    if (libriaData.episodes && Array.isArray(libriaData.episodes)) {
                        setLibriaEpisodes(libriaData.episodes);
                        setOriginalLibriaEpisodes(libriaData.episodes); // Save original
                        setIsLibriaAvailable(true);
                        setOriginalLibriaAvailable(true);
                        setEpisodeSource('libria');
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

        // Franchise Check and Load
        fetch(`${API_SERVER}/api/anime/franchise-chain/anime/${animeId}`)
            .then(res => res.ok ? res.json() : [])
            .then((data: FranchiseItem[]) => {
                if (Array.isArray(data) && data.length > 0) {
                    setHasFranchise(true);
                    // Sort by position for proper season order
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

    // Fetch episodes when tab is active
    useEffect(() => {
        if (activeTab === 'episodes' && yumekoVoices.length > 0 && yumekoEpisodes.length === 0) {
            setEpisodesLoading(true);
            const voice = yumekoVoices[0];
            setSelectedVoice(voice);

            fetch(`${API_SERVER}/api/yumeko/voices/${voice.id}/episodes`)
                .then(res => res.ok ? res.json() : [])
                .then((episodes: YumekoEpisode[]) => {
                    setYumekoEpisodes(episodes);
                    loadEpisodeProgress(episodes, voice.name);
                })
                .catch(console.error)
                .finally(() => setEpisodesLoading(false));
        }
    }, [activeTab, yumekoVoices, yumekoEpisodes.length, animeId]);

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

    // Load episodes when season changes (for franchise browsing)
    useEffect(() => {
        // Only reload if selectedSeasonId differs from current animeId
        if (selectedSeasonId.toString() !== animeId) {
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
                        // Load episodes for first voice
                        return fetch(`${API_SERVER}/api/yumeko/voices/${voices[0].id}/episodes`);
                    } else {
                        setIsYumekoAvailable(false);
                        setYumekoVoices([]);
                        setYumekoEpisodes([]);
                        return null;
                    }
                })
                .then(res => res?.ok ? res.json() : [])
                .then((episodes: YumekoEpisode[] | null) => {
                    if (episodes && episodes.length > 0) {
                        setYumekoEpisodes(episodes);
                    }
                })
                .catch(() => {
                    setIsYumekoAvailable(false);
                    setYumekoVoices([]);
                    setYumekoEpisodes([]);
                });
        } else if (originalLibriaEpisodes.length > 0 || originalYumekoVoices.length > 0 || originalLibriaAvailable || originalYumekoAvailable) {
            // Restore original episodes only when returning from another season (not on initial mount)
            setLibriaEpisodes(originalLibriaEpisodes);
            setYumekoVoices(originalYumekoVoices);
            setYumekoEpisodes(originalYumekoEpisodes);
            setIsLibriaAvailable(originalLibriaAvailable);
            setIsYumekoAvailable(originalYumekoAvailable);
            if (originalYumekoVoices.length > 0) {
                setSelectedVoice(originalYumekoVoices[0]);
            }
        }
        // If none of the above - do nothing, let the initial load useEffect handle it
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedSeasonId, animeId]);

    const currentStatus = statusOptions.find(opt => opt.value === selectedStatus);

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
        if (verified) return <Verified size={14} className="verification-icon" />;
        if (!roleString) return null;
        const roles = roleString.split(',').map(r => r.trim().toLowerCase());
        if (roles.includes('admin')) return <Shield size={14} className="role-icon admin" />;
        if (roles.includes('moderator')) return <Shield size={14} className="role-icon moderator" />;
        if (roles.includes('premium')) return <Crown size={14} className="role-icon premium" />;
        return null;
    };

    const getStatusClass = () => {
        if (anime?.status === 'Онгоинг') return 'ongoing';
        if (anime?.status === 'Завершен' || anime?.status === 'Завершён') return 'completed';
        if (anime?.status === 'Анонс') return 'announced';
        return 'status';
    };

    useEffect(() => {
        if (isEditingReview && userReview?.rating) {
            setSelectedRating(userReview.rating);
        } else if (!isEditingReview) {
            setSelectedRating(0);
        }
    }, [isEditingReview, userReview?.rating]);

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

    if (isLoading) return <AnimePageSkeleton isModern={true} />;
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
        <div className="anime-modern">
            <DiscordStatusTracker status={`На странице аниме ${anime.title}`} />

            {/* Breadcrumb */}
            <nav className="anime-modern-breadcrumb">
                <Link href="/">Главная</Link>
                <span className="breadcrumb-separator">&gt;</span>
                <span className="breadcrumb-current">
                    {anime.title}{anime.season ? ` (${anime.season})` : (anime.mouthSeason ? ` (${anime.mouthSeason})` : '')}
                </span>
            </nav>

            {/* Banner */}
            {anime.bannerUrl && (
                <div className="anime-modern-banner">
                    <Image
                        src={anime.bannerUrl}
                        alt="Баннер"
                        fill
                        style={{ objectFit: 'cover' }}
                        unoptimized
                    />
                    <div className="anime-modern-banner-overlay" />
                </div>
            )}

            {/* Top Section: Poster + Info */}
            <div className="anime-modern-top">
                {/* Poster */}
                <div className="anime-modern-poster">
                    <div className="anime-modern-poster-image">
                        {anime.coverUrl ? (
                            <Image src={anime.coverUrl} alt="Постер" fill style={{ objectFit: 'cover' }} unoptimized />
                        ) : (
                            <div className="anime-modern-poster-placeholder">Нет постера</div>
                        )}
                    </div>
                </div>

                {/* Info */}
                <div className="anime-modern-info">
                    {/* Title */}
                    <h1 className="anime-modern-title">{anime.title}</h1>
                    {anime.alttitle && <p className="anime-modern-subtitle">{anime.alttitle}</p>}

                    {/* Badges */}
                    <div className="anime-modern-badges">
                        {anime.rating && <span className="anime-modern-badge age">{anime.rating}</span>}
                        {typeof averageRating === 'number' && averageRating > 0 && (
                            <span className="anime-modern-badge rating">
                                <Star size={12} fill="currentColor" />
                                {averageRating.toFixed(1)}
                            </span>
                        )}
                        {anime.status && <span className={`anime-modern-badge ${getStatusClass()}`}>{anime.status}</span>}
                    </div>

                    {/* Meta Info */}
                    <div className="anime-modern-meta">
                        {anime.type && (
                            <div className="anime-modern-meta-row">
                                <span className="meta-label">Тип:</span>
                                <span className="meta-value white-text">
                                    {anime.type}
                                    {anime.season ? ` (${anime.season})` : ''}
                                </span>
                            </div>
                        )}

                        {(anime.mouthSeason || anime.year) && (
                            <div className="anime-modern-meta-row">
                                <span className="meta-label">Год выхода:</span>
                                <span className="meta-value white-text">
                                    {[anime.mouthSeason, anime.year].filter(Boolean).join(', ')}
                                </span>
                            </div>
                        )}

                        {(anime.episodeAll || anime.currentEpisode) && (
                            <div className="anime-modern-meta-row">
                                <span className="meta-label">Эпизодов:</span>
                                <span className="meta-value white-text">
                                    {(() => {
                                        const current = anime.currentEpisode;
                                        const total = anime.episodeAll;

                                        if (current && total && String(current) !== String(total)) {
                                            return `${current} из ${total}`;
                                        } else if (current && !total) {
                                            return `${current} из ?`;
                                        } else if (total) {
                                            return total;
                                        }
                                        return null;
                                    })()}
                                </span>
                            </div>
                        )}

                        {anime.genres && (
                            <div className="anime-modern-meta-row">
                                <span className="meta-label">Жанры:</span>
                                <div className="anime-modern-genres">
                                    {anime.genres.split(',').map((g, i) => (
                                        <span key={i} className="anime-modern-genre white-text">{g.trim()}</span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {anime.studio && (
                            <div className="anime-modern-meta-row">
                                <span className="meta-label">Студия:</span>
                                <span className="meta-value white-text">{anime.studio}</span>
                            </div>
                        )}

                        {anime.realesedFor && (
                            <div className="anime-modern-meta-row">
                                <span className="meta-label">Первоисточник:</span>
                                <span className="meta-value white-text">{anime.realesedFor}</span>
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="anime-modern-actions">
                        <button
                            className="anime-modern-btn-watch"
                            onClick={handleWatchClick}
                            disabled={!anime.opened || isAccessible === false}
                        >
                            <Play size={18} fill="#fff" />
                            {anime.opened ? 'Смотреть' : (anime.anons || 'Скоро')}
                        </button>

                        <button
                            className={`anime-modern-btn-icon ${favorites ? 'active' : ''}`}
                            onClick={toggleFavorite}
                            title={favorites ? 'Убрать из избранного' : 'В избранное'}
                        >
                            <Star size={20} fill={favorites ? 'currentColor' : 'none'} />
                        </button>

                        <div className="anime-modern-status-dropdown">
                            <button
                                className="anime-modern-status-trigger"
                                onClick={handleToggleStatusDropdown}
                                disabled={isSavingStatus}
                            >
                                {isSavingStatus ? (
                                    <Loader2 size={16} className="spinning" />
                                ) : (
                                    <>
                                        <span className="status-icon">{currentStatus?.icon}</span>
                                        <span>{currentStatus?.label || 'Добавить'}</span>
                                        <ChevronDown size={16} className="chevron" />
                                    </>
                                )}
                            </button>
                            {showStatusDropdown && (
                                <div className="anime-modern-status-menu">
                                    {statusOptions.map(option => {
                                        const isActive = selectedStatus === option.value;
                                        return (
                                            <div
                                                key={option.value}
                                                className={`anime-modern-status-item ${isActive ? 'active' : ''} ${isActive ? 'disabled' : ''}`}
                                                onClick={() => !isActive && handleStatusSelect(option.value)}
                                                style={isActive ? { pointerEvents: 'none' as const } : {}}
                                            >
                                                {option.icon}
                                                <span>{option.label}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Notice Section */}
            {anime.zametka && (
                <div className="anime-modern-notice warning">
                    <AlertTriangle size={20} />
                    <span>{anime.zametka}</span>
                </div>
            )}
            {zametka_blocked && (
                <div className="anime-modern-notice blocked">
                    <Shield size={20} />
                    <span>{zametka_blocked}</span>
                </div>
            )}

            {/* Description */}
            {anime.description && (
                <div className="anime-modern-description">
                    <p>{anime.description}</p>
                </div>
            )}

            {/* Tabs Section */}
            <div className="anime-modern-tabs">
                <div className="anime-modern-tabs-nav">
                    <button
                        className={`anime-modern-tab ${activeTab === 'episodes' ? 'active' : ''} ${!isYumekoAvailable && !isLibriaAvailable && hasCheckedSource && !libriaLoading ? 'inactive' : ''}`}
                        onClick={() => {
                            if (!isYumekoAvailable && !isLibriaAvailable && hasCheckedSource && !libriaLoading) {
                                setIsSourceWarningOpen(true);
                            } else {
                                handleTabChange('episodes');
                            }
                        }}
                    >
                        <PlayCircle size={16} />
                        Эпизоды
                    </button>
                    <button
                        className={`anime-modern-tab ${activeTab === 'screenshots' ? 'active' : ''}`}
                        onClick={() => handleTabChange('screenshots')}
                    >
                        <Camera size={16} />
                        Скриншоты {anime.screenshotsCount > 0 && `(${anime.screenshotsCount})`}
                    </button>
                    <button
                        className={`anime-modern-tab ${activeTab === 'reviews' ? 'active' : ''}`}
                        onClick={() => handleTabChange('reviews')}
                        disabled={anime.status === 'Анонс'}
                    >
                        <Star size={16} />
                        Отзывы {totalReviews > 0 && `(${totalReviews})`}
                    </button>
                    <button
                        className={`anime-modern-tab ${activeTab === 'comments' ? 'active' : ''}`}
                        onClick={() => handleTabChange('comments')}
                    >
                        <MessageCircle size={16} />
                        Комментарии {comments.length > 0 && `(${comments.length})`}
                    </button>
                    {hasFranchise && (
                        <button
                            className={`anime-modern-tab ${activeTab === 'related' ? 'active' : ''}`}
                            onClick={() => handleTabChange('related')}
                        >
                            <Link2 size={16} />
                            Связанное
                        </button>
                    )}
                    <button
                        className={`anime-modern-tab ${activeTab === 'similar' ? 'active' : ''}`}
                        onClick={() => handleTabChange('similar')}
                    >
                        <Heart size={16} />
                        Похожее
                    </button>
                </div>

                <div className="anime-modern-tabs-content">
                    {/* Episodes Tab */}
                    {activeTab === 'episodes' && (
                        <div className="anime-modern-episodes">
                            {(libriaLoading || episodesLoading) ? (
                                <div className="anime-modern-loading">
                                    <div className="spinner"></div>
                                    <span>Загрузка эпизодов...</span>
                                </div>
                            ) : (isLibriaAvailable || isYumekoAvailable || franchiseItems.length > 1) ? (
                                <>
                                    {/* Episode Controls Row: Source + Seasons + Collection */}
                                    <div className="episode-controls-row">
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

                                        {/* Single Source Label */}
                                        {isLibriaAvailable && !isYumekoAvailable && (
                                            <div className="source-label">источник Libria</div>
                                        )}
                                        {!isLibriaAvailable && isYumekoAvailable && (
                                            <div className="source-label">источник Yumeko</div>
                                        )}

                                        {/* Season Selector - show only if franchise has multiple items */}
                                        {franchiseItems.length > 1 && (
                                            <div className="season-selector">
                                                {franchiseItems.map((item, idx) => {
                                                    const seasonLabel = item.type === 'TV' || item.type === 'TV-сериал'
                                                        ? `Сезон ${idx + 1}`
                                                        : item.type || `${idx + 1}`;
                                                    return (
                                                        <button
                                                            key={item.id}
                                                            className={`season-tab ${selectedSeasonId === item.id ? 'active' : ''}`}
                                                            onClick={() => setSelectedSeasonId(item.id)}
                                                            title={item.title}
                                                        >
                                                            {seasonLabel}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* Collection Button */}
                                        <div className="collection-quick-add">
                                            <button
                                                className="collection-dropdown-trigger"
                                                onClick={() => setShowCollectionDropdown(!showCollectionDropdown)}
                                            >
                                                <ListPlus size={18} />
                                                <ChevronDown size={14} className={showCollectionDropdown ? 'rotated' : ''} />
                                            </button>

                                            {showCollectionDropdown && (
                                                <div className="collection-dropdown-menu">
                                                    <button
                                                        className={`collection-item ${selectedStatus === 'completed' ? 'active' : ''}`}
                                                        disabled={selectedStatus === 'completed'}
                                                        onClick={() => {
                                                            handleStatusSelect('completed');
                                                            setShowCollectionDropdown(false);
                                                        }}
                                                    >
                                                        <Eye size={16} />
                                                        Просмотрено
                                                    </button>
                                                    <button
                                                        className={`collection-item ${selectedStatus === 'planned' ? 'active' : ''}`}
                                                        disabled={selectedStatus === 'planned'}
                                                        onClick={() => {
                                                            handleStatusSelect('planned');
                                                            setShowCollectionDropdown(false);
                                                        }}
                                                    >
                                                        <Calendar size={16} />
                                                        В планах
                                                    </button>
                                                    <button
                                                        className={`collection-item ${selectedStatus === 'watching' ? 'active' : ''}`}
                                                        disabled={selectedStatus === 'watching'}
                                                        onClick={() => {
                                                            handleStatusSelect('watching');
                                                            setShowCollectionDropdown(false);
                                                        }}
                                                    >
                                                        <PlayCircle size={16} />
                                                        Смотрю
                                                    </button>
                                                    <button
                                                        className={`collection-item ${selectedStatus === 'paused' ? 'active' : ''}`}
                                                        disabled={selectedStatus === 'paused'}
                                                        onClick={() => {
                                                            handleStatusSelect('paused');
                                                            setShowCollectionDropdown(false);
                                                        }}
                                                    >
                                                        <Pause size={16} />
                                                        Отложено
                                                    </button>
                                                    <button
                                                        className={`collection-item ${selectedStatus === 'dropped' ? 'active' : ''}`}
                                                        disabled={selectedStatus === 'dropped'}
                                                        onClick={() => {
                                                            handleStatusSelect('dropped');
                                                            setShowCollectionDropdown(false);
                                                        }}
                                                    >
                                                        <X size={16} />
                                                        Брошено
                                                    </button>
                                                    <div className="collection-divider" />
                                                    <button
                                                        className={`collection-item favorite ${favorites ? 'active' : ''}`}
                                                        onClick={() => {
                                                            toggleFavorite();
                                                            setShowCollectionDropdown(false);
                                                        }}
                                                    >
                                                        <Heart size={16} fill={favorites ? 'currentColor' : 'none'} />
                                                        {favorites ? 'Убрать из любимых' : 'В любимые'}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Libria Episodes */}
                                    {((episodeSource === 'libria' && isLibriaAvailable) || (!isYumekoAvailable && isLibriaAvailable)) && (
                                        <div className="anime-modern-episodes-grid">
                                            <div className="episodes-list">
                                                {libriaEpisodes.map(episode => (
                                                    <Link
                                                        key={episode.id}
                                                        href={`/watch-another-source/${selectedSeasonId}?forceSource=libria&episode=${episode.ordinal}&title=${encodeURIComponent(anime.title || '')}`}
                                                        className="episode-card"
                                                    >
                                                        <div className="episode-thumbnail-wrapper">
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
                                                            {/* Info overlay */}
                                                            <div className="episode-info-overlay">
                                                                {episode.name && <span className="episode-name">{episode.name}</span>}
                                                                <span className="episode-number">{episode.ordinal} эпизод</span>
                                                            </div>
                                                        </div>
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Yumeko Episodes */}
                                    {((episodeSource === 'yumeko' && isYumekoAvailable) || (!isLibriaAvailable && isYumekoAvailable)) && (
                                        <div className="anime-modern-episodes-grid">
                                            {/* Voice Selector */}
                                            {yumekoVoices.length > 1 && (
                                                <div className="voice-selector">
                                                    {yumekoVoices.map(voice => (
                                                        <button
                                                            key={voice.id}
                                                            onClick={() => handleVoiceChange(voice)}
                                                            className={selectedVoice?.id === voice.id ? 'active' : ''}
                                                        >
                                                            {voice.name}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Episodes Grid */}
                                            <div className="episodes-list">
                                                {yumekoEpisodes.map(episode => {
                                                    const progress = episodeProgress[episode.episodeNumber];
                                                    const watchedMin = progress ? Math.floor(progress.time / 60) : 0;

                                                    return (
                                                        <Link
                                                            key={episode.id}
                                                            href={`/watch/anime/${selectedSeasonId}?source=yumeko&voiceId=${selectedVoice?.id}&voiceName=${encodeURIComponent(selectedVoice?.name || '')}&episodeId=${episode.id}&episodeNumber=${episode.episodeNumber}&title=${encodeURIComponent(anime.title || '')}&cover=${anime.coverUrl || ''}`}
                                                            className="episode-card"
                                                        >
                                                            <div className="episode-thumbnail-wrapper">
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

                                                                {/* Quality badge */}
                                                                <div className="episode-quality">
                                                                    {episode.maxQuality}
                                                                </div>

                                                                {/* Progress bar */}
                                                                {progress && progress.ratio > 0 && (
                                                                    <div className="episode-progress">
                                                                        <div className="progress-fill" style={{ width: `${progress.ratio * 100}%` }} />
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
                                        </div>
                                    )}

                                    {/* No Episodes Message - show when no sources available but inside controls */}
                                    {!isLibriaAvailable && !isYumekoAvailable && (
                                        <div className="anime-modern-empty">
                                            <PlayCircle size={48} />
                                            <h3>Эпизоды недоступны</h3>
                                            <p>В источниках Yumeko и Libria нет серий для этого сезона.</p>
                                            <p style={{ opacity: 0.7, marginTop: '8px' }}>Попробуйте посмотреть в источнике Kodik</p>
                                            <button
                                                className="anime-modern-btn-watch"
                                                onClick={handleWatchClick}
                                                style={{ marginTop: '16px' }}
                                            >
                                                <Play size={18} fill="#fff" />
                                                Смотреть в Kodik
                                            </button>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="anime-modern-empty">
                                    <PlayCircle size={48} />
                                    <h3>Эпизоды недоступны</h3>
                                    <p>В источниках Yumeko и Libria нет серий для этого аниме.</p>
                                    <p style={{ opacity: 0.7, marginTop: '8px' }}>Попробуйте посмотреть в источнике Kodik</p>
                                    <button
                                        className="anime-modern-btn-watch"
                                        onClick={handleWatchClick}
                                        style={{ marginTop: '16px' }}
                                    >
                                        <Play size={18} fill="#fff" />
                                        Смотреть в Kodik
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Screenshots Tab */}
                    {activeTab === 'screenshots' && (
                        <div className="anime-modern-screenshots">
                            {screenshotsLoading ? (
                                <div className="anime-modern-loading">
                                    <div className="spinner"></div>
                                    <span>Загрузка скриншотов...</span>
                                </div>
                            ) : screenshotUrls.length > 0 ? (
                                <div className="anime-modern-screenshots-grid">
                                    {screenshotUrls.map((screenshot, index) => (
                                        <ScreenshotItem key={screenshot.id || index} screenshot={screenshot} index={index} />
                                    ))}
                                </div>
                            ) : (
                                <div className="anime-modern-empty">
                                    <Camera size={48} />
                                    <h3>Скриншоты отсутствуют</h3>
                                    <p>Для этого аниме пока нет скриншотов</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Reviews Tab */}
                    {activeTab === 'reviews' && (
                        <div className="anime-modern-reviews">
                            {/* My Review Display */}
                            {userReview && !isEditingReview ? (
                                <div className="anime-modern-my-review">
                                    <div className="my-review-header">
                                        <span className="my-review-label">Ваш отзыв</span>
                                        <div className="my-review-actions">
                                            <button onClick={handleEditReview}>Изменить</button>
                                            <button className="delete" onClick={handleDeleteReview}>Удалить</button>
                                        </div>
                                    </div>
                                    <div className="my-review-rating">
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <Star key={star} size={18} fill={star <= (userReview.rating || 0) ? '#f5a623' : 'transparent'} color="#f5a623" />
                                        ))}
                                    </div>
                                    <p className="my-review-text">{userReview.content}</p>
                                </div>
                            ) : (
                                <div className="anime-modern-review-form">
                                    <div className="form-header">
                                        <span className="form-label">{isEditingReview ? 'Изменить оценку:' : 'Ваша оценка:'}</span>
                                        <div className="rating-stars" onMouseLeave={() => setHoverRating(0)}>
                                            {[1, 2, 3, 4, 5].map(rating => (
                                                <Star
                                                    key={rating}
                                                    size={22}
                                                    className={`star ${rating <= (hoverRating || selectedRating) ? 'active' : ''}`}
                                                    fill={rating <= (hoverRating || selectedRating) ? '#f5a623' : 'transparent'}
                                                    color={rating <= (hoverRating || selectedRating) ? '#f5a623' : 'var(--text-muted)'}
                                                    onMouseEnter={() => setHoverRating(rating)}
                                                    onClick={() => setSelectedRating(rating)}
                                                    style={{ cursor: 'pointer' }}
                                                />
                                            ))}
                                        </div>
                                        {isEditingReview && (
                                            <button onClick={handleCancelEditReview} style={{ marginLeft: 'auto', padding: '4px 10px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px' }}>Отмена</button>
                                        )}
                                    </div>
                                    <div className="form-input">
                                        <textarea
                                            placeholder={isEditingReview ? 'Измените ваш отзыв...' : 'Напишите отзыв... (Enter — отправить)'}
                                            defaultValue={isEditingReview ? (userReview?.content || '') : ''}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    const textarea = e.target as HTMLTextAreaElement;
                                                    if (!selectedRating) { alert('Выберите оценку!'); return; }
                                                    if (textarea.value.trim()) {
                                                        handleSubmitReview(selectedRating, '', textarea.value);
                                                        textarea.value = '';
                                                        setSelectedRating(0);
                                                    }
                                                }
                                            }}
                                        />
                                        <button onClick={() => {
                                            const textarea = document.querySelector('.anime-modern-review-form textarea') as HTMLTextAreaElement;
                                            if (!selectedRating) { alert('Выберите оценку!'); return; }
                                            if (textarea?.value.trim()) {
                                                handleSubmitReview(selectedRating, '', textarea.value);
                                                textarea.value = '';
                                                setSelectedRating(0);
                                            }
                                        }}>
                                            <Send size={18} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Reviews List */}
                            {reviewsLoading ? (
                                <div className="anime-modern-loading">
                                    <div className="spinner"></div>
                                    <span>Загрузка отзывов...</span>
                                </div>
                            ) : reviews.length > 0 ? (
                                <div className="anime-modern-reviews-list">
                                    {visibleReviews.map(review => (
                                        <div key={review.id} className="anime-modern-review-card">
                                            <div className="review-header">
                                                <Link href={`/profile/${review.realUsername || review.username}`} className="review-author">
                                                    <div className="author-avatar">
                                                        {review.avatarUrl ? (
                                                            <AnimatedMedia src={review.avatarUrl} alt={review.username || 'A'} fill objectFit="cover" />
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
                                                    {[1, 2, 3, 4, 5].map(star => (
                                                        <Star key={star} size={16} fill={star <= review.rating ? '#f5a623' : 'transparent'} color="#f5a623" />
                                                    ))}
                                                </div>
                                            </div>
                                            {review.content && <p className="review-text">{review.content}</p>}
                                        </div>
                                    ))}
                                    {reviews.length > 5 && handleToggleShowAllReviews && (
                                        <button className="anime-modern-show-more" onClick={handleToggleShowAllReviews}>
                                            {showAllReviews ? 'Скрыть' : `Показать ещё (${reviews.length - 3})`}
                                            {showAllReviews ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="anime-modern-empty">
                                    <Star size={48} />
                                    <h3>Отзывов пока нет</h3>
                                    <p>Станьте первым!</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Comments Tab */}
                    {activeTab === 'comments' && (
                        <div className="anime-modern-comments">
                            <div className="anime-modern-comment-form">
                                <textarea
                                    placeholder="Напишите комментарий... (Enter — отправить)"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            const textarea = e.target as HTMLTextAreaElement;
                                            if (textarea.value.trim()) {
                                                handleSubmitComment(textarea.value);
                                                textarea.value = '';
                                            }
                                        }
                                    }}
                                />
                                <button onClick={() => {
                                    const textarea = document.querySelector('.anime-modern-comment-form textarea') as HTMLTextAreaElement;
                                    if (textarea?.value.trim()) {
                                        handleSubmitComment(textarea.value);
                                        textarea.value = '';
                                    }
                                }}>
                                    <Send size={18} />
                                </button>
                            </div>

                            {commentsLoading ? (
                                <div className="anime-modern-loading">
                                    <div className="spinner"></div>
                                    <span>Загрузка комментариев...</span>
                                </div>
                            ) : comments.length > 0 ? (
                                <div className="anime-modern-comments-list">
                                    {visibleComments.map(comment => (
                                        <div key={comment.id} className="anime-modern-comment-card">
                                            <div className="comment-header">
                                                <div className="comment-avatar">
                                                    {comment.avatarUrl ? (
                                                        <AnimatedMedia src={comment.avatarUrl} alt={comment.username || 'A'} fill objectFit="cover" />
                                                    ) : (
                                                        <span>{(comment.username || 'A').charAt(0).toUpperCase()}</span>
                                                    )}
                                                </div>
                                                <Link href={`/profile/${comment.realUsername || comment.username}`} className="comment-author" style={{ color: getRoleColor(comment.role || '') }}>
                                                    {comment.nickname || comment.username || 'Аноним'}
                                                </Link>
                                                {getRoleIcon(comment.role || '', comment.verified)}
                                            </div>
                                            {/* Comment Text or Edit Form */}
                                            {editingCommentId === comment.id ? (
                                                <div className="comment-edit-form">
                                                    <textarea
                                                        value={editText}
                                                        onChange={(e) => setEditText(e.target.value)}
                                                        autoFocus
                                                    />
                                                    <div className="edit-actions">
                                                        <button onClick={handleSaveEditComment}>Сохранить</button>
                                                        <button onClick={handleCancelEdit}>Отмена</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="comment-text">{comment.text}</p>
                                            )}
                                            <div className="comment-actions">
                                                <button
                                                    className={`action-btn ${comment.isLiked ? 'active' : ''}`}
                                                    onClick={() => handleLikeComment(comment.id)}
                                                    disabled={likingComments?.has?.(comment.id)}
                                                >
                                                    <Heart size={16} fill={comment.isLiked ? '#e50914' : 'none'} />
                                                    {comment.likes || 0}
                                                </button>
                                                <button
                                                    className={`action-btn ${comment.isDisliked ? 'active' : ''}`}
                                                    onClick={() => handleDislikeComment(comment.id)}
                                                    disabled={likingComments?.has?.(comment.id)}
                                                    style={{ color: comment.isDisliked ? '#3b82f6' : undefined }}
                                                >
                                                    <Heart size={16} fill={comment.isDisliked ? '#3b82f6' : 'none'} style={{ transform: 'rotate(180deg)' }} />
                                                    {comment.dislikes || 0}
                                                </button>
                                                <button onClick={() => handleToggleReplies(comment.id)} className={`action-btn ${expandedComments.has(comment.id) ? 'active' : ''}`}>
                                                    <MessageCircle size={16} /> {comment.replies?.length || 0}
                                                </button>
                                                <button className="action-btn text-btn" onClick={() => {
                                                    handleStartReply(comment.id);
                                                    setActiveReplyId(comment.id);
                                                }}>
                                                    Ответить
                                                </button>
                                                {isCommentOwner(comment) && editingCommentId !== comment.id && (
                                                    <>
                                                        <button className="action-btn text-btn" onClick={() => handleEditComment(comment.id, comment.text)}>
                                                            Изменить
                                                        </button>
                                                        <button className="action-btn text-btn delete" onClick={() => handleDeleteComment(comment.id, comment.text)}>
                                                            Удалить
                                                        </button>
                                                    </>
                                                )}
                                            </div>

                                            {/* Reply Form */}
                                            {/* Inline Reply Form for Main Comment */}
                                            {activeReplyId === comment.id && (
                                                <div className="anime-modern-compact-reply-form">
                                                    <textarea
                                                        placeholder={`Ответ пользователю ${comment.nickname || comment.username}...`}
                                                        value={replyText}
                                                        onChange={(e) => handleReplyTextChange(e.target.value)}
                                                        autoFocus
                                                        onFocus={(e) => {
                                                            const val = e.target.value;
                                                            e.target.setSelectionRange(val.length, val.length);
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                                e.preventDefault();
                                                                handleSubmitReply(comment.id);
                                                                setActiveReplyId(null);
                                                            }
                                                        }}
                                                    />
                                                    <div className="compact-actions">
                                                        <button className="send-btn" onClick={() => {
                                                            handleSubmitReply(comment.id);
                                                            setActiveReplyId(null);
                                                        }}>
                                                            <Send size={14} /> Отправить
                                                        </button>
                                                        <button className="cancel-btn" onClick={() => {
                                                            handleCancelReply();
                                                            setActiveReplyId(null);
                                                        }}>
                                                            Отмена
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Show replies if exists */}
                                            {comment.replies && comment.replies.length > 0 && expandedComments.has(comment.id) && (
                                                <div className="comment-replies">
                                                    <div className="replies-list">
                                                        {comment.replies.map((reply, replyIndex) => {
                                                            const replyId = reply.id || (reply as any).replyId || `reply-${replyIndex}`;
                                                            const isReplyOwner = currentUserProfile?.username?.toLowerCase() === String(reply.realUsername || reply.username).toLowerCase();

                                                            return (
                                                                <div key={replyId} className="reply-card" style={{ position: 'relative', paddingLeft: '20px' }}>

                                                                    {/* Изогнутая линия ответа */}
                                                                    <svg style={{ position: 'absolute', left: '-2px', top: '-2px', width: '16px', height: '28px' }} viewBox="0 0 20 28">
                                                                        <path d="M4 0 L4 18 Q4 24, 12 24 L20 24" fill="none" stroke="var(--border-color)" strokeWidth="1.5" strokeLinecap="round" />
                                                                    </svg>

                                                                    <div className="reply-header">
                                                                        <div className="reply-avatar">
                                                                            {reply.avatarUrl ? (
                                                                                <AnimatedMedia src={reply.avatarUrl} alt={reply.username || 'A'} fill objectFit="cover" />
                                                                            ) : (
                                                                                <span>{(reply.username || 'A').charAt(0).toUpperCase()}</span>
                                                                            )}
                                                                        </div>
                                                                        <Link href={`/profile/${reply.realUsername || reply.username}`} className="reply-author" style={{ color: getRoleColor(reply.role || '') }}>
                                                                            {reply.nickname || reply.username || 'Аноним'}
                                                                        </Link>
                                                                        {getRoleIcon(reply.role || '', reply.verified)}
                                                                    </div>

                                                                    {/* Reply text or edit form */}
                                                                    {editingReplyId === replyId ? (
                                                                        <div className="reply-edit-form">
                                                                            <textarea
                                                                                value={editText}
                                                                                onChange={(e) => setEditText(e.target.value)}
                                                                                autoFocus
                                                                            />
                                                                            <div className="edit-actions">
                                                                                <button onClick={handleSaveEditReply}>Сохранить</button>
                                                                                <button onClick={handleCancelEdit}>Отмена</button>
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <p className="reply-text">
                                                                            {reply.text.split(/(@\S+(?:\s*\[[^\]]+\])?)/g).map((part, i) =>
                                                                                part.startsWith('@') ? (
                                                                                    <span key={i} style={{ color: 'var(--primary-color)', fontWeight: 500 }}>{part}</span>
                                                                                ) : part
                                                                            )}
                                                                        </p>
                                                                    )}

                                                                    <div className="reply-actions">
                                                                        <button
                                                                            className={`action-btn ${reply.isLiked ? 'active' : ''}`}
                                                                            onClick={() => typeof replyId === 'number' && handleLikeReply(replyId)}
                                                                            disabled={typeof replyId !== 'number'}
                                                                        >
                                                                            <Heart size={14} fill={reply.isLiked ? '#e50914' : 'none'} />
                                                                            {reply.likes || 0}
                                                                        </button>
                                                                        <button
                                                                            className={`action-btn ${reply.isDisliked ? 'active' : ''}`}
                                                                            onClick={() => typeof replyId === 'number' && handleDislikeReply(replyId)}
                                                                            disabled={typeof replyId !== 'number'}
                                                                            style={{ color: reply.isDisliked ? '#3b82f6' : undefined }}
                                                                        >
                                                                            <Heart size={14} fill={reply.isDisliked ? '#3b82f6' : 'none'} style={{ transform: 'rotate(180deg)' }} />
                                                                            {reply.dislikes || 0}
                                                                        </button>
                                                                        <button className="action-btn text-btn" onClick={() => {
                                                                            handleStartReply(comment.id);
                                                                            handleReplyTextChange(`@${reply.nickname || reply.username} `);
                                                                            setActiveReplyId(replyId);
                                                                        }}>
                                                                            Ответить
                                                                        </button>
                                                                        {isReplyOwner && editingReplyId !== replyId && (
                                                                            <>
                                                                                <button className="action-btn text-btn" onClick={() => handleEditReply(replyId as number, reply.text)}>
                                                                                    Изменить
                                                                                </button>
                                                                                <button className="action-btn text-btn delete" onClick={() => handleDeleteReply(replyId as number, reply.text)}>
                                                                                    Удалить
                                                                                </button>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                    <div className="reply-actions">
                                                                        {/* ... action buttons ... */}
                                                                    </div>

                                                                    {/* Inline Reply Form for Nested Reply */}
                                                                    {activeReplyId === replyId && (
                                                                        <div className="anime-modern-compact-reply-form" style={{ marginTop: '8px' }}>
                                                                            <textarea
                                                                                value={replyText}
                                                                                onChange={(e) => handleReplyTextChange(e.target.value)}
                                                                                autoFocus
                                                                                onFocus={(e) => {
                                                                                    const val = e.target.value;
                                                                                    e.target.setSelectionRange(val.length, val.length);
                                                                                }}
                                                                                onKeyDown={(e) => {
                                                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                                                        e.preventDefault();
                                                                                        handleSubmitReply(comment.id);
                                                                                        setActiveReplyId(null);
                                                                                    }
                                                                                }}
                                                                            />
                                                                            <div className="compact-actions">
                                                                                <button className="send-btn" onClick={() => {
                                                                                    handleSubmitReply(comment.id);
                                                                                    setActiveReplyId(null);
                                                                                }}>
                                                                                    <Send size={14} /> Отправить
                                                                                </button>
                                                                                <button className="cancel-btn" onClick={() => {
                                                                                    handleCancelReply();
                                                                                    setActiveReplyId(null);
                                                                                }}>
                                                                                    Отмена
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {comments.length > 10 && handleToggleShowAllComments && (
                                        <button className="anime-modern-show-more" onClick={handleToggleShowAllComments}>
                                            {showAllComments ? 'Скрыть' : `Показать ещё (${comments.length - 10})`}
                                            {showAllComments ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="anime-modern-empty">
                                    <MessageCircle size={48} />
                                    <h3>Комментариев пока нет</h3>
                                    <p>Станьте первым!</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Related Tab (Franchise) */}
                    {activeTab === 'related' && (
                        <div className="anime-modern-related">
                            <FranchiseSection animeId={Number(animeId)} />
                        </div>
                    )}

                    {/* Similar Tab */}
                    {activeTab === 'similar' && (
                        <div className="anime-modern-similar">
                            <SimilarAnimeSection animeId={Number(animeId)} genres={anime.genres || ''} />
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            <CommentsModal
                show={showCommentsModal}
                onClose={() => setShowCommentsModal(false)}
                comments={comments}
                animeTitle={anime.title}
                onSubmitComment={handleSubmitComment}
                onLikeComment={handleLikeComment}
                onReplyComment={() => { }}
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

            {/* Yumeko Source Warning Modal */}
            {
                isSourceWarningOpen && (
                    <div className="anime-modern-modal-overlay" onClick={() => setIsSourceWarningOpen(false)}>
                        <div className="anime-modern-modal" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>Источник недоступен</h3>
                                <button className="modal-close" onClick={() => setIsSourceWarningOpen(false)}>
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="modal-content">
                                <p>В данном аниме нет серий в источнике Yumeko. Воспользуйтесь внешними источниками при нажатии на кнопку "Смотреть".</p>
                            </div>
                            <div className="modal-footer">
                                <button className="modal-btn-primary" onClick={() => setIsSourceWarningOpen(false)}>Понятно</button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default AnimePageModern;
