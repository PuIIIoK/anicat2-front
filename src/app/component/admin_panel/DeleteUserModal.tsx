'use client';

import React, { useState } from 'react';
import { API_SERVER } from '@/hosts/constants';

interface User {
    id: number;
    username: string;
    nickname: string;
    email: string;
    roles: string[];
    isBanned: boolean | null;
    isMuted: boolean | null;
}

interface DeleteUserModalProps {
    user: User | null;
    isOpen: boolean;
    onClose: () => void;
    onDelete: () => void;
}

const DeleteUserModal: React.FC<DeleteUserModalProps> = ({ user, isOpen, onClose, onDelete }) => {
    const [isDeleting, setIsDeleting] = useState(false);
    const [confirmText, setConfirmText] = useState('');
    const [showConfirmation, setShowConfirmation] = useState(false);

    if (!isOpen || !user) return null;

    const expectedConfirmText = `DELETE ${user.username}`;
    const isConfirmValid = confirmText === expectedConfirmText;

    const handleFirstConfirm = () => {
        setShowConfirmation(true);
    };

    const handleFinalDelete = async () => {
        if (!isConfirmValid) return;

        setIsDeleting(true);
        try {
            const response = await fetch(`${API_SERVER}/api/admin/users/delete?by=username&value=${encodeURIComponent(user.username)}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                alert(`Пользователь ${user.username} и все его данные успешно удалены`);
                onDelete();
                onClose();
            } else {
                const errorData = await response.text();
                alert(`Ошибка при удалении: ${errorData}`);
            }
        } catch (error) {
            console.error('Ошибка при удалении пользователя:', error);
            alert('Произошла ошибка при удалении пользователя');
        } finally {
            setIsDeleting(false);
            setConfirmText('');
            setShowConfirmation(false);
        }
    };

    const handleClose = () => {
        setConfirmText('');
        setShowConfirmation(false);
        onClose();
    };

    return (
        <div className="delete-user-modal-overlay">
            <div className="delete-user-modal">
                <div className="modal-header">
                    <h2>⚠️ ОПАСНОЕ ДЕЙСТВИЕ</h2>
                    <button className="close-btn" onClick={handleClose}>✕</button>
                </div>

                <div className="modal-content">
                    <div className="warning-section">
                        <div className="warning-icon">⚠️</div>
                        <h3>Удаление пользователя</h3>
                        <p><strong>{user.username}</strong> ({user.nickname})</p>
                    </div>

                    <div className="danger-info">
                        <h4>❌ БУДЕТ УДАЛЕНО НАВСЕГДА:</h4>
                        <ul>
                            <li>👤 Профиль пользователя</li>
                            <li>💬 Все комментарии и отзывы</li>
                            <li>📚 Все коллекции аниме</li>
                            <li>⭐ Все рейтинги аниме</li>
                            <li>📺 Весь прогресс просмотра</li>
                            <li>👥 Все связи дружбы</li>
                            <li>📊 Вся активность пользователя</li>
                            <li>🏆 Все значки и достижения</li>
                        </ul>
                    </div>

                    {!showConfirmation ? (
                        <div className="first-confirmation">
                            <p className="warning-text">
                                <strong>ЭТО ДЕЙСТВИЕ НЕОБРАТИМО!</strong><br/>
                                Все данные пользователя будут удалены безвозвратно.
                            </p>
                            <div className="button-group">
                                <button className="cancel-btn" onClick={handleClose}>
                                    Отмена
                                </button>
                                <button className="continue-btn" onClick={handleFirstConfirm}>
                                    Продолжить удаление
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="final-confirmation">
                            <p className="confirm-instruction">
                                Для подтверждения введите: <code>{expectedConfirmText}</code>
                            </p>
                            <input
                                type="text"
                                value={confirmText}
                                onChange={(e) => setConfirmText(e.target.value)}
                                placeholder={`Введите: ${expectedConfirmText}`}
                                className="confirm-input"
                                disabled={isDeleting}
                            />
                            <div className="final-button-group">
                                <button className="cancel-btn" onClick={handleClose} disabled={isDeleting}>
                                    Отмена
                                </button>
                                <button 
                                    className={`delete-btn ${!isConfirmValid ? 'disabled' : ''}`}
                                    onClick={handleFinalDelete}
                                    disabled={!isConfirmValid || isDeleting}
                                >
                                    {isDeleting ? '🔄 Удаление...' : '💀 УДАЛИТЬ НАВСЕГДА'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DeleteUserModal;
