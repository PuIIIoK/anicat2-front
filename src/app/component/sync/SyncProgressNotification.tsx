'use client';

import React, { useEffect, useState, useRef } from 'react';
import { X, RefreshCw, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SyncMessage {
    type: 'start' | 'progress' | 'anime_update' | 'complete' | 'error' | 'cancelled' | 'connected';
    message: string;
    animeTitle?: string;
    animeId?: number;
    oldEpisodeCount?: string;
    newEpisodeCount?: string;
    source?: string;
    currentIndex?: number;
    totalCount?: number;
    progressPercent?: number;
    timestamp?: number;
}

interface SyncProgressNotificationProps {
    apiServer: string;
}

const SyncProgressNotification: React.FC<SyncProgressNotificationProps> = ({ apiServer }) => {
    const [isVisible, setIsVisible] = useState(false); // Скрыта по умолчанию
    const [isConnected, setIsConnected] = useState(false);
    const [syncData, setSyncData] = useState<SyncMessage | null>(null);
    const [logs, setLogs] = useState<SyncMessage[]>([]);
    const [isMinimized, setIsMinimized] = useState(false); // Начинаем в развёрнутом состоянии
    const [currentMessage, setCurrentMessage] = useState<string>('Готов к синхронизации');
    const [syncProgress, setSyncProgress] = useState<{current: number, total: number, percent: number}>({current: 0, total: 0, percent: 0});
    const websocketRef = useRef<WebSocket | null>(null);
    const messageTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const router = useRouter();

    useEffect(() => {
        // Проверяем, авторизован ли пользователь и подключаемся к WebSocket
        const checkAuthAndConnect = async () => {
            const token = getTokenFromCookie();
            if (token) {
                // Сначала проверяем статус синхронизации
                await checkSyncStatus();
                // Затем подключаемся к WebSocket
                connectWebSocket();
            }
        };

        checkAuthAndConnect();

        return () => {
            if (websocketRef.current) {
                websocketRef.current.close();
            }
            if (messageTimeoutRef.current) {
                clearTimeout(messageTimeoutRef.current);
            }
        };
    }, []);

    const getTokenFromCookie = () => {
        if (typeof document === 'undefined') return null;
        const match = document.cookie.match(/(?:^|; )token=([^;]*)/);
        return match ? decodeURIComponent(match[1]) : null;
    };

    // Проверяем текущий статус синхронизации
    const checkSyncStatus = async () => {
        try {
            const token = getTokenFromCookie();
            if (!token) return;

            const res = await fetch(`${apiServer}/api/admin/anime-updates/sync/status`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (res.ok) {
                const data = await res.json();
                const syncInProgress = data.inProgress || false;
                
                if (syncInProgress) {
                    console.log('Обнаружена активная синхронизация, показываем панель');
                    setIsVisible(true);
                    setCurrentMessage('Синхронизация в процессе...');
                    setIsMinimized(false);
                } else {
                    console.log('Синхронизация неактивна, панель скрыта');
                    setIsVisible(false);
                }
            }
        } catch (error) {
            console.error('Ошибка проверки статуса синхронизации (SyncNotification):', error);
        }
    };

    const connectWebSocket = () => {
        try {
            // Правильно определяем протокол для WebSocket
            const wsProtocol = apiServer.startsWith('https') ? 'wss' : 'ws';
            const wsUrl = apiServer.replace(/^https?/, wsProtocol) + '/ws/sync-progress';
            console.log('Подключаемся к WebSocket:', wsUrl);
            
            websocketRef.current = new WebSocket(wsUrl);

            websocketRef.current.onopen = async () => {
                console.log('WebSocket подключен к серверу синхронизации');
                setIsConnected(true);
                // При переподключении проверяем статус синхронизации
                await checkSyncStatus();
            };

            websocketRef.current.onmessage = (event) => {
                try {
                    const message: SyncMessage = JSON.parse(event.data);
                    console.log('WebSocket сообщение:', message);
                    
                    handleSyncMessage(message);
                } catch (error) {
                    console.error('Ошибка обработки WebSocket сообщения:', error);
                }
            };

            websocketRef.current.onclose = (event) => {
                console.log('WebSocket закрыт:', event.reason);
                setIsConnected(false);
                
                // Переподключаемся через 5 секунд если соединение было потеряно
                if (!event.wasClean) {
                    setTimeout(() => {
                        console.log('Переподключение к WebSocket...');
                        connectWebSocket();
                    }, 5000);
                }
            };

            websocketRef.current.onerror = (error) => {
                console.error('WebSocket ошибка:', error);
                setIsConnected(false);
            };

        } catch (error) {
            console.error('Ошибка создания WebSocket:', error);
        }
    };

    const handleSyncMessage = (message: SyncMessage) => {
        setSyncData(message);

        // Показываем панель только при начале синхронизации
        if (message.type === 'start') {
            setIsVisible(true);
            setIsMinimized(false);
            setLogs([]);
            setCurrentMessage(message.message || 'Синхронизация...');
            setSyncProgress({current: 0, total: message.totalCount || 0, percent: 0});
            console.log('Показываем панель синхронизации');
        }

        // Обрабатываем все типы сообщений для синхронизации
        if (['start', 'progress', 'anime_update', 'complete', 'error', 'cancelled'].includes(message.type)) {
            // Добавляем в логи
            setLogs(prev => {
                const newLogs = [...prev, message].slice(-100); // Оставляем последние 100 сообщений
                return newLogs;
            });

            // Обновляем текущее сообщение и прогресс
            setCurrentMessage(message.message || 'Синхронизация...');
            
            if (message.currentIndex && message.totalCount) {
                setSyncProgress({
                    current: message.currentIndex,
                    total: message.totalCount,
                    percent: message.progressPercent || 0
                });
            }

            // Очищаем предыдущий таймаут
            if (messageTimeoutRef.current) {
                clearTimeout(messageTimeoutRef.current);
            }

            // Скрываем панель после завершения/ошибки
            if (['complete', 'error', 'cancelled'].includes(message.type)) {
                messageTimeoutRef.current = setTimeout(() => {
                    setIsVisible(false);
                    setIsMinimized(false);
                    setCurrentMessage('Готов к синхронизации');
                    console.log('Скрываем панель синхронизации');
                }, 10000); // Скрываем через 10 секунд
            }
            
            // Задерживаем обновление сообщения для лучшей читаемости
            if (message.type === 'anime_update' || message.type === 'progress') {
                messageTimeoutRef.current = setTimeout(() => {
                    setCurrentMessage(getProgressText());
                }, 2000); // Показываем сообщение 2 секунды
            }
        }
    };

    const handleClose = () => {
        setIsVisible(false);
        setIsMinimized(false);
        setLogs([]);
    };

    const handleCancel = async () => {
        try {
            const token = getCookieValue('token');
            if (!token) {
                console.error('Токен не найден');
                return;
            }

            const response = await fetch(`${apiServer}/api/admin/anime-updates/sync/cancel`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Ошибка отмены синхронизации');
            }

            console.log('Синхронизация отменена');
        } catch (error) {
            console.error('Ошибка при отмене синхронизации:', error);
        }
    };

    const handleClickNotification = () => {
        // Переходим в админку во вкладку обновления аниме
        router.push('/admin_panel/?admin_panel=edit-anime-updates');
    };

    const getCookieValue = (name: string): string | null => {
        const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
        return match ? decodeURIComponent(match[2]) : null;
    };

    const getStatusIcon = () => {
        if (!syncData) return <Loader size={16} />;

        switch (syncData.type) {
            case 'start':
            case 'progress':
                return <RefreshCw size={16} />;
            case 'anime_update':
                return <CheckCircle size={16} />;
            case 'complete':
                return <CheckCircle size={16} />;
            case 'error':
            case 'cancelled':
                return <AlertCircle size={16} />;
            default:
                return <RefreshCw size={16} />;
        }
    };

    const getIconClass = () => {
        if (!syncData) return 'spinning';

        switch (syncData.type) {
            case 'start':
            case 'progress':
                return 'spinning';
            case 'anime_update':
            case 'complete':
                return 'success';
            case 'error':
            case 'cancelled':
                return 'error';
            default:
                return 'info';
        }
    };

    const getProgressText = () => {
        if (!isConnected) return 'Подключение...';
        if (!syncData) return 'Готов к синхронизации';

        switch (syncData.type) {
            case 'start':
                return 'Начало синхронизации...';
            case 'progress':
                if (syncData.currentIndex && syncData.totalCount) {
                    return `${syncData.currentIndex}/${syncData.totalCount}`;
                }
                return 'Синхронизация...';
            case 'anime_update':
                return 'Найдена новая серия!';
            case 'complete':
                return 'Завершено!';
            case 'error':
                return 'Ошибка!';
            case 'cancelled':
                return 'Отменено!';
            case 'connected':
                return 'Готов к синхронизации';
            default:
                return syncData.message || 'Готов к синхронизации';
        }
    };

    if (!isVisible) return null;

    const syncTypeClass = syncData?.type ? `sync-type-${syncData.type}` : '';
    const connectionClass = isConnected ? 'connected' : 'disconnected';
    const sizeClass = isMinimized ? 'minimized' : 'expanded';

    return (
        <div className={`sync-progress-notification ${connectionClass} ${sizeClass} ${syncTypeClass}`}>
            {/* Заголовок */}
            <div 
                className="sync-header"
                onClick={isMinimized ? () => setIsMinimized(false) : handleClickNotification}
            >
                <div className="sync-header-content">
                    <div className={`sync-icon ${getIconClass()}`}>
                        {getStatusIcon()}
                    </div>
                    <span className="sync-title">
                        Синхронизация аниме
                    </span>
                    <span className="sync-status">
                        {currentMessage}
                    </span>
                </div>
                
                <div className="sync-controls">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsMinimized(!isMinimized);
                        }}
                        className="control-button"
                        title={isMinimized ? 'Развернуть' : 'Свернуть'}
                    >
                        {isMinimized ? '▲' : '▼'}
                    </button>
                    
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleClose();
                        }}
                        className="control-button"
                        title="Закрыть"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* Контент (скрыт когда минимизировано) */}
            {!isMinimized && (
                <div className="sync-content">
                    {/* Прогресс бар */}
                    {(syncProgress.total > 0 || syncData?.progressPercent !== undefined) && (
                        <div className="sync-progress-bar">
                            <div className="progress-track">
                                <div 
                                    className="progress-fill"
                                    style={{ width: `${syncProgress.percent || syncData?.progressPercent || 0}%` }}
                                />
                            </div>
                            <div className="progress-text">
                                {syncProgress.total > 0 
                                    ? `${syncProgress.current} / ${syncProgress.total} (${syncProgress.percent}%)`
                                    : `${syncData?.progressPercent || 0}%`
                                }
                            </div>
                        </div>
                    )}

                    {/* Текущее аниме */}
                    {syncData?.animeTitle && (
                        <div className="sync-current-anime">
                            <h4 className="anime-title">
                                {syncData.animeTitle}
                            </h4>
                            {syncData.oldEpisodeCount && (
                                <div className="anime-episodes">
                                    {syncData.oldEpisodeCount}
                                    {syncData.newEpisodeCount && syncData.newEpisodeCount !== syncData.oldEpisodeCount && (
                                        <span className="episode-change"> → {syncData.newEpisodeCount}</span>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Детальная информация */}
                    <div className="sync-details">
                        <div className="sync-message">
                            {currentMessage}
                        </div>
                        
                        {/* Статистика синхронизации */}
                        {syncProgress.total > 0 && (
                            <div className="sync-stats">
                                <div className="stat-item">
                                    <span className="stat-label">Обработано:</span>
                                    <span className="stat-value">{syncProgress.current}</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-label">Всего:</span>
                                    <span className="stat-value">{syncProgress.total}</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-label">Прогресс:</span>
                                    <span className="stat-value">{syncProgress.percent}%</span>
                                </div>
                            </div>
                        )}
                        
                        {/* Последние логи */}
                        {logs.length > 0 && (
                            <div className="sync-recent-logs">
                                <div className="logs-title">Последние действия:</div>
                                <div className="logs-list">
                                    {logs.slice(-3).reverse().map((log, index) => (
                                        <div key={index} className={`log-item log-${log.type}`}>
                                            <span className="log-time">
                                                {new Date(log.timestamp || Date.now()).toLocaleTimeString()}
                                            </span>
                                            <span className="log-message">
                                                {log.animeTitle ? `${log.animeTitle}: ${log.message}` : log.message}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Кнопки действий */}
                    <div className="sync-actions">
                        {(syncData?.type === 'start' || syncData?.type === 'progress') && (
                            <button
                                onClick={handleCancel}
                                className="action-button cancel-button"
                            >
                                Отменить
                            </button>
                        )}
                        
                        <button
                            onClick={handleClickNotification}
                            className="action-button logs-button"
                        >
                            Открыть логи
                        </button>
                    </div>

                    {/* Статус соединения */}
                    <div className="sync-connection-status">
                        <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`} />
                        <span className="status-text">
                            {isConnected ? 'Подключено' : 'Отключено'}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SyncProgressNotification;
