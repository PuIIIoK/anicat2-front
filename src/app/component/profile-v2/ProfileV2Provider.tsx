'use client';

import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useYumekoProfile } from '../yumeko-anime-profile/hooks/useYumekoProfile';
import ProfileV2Header from './components/ProfileV2Header';
import ProfileV2Stats from './components/ProfileV2Stats';
import ProfileV2Content from './components/ProfileV2Content';
import ProfileV2Background from './components/ProfileV2Background';
import ProfileV2Sidebar from './components/ProfileV2Sidebar';
import './styles/profile-v2.scss';

interface ProfileV2ProviderProps {
    username?: string;
}

const ProfileV2Provider: React.FC<ProfileV2ProviderProps> = ({ username }) => {
    const [activeSection, setActiveSection] = useState<'activity' | 'anime' | 'reviews' | 'friends'>('activity');
    const profileData = useYumekoProfile(username);

    const {
        userName,
        isLoading,
        isNotFound,
        profileColor1,
        profileColor2,
        profileColorScheme,
        isPermanentBan,
        backgroundAnimatedUrl,
        backgroundStaticUrl,
        backgroundUrl
    } = profileData;

    const hexToRgb = (hex: string): string => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '175, 82, 222';
    };

    useEffect(() => {
        if (userName && userName !== 'Загрузка...') {
            document.title = `${userName} | Yumeko`;
        }
    }, [userName]);

    const profileStyle: Record<string, string> = {};
    if (profileColor1 && profileColor1.trim() !== '') {
        const rgb1 = hexToRgb(profileColor1.trim());
        profileStyle['--profile-accent-1'] = profileColor1.trim();
        profileStyle['--profile-accent-1-rgb'] = rgb1;
    }
    if (profileColor2 && profileColor2.trim() !== '') {
        const rgb2 = hexToRgb(profileColor2.trim());
        profileStyle['--profile-accent-2'] = profileColor2.trim();
        profileStyle['--profile-accent-2-rgb'] = rgb2;
    }

    if (isNotFound && !isLoading) {
        return (
            <div className="profile-v2-wrapper" data-theme="default">
                <ProfileV2Background 
                    backgroundAnimatedUrl={null}
                    backgroundStaticUrl={null}
                    backgroundUrl={null}
                />
                <div className="profile-v2-not-found">
                    <div className="not-found-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <circle cx="11" cy="11" r="8"/>
                            <path d="m21 21-4.35-4.35"/>
                            <path d="M11 8v2M11 14h.01"/>
                        </svg>
                    </div>
                    <h1>Профиль не найден</h1>
                    <p>Пользователь с таким именем не существует</p>
                    <Link href="/" className="back-home-btn">
                        На главную
                    </Link>
                </div>
            </div>
        );
    }

    if (isPermanentBan) {
        return (
            <div className="profile-v2-wrapper" data-theme={profileColorScheme || 'default'} style={profileStyle}>
                <ProfileV2Background 
                    backgroundAnimatedUrl={backgroundAnimatedUrl}
                    backgroundStaticUrl={backgroundStaticUrl}
                    backgroundUrl={backgroundUrl}
                />
                <div className="profile-v2-banned">
                    <div className="banned-icon">⛔</div>
                    <h1>Аккаунт заблокирован</h1>
                    <p>Данный пользователь был навсегда заблокирован за нарушение правил</p>
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

            <div className="profile-v2-wrapper" data-theme={profileColorScheme || 'default'} style={profileStyle}>
                <ProfileV2Background 
                    backgroundAnimatedUrl={backgroundAnimatedUrl}
                    backgroundStaticUrl={backgroundStaticUrl}
                    backgroundUrl={backgroundUrl}
                />

                <div className="profile-v2-container">
                    {/* Hero Section с баннером и аватаром */}
                    <ProfileV2Header profileData={profileData} />

                    {/* Основной контент - 2 колонки */}
                    <div className="profile-v2-layout">
                        {/* Левая колонка - sidebar + stats */}
                        <aside className="profile-v2-left">
                            <ProfileV2Sidebar 
                                profileData={profileData}
                                activeSection={activeSection}
                                setActiveSection={setActiveSection}
                            />
                            <ProfileV2Stats profileData={profileData} />
                        </aside>

                        {/* Правая колонка - контент */}
                        <ProfileV2Content 
                            profileData={profileData}
                            activeSection={activeSection}
                        />
                    </div>
                </div>
            </div>
        </>
    );
};

export default ProfileV2Provider;
