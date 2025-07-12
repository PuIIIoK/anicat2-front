'use client';

import React, { useEffect, useState } from 'react';
import { API_SERVER } from '../../../tools/constants';

interface LogEntry {
    id: number;
    action: string;
    target: string;
    performedBy: string;
    timestamp: string;
}
const getTokenFromCookie = () => {
    const match = document.cookie.match(/(?:^|; )token=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : null;
};
const AdminLogs = () => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        try {
            const token = getTokenFromCookie();
            if (!token) throw new Error('Токен не найден');

            const res = await fetch(`${API_SERVER}/api/admin/logs`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!res.ok) throw new Error('Ошибка при загрузке логов');
            const data = await res.json();
            setLogs(data);
        } catch (err) {
            console.error(err);
            setError('Не удалось загрузить логи');
        } finally {
            setLoading(false);
        }
    };


    if (loading) return <div>Загрузка логов...</div>;
    if (error) return <div>{error}</div>;

    return (
        <div className="admin-section">
            {/* Десктопная версия */}
            <div className="admin-logs-desktop">
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
            <div className="admin-logs-mobile">
            <ul className="log-list">
                {logs.map((log) => (
                    <li key={log.id}>
                        <span><b>ID:</b> {log.id}</span>
                        <span><b>Действие:</b> {log.action}</span>
                        <span><b>Событие:</b> {log.target}</span>
                        <span><b>Кто:</b> {log.performedBy}</span>
                        <span><b>Когда:</b> {new Date(log.timestamp).toLocaleString()}</span>
                    </li>
                ))}
            </ul>
        </div>
</div>
)
    ;
};

export default AdminLogs;
