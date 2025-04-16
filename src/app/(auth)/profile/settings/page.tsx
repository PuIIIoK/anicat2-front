'use client';

import React, { useState } from 'react';

interface ProfileUpdatePayload {
    nickname?: string;
    bio?: string;
    avatarId?: string;
    bannerId?: string;
}

const Page = () => {
    const [activeTab, setActiveTab] = useState<'profile' | 'account'>('profile');
    const [nickname, setNickname] = useState('');
    const [description, setDescription] = useState('');
    const [login, setLogin] = useState('');
    const [password, setPassword] = useState('');
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [bannerFile, setBannerFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);

    const handleTabChange = (tab: 'profile' | 'account') => setActiveTab(tab);
    const getToken = () => document.cookie.match(/token=([^;]+)/)?.[1] || '';

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

        await fetch('http://localhost:8080/api/upload/profile-image', {
            method: 'POST',
            body: formData
        });
    };

    const handleProfileSave = async () => {
        setLoading(true);
        const token = getToken();

        const profileRes = await fetch('http://localhost:8080/api/auth/get-profile', {
            headers: { Authorization: `Bearer ${token}` },
        });

        const profile = await profileRes.json();
        const profileId = profile.profileId;

        const updateData: ProfileUpdatePayload = {};

        if (nickname && nickname !== profile.nickname) updateData.nickname = nickname;
        if (description && description !== profile.bio) updateData.bio = description;

        if (avatarFile) {
            const newAvatarId = profileId.toString();
            await uploadImage(avatarFile, 'cover', newAvatarId);
            updateData.avatarId = newAvatarId;
        }

        if (bannerFile) {
            const newBannerId = profileId.toString();
            await uploadImage(bannerFile, 'banner', newBannerId);
            updateData.bannerId = newBannerId;
        }

        if (Object.keys(updateData).length > 0) {
            await fetch('http://localhost:8080/api/auth/set-profile', {
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

        await fetch('http://localhost:8080/api/auth/set-login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ username: login, password })
        });

        alert('Аккаунт обновлен, выполните повторный вход.');
        window.location.href = '/login';
    };

    return (
        <div className="settings-container">
            <div className="settings-sidebar">
                <h2 className="category-title">Профиль и аккаунт</h2>
                <button className={activeTab === 'profile' ? 'tab-btn active' : 'tab-btn'} onClick={() => handleTabChange('profile')}>Профиль</button>
                <button className={activeTab === 'account' ? 'tab-btn active' : 'tab-btn'} onClick={() => handleTabChange('account')}>Аккаунт</button>
            </div>
            <div className="settings-content">
                {activeTab === 'profile' && (
                    <div className="tab-content">
                        <h1 className="tab-title">Информация профиля</h1>
                        <label>Никнейм</label>
                        <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="Введите никнейм" />

                        <label>Описание <span className="char-count">({description.length}/200)</span></label>
                        <textarea
                            value={description}
                            onChange={(e) => description.length <= 200 && setDescription(e.target.value)}
                            placeholder="Введите описание (до 200 символов)"
                        />

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
            </div>
        </div>
    );
};

export default Page;