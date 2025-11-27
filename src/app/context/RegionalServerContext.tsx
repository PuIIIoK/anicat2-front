'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { detectUserRegion, getRegionalServerURL, getCachedRegion } from '../utils/regionDetection';

interface RegionalServerContextType {
    serverUrl: string;
    region: 'russia' | 'foreign' | null;
    isLoading: boolean;
    error: string | null;
    refreshRegion: () => Promise<void>;
}

const RegionalServerContext = createContext<RegionalServerContextType | undefined>(undefined);

interface RegionalServerProviderProps {
    children: ReactNode;
}

export function RegionalServerProvider({ children }: RegionalServerProviderProps) {
    const [serverUrl, setServerUrl] = useState<string>('http://localhost:8080');
    const [region, setRegion] = useState<'russia' | 'foreign' | null>(getCachedRegion());
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const initializeRegionalServer = async (): Promise<void> => {
        try {
            setIsLoading(true);
            setError(null);
            
            console.log('🌍 Инициализация регионального сервера...');
            
            const [detectedRegion, detectedServerUrl] = await Promise.all([
                detectUserRegion(),
                getRegionalServerURL()
            ]);

            setRegion(detectedRegion);
            setServerUrl(detectedServerUrl);
            
            console.log(`✅ Региональный сервер настроен:`, {
                region: detectedRegion === 'russia' ? '🇷🇺 Россия' : '🌍 Зарубежье',
                serverUrl: detectedServerUrl
            });
            
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка определения региона';
            setError(errorMessage);
            console.error('❌ Ошибка инициализации регионального сервера:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const refreshRegion = async (): Promise<void> => {
        console.log('🔄 Принудительное обновление региона...');
        await initializeRegionalServer();
    };

    useEffect(() => {
        initializeRegionalServer();
    }, []);

    const contextValue: RegionalServerContextType = {
        serverUrl,
        region,
        isLoading,
        error,
        refreshRegion
    };

    return (
        <RegionalServerContext.Provider value={contextValue}>
            {children}
        </RegionalServerContext.Provider>
    );
}

/**
 * Хук для получения регионального сервера
 * @throws Error если используется вне RegionalServerProvider
 */
export function useRegionalServer(): RegionalServerContextType {
    const context = useContext(RegionalServerContext);
    
    if (context === undefined) {
        throw new Error('useRegionalServer must be used within a RegionalServerProvider');
    }
    
    return context;
}

/**
 * Упрощенный хук для получения только URL сервера
 * @returns string URL сервера для текущего региона
 */
export function useServerUrl(): string {
    const { serverUrl } = useRegionalServer();
    return serverUrl;
}

/**
 * Хук для выполнения fetch запросов с региональным сервером
 */
export function useRegionalFetch() {
    const { serverUrl } = useRegionalServer();
    
    const regionalFetch = async (
        endpoint: string, 
        options?: RequestInit
    ): Promise<Response> => {
        const url = endpoint.startsWith('http') ? endpoint : `${serverUrl}${endpoint}`;
        
        console.log(`🌐 Regional fetch: ${url}`);
        
        return fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options?.headers
            }
        });
    };
    
    return regionalFetch;
}
