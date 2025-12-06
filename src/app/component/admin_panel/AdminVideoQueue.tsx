'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { API_SERVER } from '@/hosts/constants';
import { getAuthToken } from '../../utils/auth';
import { Video, Loader2, CheckCircle2, AlertCircle, Clock, Film, RefreshCw } from 'lucide-react';

interface ConversionQueueItem {
    episodeId: number;
    episodeNumber: number;
    voiceName: string;
    voiceId: number;
    animeId: number;
    animeTitle: string;
    videoStatus: string;
    conversionProgress: number;
    maxQuality: string;
    createdAt: string;
}

const AdminVideoQueue: React.FC = () => {
    const [queue, setQueue] = useState<ConversionQueueItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [autoRefresh, setAutoRefresh] = useState(true);

    const fetchQueue = useCallback(async () => {
        try {
            const token = getAuthToken();
            if (!token) {
                setError('Токен не найден');
                return;
            }

            const response = await fetch(`${API_SERVER}/api/admin/yumeko/conversion-queue`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Ошибка получения очереди');
            }

            const data = await response.json();
            setQueue(data);
            setError(null);
        } catch (err) {
            console.error('Ошибка загрузки очереди:', err);
            setError('Не удалось загрузить очередь конвертации');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchQueue();
    }, [fetchQueue]);

    // Автообновление каждые 5 секунд
    useEffect(() => {
        if (!autoRefresh) return;
        
        const interval = setInterval(fetchQueue, 5000);
        return () => clearInterval(interval);
    }, [autoRefresh, fetchQueue]);

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'uploading':
                return { icon: <Loader2 className="animate-spin" size={18} />, text: 'Загрузка', color: '#3b82f6' };
            case 'queued':
                return { icon: <Clock size={18} />, text: 'В очереди', color: '#f59e0b' };
            case 'converting':
                return { icon: <Video size={18} />, text: 'Конвертация', color: '#8b5cf6' };
            case 'ready':
                return { icon: <CheckCircle2 size={18} />, text: 'Готово', color: '#10b981' };
            case 'error':
                return { icon: <AlertCircle size={18} />, text: 'Ошибка', color: '#ef4444' };
            default:
                return { icon: <Clock size={18} />, text: status, color: '#666' };
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="yumeko-admin-video-queue-loading">
                <Loader2 className="animate-spin" size={32} />
                <span>Загрузка очереди...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="yumeko-admin-video-queue-error">
                <AlertCircle size={24} />
                <span>{error}</span>
                <button onClick={fetchQueue}>Повторить</button>
            </div>
        );
    }

    return (
        <div className="yumeko-admin-video-queue">
            {/* Header */}
            <div className="yumeko-admin-video-queue-header">
                <div className="header-left">
                    <Video size={20} />
                    <h3>Очередь конвертации</h3>
                    <span className="queue-count">{queue.length}</span>
                </div>
                <div className="header-right">
                    <label className="auto-refresh-toggle">
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                        />
                        <span>Автообновление</span>
                    </label>
                    <button className="refresh-btn" onClick={fetchQueue}>
                        <RefreshCw size={16} />
                    </button>
                </div>
            </div>

            {/* Queue List */}
            {queue.length === 0 ? (
                <div className="yumeko-admin-video-queue-empty">
                    <Film size={48} />
                    <h4>Очередь пуста</h4>
                    <p>Нет активных загрузок или конвертаций</p>
                </div>
            ) : (
                <div className="yumeko-admin-video-queue-list">
                    {queue.map((item) => {
                        const statusInfo = getStatusInfo(item.videoStatus);
                        return (
                            <div key={item.episodeId} className="queue-item">
                                <div className="queue-item-status" style={{ color: statusInfo.color }}>
                                    {statusInfo.icon}
                                </div>
                                
                                <div className="queue-item-info">
                                    <div className="queue-item-title">
                                        <span className="episode-number">Эпизод {item.episodeNumber}</span>
                                        <span className="quality-badge">{item.maxQuality}</span>
                                    </div>
                                    <div className="queue-item-details">
                                        <span className="voice-name">{item.voiceName}</span>
                                        <span className="separator">•</span>
                                        <span className="anime-title">{item.animeTitle}</span>
                                    </div>
                                </div>

                                <div className="queue-item-progress">
                                    {item.videoStatus === 'converting' && (
                                        <>
                                            <div className="progress-bar">
                                                <div 
                                                    className="progress-fill" 
                                                    style={{ width: `${item.conversionProgress}%` }}
                                                />
                                            </div>
                                            <span className="progress-text">{item.conversionProgress}%</span>
                                        </>
                                    )}
                                    {item.videoStatus === 'queued' && (
                                        <span className="status-text" style={{ color: statusInfo.color }}>
                                            {statusInfo.text}
                                        </span>
                                    )}
                                    {item.videoStatus === 'uploading' && (
                                        <span className="status-text" style={{ color: statusInfo.color }}>
                                            {statusInfo.text}...
                                        </span>
                                    )}
                                </div>

                                <div className="queue-item-time">
                                    {formatDate(item.createdAt)}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default AdminVideoQueue;
