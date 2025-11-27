'use client';

import { useState, useEffect } from 'react';
import { detectUserRegion, getRegionalServerURL, getCachedRegion } from '../utils/regionDetection';

interface RegionalServerState {
    serverUrl: string;
    region: 'russia' | 'foreign' | null;
    isLoading: boolean;
    error: string | null;
}

/**
 * Хук для автоматического выбора сервера в зависимости от региона пользователя
 * Россия -> API_SERVER, Зарубежье -> SERVER_URL3
 */
export function useRegionalServer() {
    const [state, setState] = useState<RegionalServerState>({
        serverUrl: 'http://localhost:8080', // Дефолт на время загрузки
        region: getCachedRegion(),
        isLoading: true,
        error: null
    });

    useEffect(() => {
        let isMounted = true;

        async function initializeServer() {
            try {
                setState(prev => ({ ...prev, isLoading: true, error: null }));
                
                const [region, serverUrl] = await Promise.all([
                    detectUserRegion(),
                    getRegionalServerURL()
                ]);

                if (isMounted) {
                    setState({
                        serverUrl,
                        region,
                        isLoading: false,
                        error: null
                    });
                    
                    console.log(`🌍 Региональный сервер настроен: ${region === 'russia' ? '🇷🇺 Россия' : '🌍 Зарубежье'} -> ${serverUrl}`);
                }
            } catch (error) {
                if (isMounted) {
                    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
                    setState(prev => ({
                        ...prev,
                        isLoading: false,
                        error: errorMessage
                    }));
                    console.error('❌ Ошибка настройки регионального сервера:', error);
                }
            }
        }

        initializeServer();

        return () => {
            isMounted = false;
        };
    }, []);

    return state;
}

/**
 * Упрощенный хук, который возвращает только URL сервера
 */
export function useServerUrl(): string {
    const { serverUrl } = useRegionalServer();
    return serverUrl;
}
