'use client';

import React, { useState, useEffect } from 'react';
import { X, ExternalLink, Crown, ChevronLeft } from 'lucide-react';
import { API_SERVER } from '../../../tools/constants';
import Image from 'next/image';
import { getEpisodeProgress } from '@/utils/player/progressCache';
import '@/styles/components/source-selection-modal.scss';

interface SourceSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    animeId: string;
    animeTitle: string;
    animeCover: string;
    onSourceSelect: (url: string) => void;
}

interface YumekoVoice {
    id: number;
    animeId: number;
    name: string;
    voiceType: string;
    language: string;
    episodesCount: number;
    createdAt: string;
    updatedAt: string;
}

interface YumekoEpisode {
    id: number;
    voiceId: number;
    episodeNumber: number;
    title: string | null;
    durationSeconds: number;
    maxQuality: string;
    screenshotPath: string | null;
    videoStatus: string;
    conversionProgress: number | null;
    hlsBasePath: string;
}

export default function SourceSelectionModal({
    isOpen,
    onClose,
    animeId,
    animeTitle,
    animeCover,
    onSourceSelect
}: SourceSelectionModalProps) {
    const [view, setView] = useState<'source' | 'voices' | 'episodes'>('source');
    const [voices, setVoices] = useState<YumekoVoice[]>([]);
    const [episodes, setEpisodes] = useState<YumekoEpisode[]>([]);
    const [selectedVoice, setSelectedVoice] = useState<YumekoVoice | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [episodeProgress, setEpisodeProgress] = useState<Record<number, { time: number; ratio: number }>>({});

    // Загрузка озвучек при открытии вида Yumeko
    useEffect(() => {
        if (view === 'voices' && isOpen) {
            loadVoices();
        }
    }, [view, isOpen, animeId]);

    const loadVoices = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${API_SERVER}/api/yumeko/anime/${animeId}/voices`);
            if (response.ok) {
                const data: YumekoVoice[] = await response.json();
                setVoices(data);
            }
        } catch (error) {
            console.error('Ошибка загрузки озвучек:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadEpisodes = async (voiceId: number, voiceName: string) => {
        setIsLoading(true);
        try {
            const response = await fetch(`${API_SERVER}/api/yumeko/voices/${voiceId}/episodes`);
            if (response.ok) {
                const data: YumekoEpisode[] = await response.json();
                setEpisodes(data);
                
                // Загрузка прогресса для каждого эпизода
                const progressMap: Record<number, { time: number; ratio: number }> = {};
                data.forEach(ep => {
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
            }
        } catch (error) {
            console.error('Ошибка загрузки серий:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKodikSelect = () => {
        // Переход на обычный плеер с Kodik (сторонний источник)
        const baseParams = new URLSearchParams({
            kodik: animeTitle || '',
            title: animeTitle || '',
            cover: animeCover || ''
        });
        onSourceSelect(`/watch/anime/${animeId}?${baseParams.toString()}`);
        onClose();
    };

    const handleYumekoSelect = () => {
        setView('voices');
    };

    const handleVoiceSelect = async (voice: YumekoVoice) => {
        setSelectedVoice(voice);
        setView('episodes');
        await loadEpisodes(voice.id, voice.name);
    };

    const handleEpisodeSelect = (episode: YumekoEpisode) => {
        if (!selectedVoice) return;
        
        // Переход на плеер с Yumeko (наш источник)
        const params = new URLSearchParams({
            source: 'yumeko',
            voiceId: selectedVoice.id.toString(),
            voiceName: selectedVoice.name,
            episodeId: episode.id.toString(),
            episodeNumber: episode.episodeNumber.toString(),
            title: animeTitle || '',
            cover: animeCover || ''
        });
        onSourceSelect(`/watch/anime/${animeId}?${params.toString()}`);
        onClose();
    };

    const handleBackToSource = () => {
        setView('source');
        setSelectedVoice(null);
        setEpisodes([]);
    };

    const handleBackToVoices = () => {
        setView('voices');
        setSelectedVoice(null);
        setEpisodes([]);
    };

    if (!isOpen) return null;

    return (
        <div className="source-selection-overlay" onClick={onClose}>
            <div className="source-selection-modal" onClick={e => e.stopPropagation()}>
                {view === 'source' ? (
                    <>
                        <div className="source-selection-header">
                            <h2 className="source-selection-title">Выберите сервер для просмотра:</h2>
                            <button className="source-selection-close" onClick={onClose} aria-label="Закрыть">
                                <X size={24} strokeWidth={2} />
                            </button>
                        </div>

                        <div className="source-selection-content">
                            {/* Сторонний источник (Kodik) */}
                            <div className="source-option" onClick={handleKodikSelect}>
                                <div className="source-option-icon">
                                    <ExternalLink size={32} strokeWidth={2} />
                                </div>
                                <div className="source-option-content">
                                    <h3 className="source-option-title">Сторонний источник</h3>
                                    <p className="source-option-description">
                                        Большой выбор озвучек, но нету 2K. В некоторых источниках есть 1080p качество
                                    </p>
                                </div>
                            </div>

                            {/* Наш источник (Yumeko) */}
                            <div className="source-option" onClick={handleYumekoSelect}>
                                <div className="source-option-icon yumeko">
                                    <Crown size={32} strokeWidth={2} />
                                </div>
                                <div className="source-option-content">
                                    <h3 className="source-option-title">Наш источник</h3>
                                    <p className="source-option-description">
                                        Не такой сильный выбор озвучек, но есть 1080p и 2K качество. Подходит тем, у кого ХОРОШИЙ интернет и хочет посмотреть в хорошем качестве аниме
                                    </p>
                                </div>
                            </div>
                        </div>
                    </>
                ) : view === 'voices' ? (
                    <>
                        <div className="source-selection-header">
                            <div className="source-selection-breadcrumb">
                                <button className="breadcrumb-back" onClick={handleBackToSource} aria-label="Назад">
                                    <ChevronLeft size={20} strokeWidth={2.5} />
                                </button>
                                <span className="breadcrumb-text">Выбор источника</span>
                                <span className="breadcrumb-separator">›</span>
                                <span className="breadcrumb-current">Yumeko</span>
                            </div>
                            <button className="source-selection-close" onClick={onClose} aria-label="Закрыть">
                                <X size={24} strokeWidth={2} />
                            </button>
                        </div>

                        <div className="yumeko-selection-content">
                            {isLoading ? (
                                <div className="yumeko-loading">Загрузка...</div>
                            ) : voices.length > 0 ? (
                                <div className="yumeko-voices">
                                    <h3 className="yumeko-section-title">Выберите озвучку:</h3>
                                    <div className="yumeko-voice-list">
                                        {voices.map(voice => (
                                            <div
                                                key={voice.id}
                                                className="yumeko-voice-item"
                                                onClick={() => handleVoiceSelect(voice)}
                                            >
                                                <div className="yumeko-voice-info">
                                                    <div className="yumeko-voice-name">{voice.name}</div>
                                                    <div className="yumeko-voice-meta">
                                                        {voice.episodesCount} {voice.episodesCount === 1 ? 'эпизод' : voice.episodesCount > 1 && voice.episodesCount < 5 ? 'эпизода' : 'эпизодов'}
                                                    </div>
                                                </div>
                                                <ChevronLeft size={20} style={{ transform: 'rotate(180deg)' }} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="yumeko-empty">
                                    <p>Для этого аниме пока нет озвучек в Yumeko</p>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <>
                        <div className="source-selection-header">
                            <div className="source-selection-breadcrumb">
                                <button className="breadcrumb-back" onClick={handleBackToVoices} aria-label="Назад">
                                    <ChevronLeft size={20} strokeWidth={2.5} />
                                </button>
                                <span className="breadcrumb-text">Выбор источника</span>
                                <span className="breadcrumb-separator">›</span>
                                <span className="breadcrumb-text">Yumeko</span>
                                <span className="breadcrumb-separator">›</span>
                                <span className="breadcrumb-current">{selectedVoice?.name}</span>
                            </div>
                            <button className="source-selection-close" onClick={onClose} aria-label="Закрыть">
                                <X size={24} strokeWidth={2} />
                            </button>
                        </div>

                        <div className="yumeko-selection-content">
                            {isLoading ? (
                                <div className="yumeko-loading">Загрузка...</div>
                            ) : episodes.length > 0 ? (
                                <div className="yumeko-episodes">
                                    <h3 className="yumeko-section-title">Выберите эпизод:</h3>
                                    <div className="yumeko-episode-grid">
                                        {episodes.map(episode => (
                                            <div
                                                key={episode.id}
                                                className="yumeko-episode-card"
                                                onClick={() => handleEpisodeSelect(episode)}
                                            >
                                                <div className="yumeko-episode-thumbnail">
                                                    {episode.screenshotPath ? (
                                                        <Image
                                                            src={`${API_SERVER}/api/video/screenshot/${episode.screenshotPath}`}
                                                            alt={`Эпизод ${episode.episodeNumber}`}
                                                            fill
                                                            sizes="200px"
                                                            style={{ objectFit: 'cover' }}
                                                            onError={(e) => {
                                                                e.currentTarget.style.display = 'none';
                                                            }}
                                                        />
                                                    ) : (
                                                        <div className="yumeko-episode-placeholder">
                                                            <span>{episode.episodeNumber}</span>
                                                        </div>
                                                    )}
                                                    <div className="yumeko-episode-quality-badge">
                                                        {episode.maxQuality}
                                                    </div>
                                                    <div className="yumeko-episode-progress-bar">
                                                        <div 
                                                            className="yumeko-episode-progress-fill" 
                                                            style={{ width: `${episodeProgress[episode.episodeNumber]?.ratio ? episodeProgress[episode.episodeNumber].ratio * 100 : 0}%` }}
                                                        />
                                                    </div>
                                                    <div className="yumeko-episode-info">
                                                        <div className="yumeko-episode-title-row">
                                                            <div className="yumeko-episode-title">
                                                                Эпизод {episode.episodeNumber}
                                                                {episode.title && `: ${episode.title}`}
                                                            </div>
                                                            {episodeProgress[episode.episodeNumber] && (
                                                                <div className="yumeko-episode-watched-time">
                                                                    {Math.floor(episodeProgress[episode.episodeNumber].time / 60)} мин
                                                                </div>
                                                            )}
                                                        </div>
                                                        {episode.durationSeconds > 0 && (
                                                            <div className="yumeko-episode-duration">
                                                                {Math.floor(episode.durationSeconds / 60)} мин
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="yumeko-empty">
                                    <p>Нет доступных эпизодов</p>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

