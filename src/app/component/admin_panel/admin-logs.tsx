'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { API_SERVER } from '@/hosts/constants';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface LogEntry {
    id: number;
    action: string;
    target: string;
    performedBy: string;
    timestamp: string;
}

interface PageData {
    content: LogEntry[];
    totalPages: number;
    totalElements: number;
    number: number;
    size: number;
}

const getTokenFromCookie = () => {
    const match = document.cookie.match(/(?:^|; )token=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : null;
};

const AdminLogs = () => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Параметры фильтрации и пагинации
    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const [pageSize] = useState(20);
    const [actionType, setActionType] = useState<string>('');
    const [sortOrder, setSortOrder] = useState<string>('new');
    const [timePeriod, setTimePeriod] = useState<string>('');
    
    // Параметры поиска
    const [logId, setLogId] = useState<string>('');
    const [username, setUsername] = useState<string>('');
    const [animeId, setAnimeId] = useState<string>('');
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [availableDates, setAvailableDates] = useState<string[]>([]);

    const fetchLogs = useCallback(async () => {
        try {
            setLoading(true);
            const token = getTokenFromCookie();
            if (!token) throw new Error('Токен не найден');

            const params = new URLSearchParams({
                page: currentPage.toString(),
                size: pageSize.toString(),
                sortOrder: sortOrder,
            });
            
            if (actionType) params.append('actionType', actionType);
            if (logId) params.append('logId', logId);
            if (username) params.append('username', username);
            if (animeId) params.append('animeId', animeId);
            if (timePeriod && !selectedDate) params.append('timePeriod', timePeriod);
            if (selectedDate) {
                // Преобразуем дату в ISO формат для бэкенда
                const dateObj = new Date(selectedDate);
                params.append('specificDate', dateObj.toISOString());
            }

            const res = await fetch(`${API_SERVER}/api/admin/logs/paginated?${params}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!res.ok) throw new Error('Ошибка при загрузке логов');
            const data: PageData = await res.json();
            
            setLogs(data.content);
            setTotalPages(data.totalPages);
            setTotalElements(data.totalElements);
        } catch (err) {
            console.error(err);
            setError('Не удалось загрузить логи');
        } finally {
            setLoading(false);
        }
    }, [currentPage, actionType, logId, username, animeId, sortOrder, timePeriod, selectedDate, pageSize]);
    
    const fetchAvailableDates = useCallback(async () => {
        try {
            const token = getTokenFromCookie();
            if (!token) return;

            const res = await fetch(`${API_SERVER}/api/admin/logs/available-dates`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (res.ok) {
                const dates: string[] = await res.json();
                setAvailableDates(dates);
            }
        } catch (err) {
            console.error('Ошибка загрузки доступных дат:', err);
        }
    }, []);
    
    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);
    
    useEffect(() => {
        fetchAvailableDates();
    }, [fetchAvailableDates]);
    
    const handleActionTypeChange = (value: string) => {
        setActionType(value);
        setCurrentPage(0);
    };
    
    const handleSortOrderChange = (value: string) => {
        setSortOrder(value);
        setCurrentPage(0);
    };
    
    const handleTimePeriodChange = (value: string) => {
        setTimePeriod(value);
        setSelectedDate(''); // Сбрасываем конкретную дату при выборе периода
        setCurrentPage(0);
    };
    
    const handleDateChange = (value: string) => {
        setSelectedDate(value);
        setTimePeriod(''); // Сбрасываем период при выборе конкретной даты
        setCurrentPage(0);
    };
    
    const handleSearchChange = (field: 'logId' | 'username' | 'animeId', value: string) => {
        if (field === 'logId') setLogId(value);
        else if (field === 'username') setUsername(value);
        else if (field === 'animeId') setAnimeId(value);
        setCurrentPage(0);
    };
    
    const clearAllFilters = () => {
        setActionType('');
        setLogId('');
        setUsername('');
        setAnimeId('');
        setSortOrder('new');
        setTimePeriod('');
        setSelectedDate('');
        setCurrentPage(0);
    };
    
    const goToPage = (page: number) => {
        if (page >= 0 && page < totalPages) {
            setCurrentPage(page);
        }
    };
    
    // Генерируем массив номеров страниц для отображения
    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        const maxVisible = 5;
        
        if (totalPages <= maxVisible) {
            for (let i = 0; i < totalPages; i++) {
                pages.push(i);
            }
        } else {
            if (currentPage <= 2) {
                for (let i = 0; i < 4; i++) pages.push(i);
                pages.push('...');
                pages.push(totalPages - 1);
            } else if (currentPage >= totalPages - 3) {
                pages.push(0);
                pages.push('...');
                for (let i = totalPages - 4; i < totalPages; i++) pages.push(i);
            } else {
                pages.push(0);
                pages.push('...');
                pages.push(currentPage - 1);
                pages.push(currentPage);
                pages.push(currentPage + 1);
                pages.push('...');
                pages.push(totalPages - 1);
            }
        }
        
        return pages;
    };


    if (error) return <div className="mobile-error">{error}</div>;

    return (
        <div className="admin-section admin-logs-container">
            {/* Фильтры */}
            <div className="admin-logs-filters">
                <div className="filter-row">
                    <div className="filter-group">
                        <label>Действие:</label>
                        <select 
                            value={actionType} 
                            onChange={(e) => handleActionTypeChange(e.target.value)}
                            className="filter-select"
                        >
                            <option value="">Все действия</option>
                            <option value="Создание аниме">Создание аниме</option>
                            <option value="Редактирование аниме">Редактирование аниме</option>
                            <option value="Добавление в категорию">Добавление в категорию</option>
                            <option value="Изменение порядка аниме в цепочке франшизы">Управление франшизой</option>
                            <option value="Обновление информации">Обновление информации</option>
                        </select>
                    </div>
                    
                    <div className="filter-group">
                        <label>Сортировка:</label>
                        <select 
                            value={sortOrder} 
                            onChange={(e) => handleSortOrderChange(e.target.value)}
                            className="filter-select"
                        >
                            <option value="new">Новые</option>
                            <option value="old">Старые</option>
                        </select>
                    </div>
                    
                    <div className="filter-group">
                        <label>Период:</label>
                        <select 
                            value={timePeriod} 
                            onChange={(e) => handleTimePeriodChange(e.target.value)}
                            className="filter-select"
                            disabled={!!selectedDate}
                        >
                            <option value="">Все время</option>
                            <option value="week">За неделю</option>
                            <option value="month">За месяц</option>
                            <option value="year">За год</option>
                        </select>
                    </div>
                </div>
                
                <div className="filter-row">
                    <div className="filter-group">
                        <label>ID Лога:</label>
                        <input
                            type="number"
                            value={logId}
                            onChange={(e) => handleSearchChange('logId', e.target.value)}
                            className="filter-input"
                            placeholder="Поиск по ID"
                        />
                    </div>
                    
                    <div className="filter-group">
                        <label>Пользователь:</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => handleSearchChange('username', e.target.value)}
                            className="filter-input"
                            placeholder="Поиск по имени"
                        />
                    </div>
                    
                    <div className="filter-group">
                        <label>ID Аниме:</label>
                        <input
                            type="text"
                            value={animeId}
                            onChange={(e) => handleSearchChange('animeId', e.target.value)}
                            className="filter-input"
                            placeholder="Поиск по ID аниме"
                        />
                    </div>
                    
                    <div className="filter-group">
                        <label>Дата:</label>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => handleDateChange(e.target.value)}
                            className="filter-input filter-date"
                            disabled={!!timePeriod}
                            list="available-dates"
                        />
                        <datalist id="available-dates">
                            {availableDates.map((date, index) => (
                                <option key={index} value={date} />
                            ))}
                        </datalist>
                    </div>
                </div>
                
                <div className="filter-actions">
                    <div className="filter-info">
                        Всего записей: {totalElements}
                    </div>
                    <button onClick={clearAllFilters} className="clear-filters-button">
                        Сбросить все фильтры
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="mobile-loading">Загрузка логов...</div>
            ) : (
                <>
                    {/* Десктопная версия */}
                    <div className="admin-logs-desktop desktop-only">
                        <div className="admin-table">
                            <div className="admin-table-header">
                                <span>ID</span>
                                <span>Действие</span>
                                <span>Событие</span>
                                <span>Кто</span>
                                <span>Когда</span>
                            </div>
                            {logs.map((log) => (
                                <div className="admin-table-row" key={log.id}>
                                    <span>{log.id}</span>
                                    <span>{log.action}</span>
                                    <span>{log.target}</span>
                                    <span>{log.performedBy}</span>
                                    <span>{new Date(log.timestamp).toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Мобильная версия */}
                    <div className="mobile-only logs-table-container">
                        <div className="mobile-logs-list">
                            {logs.map((log) => (
                                <div className="mobile-log-card" key={log.id}>
                                    <div className="log-header">
                                        <div className="log-id">#{log.id}</div>
                                        <div className="log-time">
                                            {new Date(log.timestamp).toLocaleString('ru-RU', {
                                                day: '2-digit',
                                                month: '2-digit',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </div>
                                    </div>
                                    <div className="log-action">{log.action}</div>
                                    <div className="log-details">
                                        <div className="log-target">{log.target}</div>
                                        <div className="log-user">{log.performedBy}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    {/* Пагинация */}
                    {totalPages > 1 && (
                        <div className="admin-logs-pagination">
                            <button
                                onClick={() => goToPage(currentPage - 1)}
                                disabled={currentPage === 0}
                                className="pagination-button"
                                title="Предыдущая страница"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            
                            <div className="pagination-pages">
                                {getPageNumbers().map((page, index) => (
                                    typeof page === 'number' ? (
                                        <button
                                            key={index}
                                            onClick={() => goToPage(page)}
                                            className={`pagination-page ${currentPage === page ? 'active' : ''}`}
                                        >
                                            {page + 1}
                                        </button>
                                    ) : (
                                        <span key={index} className="pagination-ellipsis">
                                            {page}
                                        </span>
                                    )
                                ))}
                            </div>
                            
                            <button
                                onClick={() => goToPage(currentPage + 1)}
                                disabled={currentPage === totalPages - 1}
                                className="pagination-button"
                                title="Следующая страница"
                            >
                                <ChevronRight size={20} />
                            </button>
                            
                            <div className="pagination-info">
                                Страница {currentPage + 1} из {totalPages}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default AdminLogs;
