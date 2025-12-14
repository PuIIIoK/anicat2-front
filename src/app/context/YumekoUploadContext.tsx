'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface YumekoUploadProgress {
    uploadId: string; // Уникальный ID загрузки
    episodeId: number;
    voiceName: string;
    episodeNumber: number;
    animeId: number;
    quality: string; // Качество видео
    step: string;
    progress: number;
    status: 'uploading' | 'converting' | 'ready' | 'error';
    errorMessage?: string;
    onCancel?: () => void;
    screenshotUrl?: string; // URL скриншота эпизода
    duration?: number; // Длительность в секундах
    conversionDetails?: string; // JSON с деталями конвертации по качествам
}

interface YumekoUploadContextType {
    uploads: YumekoUploadProgress[];
    addUpload: (upload: YumekoUploadProgress) => void;
    updateUpload: (uploadId: string, upload: Partial<YumekoUploadProgress>) => void;
    removeUpload: (uploadId: string) => void;
    isMinimized: boolean;
    setIsMinimized: (minimized: boolean) => void;
    activeTab: string | null;
    setActiveTab: (uploadId: string | null) => void;
}

const YumekoUploadContext = createContext<YumekoUploadContextType | undefined>(undefined);

export const YumekoUploadProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [uploads, setUploads] = useState<YumekoUploadProgress[]>([]);
    const [isMinimized, setIsMinimized] = useState(false);
    const [activeTab, setActiveTab] = useState<string | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);

    // Очищаем localStorage при монтировании - не восстанавливаем старые загрузки
    React.useEffect(() => {
        if (typeof window !== 'undefined' && !isInitialized) {
            // Очищаем localStorage - конвертация отслеживается через API
            localStorage.removeItem('yumeko-uploads');
            setIsInitialized(true);
        }
    }, [isInitialized]);

    // НЕ сохраняем в localStorage - конвертация отслеживается через API бэкенда
    // localStorage больше не используется для хранения прогресса

    const addUpload = (upload: YumekoUploadProgress) => {
        setUploads(prev => [...prev, upload]);
        setActiveTab(upload.uploadId);
        setIsMinimized(false);
    };

    const updateUpload = (uploadId: string, updates: Partial<YumekoUploadProgress>) => {
        setUploads(prev => prev.map(u => 
            u.uploadId === uploadId ? { ...u, ...updates } : u
        ));
    };

    const removeUpload = (uploadId: string) => {
        setUploads(prev => {
            const filtered = prev.filter(u => u.uploadId !== uploadId);
            // Если удаляем активную вкладку, переключаемся на первую доступную
            if (activeTab === uploadId && filtered.length > 0) {
                setActiveTab(filtered[0].uploadId);
            } else if (filtered.length === 0) {
                setActiveTab(null);
            }
            return filtered;
        });
    };

    return (
        <YumekoUploadContext.Provider
            value={{
                uploads,
                addUpload,
                updateUpload,
                removeUpload,
                isMinimized,
                setIsMinimized,
                activeTab,
                setActiveTab,
            }}
        >
            {children}
        </YumekoUploadContext.Provider>
    );
};

export const useYumekoUpload = () => {
    const context = useContext(YumekoUploadContext);
    if (context === undefined) {
        throw new Error('useYumekoUpload must be used within a YumekoUploadProvider');
    }
    return context;
};

