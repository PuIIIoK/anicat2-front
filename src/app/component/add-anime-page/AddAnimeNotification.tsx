'use client';

import React, { useEffect } from 'react';
import { XCircle, Info, AlertTriangle, RotateCcw, Save } from 'lucide-react';

interface AddAnimeNotificationProps {
    type: 'success' | 'error' | 'info' | 'warning' | 'anime-saved' | 'anime-cancelled';
    message: string;
    onClose: () => void;
    autoClose?: boolean;
    duration?: number;
}

const AddAnimeNotification: React.FC<AddAnimeNotificationProps> = ({
    type,
    message,
    onClose,
    autoClose = true,
    duration = 5000
}) => {
    useEffect(() => {
        if (autoClose) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);

            return () => clearTimeout(timer);
        }
    }, [autoClose, duration, onClose]);

    const getIcon = () => {
        switch (type) {
            case 'success':
            case 'anime-saved':
                return <Save size={20} />;
            case 'error':
                return <XCircle size={20} />;
            case 'warning':
                return <AlertTriangle size={20} />;
            case 'anime-cancelled':
                return <RotateCcw size={20} />;
            case 'info':
            default:
                return <Info size={20} />;
        }
    };

    const getThemeClass = () => {
        switch (type) {
            case 'success':
            case 'anime-saved':
                return 'add-anime-notification-success';
            case 'error':
                return 'add-anime-notification-error';
            case 'warning':
                return 'add-anime-notification-warning';
            case 'anime-cancelled':
                return 'add-anime-notification-cancelled';
            case 'info':
            default:
                return 'add-anime-notification-info';
        }
    };

    return (
        <div className={`add-anime-notification ${getThemeClass()}`}>
            <div className="add-anime-notification-content">
                <div className="add-anime-notification-icon">
                    {getIcon()}
                </div>
                <div className="add-anime-notification-message">
                    {message}
                </div>
                <button 
                    className="add-anime-notification-close"
                    onClick={onClose}
                    aria-label="Закрыть уведомление"
                >
                    <XCircle size={16} />
                </button>
            </div>
            <div className="add-anime-notification-progress">
                <div 
                    className="add-anime-notification-progress-bar"
                    style={{ 
                        animationDuration: `${duration}ms`,
                        animationPlayState: autoClose ? 'running' : 'paused'
                    }}
                />
            </div>
        </div>
    );
};

export default AddAnimeNotification;
