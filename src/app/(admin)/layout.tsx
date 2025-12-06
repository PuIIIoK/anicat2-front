'use client';

import React, { ReactNode } from 'react';
import '@/styles/index.scss';
import { Header, CustomTitleBar, DiscordStatusTracker, ElectronBodyClass, Sidebar } from "@/component/layout";
import { NotificationProvider } from '@/component/notifications/NotificationManager';
import BanChecker from '@/component/BanChecker';
import AdminRoleChecker from '@/component/AdminRoleChecker';
import SyncProgressNotification from '@/component/sync/SyncProgressNotification';
import { API_SERVER } from '@/hosts/constants';
import { ThemeProvider } from '../context/ThemeContext';
import { SidebarProvider, useSidebar } from '../context/SidebarContext';
import { YumekoUploadProvider } from '../context/YumekoUploadContext';

type LayoutProps = {
  children: ReactNode;
};

// Wrapper для доступа к useSidebar
const AdminContent: React.FC<LayoutProps> = ({ children }) => {
  const { isOpen, toggle } = useSidebar();
  
  return (
    <>
      <Sidebar isOpen={isOpen} onToggle={toggle} />
      <ElectronBodyClass />
      <CustomTitleBar />
      <DiscordStatusTracker />
      <Header />
      <main className="main">{children}</main>
      
      {/* Глобальные компоненты */}
      <SyncProgressNotification apiServer={API_SERVER} />
    </>
  );
};

const RootLayout: React.FC<LayoutProps> = ({ children }) => {
  return (
      <html lang="ru" suppressHydrationWarning>
      <head>
        <title>Yumeko | Admin_Panel</title>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider>
          <SidebarProvider>
            <NotificationProvider>
              <YumekoUploadProvider>
                <BanChecker>
                  <AdminRoleChecker>
                    <AdminContent>{children}</AdminContent>
                  </AdminRoleChecker>
                </BanChecker>
              </YumekoUploadProvider>
            </NotificationProvider>
          </SidebarProvider>
        </ThemeProvider>
      </body>
      </html>
  );
};

export default RootLayout;
