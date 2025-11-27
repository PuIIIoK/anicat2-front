'use client';

import React, { useState, useEffect } from 'react';
import { Clock, Upload, Cog, CheckCircle, AlertCircle, FileVideo, Users } from 'lucide-react';
import { useServerUrl } from '@/app/context/RegionalServerContext';
import { SERVER_URL2 } from '@/hosts/constants';
import './upload-queue.scss';

interface UploadQueueItem {
    id: number;
    animeTitle: string;
    voiceName: string;
    episodeNumber: number;
    maxQuality: string;
    fileSize: number;
    originalFilename: string;
    uploadStatus: 'IN_QUEUE' | 'UPLOADING' | 'PROCESSING' | 'COMPLETED' | 'ERROR';
    uploadProgress: number;
    createdAt: string;
    errorMessage?: string;
}

interface QueueStats {
    totalActive: number;
    inQueue: number;
    uploading: number;
    processing: number;
}

interface Props {
    animeId?: number; // Если передано, показывать только для этого аниме
    compact?: boolean; // Компактный режим
}

const UploadQueueViewer: React.FC<Props> = ({ animeId, compact = false }) => {
    const [queue, setQueue] = useState<UploadQueueItem[]>([]);
    const [stats, setStats] = useState<QueueStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    // Используем fallback если контекст недоступен
    let serverUrl: string;
    try {
        serverUrl = useServerUrl();
    } catch {
        serverUrl = SERVER_URL2;
    }

    const fetchQueue = async () => {
        try {
            const url = animeId 
                ? `${serverUrl}/api/upload-queue/anime/${animeId}`
                : `${serverUrl}/api/upload-queue`;
            
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                setQueue(data);
            }
        } catch (error) {
            console.error('Ошибка загрузки очереди:', error);
        }
    };

    const fetchStats = async () => {
        if (animeId) return; // Статистика только для глобальной очереди
        
        try {
            const response = await fetch(`${serverUrl}/api/upload-queue/stats`);
            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        } catch (error) {
            console.error('Ошибка загрузки статистики:', error);
        }
    };

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            await Promise.all([fetchQueue(), fetchStats()]);
            setIsLoading(false);
        };

        loadData();
        
        // Обновляем каждые 3 секунды
        const interval = setInterval(loadData, 3000);
        return () => clearInterval(interval);
    }, [animeId, serverUrl]);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'IN_QUEUE':
                return <Clock className="queue-icon queue-icon--waiting" size={16} />;
            case 'UPLOADING':
                return <Upload className="queue-icon queue-icon--uploading" size={16} />;
            case 'PROCESSING':
                return <Cog className="queue-icon queue-icon--processing" size={16} />;
            case 'COMPLETED':
                return <CheckCircle className="queue-icon queue-icon--completed" size={16} />;
            case 'ERROR':
                return <AlertCircle className="queue-icon queue-icon--error" size={16} />;
            default:
                return <Clock className="queue-icon" size={16} />;
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'IN_QUEUE':
                return 'В очереди на загрузку';
            case 'UPLOADING':
                return 'Загружается';
            case 'PROCESSING':
                return 'Обрабатывается';
            case 'COMPLETED':
                return 'Завершено';
            case 'ERROR':
                return 'Ошибка';
            default:
                return status;
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024 * 1024) {
            return `${(bytes / 1024).toFixed(1)} KB`;
        } else if (bytes < 1024 * 1024 * 1024) {
            return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
        } else {
            return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
        }
    };

    const formatTimeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 1) return 'только что';
        if (diffMins < 60) return `${diffMins} мин назад`;
        
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours} ч назад`;
        
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays} дн назад`;
    };

    if (isLoading) {
        return (
            <div className={`upload-queue ${compact ? 'upload-queue--compact' : ''}`}>
                <div className="upload-queue__loading">
                    <div className="upload-queue__spinner"></div>
                    <span>Загрузка очереди...</span>
                </div>
            </div>
        );
    }

    if (queue.length === 0) {
        return (
            <div className={`upload-queue ${compact ? 'upload-queue--compact' : ''}`}>
                <div className="upload-queue__empty">
                    <FileVideo size={24} />
                    <span>{animeId ? 'Нет загрузок для этого аниме' : 'Очередь загрузки пуста'}</span>
                </div>
            </div>
        );
    }

    return (
        <div className={`upload-queue ${compact ? 'upload-queue--compact' : ''}`}>
            {!animeId && stats && (
                <div className="upload-queue__header">
                    <div className="upload-queue__title">
                        <Users size={20} />
                        <span>Глобальная очередь загрузки</span>
                    </div>
                    <div className="upload-queue__stats">
                        <span className="stat">Всего: {stats.totalActive}</span>
                        <span className="stat">В очереди: {stats.inQueue}</span>
                        <span className="stat">Загружается: {stats.uploading}</span>
                        <span className="stat">Обрабатывается: {stats.processing}</span>
                    </div>
                </div>
            )}

            <div className="upload-queue__list">
                {queue.map((item) => (
                    <div key={item.id} className={`upload-queue__item upload-queue__item--${item.uploadStatus.toLowerCase()}`}>
                        <div className="upload-queue__item-main">
                            <div className="upload-queue__item-status">
                                {getStatusIcon(item.uploadStatus)}
                                <span className="upload-queue__status-text">
                                    {getStatusText(item.uploadStatus)}
                                </span>
                            </div>
                            
                            <div className="upload-queue__item-info">
                                <div className="upload-queue__item-title">
                                    {item.animeTitle} - {item.voiceName} Эп.{item.episodeNumber}
                                </div>
                                <div className="upload-queue__item-details">
                                    <span className="detail">{item.maxQuality}</span>
                                    <span className="detail">{formatFileSize(item.fileSize)}</span>
                                    <span className="detail">{formatTimeAgo(item.createdAt)}</span>
                                </div>
                            </div>
                        </div>

                        {item.uploadStatus === 'UPLOADING' && (
                            <div className="upload-queue__progress">
                                <div className="progress-bar">
                                    <div 
                                        className="progress-bar__fill"
                                        style={{ width: `${item.uploadProgress}%` }}
                                    ></div>
                                </div>
                                <span className="progress-text">{item.uploadProgress}%</span>
                            </div>
                        )}

                        {item.uploadStatus === 'ERROR' && item.errorMessage && (
                            <div className="upload-queue__error">
                                <span>{item.errorMessage}</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default UploadQueueViewer;
