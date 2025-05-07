'use client';

import React, { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { API_SERVER } from '../../../tools/constants';
import Chart from 'chart.js/auto';

interface UserProfileResponse {
    userId: number;
    username: string;
    roles: string[];
    profileId: number;
    nickname: string | null;
    bio: string | null;
    avatarId: string | null;
    bannerId: string | null;
}

const ProfileMainInfo: React.FC = () => {
    const [userName, setUserName] = useState<string>('Загрузка...');
    const [userDescription, setUserDescription] = useState<string | null>('...');
    const [userRoles, setUserRoles] = useState<string[]>([]);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [bannerUrl, setBannerUrl] = useState<string | null>(null);
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstanceRef = useRef<Chart | null>(null);

    const getCookieToken = () => {
        const match = document.cookie.match(/token=([^;]+)/);
        return match ? match[1] : '';
    };

    const fetchProfile = async () => {
        try {
            const response = await fetch(`${API_SERVER}/api/auth/get-profile`, {
                headers: {
                    Authorization: `Bearer ${getCookieToken()}`
                }
            });

            if (response.ok) {
                const data: UserProfileResponse = await response.json();
                setUserName(data.nickname || data.username || 'Пользователь');
                setUserDescription(data.bio);
                const cleanRoles = data.roles.map(role => role.replace('ROLE_', ''));
                setUserRoles(cleanRoles);
            } else {
                setUserName('Ошибка');
                setUserDescription('Профиль не найден');
            }
        } catch {
            setUserName('Ошибка');
            setUserDescription('Ошибка загрузки профиля');
        }
    };

    const fetchImages = async () => {
        try {
            const token = getCookieToken();

            const avatarRes = await fetch(`${API_SERVER}/api/profile/get-cover-lk`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (avatarRes.ok) {
                const avatarData = await avatarRes.json();
                if (avatarData.url) setAvatarUrl(avatarData.url);
            }

            const bannerRes = await fetch(`${API_SERVER}/api/profile/get-banner-lk`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (bannerRes.ok) {
                const bannerData = await bannerRes.json();
                if (bannerData.url) setBannerUrl(bannerData.url);
            }
        } catch (err) {
            console.error('Ошибка загрузки изображений профиля', err);
        }
    };

    useEffect(() => {
        fetchProfile();
        fetchImages();

        const ctx = chartRef.current?.getContext('2d');
        if (ctx && chartInstanceRef.current) {
            chartInstanceRef.current.destroy();
        }
    }, []);

    return (
        <div className="profile-main-info">
            <div className="profile-header-container">
                <div className="profile-photo-cover">
                    {bannerUrl ? (
                        <Image
                            src={bannerUrl}
                            alt="Cover"
                            className="photo-cover-img"
                            width={1200}
                            height={200}
                        />
                    ) : (
                        <div className="photo-cover-placeholder">Загрузка баннера...</div>
                    )}

                    <div className="profile-photo">
                        {avatarUrl ? (
                            <Image
                                src={avatarUrl}
                                alt="Avatar"
                                className="photo-logo-img"
                                width={70}
                                height={70}
                            />
                        ) : (
                            <div className="photo-avatar-placeholder">Загрузка аватарки...</div>
                        )}
                    </div>
                </div>
            </div>

            <div className="profile-info-page">
                <div className="profile-info-roles">
                    <div className="profile-role-list">
                        {userRoles
                            .filter(role => role !== 'USER')
                            .map((role, index) => {
                                let displayRole = role;
                                switch (role) {
                                    case 'ADMIN':
                                        displayRole = 'Администратор';
                                        break;
                                    case 'MODERATOR':
                                        displayRole = 'Модератор';
                                        break;
                                    case 'ANIME_CHECKER':
                                        displayRole = 'Заливщик';
                                        break;
                                }
                                return (
                                    <span key={role} className={`profile-role role-${role.toLowerCase()}`}>
                                        {displayRole}
                                        {index < userRoles.length - 1}
                                    </span>
                                );
                            })}
                    </div>
                </div>

                <div className="profile-info-info">
                    <h1>{userName}</h1>
                    <h2>{userDescription?.trim() ? userDescription : 'Нету информации'}</h2>
                </div>
            </div>
        </div>
    );
};

export default ProfileMainInfo;
