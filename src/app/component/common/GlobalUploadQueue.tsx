'use client';

import React, { useState, useEffect } from 'react';
import { Users, X } from 'lucide-react';
import { useServerUrl } from '@/app/context/RegionalServerContext';
import { SERVER_URL2 } from '@/hosts/constants';
import UploadQueueViewer from '../yumeko-video/UploadQueueViewer';
import './global-upload-queue.scss';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

/**
 * Глобальная очередь загрузки - показывает все активные загрузки на сайте
 * Может быть открыта из любого места интерфейса
 */
const GlobalUploadQueue: React.FC<Props> = ({ isOpen, onClose }) => {
    const [queueStats, setQueueStats] = useState<{ totalActive: number } | null>(null);
    
    // Используем fallback если контекст недоступен
    let serverUrl: string;
    try {
        serverUrl = useServerUrl();
    } catch {
        serverUrl = SERVER_URL2;
    }

    useEffect(() => {
        if (!isOpen) return;

        const fetchStats = async () => {
            try {
                const response = await fetch(`${serverUrl}/api/upload-queue/stats`);
                if (response.ok) {
                    const data = await response.json();
                    setQueueStats(data);
                }
            } catch (error) {
                console.error('Ошибка загрузки статистики очереди:', error);
            }
        };

        fetchStats();
        const interval = setInterval(fetchStats, 5000);
        return () => clearInterval(interval);
    }, [isOpen, serverUrl]);

    if (!isOpen) return null;

    return (
        <div className="global-queue-overlay" onClick={onClose}>
            <div className="global-queue-modal" onClick={(e) => e.stopPropagation()}>
                <div className="global-queue-header">
                    <div className="queue-title">
                        <Users size={24} />
                        <span>Глобальная очередь загрузки</span>
                        {queueStats && (
                            <span className="queue-count">
                                ({queueStats.totalActive} активных)
                            </span>
                        )}
                    </div>
                    <button className="close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="global-queue-content">
                    <UploadQueueViewer />
                </div>
            </div>
        </div>
    );
};

export default GlobalUploadQueue;
