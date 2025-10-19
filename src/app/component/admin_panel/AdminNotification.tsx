'use client';

import React, { useEffect } from 'react';
import { CheckCircle, XCircle, Info, AlertTriangle, Plus, Trash2 } from 'lucide-react';

interface AdminNotificationProps {
    type: 'success' | 'error' | 'info' | 'warning' | 'anime-created' | 'anime-deleted';
    message: string;
    onClose: () => void;
    autoClose?: boolean;
    duration?: number;
}

const AdminNotification: React.FC<AdminNotificationProps> = ({
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
                return <CheckCircle size={20} />;
            case 'error':
                return <XCircle size={20} />;
            case 'warning':
                return <AlertTriangle size={20} />;
            case 'anime-created':
                return <Plus size={20} />;
            case 'anime-deleted':
                return <Trash2 size={20} />;
            case 'info':
            default:
                return <Info size={20} />;
        }
    };

    const getThemeClass = () => {
        switch (type) {
            case 'success':
            case 'anime-created':
                return 'admin-notification-success';
            case 'error':
            case 'anime-deleted':
                return 'admin-notification-error';
            case 'warning':
                return 'admin-notification-warning';
            case 'info':
            default:
                return 'admin-notification-info';
        }
    };

    return (
        <div className={`admin-notification ${getThemeClass()}`}>
            <div className="admin-notification-content">
                <div className="admin-notification-icon">
                    {getIcon()}
                </div>
                <div className="admin-notification-message">
                    {message}
                </div>
                <button 
                    className="admin-notification-close"
                    onClick={onClose}
                    aria-label="Закрыть уведомление"
                >
                    <XCircle size={16} />
                </button>
            </div>
            <div className="admin-notification-progress">
                <div 
                    className="admin-notification-progress-bar"
                    style={{ 
                        animationDuration: `${duration}ms`,
                        animationPlayState: autoClose ? 'running' : 'paused'
                    }}
                />
            </div>
        </div>
    );
};

export default AdminNotification;
