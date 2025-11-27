'use client';

import React from 'react';
import { useRegionalServer } from '../../context/RegionalServerContext';

/**
 * Компонент для отображения статуса регионального сервера (для дебага и админки)
 */
const RegionalServerStatus: React.FC = () => {
    const { serverUrl, region, isLoading, error, refreshRegion } = useRegionalServer();

    if (isLoading) {
        return (
            <div style={{ 
                position: 'fixed', 
                top: '10px', 
                right: '10px', 
                background: '#1a1a1a', 
                color: '#fff', 
                padding: '8px 12px', 
                borderRadius: '6px',
                fontSize: '12px',
                zIndex: 9999
            }}>
                🌍 Определение региона...
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ 
                position: 'fixed', 
                top: '10px', 
                right: '10px', 
                background: '#dc2626', 
                color: '#fff', 
                padding: '8px 12px', 
                borderRadius: '6px',
                fontSize: '12px',
                zIndex: 9999,
                cursor: 'pointer'
            }}
            onClick={refreshRegion}
            title="Нажмите для повторной попытки"
            >
                ❌ Ошибка определения региона
            </div>
        );
    }

    return (
        <div style={{ 
            position: 'fixed', 
            top: '10px', 
            right: '10px', 
            background: region === 'russia' ? '#059669' : '#3b82f6', 
            color: '#fff', 
            padding: '8px 12px', 
            borderRadius: '6px',
            fontSize: '12px',
            zIndex: 9999,
            cursor: 'pointer'
        }}
        onClick={refreshRegion}
        title={`Сервер: ${serverUrl}\nНажмите для обновления`}
        >
            {region === 'russia' ? '🇷🇺 RU Server' : '🌍 Foreign Server'}
        </div>
    );
};

export default RegionalServerStatus;
