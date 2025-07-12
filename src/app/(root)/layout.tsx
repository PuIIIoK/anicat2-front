'use client';

import React, { ReactNode, useEffect } from 'react';
import Header from '../component/header';
import Footer from '../component/footer';
import BottomNavBar from '../component/mobile-navigation/BottomNavBar';
import '../styles/index.scss';
import dynamic from 'next/dynamic';
import TestAccess from "../component/TestAcces";

const CustomTitleBar = dynamic(() => import('../component/CustomTitleBar'), { ssr: false });
const DiscordStatusTracker = dynamic(() => import('../component/DiscordStatusTracker'), { ssr: false });

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

    return (
        <html lang="ru">
        <head>
            <title>Anicat - Твой аниме сайт!</title>
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
        <TestAccess>
        <CustomTitleBar />
        <DiscordStatusTracker />

        <div className="mobile-only">
            <BottomNavBar />
        </div>
        <Header />
        <main className="main">{children}</main>
        <Footer />
        </TestAccess>
        </body>
        </html>
    );
};

export default RootLayout;
