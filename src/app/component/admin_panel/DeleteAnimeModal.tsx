'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, AlertTriangle, Trash2 } from 'lucide-react';
import HCaptcha from '@hcaptcha/react-hcaptcha';

interface DeleteAnimeModalProps {
    animeId: number;
    isOpen: boolean;
    onClose: () => void;
    onConfirmDelete: () => Promise<void>;
    userRoles: string[];
}

const DeleteAnimeModal: React.FC<DeleteAnimeModalProps> = ({
    animeId,
    isOpen,
    onClose,
    onConfirmDelete,
    userRoles
}) => {
    const [confirmed, setConfirmed] = useState(false);
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteProgress, setDeleteProgress] = useState(0);
    const [deleteStep, setDeleteStep] = useState('');
    const captchaRef = useRef<HCaptcha>(null);

    const isAdmin = userRoles.includes('ADMIN') || userRoles.includes('SUPER_ADMIN');
    const canDelete = confirmed && captchaToken && isAdmin;

    const handleCaptchaVerify = (token: string) => {
        setCaptchaToken(token);
    };

    const handleDelete = async () => {
        if (!canDelete) return;

        setIsDeleting(true);
        setDeleteProgress(10);
        setDeleteStep('Подготовка к удалению...');

        try {
            setDeleteProgress(30);
            setDeleteStep('Удаление из категории "все аниме"...');
            
            await new Promise(resolve => setTimeout(resolve, 500)); // Небольшая задержка для UI
            
            setDeleteProgress(60);
            setDeleteStep('Удаление аниме с сервера...');
            
            await onConfirmDelete();
            
            setDeleteProgress(90);
            setDeleteStep('Завершение удаления...');
            
            await new Promise(resolve => setTimeout(resolve, 300));
            
            setDeleteProgress(100);
            setDeleteStep('Аниме успешно удалено!');
            
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Сброс состояния и закрытие модала
            setConfirmed(false);
            setCaptchaToken(null);
            setIsDeleting(false);
            setDeleteProgress(0);
            setDeleteStep('');
            if (captchaRef.current) {
                captchaRef.current.resetCaptcha();
            }
            onClose();
            
        } catch (error) {
            console.error('Ошибка при удалении:', error);
            setDeleteStep('Ошибка при удалении!');
            setIsDeleting(false);
            setDeleteProgress(0);
        }
    };

    const handleClose = () => {
        if (isDeleting) return; // Не позволяем закрыть во время удаления
        
        setConfirmed(false);
        setCaptchaToken(null);
        setDeleteProgress(0);
        setDeleteStep('');
        if (captchaRef.current) {
            captchaRef.current.resetCaptcha();
        }
        onClose();
    };

    // Закрытие на ESC
    useEffect(() => {
        const handleEscKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !isDeleting) {
                handleClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscKey);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscKey);
            document.body.style.overflow = '';
        };
    }, [isOpen, isDeleting]);

    if (!isOpen) return null;

    return (
        <div 
            className="delete-anime-modal-overlay"
            onClick={(e) => {
                if (e.target === e.currentTarget && !isDeleting) {
                    handleClose();
                }
            }}
        >
            <div className="delete-anime-modal">
                <div className="modal-header">
                    <h3>
                        <Trash2 size={24} />
                        Удаление аниме #{animeId}
                    </h3>
                    {!isDeleting && (
                        <button 
                            className="modal-close-btn" 
                            onClick={handleClose}
                            aria-label="Закрыть модальное окно"
                        >
                            <X size={22} />
                        </button>
                    )}
                </div>

                <div className="modal-content">
                    {!isAdmin ? (
                        // Для модераторов
                        <div className="moderator-warning">
                            <AlertTriangle size={56} />
                            <h4>Доступ ограничен</h4>
                            <p>
                                Если хотите удалить аниме из сайта полностью, обратитесь к администрации сайта. 
                                Так как данная функция временно ограничена для модераторов
                                по причине, чтобы не начались массовые сбои или удаление аниме с сайта.
                                Потому что подобные инциденты уже были на сайте :)
                            </p>
                        </div>
                    ) : isDeleting ? (
                        // Процесс удаления
                        <div className="delete-progress">
                            <div className="progress-info">
                                <h4>Удаление аниме...</h4>
                                <p>{deleteStep}</p>
                            </div>
                            <div className="progress-bar">
                                <div 
                                    className="progress-fill" 
                                    style={{ width: `${deleteProgress}%` }}
                                />
                            </div>
                            <div className="progress-percentage">{deleteProgress}%</div>
                        </div>
                    ) : (
                        // Форма подтверждения для админов
                        <div className="admin-delete-form">
                            <div className="warning-message">
                                <AlertTriangle size={40} />
                                <div>
                                    <h4>Внимание! Необратимое действие</h4>
                                    <p>
                                        Вы собираетесь полностью удалить аниме #{animeId} с сайта. 
                                        Это действие нельзя отменить и приведет к безвозвратной потере всех данных.
                                    </p>
                                </div>
                            </div>

                            <div className="confirmation-checkbox">
                                <label className="checkbox-container">
                                    <input
                                        type="checkbox"
                                        checked={confirmed}
                                        onChange={(e) => setConfirmed(e.target.checked)}
                                    />
                                    <span className="checkmark"></span>
                                    <span className="checkbox-text">
                                        Я подтверждаю, что хочу полностью удалить это аниме из сайта
                                    </span>
                                </label>
                            </div>

                            {confirmed && (
                                <div className="captcha-section">
                                    <p>Пройдите проверку для подтверждения:</p>
                                    <HCaptcha
                                        ref={captchaRef}
                                        sitekey="5df4f0a0-b066-4732-980a-694cd7661c2e"
                                        onVerify={handleCaptchaVerify}
                                        theme="dark"
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    {!isAdmin ? (
                        <button 
                            className="btn-secondary" 
                            onClick={handleClose}
                            autoFocus
                        >
                            Понятно
                        </button>
                    ) : !isDeleting ? (
                        <>
                            <button 
                                className="btn-secondary" 
                                onClick={handleClose}
                            >
                                Отмена
                            </button>
                            <button 
                                className={`btn-danger ${canDelete ? 'enabled' : 'disabled'}`}
                                onClick={handleDelete}
                                disabled={!canDelete}
                                aria-describedby={!canDelete ? 'delete-requirements' : undefined}
                            >
                                <Trash2 size={18} />
                                УДАЛИТЬ АНИМЕ
                            </button>
                            {!canDelete && (
                                <div id="delete-requirements" className="sr-only">
                                    Для удаления необходимо подтвердить действие и пройти капчу
                                </div>
                            )}
                        </>
                    ) : null}
                </div>
            </div>
        </div>
    );
};

export default DeleteAnimeModal;
