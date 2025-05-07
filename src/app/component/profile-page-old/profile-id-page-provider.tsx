'use client';

import React, { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { API_SERVER } from '../../../tools/constants';
import Chart from 'chart.js/auto';

interface UserProfileResponse {
    profileId: number;
    username: string;
    nickname: string | null;
    bio: string | null;
    avatarId: string | null;
    bannerId: string | null;
    roles?: string[];
}

interface Props {
    username: string;
}

const ProfileMainInfoID: React.FC<Props> = ({ username }) => {
    const [userName, setUserName] = useState<string>('Загрузка...');
    const [userDescription, setUserDescription] = useState<string | null>('...');
    const [userRoles, setUserRoles] = useState<string[]>([]);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [bannerUrl, setBannerUrl] = useState<string | null>(null);
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstanceRef = useRef<Chart | null>(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await fetch(`${API_SERVER}/api/profiles/get-profile?username=${username}`);
                if (!res.ok) throw new Error('Профиль не найден');
                const data: UserProfileResponse = await res.json();
                setUserName(data.nickname || data.username);
                setUserDescription(data.bio);
                setUserRoles(data.roles || []);
            } catch (e) {
                setUserName('Ошибка загрузки');
                setUserDescription('Не удалось загрузить профиль');
                console.error(e);
            }
        };

        const fetchImages = async () => {
            try {
                const avatarRes = await fetch(`${API_SERVER}/api/profiles/avatar?username=${username}`);
                if (avatarRes.ok) {
                    const avatarData = await avatarRes.json();
                    if (avatarData.url) setAvatarUrl(avatarData.url);
                }

                const bannerRes = await fetch(`${API_SERVER}/api/profiles/banner?username=${username}`);
                if (bannerRes.ok) {
                    const bannerData = await bannerRes.json();
                    if (bannerData.url) setBannerUrl(bannerData.url);
                }
            } catch (err) {
                console.error('Ошибка загрузки изображений профиля', err);
            }
        };

        fetchProfile();
        fetchImages();

        if (chartRef.current && chartInstanceRef.current) {
            chartInstanceRef.current.destroy();
        }
    }, [username]);

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
                                        {index < userRoles.length - 1 && ' '}
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

export default ProfileMainInfoID;
