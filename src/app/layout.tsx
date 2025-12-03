import { ReactNode } from 'react';
import '@/styles/index.scss';

export const metadata = {
    title: 'Yumeko - Аниме онлайн',
    description: 'Смотрите аниме онлайн бесплатно в хорошем качестве',
};

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="ru" suppressHydrationWarning>
            <head>
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
            <body suppressHydrationWarning style={{ margin: 0, padding: 0, background: '#0a0a0a' }}>
                {children}
            </body>
        </html>
    );
}
