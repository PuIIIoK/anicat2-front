'use client';

import React, { useState, useEffect } from 'react';
import { API_SERVER } from '../../../tools/constants';
import { Plus, Edit2, Trash2, Eye, EyeOff, Save, X, AlertCircle, Bell } from 'lucide-react';

interface SiteUpdate {
    id: number;
    version: string;
    updateType: 'REGULAR' | 'MAJOR';
    changesList: string;
    isActive: boolean;
    createdAt: string;
}

interface Props {
    setNotification: (notification: {
        type: 'success' | 'error' | 'info' | 'warning';
        message: string;
    }) => void;
}

const AdminSiteUpdates: React.FC<Props> = ({ setNotification }) => {
    const [updates, setUpdates] = useState<SiteUpdate[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [editingUpdate, setEditingUpdate] = useState<SiteUpdate | null>(null);

    // Форма для создания/редактирования
    const [formData, setFormData] = useState({
        version: '',
        updateType: 'MAJOR' as 'REGULAR' | 'MAJOR',
        changesList: ''
    });

    const getCookieToken = (): string | null => {
        const match = document.cookie.match(/token=([^;]+)/);
        return match ? match[1] : null;
    };

    const fetchUpdates = async () => {
        try {
            const token = getCookieToken();
            if (!token) throw new Error('Токен не найден');

            const response = await fetch(`${API_SERVER}/api/admin/site-updates`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setUpdates(data);
            } else {
                setNotification({ type: 'error', message: 'Ошибка загрузки обновлений' });
            }
        } catch {
            setNotification({ type: 'error', message: 'Ошибка подключения к серверу' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUpdates();
    }, []);

    const handleCreateUpdate = async () => {
        try {
            const token = getCookieToken();
            if (!token) throw new Error('Токен не найден');

            const response = await fetch(`${API_SERVER}/api/admin/site-updates`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (response.ok) {
                setNotification({ type: 'success', message: 'Обновление создано успешно' });
                fetchUpdates();
                setShowCreateForm(false);
                setFormData({ version: '', updateType: 'MAJOR', changesList: '' });
            } else {
                setNotification({ type: 'error', message: result.error || 'Ошибка создания обновления' });
            }
        } catch {
            setNotification({ type: 'error', message: 'Ошибка подключения к серверу' });
        }
    };

    const handleUpdateUpdate = async () => {
        if (!editingUpdate) return;

        try {
            const token = getCookieToken();
            if (!token) throw new Error('Токен не найден');

            const response = await fetch(`${API_SERVER}/api/admin/site-updates/${editingUpdate.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (response.ok) {
                setNotification({ type: 'success', message: 'Обновление изменено успешно' });
                fetchUpdates();
                setEditingUpdate(null);
                setFormData({ version: '', updateType: 'MAJOR', changesList: '' });
            } else {
                setNotification({ type: 'error', message: result.error || 'Ошибка изменения обновления' });
            }
        } catch {
            setNotification({ type: 'error', message: 'Ошибка подключения к серверу' });
        }
    };

    const handleDeleteUpdate = async (id: number) => {
        if (!confirm('Вы уверены, что хотите удалить это обновление?')) return;

        try {
            const token = getCookieToken();
            if (!token) throw new Error('Токен не найден');

            const response = await fetch(`${API_SERVER}/api/admin/site-updates/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const result = await response.json();

            if (response.ok) {
                setNotification({ type: 'success', message: 'Обновление удалено' });
                fetchUpdates();
            } else {
                setNotification({ type: 'error', message: result.error || 'Ошибка удаления' });
            }
        } catch {
            setNotification({ type: 'error', message: 'Ошибка подключения к серверу' });
        }
    };

    const handleToggleActive = async (id: number) => {
        try {
            const token = getCookieToken();
            if (!token) throw new Error('Токен не найден');

            const response = await fetch(`${API_SERVER}/api/admin/site-updates/${id}/toggle`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const result = await response.json();

            if (response.ok) {
                setNotification({ type: 'info', message: 'Статус обновления изменен' });
                fetchUpdates();
            } else {
                setNotification({ type: 'error', message: result.error || 'Ошибка изменения статуса' });
            }
        } catch {
            setNotification({ type: 'error', message: 'Ошибка подключения к серверу' });
        }
    };

    const startEditing = (update: SiteUpdate) => {
        setEditingUpdate(update);
        setFormData({
            version: update.version,
            updateType: update.updateType,
            changesList: update.changesList
        });
        setShowCreateForm(false);
    };

    const cancelEditing = () => {
        setEditingUpdate(null);
        setShowCreateForm(false);
        setFormData({ version: '', updateType: 'MAJOR', changesList: '' });
    };

    if (loading) {
        return (
            <div className="admin-site-updates">
                <div className="loading-message">
                    <Bell size={24} />
                    <span>Загрузка обновлений...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-site-updates">
            <div className="admin-site-updates-header">
                <h1>
                    <Bell size={28} />
                    Обновления сайта
                </h1>
                <button 
                    className="create-update-btn"
                    onClick={() => {
                        setShowCreateForm(true);
                        setEditingUpdate(null);
                        setFormData({ version: '', updateType: 'MAJOR', changesList: '' });
                    }}
                >
                    <Plus size={20} />
                    Создать обновление
                </button>
            </div>

            {(showCreateForm || editingUpdate) && (
                <div className="update-form-modal">
                    <div className="update-form">
                        <h3>{editingUpdate ? 'Редактировать обновление' : 'Создать обновление'}</h3>
                        
                        <div className="form-group">
                            <label>Версия:</label>
                            <input
                                type="text"
                                value={formData.version}
                                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                                placeholder="например: 5.0"
                            />
                        </div>

                        <div className="form-group">
                            <label>Тип обновления:</label>
                            <select
                                value={formData.updateType}
                                onChange={(e) => setFormData({ ...formData, updateType: e.target.value as 'REGULAR' | 'MAJOR' })}
                            >
                                <option value="MAJOR">Крупное</option>
                                <option value="REGULAR">Обычное</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Список изменений:</label>
                            <textarea
                                value={formData.changesList}
                                onChange={(e) => setFormData({ ...formData, changesList: e.target.value })}
                                placeholder="- Возможность кастомизации сайта под свой вкус
- Лидерборд
- Время просмотра любых абсолютно серий и озвучек в профиль
- Возможность кастомизация профиля!"
                                rows={6}
                            />
                        </div>

                        <div className="form-actions">
                            <button 
                                className="save-btn"
                                onClick={editingUpdate ? handleUpdateUpdate : handleCreateUpdate}
                            >
                                <Save size={18} />
                                {editingUpdate ? 'Сохранить' : 'Создать'}
                            </button>
                            <button 
                                className="cancel-btn"
                                onClick={cancelEditing}
                            >
                                <X size={18} />
                                Отмена
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="updates-list">
                {updates.length === 0 ? (
                    <div className="empty-state">
                        <AlertCircle size={48} />
                        <h3>Обновлений пока нет</h3>
                        <p>Создайте первое обновление для пользователей</p>
                    </div>
                ) : (
                    updates.map(update => (
                        <div key={update.id} className={`update-card ${!update.isActive ? 'inactive' : ''}`}>
                            <div className="update-header">
                                <div className="update-info">
                                    <h3 className="update-version">v{update.version}</h3>
                                    <span className={`update-type ${update.updateType.toLowerCase()}`}>
                                        {update.updateType === 'MAJOR' ? 'Крупное' : 'Обычное'}
                                    </span>
                                    {!update.isActive && <span className="inactive-badge">Неактивно</span>}
                                </div>
                                <div className="update-actions">
                                    <button
                                        className="action-btn edit-btn"
                                        onClick={() => startEditing(update)}
                                        title="Редактировать"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        className="action-btn toggle-btn"
                                        onClick={() => handleToggleActive(update.id)}
                                        title={update.isActive ? 'Деактивировать' : 'Активировать'}
                                    >
                                        {update.isActive ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                    <button
                                        className="action-btn delete-btn"
                                        onClick={() => handleDeleteUpdate(update.id)}
                                        title="Удалить"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                            <div className="update-content">
                                <h4>Что добавлено?</h4>
                                <div className="changes-list">
                                    {update.changesList.split('\n').filter(line => line.trim()).map((line, index) => (
                                        <div key={index} className="change-item">
                                            {line.startsWith('-') ? line : `- ${line}`}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="update-footer">
                                <span className="created-at">
                                    Создано: {new Date(update.createdAt).toLocaleDateString('ru-RU')}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default AdminSiteUpdates;
