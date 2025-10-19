'use client';

import React, { ReactNode } from 'react';
import '@/styles/index.scss';
import { CustomTitleBar, DiscordStatusTracker, ElectronBodyClass } from "@/component/layout";
import { NotificationProvider } from '@/component/notifications/NotificationManager';
import BanChecker from '@/component/BanChecker';

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
            <NotificationProvider>
                <BanChecker>
                    <ElectronBodyClass />
                    <CustomTitleBar />
                    <DiscordStatusTracker />
                    <main className="main-player">{children}</main>
                    
                    {/* Глобальный компонент синхронизации */}
                </BanChecker>
            </NotificationProvider>
        </body>
        </html>
    );
};

export default RootLayout;
