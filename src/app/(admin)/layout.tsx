import React, { ReactNode } from 'react';
import '@/styles/index.scss';
import { Header, CustomTitleBar, DiscordStatusTracker, ElectronBodyClass } from "@/component/layout";
import { NotificationProvider } from '@/component/notifications/NotificationManager';
import BanChecker from '@/component/BanChecker';
import AdminRoleChecker from '@/component/AdminRoleChecker';
import SyncProgressNotification from '@/component/sync/SyncProgressNotification';
import { API_SERVER } from '@/hosts/constants';
import { ThemeProvider } from '../context/ThemeContext';
import { YumekoUploadProvider } from '../context/YumekoUploadContext';

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
            <YumekoUploadProvider>
              <BanChecker>
                <AdminRoleChecker>
                  <ElectronBodyClass />
                  <CustomTitleBar />
                  <DiscordStatusTracker />
                  <Header />
                  <main className="main">{children}</main>
                  
                  {/* Глобальные компоненты */}
                  <SyncProgressNotification apiServer={API_SERVER} />
                </AdminRoleChecker>
              </BanChecker>
            </YumekoUploadProvider>
          </NotificationProvider>
        </ThemeProvider>
      </body>
      </html>
  );
};

export default RootLayout;
