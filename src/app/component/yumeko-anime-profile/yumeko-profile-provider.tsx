'use client';

import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useYumekoProfile } from './hooks/useYumekoProfile';
import YumekoProfileHeader from './yumeko-profile-components/YumekoProfileHeader';
import YumekoProfileSidebar from './yumeko-profile-components/YumekoProfileSidebar';
import YumekoProfileContent from './yumeko-profile-components/YumekoProfileContent';
import YumekoProfileBackground from './yumeko-profile-components/YumekoProfileBackground';
import YumekoFriendsModal from './yumeko-profile-components/YumekoFriendsModal';
import './styles-for-profile/yumeko-profile.scss';

interface YumekoProfileProviderProps {
    username?: string;
}

const YumekoProfileProvider: React.FC<YumekoProfileProviderProps> = ({ username }) => {
    const [activeTab, setActiveTab] = useState('main');
    const [isFriendsModalOpen, setIsFriendsModalOpen] = useState(false);

    const profileData = useYumekoProfile(username);

    const {
        userName,
        isLoading,
        isNotFound,
        profileColor1,
        profileColor2,
        profileColorScheme,
        isOwnProfile,
        isPermanentBan,
        canonicalUsername,
        backgroundAnimatedUrl,
        backgroundStaticUrl,
        backgroundUrl
    } = profileData;

    // Функция для конвертации HEX в RGB
    const hexToRgb = (hex: string): string => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '102, 192, 244';
    };

    // Применяем CSS переменные для цветов профиля
    useEffect(() => {
        const wrapper = document.querySelector('.yumeko-profile-wrapper');
        if (wrapper) {
            const htmlElement = wrapper as HTMLElement;
            
            if (profileColor1 && profileColor1.trim() !== '') {
                const color1 = profileColor1.trim();
                const rgb1 = hexToRgb(color1);
                htmlElement.style.setProperty('--profile-color-1', color1);
                htmlElement.style.setProperty('--profile-color-1-rgb', rgb1);
            }
            
            if (profileColor2 && profileColor2.trim() !== '') {
                const color2 = profileColor2.trim();
                const rgb2 = hexToRgb(color2);
                htmlElement.style.setProperty('--profile-color-2', color2);
                htmlElement.style.setProperty('--profile-color-2-rgb', rgb2);
            }
        }
    }, [profileColor1, profileColor2]);

    // Обновляем title
    useEffect(() => {
        if (userName && userName !== 'Загрузка...') {
            document.title = `${userName} | Yumeko`;
        }
    }, [userName]);

    // Применяем CSS переменные для цветов профиля через inline style
    const profileStyle: Record<string, string> = {};
    if (profileColor1 && profileColor1.trim() !== '') {
        const rgb1 = hexToRgb(profileColor1.trim());
        profileStyle['--profile-color-1'] = profileColor1.trim();
        profileStyle['--profile-color-1-rgb'] = rgb1;
    }
    if (profileColor2 && profileColor2.trim() !== '') {
        const rgb2 = hexToRgb(profileColor2.trim());
        profileStyle['--profile-color-2'] = profileColor2.trim();
        profileStyle['--profile-color-2-rgb'] = rgb2;
    }

    // Если профиль не найден
    if (isNotFound && !isLoading) {
        return (
            <div className="yumeko-profile-wrapper" data-theme="default">
                <YumekoProfileBackground 
                    backgroundAnimatedUrl={null}
                    backgroundStaticUrl={null}
                    backgroundUrl={null}
                />
                <div className="yumeko-profile-not-found">
                    <div className="not-found-icon">🔍</div>
                    <h1>Данный профиль не найден</h1>
                    <p>Пользователь с таким именем не существует или был удален</p>
                </div>
            </div>
        );
    }

    // Если перманентный бан
    if (isPermanentBan) {
        return (
            <div className="yumeko-profile-wrapper" data-theme={profileColorScheme || 'default'} style={profileStyle}>
                <YumekoProfileBackground 
                    backgroundAnimatedUrl={backgroundAnimatedUrl}
                    backgroundStaticUrl={backgroundStaticUrl}
                    backgroundUrl={backgroundUrl}
                />
                <div className="yumeko-profile-ban-page">
                    <div className="yumeko-ban-container">
                        <div className="yumeko-ban-icon">⛔</div>
                        <h1>Пользователь заблокирован</h1>
                        <p>Данный пользователь был навсегда забанен за нарушение правил сообщества</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <Head>
                <title>{userName} | Yumeko</title>
                <meta name="description" content={`Профиль ${userName} на Yumeko`} />
            </Head>

            <div className="yumeko-profile-wrapper" data-theme={profileColorScheme || 'default'} style={profileStyle}>
                <YumekoProfileBackground 
                    backgroundAnimatedUrl={backgroundAnimatedUrl}
                    backgroundStaticUrl={backgroundStaticUrl}
                    backgroundUrl={backgroundUrl}
                />

                <div className="yumeko-profile-container">
                    <YumekoProfileHeader 
                        profileData={profileData}
                    />

                    <div className="yumeko-profile-body">
                        <YumekoProfileSidebar 
                            profileData={profileData}
                            onOpenFriendsModal={() => setIsFriendsModalOpen(true)}
                        />

                        <YumekoProfileContent 
                            profileData={profileData}
                            activeTab={activeTab}
                            setActiveTab={setActiveTab}
                        />
                    </div>
                </div>

                <YumekoFriendsModal 
                    isOpen={isFriendsModalOpen}
                    onClose={() => setIsFriendsModalOpen(false)}
                    friends={profileData.friends}
                    incomingCount={profileData.incomingCount}
                />
            </div>
        </>
    );
};

export default YumekoProfileProvider;
