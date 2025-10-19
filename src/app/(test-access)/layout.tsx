'use client';

import React, { ReactNode, useEffect } from 'react';

import BottomNavBar from '@/component/mobile-navigation/BottomNavBar';
import '@/styles/index.scss';
import dynamic from 'next/dynamic';
import { NotificationProvider } from '@/component/notifications/NotificationManager';
import SyncProgressNotification from '@/component/sync/SyncProgressNotification';
import { API_SERVER } from '@/tools/constants';


const CustomTitleBar = dynamic(() => import('@/component/layout').then(m => m.CustomTitleBar), { ssr: false });
const DiscordStatusTracker = dynamic(() => import('@/component/layout').then(m => m.DiscordStatusTracker), { ssr: false });
// TestAccess импорт больше не нужен

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
    }, []);

    // const token = useToken();      // Если не используешь — можно тоже убрать
    // const pathname = usePathname();

    // const excluded =
    //     pathname === '/login' ||
    //     pathname === '/register' ||
    //     pathname === '/profile' ||
    //     pathname.startsWith('/profile/');

    // const showTestAccess = !token && !excluded;

    return (
        <html lang="ru">
        <head>
            <title>Yumeko - Твой аниме сайт!</title>
            <meta charSet="UTF-8" />
            <meta
                name="viewport"
                content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
            />
            <link
                href="https://fonts.googleapis.com/css2?family=M+PLUS+1p:wght@400;500;700&family=Rubik:wght@400;500;700&family=Stick&family=Zen+Tokyo+Zoo&display=swap"
                rel="stylesheet"
            />
        </head>
        <body>
            <NotificationProvider>
                <CustomTitleBar />
                <DiscordStatusTracker />
                <div className="mobile-only">
                    <BottomNavBar />
                </div>
                <main className="main">{children}</main>
                
                {/* Глобальный компонент синхронизации */}
                <SyncProgressNotification apiServer={API_SERVER} />
            </NotificationProvider>
        </body>
        </html>
    );
};

export default RootLayout;
