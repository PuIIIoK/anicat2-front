'use client';

import React, { ReactNode, useEffect } from 'react';
import { Header, Footer, Sidebar } from '@/component/layout';
import BottomNavBar from '@/component/mobile-navigation/BottomNavBar';
import '@/styles/index.scss';
import dynamic from 'next/dynamic';
import BanChecker from '@/component/BanChecker';
import RegionalSyncProgressNotification from '@/component/sync/RegionalSyncProgressNotification';
import { ThemeProvider } from '../context/ThemeContext';
import { SidebarProvider, useSidebar } from '../context/SidebarContext';
import NotificationManager, { NotificationProvider } from '@/component/notifications/NotificationManager';
import { cleanupOldPlayerStates } from '@/utils/player/playerState';
import { YumekoUploadProvider } from '../context/YumekoUploadContext';
import { RegionalServerProvider } from '../context/RegionalServerContext';
import ServerStatusChecker from '@/component/ServerStatusChecker';

const CustomTitleBar = dynamic(() => import('@/component/layout').then(m => m.CustomTitleBar), { ssr: false });
const DiscordStatusTracker = dynamic(() => import('@/component/layout').then(m => m.DiscordStatusTracker), { ssr: false });

type LayoutProps = {
    children: ReactNode;
};

// Wrapper component that uses the sidebar context
const MainContent: React.FC<LayoutProps> = ({ children }) => {
    const { isOpen, toggle } = useSidebar();
    
    return (
        <>
            <Sidebar isOpen={isOpen} onToggle={toggle} />
            <div className={`main-wrapper ${isOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
                <Header />
                <main className="main yumeko-main">{children}</main>
                <Footer />
            </div>
        </>
    );
};

type RootLayoutProps = {
    children: ReactNode;
};

const isElectron = () =>
    typeof window !== 'undefined' && window.process?.versions?.electron;

const RootLayout: React.FC<RootLayoutProps> = ({ children }) => {
    useEffect(() => {
        if (isElectron()) {
            document.body.classList.add('electron');
        }
        
        // Очистка старых состояний плеера при загрузке приложения
        cleanupOldPlayerStates();
    }, []);

    return (
        <ThemeProvider>
            <SidebarProvider>
                <RegionalServerProvider>
                    <NotificationProvider>
                        <YumekoUploadProvider>
                            <BanChecker>
                                <CustomTitleBar />
                                <DiscordStatusTracker />

                                <div className="mobile-only">
                                    <BottomNavBar />
                                </div>
                                
                                <MainContent>{children}</MainContent>
                                
                                {/* Глобальные компоненты */}
                                <ServerStatusChecker />
                                <RegionalSyncProgressNotification />
                                <NotificationManager />
                            </BanChecker>
                        </YumekoUploadProvider>
                    </NotificationProvider>
                </RegionalServerProvider>
            </SidebarProvider>
        </ThemeProvider>
    );
};

export default RootLayout;