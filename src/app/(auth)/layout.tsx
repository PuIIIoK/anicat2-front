// app/layout.tsx
import React, { ReactNode } from 'react';
import { ElectronBodyClass, CustomTitleBar, DiscordStatusTracker, Header } from '@/component/layout';
import BottomNavBar from '@/component/mobile-navigation/BottomNavBar';
import BanChecker from '@/component/BanChecker';
import SyncProgressNotification from '@/component/sync/SyncProgressNotification';
import { API_SERVER } from '@/tools/constants';
import { ThemeProvider } from '../context/ThemeContext';
import NotificationManager, { NotificationProvider } from '@/component/notifications/NotificationManager';

type LayoutProps = {
    children: ReactNode;
};

export default function RootLayout({ children }: LayoutProps) {
    return (
        <html lang="ru">
        <head>
            <title>AniCat - твой аниме сайт!</title>
            <meta charSet="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <meta
                name="description"
                content="AniCat — смотри аниме, находи друзей, комментируй, ставь оценки и отзывы. У нас есть огромная библиотека 2K и 4K аниме. Зарегистрируйся и смотри с удовольствием!"
            />
            <meta property="og:title" content="AniCat - твой аниме сайт!" />
            <meta
                property="og:description"
                content="Смотри аниме, находи друзей, оставляй отзывы и оценки. Огромная библиотека 2K и 4K аниме!"
            />
            <meta property="og:type" content="website" />
            <meta property="og:locale" content="ru_RU" />
            <meta property="og:site_name" content="AniCat" />
            <link
                href="https://fonts.googleapis.com/css2?family=M+PLUS+1p:wght@400;500;700&family=Rubik:wght@400;500;700&family=Stick&family=Zen+Tokyo+Zoo&display=swap"
                rel="stylesheet"
            />
        </head>
        <body>
            <ThemeProvider>
                <NotificationProvider>
                    <BanChecker>
                        <ElectronBodyClass />
                        <div className="mobile-only">
                            <BottomNavBar />
                        </div>
                        <CustomTitleBar />
                        <DiscordStatusTracker />
                        <Header />
                        {children}
                        
                        {/* Глобальные компоненты */}
                        <SyncProgressNotification apiServer={API_SERVER} />
                        <NotificationManager />
                    </BanChecker>
                </NotificationProvider>
            </ThemeProvider>
        </body>
        </html>
    );
}
