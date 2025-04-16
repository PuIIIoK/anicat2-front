import { ReactNode } from 'react';
import '../styles/index.scss';
import AuthHeader from '../component/header-auth';
import LoadingPage from "../component/LoadingPage";

type LayoutProps = {
    children: ReactNode;
};

const RootLayout: React.FC<LayoutProps> = ({ children }) => {
    return (
        <html lang="ru">
        <head>
            <title>Anicat</title>
            <meta charSet="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        </head>
        <body>
        <LoadingPage />
        <AuthHeader/>
        <main className="main">{children}</main>
        </body>
        </html>
    );
};

export default RootLayout;
