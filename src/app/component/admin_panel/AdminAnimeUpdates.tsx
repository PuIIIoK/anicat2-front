'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { API_SERVER } from '../../../tools/constants';
import { RefreshCw, AlertCircle, X } from 'lucide-react';

interface AnimeUpdateLog {
    id: number;
    animeId: number;
    animeTitle: string;
    oldEpisodeCount: string;
    newEpisodeCount: string;
    currentEpisodes: string;
    previousEpisodes: string;
    updateSource: 'KODIK_AUTO' | 'MANUAL';
    timestamp: string;
}

const getTokenFromCookie = () => {
    const match = document.cookie.match(/(?:^|; )token=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : null;
};

const AdminAnimeUpdates: React.FC = () => {
    const [updateLogs, setUpdateLogs] = useState<AnimeUpdateLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isManualSyncRunning, setIsManualSyncRunning] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [isSyncActive, setIsSyncActive] = useState(false);
    const websocketRef = useRef<WebSocket | null>(null);
    const [filterType, setFilterType] = useState('ALL');
    
    const PAGE_SIZE = 20;

    const fetchUpdateLogs = async () => {
        try {
            const token = getTokenFromCookie();
            if (!token) throw new Error('Токен не найден');

            const res = await fetch(`${API_SERVER}/api/admin/anime-updates`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!res.ok) throw new Error('Ошибка при загрузке логов обновлений');
            const data = await res.json();
            setUpdateLogs(data);
        } catch (err) {
            console.error(err);
            setError('Не удалось загрузить логи обновлений');
        } finally {
            setLoading(false);
        }
    };

    const fetchLastSyncTime = async () => {
        try {
            const token = getTokenFromCookie();
            if (!token) return;

            const res = await fetch(`${API_SERVER}/api/admin/anime-updates/last-sync`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (res.ok) {
                await res.json();
                // Время последней синхронизации получено, но state удален
            }
        } catch (err) {
            console.error('Ошибка получения времени последней синхронизации:', err);
        }
    };

    // WebSocket подключение для отслеживания статуса синхронизации
    const connectWebSocket = useCallback(() => {
        try {
            // Правильно определяем протокол для WebSocket
            const wsProtocol = API_SERVER.startsWith('https') ? 'wss' : 'ws';
            const wsUrl = API_SERVER.replace(/^https?/, wsProtocol) + '/ws/sync-progress';
            console.log('Подключаемся к WebSocket для отслеживания синхронизации:', wsUrl);
            
            websocketRef.current = new WebSocket(wsUrl);

            websocketRef.current.onopen = () => {
                console.log('WebSocket подключен (AdminAnimeUpdates)');
            };

            websocketRef.current.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    console.log('WebSocket сообщение (AdminAnimeUpdates):', message);
                    
                    // Обновляем состояние кнопки на основе статуса синхронизации
                    switch (message.type) {
                        case 'start':
                            setIsSyncActive(true);
                            setIsManualSyncRunning(true);
                            break;
                        case 'complete':
                        case 'error':
                        case 'cancelled':
                            setIsSyncActive(false);
                            setIsManualSyncRunning(false);
                            // Обновляем логи после завершения синхронизации
                            setTimeout(() => {
                                fetchUpdateLogs();
                                fetchLastSyncTime();
                            }, 1000);
                            break;
                        case 'progress':
                        case 'anime_update':
                            setIsSyncActive(true);
                            setIsManualSyncRunning(true);
                            break;
                    }
                } catch (error) {
                    console.error('Ошибка обработки WebSocket сообщения:', error);
                }
            };

            websocketRef.current.onclose = (event) => {
                console.log('WebSocket закрыт (AdminAnimeUpdates)', event.code, event.reason);
                // Переподключаемся через 3 секунды
                setTimeout(connectWebSocket, 3000);
            };

            websocketRef.current.onerror = (error) => {
                console.error('WebSocket ошибка (AdminAnimeUpdates):', error);
                // WebSocket автоматически закроется после ошибки, onclose вызовется
            };

        } catch (error) {
            console.error('Ошибка подключения WebSocket:', error);
            // Даже если WebSocket не подключился, пробуем переподключиться
            setTimeout(connectWebSocket, 3000);
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        fetchUpdateLogs();
        fetchLastSyncTime();
        checkSyncStatus();
        connectWebSocket();
        
        return () => {
            if (websocketRef.current) {
                websocketRef.current.close();
            }
        };
    }, [connectWebSocket]); // eslint-disable-line react-hooks/exhaustive-deps

    // Проверяем текущий статус синхронизации при загрузке
    const checkSyncStatus = async () => {
        try {
            const token = getTokenFromCookie();
            if (!token) return;

            const res = await fetch(`${API_SERVER}/api/admin/anime-updates/sync/status`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (res.ok) {
                const data = await res.json();
                const syncInProgress = data.inProgress || false;
                setIsSyncActive(syncInProgress);
                setIsManualSyncRunning(syncInProgress);
                console.log('Статус синхронизации при загрузке:', syncInProgress);
            }
        } catch (error) {
            console.error('Ошибка проверки статуса синхронизации:', error);
        }
    };

    const runManualSync = async () => {
        if (isManualSyncRunning || isSyncActive) {
            console.log('Синхронизация уже запущена, пропускаем');
            return;
        }
        
        try {
            setIsManualSyncRunning(true);
            setIsSyncActive(true);
            setError(null);
            
            const token = getTokenFromCookie();
            if (!token) {
                setIsManualSyncRunning(false);
                setIsSyncActive(false);
                throw new Error('Токен не найден');
            }

            console.log('Запуск ручной синхронизации...');
            const res = await fetch(`${API_SERVER}/api/admin/anime-updates/sync`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!res.ok) {
                const errorText = await res.text();
                setIsManualSyncRunning(false);
                setIsSyncActive(false);
                throw new Error(`Ошибка при запуске синхронизации: ${errorText}`);
            }

            const result = await res.json();
            console.log('Синхронизация запущена:', result);

            // Автоматически сбрасываем состояние через 5 минут (на случай если WebSocket не отработает)
            setTimeout(() => {
                if (isManualSyncRunning || isSyncActive) {
                    console.log('Автоматический сброс состояния синхронизации через таймаут');
                    setIsManualSyncRunning(false);
                    setIsSyncActive(false);
                    fetchUpdateLogs();
                    fetchLastSyncTime();
                }
            }, 300000); // 5 минут

            // Глобальный компонент синхронизации покажет прогресс через WebSocket
            // Обновляем логи периодически во время синхронизации
            const pollInterval = setInterval(async () => {
                try {
                    const statusRes = await fetch(`${API_SERVER}/api/admin/anime-updates/sync/status`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    
                    if (statusRes.ok) {
                        const status = await statusRes.json();
                        if (!status.inProgress) {
                            // Синхронизация завершена
                            clearInterval(pollInterval);
                            setIsManualSyncRunning(false);
                            await fetchUpdateLogs();
                            await fetchLastSyncTime();
                        }
                    }
                } catch (e) {
                    console.error('Ошибка проверки статуса:', e);
                }
            }, 3000);

        } catch (err: unknown) {
            console.error('Ошибка ручной синхронизации:', err);
            setError((err as Error)?.message || 'Не удалось запустить синхронизацию');
            setIsManualSyncRunning(false);
        }
    };

    // Проверяем, является ли запись системной (сводной)
    const isSystemLog = (log: AnimeUpdateLog) => {
        return log.animeId === 0 && log.animeTitle.startsWith('СИСТЕМА');
    };

    const filteredLogs = updateLogs.filter(log => {
        // Показываем только системные записи (сводки синхронизации)
        if (!isSystemLog(log)) return false;
        
        switch (filterType) {
            case 'KODIK_AUTO': return log.updateSource === 'KODIK_AUTO';
            case 'MANUAL': return log.updateSource === 'MANUAL';
            default: return true; // ALL
        }
    });

    const totalPages = Math.ceil(filteredLogs.length / PAGE_SIZE);
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const currentLogs = filteredLogs.slice(startIndex, startIndex + PAGE_SIZE);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getSourceDisplay = (source: 'KODIK_AUTO' | 'MANUAL') => {
        switch (source) {
            case 'KODIK_AUTO': return { text: 'Кодик (Авто)', className: 'admin-anime-updates-source-kodik' };
            case 'MANUAL': return { text: 'Вручную', className: 'admin-anime-updates-source-manual' };
            default: return { text: source, className: 'admin-anime-updates-source-unknown' };
        }
    };

    // Состояние для модального окна сводки
    const [showSummaryModal, setShowSummaryModal] = useState(false);
    const [selectedSyncLog, setSelectedSyncLog] = useState<AnimeUpdateLog | null>(null);
    const [summaryData, setSummaryData] = useState<{
        updated: AnimeUpdateLog[];
        total: number;
        updatedCount: number;
    }>({ updated: [], total: 0, updatedCount: 0 });
    const [loadingSummary, setLoadingSummary] = useState(false);

    // Функция для открытия сводки
    const openSummaryModal = async (log: AnimeUpdateLog) => {
        setSelectedSyncLog(log);
        setShowSummaryModal(true);
        setLoadingSummary(true);
        
        try {
            const token = getTokenFromCookie();
            if (!token) return;

            // Загружаем детальные результаты синхронизации по времени
            const response = await fetch(`${API_SERVER}/api/admin/anime-updates/sync-details?timestamp=${encodeURIComponent(log.timestamp)}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const data = await response.json();
                // Группируем данные: обновленные и не обновленные
                const updated = data.filter((item: Record<string, unknown>) => Number(item.animeId) > 0);
                const processedData = {
                    updated: updated,
                    total: parseInt(log.newEpisodeCount.match(/\d+/)?.[0] || '0'), // Извлекаем общее количество
                    updatedCount: updated.length
                };
                setSummaryData(processedData);
            } else {
                setSummaryData({ updated: [], total: 0, updatedCount: 0 });
            }
        } catch (error) {
            console.error('Ошибка загрузки сводки:', error);
            setSummaryData({ updated: [], total: 0, updatedCount: 0 });
        } finally {
            setLoadingSummary(false);
        }
    };

    const closeSummaryModal = () => {
        setShowSummaryModal(false);
        setSelectedSyncLog(null);
        setSummaryData({ updated: [], total: 0, updatedCount: 0 });
    };

    if (loading) return (
        <div className="admin-section">
            <div className="mobile-loading">Загрузка логов обновлений...</div>
        </div>
    );

    if (error) return (
        <div className="admin-section">
            <div className="mobile-error">
                <AlertCircle size={20} />
                <span>{error}</span>
            </div>
        </div>
    );

    return (
        <div className="admin-section admin-anime-updates-container">
            <div className="admin-anime-updates-header">
                <div className="admin-anime-updates-title">
                    <h2>Обновления аниме</h2>
                </div>
                
                <div className="admin-anime-updates-controls">
                    <button 
                        className={`admin-anime-updates-sync-btn ${isSyncActive ? 'active' : ''}`}
                        onClick={runManualSync}
                        disabled={isManualSyncRunning || isSyncActive}
                        title={isManualSyncRunning || isSyncActive ? 'Синхронизация в процессе' : 'Запустить синхронизацию'}
                    >
                        <RefreshCw size={16} className={(isManualSyncRunning || isSyncActive) ? 'spinning' : ''} />
                        {(isManualSyncRunning || isSyncActive) ? 'Синхронизация...' : 'Синхронизировать'}
                    </button>
                    {(isManualSyncRunning || isSyncActive) && (
                        <button 
                            className="admin-anime-updates-reset-btn"
                            onClick={() => {
                                console.log('Принудительный сброс состояния синхронизации');
                                setIsManualSyncRunning(false);
                                setIsSyncActive(false);
                                fetchUpdateLogs();
                                fetchLastSyncTime();
                            }}
                            title="Сбросить состояние синхронизации"
                        >
                            <X size={16} />
                        </button>
                    )}
                    
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="admin-anime-updates-filter-select"
                    >
                        <option value="ALL">Все источники</option>
                        <option value="KODIK_AUTO">Кодик (Авто)</option>
                        <option value="MANUAL">Вручную</option>
                    </select>
                </div>
            </div>

            <div className="admin-anime-updates-stats">
                <span className="admin-anime-updates-stats-text">
                    Показано: {currentLogs.length} из {filteredLogs.length}
                </span>
            </div>

            <div className="admin-anime-updates-desktop-only">
                <div className="admin-anime-updates-table">
                    <div className="admin-anime-updates-table-header">
                        <div className="admin-anime-updates-header-cell">Время</div>
                        <div className="admin-anime-updates-header-cell">Аниме</div>
                        <div className="admin-anime-updates-header-cell">Изменение эпизодов</div>
                        <div className="admin-anime-updates-header-cell">Источник</div>
                        <div className="admin-anime-updates-header-cell">Действия</div>
                    </div>
                    <div className="admin-anime-updates-table-body">
                        {currentLogs.length > 0 ? (
                            currentLogs.map((log) => {
                                const sourceInfo = getSourceDisplay(log.updateSource);
                                return (
                                    <div className="admin-anime-updates-table-row" key={log.id}>
                                        <div className="admin-anime-updates-cell admin-anime-updates-cell-time">
                                            <span className="admin-anime-updates-time-text">
                                                {formatDate(log.timestamp)}
                                            </span>
                                        </div>
                                        <div className="admin-anime-updates-cell admin-anime-updates-cell-anime">
                                            <div className="admin-anime-updates-anime-info">
                                                <span className={`admin-anime-updates-anime-title ${isSystemLog(log) ? 'system-log' : ''}`}>
                                                    {log.animeTitle}
                                                </span>
                                                {!isSystemLog(log) && (
                                                    <span className="admin-anime-updates-anime-id">ID: {log.animeId}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="admin-anime-updates-cell admin-anime-updates-cell-episodes">
                                            {isSystemLog(log) ? (
                                                <div className="admin-anime-updates-system-result">
                                                    <div className="system-description">{log.oldEpisodeCount}</div>
                                                    <div className="system-summary">{log.newEpisodeCount}</div>
                                                </div>
                                            ) : (
                                                <div className="admin-anime-updates-episodes-change">
                                                    <span className="admin-anime-updates-episodes-before">{log.oldEpisodeCount}</span>
                                                    <span className="admin-anime-updates-arrow">→</span>
                                                    <span className="admin-anime-updates-episodes-after">{log.newEpisodeCount}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="admin-anime-updates-cell admin-anime-updates-cell-source">
                                            <span className={`admin-anime-updates-source-badge ${sourceInfo.className}`}>
                                                {sourceInfo.text}
                                            </span>
                                        </div>
                                        <div className="admin-anime-updates-cell admin-anime-updates-cell-actions">
                                            {isSystemLog(log) && (
                                                <button 
                                                    className="admin-anime-updates-summary-btn"
                                                    onClick={() => openSummaryModal(log)}
                                                >
                                                    Сводка
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="admin-anime-updates-no-data">
                                <RefreshCw size={48} />
                                <p>Нет логов обновлений</p>
                                <span>Обновления будут отображаться здесь после автоматической проверки или ручной синхронизации</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="admin-anime-updates-mobile-only">
                <div className="admin-anime-updates-mobile-list">
                    {currentLogs.length > 0 ? (
                        currentLogs.map((log) => {
                            const sourceInfo = getSourceDisplay(log.updateSource);
                            return (
                                <div className="admin-anime-updates-mobile-card" key={log.id}>
                                    <div className="admin-anime-updates-mobile-header">
                                        <div className="admin-anime-updates-mobile-time">
                                            {formatDate(log.timestamp)}
                                        </div>
                                    <div className={`admin-anime-updates-mobile-source ${sourceInfo.className}`}>
                                        {sourceInfo.text}
                                    </div>
                                    {isSystemLog(log) && (
                                        <button 
                                            className="admin-anime-updates-mobile-summary-btn"
                                            onClick={() => openSummaryModal(log)}
                                        >
                                            Сводка
                                        </button>
                                    )}
                                </div>
                                    
                                    <div className="admin-anime-updates-mobile-anime">
                                        <span className={`admin-anime-updates-anime-title ${isSystemLog(log) ? 'system-log' : ''}`}>
                                            {log.animeTitle}
                                        </span>
                                        {!isSystemLog(log) && (
                                            <span className="admin-anime-updates-anime-id">ID: {log.animeId}</span>
                                        )}
                                    </div>
                                    
                                    <div className="admin-anime-updates-mobile-episodes">
                                        {isSystemLog(log) ? (
                                            <div className="admin-anime-updates-mobile-system-result">
                                                <div className="mobile-system-description">{log.oldEpisodeCount}</div>
                                                <div className="mobile-system-summary">{log.newEpisodeCount}</div>
                                            </div>
                                        ) : (
                                            <>
                                                <span>Эпизоды: </span>
                                                <span className="admin-anime-updates-episodes-change">
                                                    {log.oldEpisodeCount} → {log.newEpisodeCount}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="admin-anime-updates-no-data">
                            <RefreshCw size={48} />
                            <p>Нет логов обновлений</p>
                            <span>Обновления будут отображаться здесь после автоматической проверки</span>
                        </div>
                    )}
                </div>
            </div>

            {totalPages > 1 && (
                <div className="admin-anime-updates-pagination">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                            key={page}
                            className={currentPage === page ? 'admin-anime-updates-active' : ''}
                            onClick={() => setCurrentPage(page)}
                        >
                            {page}
                        </button>
                    ))}
                </div>
            )}
            {/* Модальное окно сводки */}
            {showSummaryModal && (
                <div className="admin-anime-updates-modal-overlay" onClick={closeSummaryModal}>
                    <div className="admin-anime-updates-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="admin-anime-updates-modal-header">
                            <h3>Сводка синхронизации</h3>
                            <button className="admin-anime-updates-modal-close" onClick={closeSummaryModal}>
                                ✕
                            </button>
                        </div>
                        
                        <div className="admin-anime-updates-modal-content">
                            {selectedSyncLog && (
                                <div className="admin-anime-updates-modal-info">
                                    <div className="modal-sync-title">{selectedSyncLog.animeTitle}</div>
                                    <div className="modal-sync-time">
                                        {formatDate(selectedSyncLog.timestamp)}
                                    </div>
                                    <div className="modal-sync-result">
                                        {selectedSyncLog.newEpisodeCount}
                                    </div>
                                </div>
                            )}

                            <div className="admin-anime-updates-modal-details">
                                <h4>Детальные результаты:</h4>
                                
                                {loadingSummary ? (
                                    <div className="modal-loading">
                                        <RefreshCw className="spinning" size={24} />
                                        <span>Загрузка результатов...</span>
                                    </div>
                                ) : summaryData.updated.length > 0 || summaryData.total > 0 ? (
                                    <div className="modal-sync-summary">
                                        <div className="modal-summary-stats">
                                            <div className="summary-stat">
                                                <span className="stat-label">Проверено аниме:</span>
                                                <span className="stat-value">{summaryData.total}</span>
                                            </div>
                                            <div className="summary-stat">
                                                <span className="stat-label">Обновлено:</span>
                                                <span className="stat-value updated">{summaryData.updatedCount}</span>
                                            </div>
                                            <div className="summary-stat">
                                                <span className="stat-label">Без изменений:</span>
                                                <span className="stat-value no-changes">{summaryData.total - summaryData.updatedCount}</span>
                                            </div>
                                        </div>

                                        {summaryData.updated.length > 0 && (
                                            <>
                                                <h5>Обновленные аниме:</h5>
                                                <div className="modal-results-list">
                                                    {summaryData.updated.map((detail, index) => (
                                                        <div key={index} className="modal-result-item updated">
                                                            <div className="modal-anime-info">
                                                                <div className="modal-anime-title">{detail.animeTitle}</div>
                                                                <div className="modal-anime-id">ID: {detail.animeId}</div>
                                                            </div>
                                                            <div className="modal-episode-change">
                                                                <span className="before">{detail.oldEpisodeCount}</span>
                                                                <span className="arrow">→</span>
                                                                <span className="after">{detail.newEpisodeCount}</span>
                                                            </div>
                                                            <div className="update-status">
                                                                <span className="status-badge success">Обновлено</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                        
                                        {summaryData.total > summaryData.updatedCount && (
                                            <div className="no-updates-info">
                                                <span>{summaryData.total - summaryData.updatedCount} аниме проверены, но обновлений не найдено</span>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="modal-no-details">
                                        <p>Нет детальных результатов для этой синхронизации</p>
                                        <span>Возможно, обновлений не было или данные недоступны</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminAnimeUpdates;
