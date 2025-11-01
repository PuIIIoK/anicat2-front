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

    // НЕ загружаем состояние из localStorage после перезагрузки страницы
    // Прогресс конвертации теперь отображается динамически в основной модалке
    // Это предотвращает проблемы с потерянной функцией onCancel и устаревшими данными
    
    // Очищаем localStorage при монтировании (начало новой сессии)
    React.useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('yumeko-uploads');
        }
    }, []);

    // Сохраняем состояние в sessionStorage (только для текущей вкладки)
    // НЕ в localStorage, чтобы не сохранялось между перезагрузками
    React.useEffect(() => {
        if (typeof window !== 'undefined' && uploads.length > 0) {
            // Сохраняем в sessionStorage без функции onCancel
            const toSave = uploads.map(({ onCancel, ...rest }) => rest);
            sessionStorage.setItem('yumeko-uploads', JSON.stringify(toSave));
        } else if (typeof window !== 'undefined' && uploads.length === 0) {
            sessionStorage.removeItem('yumeko-uploads');
        }
    }, [uploads]);

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

