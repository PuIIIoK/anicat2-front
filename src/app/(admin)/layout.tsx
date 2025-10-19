import React, { ReactNode } from 'react';
import '@/styles/index.scss';
import { Header, CustomTitleBar, DiscordStatusTracker, ElectronBodyClass } from "@/component/layout";
import { NotificationProvider } from '@/component/notifications/NotificationManager';
import BanChecker from '@/component/BanChecker';
import AdminRoleChecker from '@/component/AdminRoleChecker';
import SyncProgressNotification from '@/component/sync/SyncProgressNotification';
import { API_SERVER } from '@/tools/constants';
import { ThemeProvider } from '../context/ThemeContext';

type LayoutProps = {
  children: ReactNode;
};

const RootLayout: React.FC<LayoutProps> = ({ children }) => {
  return (
      <html lang="ru">
      <head>
        <title>Yumeko | Admin_Panel</title>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body>
        <ThemeProvider>
          <NotificationProvider>
            <BanChecker>
              <AdminRoleChecker>
                <ElectronBodyClass />
                <CustomTitleBar />
                <DiscordStatusTracker />
                <Header />
                <main className="main">{children}</main>
                
                {/* Глобальный компонент синхронизации */}
                <SyncProgressNotification apiServer={API_SERVER} />
              </AdminRoleChecker>
            </BanChecker>
          </NotificationProvider>
        </ThemeProvider>
      </body>
      </html>
  );
};

export default RootLayout;
