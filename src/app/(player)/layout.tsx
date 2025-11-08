'use client';

import React, { ReactNode } from 'react';
import '@/styles/index.scss';
import { CustomTitleBar, DiscordStatusTracker, ElectronBodyClass } from "@/component/layout";
import { NotificationProvider } from '@/component/notifications/NotificationManager';
import BanChecker from '@/component/BanChecker';
import { ThemeProvider } from '@/app/context/ThemeContext';

type LayoutProps = {
    children: ReactNode;
};

const RootLayout: React.FC<LayoutProps> = ({ children }) => {
    return (
        <html lang="ru">
        <head>
            <meta charSet="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        </head>
        <body>
            <ThemeProvider>
                <NotificationProvider>
                    <BanChecker>
                        <ElectronBodyClass />
                        <CustomTitleBar />
                        <DiscordStatusTracker />
                        <main className="main-player">{children}</main>
                        
                        {/* Глобальный компонент синхронизации */}
                    </BanChecker>
                </NotificationProvider>
            </ThemeProvider>
        </body>
        </html>
    );
};

export default RootLayout;
