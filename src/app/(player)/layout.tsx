'use client';

import React, { ReactNode } from 'react';
import '../styles/index.scss';
import CustomTitleBar from "../component/CustomTitleBar";
import DiscordStatusTracker from "../component/DiscordStatusTracker";
import ElectronBodyClass from "../component/ElectronBodyClass";

type LayoutProps = {
    children: ReactNode;
};

const RootLayout: React.FC<LayoutProps> = ({ children }) => {
    return (
        <html lang="ru">
        <head>
            <title>Anicat - Твой аниме сайт!</title>
            <meta charSet="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        </head>
        <body>
        <ElectronBodyClass />
        <CustomTitleBar />
        <DiscordStatusTracker />
        <main className="main-player">{children}</main>
        </body>
        </html>
    );
};

export default RootLayout;
