'use client';

import React, { ReactNode, useEffect } from 'react';
import { Header, Footer } from '@/component/layout';
import BottomNavBar from '@/component/mobile-navigation/BottomNavBar';
import '@/styles/index.scss';
import dynamic from 'next/dynamic';
import BanChecker from '@/component/BanChecker';
import SyncProgressNotification from '@/component/sync/SyncProgressNotification';
import { API_SERVER } from '@/tools/constants';
import { ThemeProvider } from '../context/ThemeContext';
import NotificationManager, { NotificationProvider } from '@/component/notifications/NotificationManager';
import { cleanupOldPlayerStates } from '@/utils/player/playerState';
import { YumekoUploadProvider } from '../context/YumekoUploadContext';
import YumekoUploadNotification from '@/component/yumeko-video/YumekoUploadNotification';

const CustomTitleBar = dynamic(() => import('@/component/layout').then(m => m.CustomTitleBar), { ssr: false });
const DiscordStatusTracker = dynamic(() => import('@/component/layout').then(m => m.DiscordStatusTracker), { ssr: false });

type LayoutProps = {
    children: ReactNode;
};

const isElectron = () =>
    typeof window !== 'undefined' && window.process?.versions?.electron;

const RootLayout: React.FC<LayoutProps> = ({ children }) => {
    useEffect(() => {
        if (isElectron()) {
            document.body.classList.add('electron');
        }
        
        // Очистка старых состояний плеера при загрузке приложения
        cleanupOldPlayerStates();
    }, []);

    return (
        <html lang="ru">
        <head>
            <meta charSet="UTF-8" />
            <meta
                name="viewport"
                content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
            />
            <meta name="description" content="AniCat - смотрите аниме онлайн бесплатно в хорошем качестве" />
            <link
                href="https://fonts.googleapis.com/css2?family=M+PLUS+1p:wght@400;500;700&family=Rubik:wght@400;500;700&family=Stick&family=Zen+Tokyo+Zoo&display=swap"
                rel="stylesheet"
            />
        </head>
        <body>
            <ThemeProvider>
                <NotificationProvider>
                    <YumekoUploadProvider>
                        <BanChecker>
                            <CustomTitleBar />
                            <DiscordStatusTracker />

                            <div className="mobile-only">
                                <BottomNavBar />
                            </div>
                            <Header />
                            <main className="main">{children}</main>
                            <Footer />
                            
                            {/* Глобальные компоненты */}
                            <SyncProgressNotification apiServer={API_SERVER} />
                            <YumekoUploadNotification />
                            <NotificationManager />
                        </BanChecker>
                    </YumekoUploadProvider>
                </NotificationProvider>
            </ThemeProvider>
        </body>
        </html>
    );
};

export default RootLayout;