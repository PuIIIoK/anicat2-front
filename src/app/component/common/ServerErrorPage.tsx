'use client';

import React from 'react';

interface ServerErrorPageProps {
    title?: string;
    message?: string;
    onRetry?: () => void;
}

const ServerErrorPage: React.FC<ServerErrorPageProps> = ({ 
    title = "Внутренняя ошибка сервера!",
    message = "Пожалуйста, попробуйте позже",
    onRetry 
}) => {
    return (
        <div className="server-error-page">
            <div className="server-error-content">
                <h1 className="server-error-title">{title}</h1>
                <p className="server-error-message">{message}</p>
                {onRetry && (
                    <button 
                        className="server-error-retry"
                        onClick={onRetry}
                    >
                        Попробовать снова
                    </button>
                )}
            </div>
        </div>
    );
};

export default ServerErrorPage;
