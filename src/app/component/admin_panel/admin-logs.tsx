'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { API_SERVER } from '@/hosts/constants';
import { getAuthToken } from '../../utils/auth';
import { ChevronLeft, ChevronRight, Search, Filter, Calendar, User, Hash, X, RefreshCw } from 'lucide-react';

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

const AdminLogs: React.FC = () => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const [pageSize] = useState(20);
    const [actionType, setActionType] = useState<string>('');
    const [sortOrder, setSortOrder] = useState<string>('new');
    const [timePeriod, setTimePeriod] = useState<string>('');
    
    const [logId, setLogId] = useState<string>('');
    const [username, setUsername] = useState<string>('');
    const [animeId, setAnimeId] = useState<string>('');
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [availableDates, setAvailableDates] = useState<string[]>([]);

    const fetchLogs = useCallback(async () => {
        try {
            setLoading(true);
            const token = getAuthToken();
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
                const dateObj = new Date(selectedDate);
                params.append('specificDate', dateObj.toISOString());
            }

            const res = await fetch(`${API_SERVER}/api/admin/logs/paginated?${params}`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` },
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
            const token = getAuthToken();
            if (!token) return;

            const res = await fetch(`${API_SERVER}/api/admin/logs/available-dates`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (res.ok) {
                const dates: string[] = await res.json();
                setAvailableDates(dates);
            }
        } catch (err) {
            console.error('Ошибка загрузки дат:', err);
        }
    }, []);
    
    useEffect(() => { fetchLogs(); }, [fetchLogs]);
    useEffect(() => { fetchAvailableDates(); }, [fetchAvailableDates]);
    
    const handleFilterChange = (setter: (v: string) => void, value: string, resetDate = false) => {
        setter(value);
        if (resetDate) setSelectedDate('');
        setCurrentPage(0);
    };
    
    const handleDateChange = (value: string) => {
        setSelectedDate(value);
        setTimePeriod('');
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
        if (page >= 0 && page < totalPages) setCurrentPage(page);
    };
    
    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        const maxVisible = 5;
        
        if (totalPages <= maxVisible) {
            for (let i = 0; i < totalPages; i++) pages.push(i);
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

    const getActionColor = (action: string) => {
        if (action.includes('Создание')) return 'create';
        if (action.includes('Редактирование') || action.includes('Изменение')) return 'edit';
        if (action.includes('Удаление')) return 'delete';
        if (action.includes('Добавление')) return 'add';
        return 'default';
    };

    // Скелетон
    if (loading && logs.length === 0) {
        return (
            <section className="yumeko-admin-section yumeko-admin-logs">
                <div className="yumeko-admin-logs-skeleton">
                    <div className="skeleton-filters">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="skeleton-filter" />
                        ))}
                    </div>
                    <div className="skeleton-table">
                        {[...Array(10)].map((_, i) => (
                            <div key={i} className="skeleton-row" />
                        ))}
                    </div>
                </div>
            </section>
        );
    }

    if (error) {
        return (
            <section className="yumeko-admin-section yumeko-admin-logs">
                <div className="yumeko-admin-logs-error">
                    <span>{error}</span>
                    <button onClick={() => fetchLogs()}>
                        <RefreshCw size={16} />
                        Повторить
                    </button>
                </div>
            </section>
        );
    }

    return (
        <section className="yumeko-admin-section yumeko-admin-logs">
            {/* Фильтры */}
            <div className="yumeko-admin-logs-filters">
                <div className="yumeko-admin-logs-filters-row">
                    <div className="yumeko-admin-logs-filter">
                        <Filter size={16} />
                        <select 
                            value={actionType} 
                            onChange={(e) => handleFilterChange(setActionType, e.target.value)}
                        >
                            <option value="">Все действия</option>
                            <option value="Создание аниме">Создание</option>
                            <option value="Редактирование аниме">Редактирование</option>
                            <option value="Добавление в категорию">В категорию</option>
                            <option value="Изменение порядка аниме в цепочке франшизы">Франшиза</option>
                            <option value="Обновление информации">Обновление</option>
                        </select>
                    </div>
                    
                    <div className="yumeko-admin-logs-filter">
                        <select 
                            value={sortOrder} 
                            onChange={(e) => handleFilterChange(setSortOrder, e.target.value)}
                        >
                            <option value="new">Новые</option>
                            <option value="old">Старые</option>
                        </select>
                    </div>
                    
                    <div className="yumeko-admin-logs-filter">
                        <Calendar size={16} />
                        <select 
                            value={timePeriod} 
                            onChange={(e) => handleFilterChange(setTimePeriod, e.target.value, true)}
                            disabled={!!selectedDate}
                        >
                            <option value="">Все время</option>
                            <option value="week">Неделя</option>
                            <option value="month">Месяц</option>
                            <option value="year">Год</option>
                        </select>
                    </div>

                    <div className="yumeko-admin-logs-filter">
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => handleDateChange(e.target.value)}
                            disabled={!!timePeriod}
                            list="available-dates"
                        />
                        <datalist id="available-dates">
                            {availableDates.map((date, i) => <option key={i} value={date} />)}
                        </datalist>
                    </div>
                </div>
                
                <div className="yumeko-admin-logs-filters-row">
                    <div className="yumeko-admin-logs-search">
                        <Hash size={16} />
                        <input
                            type="number"
                            value={logId}
                            onChange={(e) => handleFilterChange(setLogId, e.target.value)}
                            placeholder="ID лога"
                        />
                    </div>
                    
                    <div className="yumeko-admin-logs-search">
                        <User size={16} />
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => handleFilterChange(setUsername, e.target.value)}
                            placeholder="Пользователь"
                        />
                    </div>
                    
                    <div className="yumeko-admin-logs-search">
                        <Search size={16} />
                        <input
                            type="text"
                            value={animeId}
                            onChange={(e) => handleFilterChange(setAnimeId, e.target.value)}
                            placeholder="ID аниме"
                        />
                    </div>
                    
                    <button className="yumeko-admin-logs-clear" onClick={clearAllFilters}>
                        <X size={16} />
                        Сбросить
                    </button>
                </div>
                
                <div className="yumeko-admin-logs-info">
                    <span>Найдено: <strong>{totalElements}</strong> записей</span>
                    {loading && <RefreshCw size={14} className="animate-spin" />}
                </div>
            </div>

            {/* Таблица */}
            <div className="yumeko-admin-logs-table">
                <div className="yumeko-admin-logs-table-header">
                    <span className="col-id">ID</span>
                    <span className="col-action">Действие</span>
                    <span className="col-target">Событие</span>
                    <span className="col-user">Пользователь</span>
                    <span className="col-time">Время</span>
                </div>
                
                <div className="yumeko-admin-logs-table-body">
                    {logs.length === 0 ? (
                        <div className="yumeko-admin-logs-empty">
                            Логи не найдены
                        </div>
                    ) : (
                        logs.map((log) => (
                            <div className="yumeko-admin-logs-row" key={log.id}>
                                <span className="col-id">#{log.id}</span>
                                <span className={`col-action action-${getActionColor(log.action)}`}>
                                    {log.action}
                                </span>
                                <span className="col-target">{log.target}</span>
                                <span className="col-user">{log.performedBy}</span>
                                <span className="col-time">
                                    {new Date(log.timestamp).toLocaleString('ru-RU', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Мобильные карточки */}
            <div className="yumeko-admin-logs-cards">
                {logs.map((log) => (
                    <div className="yumeko-admin-logs-card" key={log.id}>
                        <div className="yumeko-admin-logs-card-header">
                            <span className="log-id">#{log.id}</span>
                            <span className={`log-action action-${getActionColor(log.action)}`}>
                                {log.action}
                            </span>
                        </div>
                        <div className="yumeko-admin-logs-card-body">
                            <p className="log-target">{log.target}</p>
                        </div>
                        <div className="yumeko-admin-logs-card-footer">
                            <span className="log-user">
                                <User size={14} />
                                {log.performedBy}
                            </span>
                            <span className="log-time">
                                {new Date(log.timestamp).toLocaleString('ru-RU', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Пагинация */}
            {totalPages > 1 && (
                <div className="yumeko-admin-logs-pagination">
                    <button
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 0}
                        className="yumeko-admin-logs-pagination-btn"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    
                    <div className="yumeko-admin-logs-pagination-pages">
                        {getPageNumbers().map((page, index) => (
                            typeof page === 'number' ? (
                                <button
                                    key={index}
                                    onClick={() => goToPage(page)}
                                    className={`yumeko-admin-logs-pagination-page ${currentPage === page ? 'active' : ''}`}
                                >
                                    {page + 1}
                                </button>
                            ) : (
                                <span key={index} className="yumeko-admin-logs-pagination-dots">
                                    {page}
                                </span>
                            )
                        ))}
                    </div>
                    
                    <button
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages - 1}
                        className="yumeko-admin-logs-pagination-btn"
                    >
                        <ChevronRight size={18} />
                    </button>
                    
                    <span className="yumeko-admin-logs-pagination-info">
                        {currentPage + 1} / {totalPages}
                    </span>
                </div>
            )}
        </section>
    );
};

export default AdminLogs;
