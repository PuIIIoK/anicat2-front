import React, { ReactNode } from 'react';
import '../styles/index.scss';
import AuthHeader from '../component/header-auth';
import BottomNavBar from "../component/mobile-navigation/BottomNavBar";
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
            <title>AniCat - твой аниме сайт!</title>
            <meta charSet="UTF-8"/>
            <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
            <meta
                name="description"
                content="AniCat — смотри аниме, находи друзей, комментируй, ставь оценки и отзывы. У нас есть огромная библиотека 2K и 4K аниме. Зарегистрируйся и смотри с удовольствием!"
            />
            <meta property="og:title" content="AniCat - твой аниме сайт!"/>
            <meta
                property="og:description"
                content="Смотри аниме, находи друзей, оставляй отзывы и оценки. Огромная библиотека 2K и 4K аниме!"
            />
            <meta property="og:type" content="website"/>
            <meta property="og:locale" content="ru_RU"/>
            <meta property="og:site_name" content="AniCat"/>

            <link
                href="https://fonts.googleapis.com/css2?family=M+PLUS+1p:wght@400;500;700&family=Rubik:wght@400;500;700&family=Stick&family=Zen+Tokyo+Zoo&display=swap"
                rel="stylesheet"
            />
        </head>
        <body>
        <ElectronBodyClass />
        <div className="mobile-only">
            <BottomNavBar/>
        </div>
        <CustomTitleBar />
        <DiscordStatusTracker />
        <AuthHeader/>
        <main className="main">{children}</main>
        </body>
        </html>
    );
};

export default RootLayout;
