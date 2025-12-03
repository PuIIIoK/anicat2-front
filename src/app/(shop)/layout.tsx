'use client';

import React, { ReactNode } from 'react';
import Footer from '@/component/footer';
import '@/styles/index.scss';
import { NotificationProvider } from '@/component/notifications/NotificationManager';
import BanChecker from '@/component/BanChecker';
import SyncProgressNotification from '@/component/sync/SyncProgressNotification';
import { API_SERVER } from '@/hosts/constants';

type LayoutProps = {
    children: ReactNode;
};

const RootLayout: React.FC<LayoutProps> = ({ children }) => {
    return (
        <html lang="ru" suppressHydrationWarning>
        <head>
            <title>Yumeko - Магазин</title>
            <meta charSet="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        </head>
        <body suppressHydrationWarning>
            <NotificationProvider>
                <BanChecker>
                    <main className="main">{children}</main>
                    <Footer />
                    
                    {/* Глобальный компонент синхронизации */}
                    <SyncProgressNotification apiServer={API_SERVER} />
                </BanChecker>
            </NotificationProvider>
        </body>
        </html>
    );
};

export default RootLayout;
