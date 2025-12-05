'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { API_SERVER } from '@/hosts/constants';
import * as LucideIcons from 'lucide-react';
import './server-status-checker.scss';

type ErrorType = 'offline' | 'forbidden' | 'error' | null;

const ServerStatusChecker: React.FC = () => {
    const [showModal, setShowModal] = useState(false);
    const [errorType, setErrorType] = useState<ErrorType>(null);
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [isChecking, setIsChecking] = useState(false);

    const checkServerStatus = useCallback(async () => {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 сек таймаут

            const response = await fetch(`${API_SERVER}/api/anime/category/ping`, {
                method: 'GET',
                signal: controller.signal,
                cache: 'no-store'
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                if (response.status === 403) {
                    setErrorType('forbidden');
                    setErrorMessage('Доступ запрещен (403)');
                } else if (response.status >= 500) {
                    setErrorType('error');
                    setErrorMessage(`Ошибка сервера (${response.status})`);
                } else {
                    setErrorType('error');
                    setErrorMessage(`Ошибка: ${response.status}`);
                }
                setShowModal(true);
                return false;
            }

            // Сервер работает - скрываем модалку
            setShowModal(false);
            setErrorType(null);
            return true;
        } catch (error) {
            if (error instanceof Error) {
                if (error.name === 'AbortError') {
                    setErrorType('offline');
                    setErrorMessage('Превышено время ожидания');
                } else if (error.message.includes('fetch')) {
                    setErrorType('offline');
                    setErrorMessage('Сервер отключен');
                } else {
                    setErrorType('error');
                    setErrorMessage('Сервер не смог получить ваш запрос');
                }
            } else {
                setErrorType('offline');
                setErrorMessage('Сервер отключен');
            }
            setShowModal(true);
            return false;
        }
    }, []);

    const handleRetry = async () => {
        setIsChecking(true);
        await checkServerStatus();
        setIsChecking(false);
    };

    useEffect(() => {
        // Проверяем сервер при загрузке
        checkServerStatus();

        // Периодическая проверка каждые 30 секунд если модалка показана
        const interval = setInterval(() => {
            if (showModal) {
                checkServerStatus();
            }
        }, 30000);

        return () => clearInterval(interval);
    }, [checkServerStatus, showModal]);

    // Слушаем ошибки fetch глобально
    useEffect(() => {
        const handleFetchError = (event: Event) => {
            const customEvent = event as CustomEvent;
            if (customEvent.detail?.type === 'server-error') {
                setErrorType(customEvent.detail.errorType || 'error');
                setErrorMessage(customEvent.detail.message || 'Ошибка сервера');
                setShowModal(true);
            }
        };

        window.addEventListener('server-status-error', handleFetchError);
        return () => window.removeEventListener('server-status-error', handleFetchError);
    }, []);

    if (!showModal) return null;

    const getErrorDetails = () => {
        switch (errorType) {
            case 'offline':
                return {
                    icon: <LucideIcons.WifiOff size={64} />,
                    title: 'Сервер отключен',
                    description: errorMessage
                };
            case 'forbidden':
                return {
                    icon: <LucideIcons.ShieldX size={64} />,
                    title: 'Доступ запрещен',
                    description: 'Сервер не смог получить ваш запрос, повторите попытку позже'
                };
            case 'error':
            default:
                return {
                    icon: <LucideIcons.ServerCrash size={64} />,
                    title: 'Ошибка сервера',
                    description: 'Сервер не смог получить ваш запрос, повторите попытку позже'
                };
        }
    };

    const errorDetails = getErrorDetails();

    return (
        <div className="server-status-modal-overlay">
            <div className="server-status-modal">
                <div className="server-status-icon">
                    {errorDetails.icon}
                </div>
                
                <h2 className="server-status-title">
                    Упс, сайт на тех.работах
                </h2>
                
                <p className="server-status-subtitle">
                    Подождите немного и он заработает!)
                </p>

                <div className="server-status-error">
                    <span className="server-status-error-label">Ошибка:</span>
                    <span className="server-status-error-message">{errorDetails.description}</span>
                </div>

                <button 
                    className="server-status-retry-btn"
                    onClick={handleRetry}
                    disabled={isChecking}
                >
                    {isChecking ? (
                        <>
                            <LucideIcons.Loader2 size={18} className="spin" />
                            Проверка...
                        </>
                    ) : (
                        <>
                            <LucideIcons.RefreshCw size={18} />
                            Повторить попытку
                        </>
                    )}
                </button>

                <div className="server-status-footer">
                    <LucideIcons.Info size={14} />
                    <span>Автоматическая проверка каждые 30 секунд</span>
                </div>
            </div>
        </div>
    );
};

export default ServerStatusChecker;
