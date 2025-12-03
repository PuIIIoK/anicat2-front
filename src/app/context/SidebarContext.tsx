'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface SidebarContextType {
    isOpen: boolean;
    toggle: () => void;
    open: () => void;
    close: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const useSidebar = () => {
    const context = useContext(SidebarContext);
    if (!context) {
        throw new Error('useSidebar must be used within a SidebarProvider');
    }
    return context;
};

interface SidebarProviderProps {
    children: ReactNode;
}

export const SidebarProvider: React.FC<SidebarProviderProps> = ({ children }) => {
    // Sidebar closed by default - will be opened on desktop after mount
    const [isOpen, setIsOpen] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);

    // Set initial state based on screen width (only on desktop open by default)
    useEffect(() => {
        const isDesktop = window.innerWidth > 1024;
        // На мобильных устройствах сайдбар всегда закрыт при загрузке
        // На десктопе - открыт по умолчанию
        setIsOpen(isDesktop);
        setIsInitialized(true);
    }, []);
    
    // Не показываем сайдбар пока не определили тип устройства
    // Это предотвращает "мигание" сайдбара на мобильных
    useEffect(() => {
        if (!isInitialized) return;
        
        // При изменении размера окна закрываем сайдбар на мобильных
        const handleResize = () => {
            if (window.innerWidth <= 1024 && isOpen) {
                setIsOpen(false);
            }
        };
        
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [isInitialized, isOpen]);

    // Close sidebar when clicking outside or pressing escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    const toggle = () => setIsOpen(prev => !prev);
    const open = () => setIsOpen(true);
    const close = () => setIsOpen(false);

    return (
        <SidebarContext.Provider value={{ isOpen, toggle, open, close }}>
            {children}
        </SidebarContext.Provider>
    );
};

export default SidebarContext;
