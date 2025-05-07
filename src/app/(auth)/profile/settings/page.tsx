'use client';

import React, { useEffect, useState } from 'react';
import { API_SERVER } from '../../../../tools/constants';

interface ProfileUpdatePayload {
    nickname?: string;
    bio?: string;
    avatarId?: string;
    bannerId?: string;
}

interface Profile {
    nickname: string;
    bio: string;
    profileId: number;
    roles: string[];
    animePageBeta?: boolean;
    profilePageBeta?: boolean;
}

type Tab = 'profile' | 'account' | 'testing';

const Page = () => {
    const [activeTab, setActiveTab] = useState<Tab>('profile');
    const [nickname, setNickname] = useState('');
    const [description, setDescription] = useState('');
    const [login, setLogin] = useState('');
    const [password, setPassword] = useState('');
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [bannerFile, setBannerFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);

    const [profile, setProfile] = useState<Profile | null>(null);
    const [animePageEnabled, setAnimePageEnabled] = useState(false);
    const [profilePageEnabled, setProfilePageEnabled] = useState(false);
    const [allTestingEnabled, setAllTestingEnabled] = useState(false);

    const isTester = profile?.roles.includes('TESTER') || profile?.roles.includes('MODERATOR') || profile?.roles.includes('ADMIN');

    const getToken = () => document.cookie.match(/token=([^;]+)/)?.[1] || '';

    const handleTabChange = (tab: Tab) => setActiveTab(tab);

    const resetFields = () => {
        setNickname('');
        setDescription('');
        setLogin('');
        setPassword('');
        setAvatarFile(null);
        setBannerFile(null);
    };

    const uploadImage = async (file: File, type: 'cover' | 'banner', id: string) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', type);
        formData.append('id', id);

        await fetch(`${API_SERVER}/api/upload/profile-image`, {
            method: 'POST',
            body: formData,
        });
    };

    const handleProfileSave = async () => {
        setLoading(true);
        const token = getToken();

        const res = await fetch(`${API_SERVER}/api/auth/get-profile`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        const updateData: ProfileUpdatePayload = {};

        if (nickname && nickname !== data.nickname) updateData.nickname = nickname;
        if (description && description !== data.bio) updateData.bio = description;

        if (avatarFile) {
            await uploadImage(avatarFile, 'cover', data.profileId.toString());
            updateData.avatarId = data.profileId.toString();
        }

        if (bannerFile) {
            await uploadImage(bannerFile, 'banner', data.profileId.toString());
            updateData.bannerId = data.profileId.toString();
        }

        if (Object.keys(updateData).length > 0) {
            await fetch(`${API_SERVER}/api/auth/set-profile`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(updateData),
            });
            alert('Профиль обновлён!');
        } else {
            alert('Нет изменений для сохранения.');
        }

        setLoading(false);
    };

    const handleAccountSave = async () => {
        const token = getToken();
        await fetch(`${API_SERVER}/api/auth/set-login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ username: login, password }),
        });

        alert('Аккаунт обновлен! Пожалуйста, перезайдите.');
        window.location.href = '/login';
    };

    const saveTestSettings = async (anime: boolean, profile: boolean) => {
        const token = getToken();
        try {
            const response = await fetch(`${API_SERVER}/api/upload/profile/test-settings`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    animePageBeta: anime,
                    profilePageBeta: profile
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Ошибка сохранения настроек:', errorText);
                alert('Не удалось сохранить тестовые настройки!');
            } else {
                console.log('Тестовые настройки успешно сохранены.');
            }
        } catch (error) {
            console.error('Ошибка запроса на сервер:', error);
            alert('Ошибка подключения к серверу!');
        }
    };


    useEffect(() => {
        const fetchProfile = async () => {
            const token = getToken();
            const res = await fetch(`${API_SERVER}/api/auth/get-profile`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            setProfile(data);
            setAnimePageEnabled(data.animePageBeta ?? false);
            setProfilePageEnabled(data.profilePageBeta ?? false);
            setAllTestingEnabled((data.animePageBeta ?? false) && (data.profilePageBeta ?? false));
        };

        fetchProfile();
    }, []);

    useEffect(() => {
        if (profile) {
            saveTestSettings(animePageEnabled, profilePageEnabled);
        }
    }, [animePageEnabled, profilePageEnabled]);

    return (
        <div className="settings-container">
            <div className="settings-sidebar">
                <h2 className="category-title">Профиль и аккаунт</h2>
                <button className={activeTab === 'profile' ? 'tab-btn active' : 'tab-btn'} onClick={() => handleTabChange('profile')}>Профиль</button>
                <button className={activeTab === 'account' ? 'tab-btn active' : 'tab-btn'} onClick={() => handleTabChange('account')}>Аккаунт</button>
                <button className={activeTab === 'testing' ? 'tab-btn active' : 'tab-btn'} onClick={() => handleTabChange('testing')}>Тестирование</button>
            </div>

            <div className="settings-content">
                {activeTab === 'profile' && (
                    <div className="tab-content">
                        <h1 className="tab-title">Информация профиля</h1>
                        <label>Никнейм</label>
                        <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="Введите никнейм" />
                        <label>Описание <span className="char-count">({description.length}/200)</span></label>
                        <textarea value={description} onChange={(e) => description.length <= 200 && setDescription(e.target.value)} placeholder="Введите описание (до 200 символов)" />
                        <label>Аватарка</label>
                        <input type="file" className="upload-input" onChange={(e) => setAvatarFile(e.target.files?.[0] || null)} />
                        <label>Баннер</label>
                        <input type="file" className="upload-input" onChange={(e) => setBannerFile(e.target.files?.[0] || null)} />
                        <div className="button-group">
                            <button onClick={handleProfileSave} className="save-btn" disabled={loading}>
                                {loading ? 'Сохраняем...' : 'Сохранить'}
                            </button>
                            <button onClick={resetFields} className="cancel-btn">Отмена</button>
                        </div>
                    </div>
                )}

                {activeTab === 'account' && (
                    <div className="tab-content">
                        <h1 className="tab-title">Настройки аккаунта</h1>
                        <label>Логин</label>
                        <input type="text" value={login} onChange={(e) => setLogin(e.target.value)} placeholder="Введите логин" />
                        <label>Пароль</label>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Введите пароль" />
                        <div className="button-group">
                            <button onClick={handleAccountSave} className="save-btn">Сохранить</button>
                            <button onClick={resetFields} className="cancel-btn">Отмена</button>
                        </div>
                    </div>
                )}

                {activeTab === 'testing' && (
                    <div className="tab-content">
                        {isTester ? (
                            <>
                                <h1 className="tab-title">Страница тестирования</h1>
                                <div className="testing-options">
                                    <div className="switch-row">
                                        <label className="custom-switch">
                                            <input
                                                type="checkbox"
                                                checked={animePageEnabled}
                                                onChange={async () => {
                                                    const newAnimeValue = !animePageEnabled;
                                                    const currentProfileValue = profilePageEnabled;
                                                    setAnimePageEnabled(newAnimeValue);
                                                    await saveTestSettings(newAnimeValue, currentProfileValue);
                                                }}
                                            />
                                            <span className="custom-slider"></span>
                                        </label>
                                        <span className="switch-label">Новая страница аниме</span>
                                    </div>

                                    <div className="switch-row">
                                        <label className="custom-switch">
                                            <input
                                                type="checkbox"
                                                checked={profilePageEnabled}
                                                onChange={async () => {
                                                    const newProfileValue = !profilePageEnabled;
                                                    const currentAnimeValue = animePageEnabled;
                                                    setProfilePageEnabled(newProfileValue);
                                                    await saveTestSettings(currentAnimeValue, newProfileValue);
                                                }}
                                            />
                                            <span className="custom-slider"></span>
                                        </label>
                                        <span className="switch-label">Новая страница профиля</span>
                                    </div>

                                    <div className="switch-row">
                                        <label className="custom-switch">
                                            <input
                                                type="checkbox"
                                                checked={allTestingEnabled}
                                                onChange={async () => {
                                                    const newAllValue = !allTestingEnabled;
                                                    setAllTestingEnabled(newAllValue);
                                                    setAnimePageEnabled(newAllValue);
                                                    setProfilePageEnabled(newAllValue);
                                                    await saveTestSettings(newAllValue, newAllValue);
                                                }}
                                            />
                                            <span className="custom-slider"></span>
                                        </label>
                                        <span className="switch-label">Включить всё тестирование</span>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="testing-info">
                                Чтобы участвовать в тестировании, обратитесь к главному администратору, чтобы вам выдали
                                роль тестера.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Page;
