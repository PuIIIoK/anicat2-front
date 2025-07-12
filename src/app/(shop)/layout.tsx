'use client';

import { ReactNode } from 'react';
import Footer from '../component/footer';
import '../styles/index.scss';

type LayoutProps = {
    children: ReactNode;
};

const RootLayout: React.FC<LayoutProps> = ({ children }) => {
    return (
        <html lang="ru">
        <head>
            <title>Anicat - Магазин</title>
            <meta charSet="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        </head>
        <body>
        <main className="main">{children}</main>
        <Footer />
        </body>
        </html>
    );
};

export default RootLayout;
