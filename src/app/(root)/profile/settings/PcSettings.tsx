'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { API_SERVER } from '@/hosts/constants';
import { performLogout } from '../../../utils/logoutUtils';
import { getAuthToken } from '../../../utils/auth';
import { updateProfileCache } from '../../../component/profile-page-old/hooks/useProfile';
import VideoTrimModal from '../../../../components/VideoTrimModal';
import AnimatedMedia from '../../../../components/AnimatedMedia';
import { OptimizedImage } from '../../../component/profile-page-old/components/OptimizedImage';
import * as LucideIcons from 'lucide-react';
import { BADGE_META } from '../../../component/profile-page-old/badgeMeta';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import '@/styles/components/yumeko-collection-service.scss';

type Tab = 'profile' | 'account';
type LucideIconComponent = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

interface ProfileUpdatePayload {
    nickname?: string;
    bio?: string;
    avatarId?: string;
    bannerId?: string;
    profileColorScheme?: string | null;
    profileColor1?: string | null;
    profileColor2?: string | null;
}

interface ProfileResponse {
    profileId: number;
    username: string;
    nickname: string | null;
    bio: string | null;
    profileColorScheme?: string | null;
    profileColor1?: string | null;
    profileColor2?: string | null;
    verified?: boolean;
    roles?: string[];
    badges?: string[];
}

interface MediaUrlResponse {
    url: string;
    animatedUrl?: string;
    staticUrl?: string;
}

const getToken = () => getAuthToken() || '';

const fetchProfile = async (): Promise<ProfileResponse | null> => {
    try {
        const res = await fetch(`${API_SERVER}/api/auth/get-profile`, {
            headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (!res.ok) return null;
        const data = await res.json();
        return data;
    } catch {
        return null;
    }
};

const fetchAvatarUrl = async (username: string): Promise<MediaUrlResponse | null> => {
    try {
        const res = await fetch(`${API_SERVER}/api/profiles/avatar?username=${username}`, {
            headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (!res.ok) return null;
        const data = await res.json();
        return {
            url: data?.url || data?.staticUrl || null,
            animatedUrl: data?.animatedUrl || null,
            staticUrl: data?.staticUrl || data?.url || null,
        };
    } catch {
        return null;
    }
};

const fetchBannerUrl = async (username: string): Promise<MediaUrlResponse | null> => {
    try {
        const res = await fetch(`${API_SERVER}/api/profiles/banner?username=${username}`, {
            headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (!res.ok) return null;
        const data = await res.json();
        return {
            url: data?.url || data?.staticUrl || null,
            animatedUrl: data?.animatedUrl || null,
            staticUrl: data?.staticUrl || data?.url || null,
        };
    } catch {
        return null;
    }
};

const fetchBadges = async (username: string): Promise<string[] | null> => {
    try {
        const res = await fetch(`${API_SERVER}/api/badges/user/${encodeURIComponent(username)}`);
        if (!res.ok) return null;
        const data = await res.json();
        return Array.isArray(data) ? data.map((b: Record<string, unknown>) => b.badgeName as string) : [];
    } catch {
        return null;
    }
};

const uploadImage = async (file: File, type: 'cover' | 'banner', id: string) => {
    const form = new FormData();
    form.append('file', file);
    form.append('id', id);
    const endpoint = type === 'cover' ? 'upload-avatar' : 'upload-banner';
    const res = await fetch(`${API_SERVER}/api/profiles/${endpoint}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: form,
    });
    if (!res.ok) throw new Error('Ошибка загрузки изображения');
};

const applyProfileMedia = async (profileId: string, hasAvatar: boolean, hasBanner: boolean) => {
    const payload: { profileId: string; applyAvatar?: boolean; applyBanner?: boolean } = { profileId };
    if (hasAvatar) payload.applyAvatar = true;
    if (hasBanner) payload.applyBanner = true;

    const res = await fetch(`${API_SERVER}/api/profiles/apply-profile-media`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        const errorText = await res.text();
        console.error('Ошибка применения медиа:', errorText);
        throw new Error(`Ошибка применения медиа: ${res.status}`);
    }
};

export default function PcSettings() {
    const [activeTab, setActiveTab] = useState<Tab>('profile');
    const [serverProfile, setServerProfile] = useState<ProfileResponse | null>(null);

    // Profile fields
    const [nicknameInput, setNicknameInput] = useState('');
    const [bioInput, setBioInput] = useState('');
    const [profileColorScheme, setProfileColorScheme] = useState<string | null>(null);
    const [profileColor1, setProfileColor1] = useState<string | null>(null);
    const [profileColor2, setProfileColor2] = useState<string | null>(null);
    
    // Account fields
    const [loginInput, setLoginInput] = useState('');
    
    // Files
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [bannerFile, setBannerFile] = useState<File | null>(null);
    const [animatedAvatarFile, setAnimatedAvatarFile] = useState<File | null>(null);
    const [animatedBannerFile, setAnimatedBannerFile] = useState<File | null>(null);
    const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
    const [animatedBackgroundFile, setAnimatedBackgroundFile] = useState<File | null>(null);
    
    // Preview URLs
    const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
    const [bannerPreviewUrl, setBannerPreviewUrl] = useState<string | null>(null);
    const [animatedAvatarPreviewUrl, setAnimatedAvatarPreviewUrl] = useState<string | null>(null);
    const [animatedBannerPreviewUrl, setAnimatedBannerPreviewUrl] = useState<string | null>(null);
    
    // Server URLs
    const [avatarServerUrl, setAvatarServerUrl] = useState<string | null>(null);
    const [bannerServerUrl, setBannerServerUrl] = useState<string | null>(null);
    const [animatedAvatarServerUrl, setAnimatedAvatarServerUrl] = useState<string | null>(null);
    const [animatedBannerServerUrl, setAnimatedBannerServerUrl] = useState<string | null>(null);
    
    // Video trim modal
    const [showTrimModal, setShowTrimModal] = useState(false);
    const [trimModalFile, setTrimModalFile] = useState<File | null>(null);
    const [trimModalType, setTrimModalType] = useState<'avatar' | 'banner'>('avatar');
    const [isProcessingVideo, setIsProcessingVideo] = useState(false);
    
    // UI state
    const [saving, setSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    
    // Account modals
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [newLogin, setNewLogin] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [loginCaptchaToken, setLoginCaptchaToken] = useState<string | null>(null);
    const [passwordCaptchaToken, setPasswordCaptchaToken] = useState<string | null>(null);
    const loginCaptchaRef = useRef<HCaptcha>(null);
    const passwordCaptchaRef = useRef<HCaptcha>(null);
    
    const HCAPTCHA_SITE_KEY = '10000000-ffff-ffff-ffff-000000000001'; // Замените на ваш реальный ключ

    // Load profile on mount
    useEffect(() => {
        (async () => {
            const p = await fetchProfile();
            if (!p) return;
            setServerProfile(p);
            setNicknameInput(p.nickname || '');
                setBioInput(p.bio || '');
                setLoginInput(p.username || '');
            setProfileColorScheme(p.profileColorScheme || null);
            setProfileColor1(p.profileColor1 || null);
            setProfileColor2(p.profileColor2 || null);

            // Fetch avatar, banner and badges using username
            const [avatarData, bannerData, badgesData] = await Promise.all([
                fetchAvatarUrl(p.username), 
                fetchBannerUrl(p.username),
                fetchBadges(p.username)
            ]);
            
            if (avatarData?.url) setAvatarServerUrl(avatarData.url);
            if (avatarData?.animatedUrl) setAnimatedAvatarServerUrl(avatarData.animatedUrl);
            if (bannerData?.url) setBannerServerUrl(bannerData.url);
            if (bannerData?.animatedUrl) setAnimatedBannerServerUrl(bannerData.animatedUrl);
            
            // Update serverProfile with badges
            if (badgesData) {
                setServerProfile(prev => prev ? { ...prev, badges: badgesData } : null);
            }
        })();
    }, []);

    // Track unsaved changes
    useEffect(() => {
        if (!serverProfile) return;
        
        const hasChanges = 
            nicknameInput !== (serverProfile.nickname || '') ||
            bioInput !== (serverProfile.bio || '') ||
            profileColorScheme !== (serverProfile.profileColorScheme || null) ||
            profileColor1 !== (serverProfile.profileColor1 || null) ||
            profileColor2 !== (serverProfile.profileColor2 || null) ||
            avatarFile !== null ||
            bannerFile !== null ||
            animatedAvatarFile !== null ||
            animatedBannerFile !== null;
            
        setHasUnsavedChanges(hasChanges);
    }, [nicknameInput, bioInput, profileColorScheme, profileColor1, profileColor2, avatarFile, bannerFile, animatedAvatarFile, animatedBannerFile, serverProfile]);

    // Create preview URLs for files
    useEffect(() => {
        if (avatarFile) {
            const url = URL.createObjectURL(avatarFile);
            setAvatarPreviewUrl(url);
            return () => URL.revokeObjectURL(url);
        }
    }, [avatarFile]);

    useEffect(() => {
        if (bannerFile) {
            const url = URL.createObjectURL(bannerFile);
            setBannerPreviewUrl(url);
            return () => URL.revokeObjectURL(url);
        }
    }, [bannerFile]);

    useEffect(() => {
        if (animatedAvatarFile) {
            const url = URL.createObjectURL(animatedAvatarFile);
            setAnimatedAvatarPreviewUrl(url);
            return () => URL.revokeObjectURL(url);
        }
    }, [animatedAvatarFile]);

    useEffect(() => {
        if (animatedBannerFile) {
            const url = URL.createObjectURL(animatedBannerFile);
            setAnimatedBannerPreviewUrl(url);
            return () => URL.revokeObjectURL(url);
        }
    }, [animatedBannerFile]);

    const handleVideoTrimConfirm = async (startTime: number, endTime: number, previewFrame?: number) => {
        if (!trimModalFile || !serverProfile) return;
        
        setIsProcessingVideo(true);
        
        try {
            const formData = new FormData();
            formData.append('video', trimModalFile);
            formData.append('start', startTime.toString());
            formData.append('end', endTime.toString());
            if (previewFrame !== undefined) {
                formData.append('previewFrame', previewFrame.toString());
            }
            formData.append('profileId', String(serverProfile.profileId));
            
            const endpoint = trimModalType === 'avatar' ? 'upload-avatar-animated' : 'upload-banner-animated';
            const res = await fetch(`${API_SERVER}/api/profiles/${endpoint}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${getToken()}` },
                body: formData,
            });
            
            if (!res.ok) throw new Error('Ошибка обработки видео');
            
            if (trimModalType === 'avatar') {
                setAnimatedAvatarFile(trimModalFile);
            } else {
                setAnimatedBannerFile(trimModalFile);
            }
            
            setShowTrimModal(false);
            setTrimModalFile(null);
        } catch (error) {
            console.error('Ошибка обработки видео:', error);
            alert('Ошибка обработки видео');
        } finally {
            setIsProcessingVideo(false);
        }
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        if (file.type.startsWith('video/')) {
            setTrimModalFile(file);
            setTrimModalType('avatar');
            setShowTrimModal(true);
        } else if (file.type.startsWith('image/')) {
            setAvatarFile(file);
        }
    };

    const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        if (file.type.startsWith('video/')) {
            setTrimModalFile(file);
            setTrimModalType('banner');
            setShowTrimModal(true);
        } else if (file.type.startsWith('image/')) {
            setBannerFile(file);
        }
    };

    const handleUnsavedSave = async () => {
        await handleSaveProfile();
    };

    const handleUnsavedCancel = () => {
        if (!serverProfile) return;
        
        setNicknameInput(serverProfile.nickname || '');
        setBioInput(serverProfile.bio || '');
        setProfileColorScheme(serverProfile.profileColorScheme || null);
        setProfileColor1(serverProfile.profileColor1 || null);
        setProfileColor2(serverProfile.profileColor2 || null);
        setAvatarFile(null);
        setBannerFile(null);
        setAnimatedAvatarFile(null);
        setAnimatedBannerFile(null);
        setHasUnsavedChanges(false);
    };

    const handleSaveProfile = async () => {
        if (!serverProfile) return;
        setSaving(true);

        try {
            const updateData: ProfileUpdatePayload = {};
            
            if (nicknameInput.trim() && nicknameInput !== (serverProfile.nickname || '')) {
                updateData.nickname = nicknameInput.trim();
            }
            if (bioInput !== (serverProfile.bio || '')) {
                updateData.bio = bioInput;
            }
            if (profileColorScheme !== (serverProfile.profileColorScheme || null)) {
                updateData.profileColorScheme = profileColorScheme;
            }
            // Всегда отправляем цвета, даже если они null (для сброса отправляем пустую строку)
            if (profileColor1 !== (serverProfile.profileColor1 || null)) {
                updateData.profileColor1 = profileColor1 === null ? '' : profileColor1;
            }
            if (profileColor2 !== (serverProfile.profileColor2 || null)) {
                updateData.profileColor2 = profileColor2 === null ? '' : profileColor2;
            }
            
            // Upload static images
            if (avatarFile) {
                await uploadImage(avatarFile, 'cover', String(serverProfile.profileId));
                updateData.avatarId = String(serverProfile.profileId);
            }
            if (bannerFile) {
                await uploadImage(bannerFile, 'banner', String(serverProfile.profileId));
                updateData.bannerId = String(serverProfile.profileId);
            }
            
            // Apply animated media
            const hasAnimatedAvatar = !!animatedAvatarFile;
            const hasAnimatedBanner = !!animatedBannerFile;
            
            if (hasAnimatedAvatar || hasAnimatedBanner) {
                await applyProfileMedia(
                    String(serverProfile.profileId),
                    hasAnimatedAvatar,
                    hasAnimatedBanner
                );
                
                if (hasAnimatedAvatar) updateData.avatarId = String(serverProfile.profileId);
                if (hasAnimatedBanner) updateData.bannerId = String(serverProfile.profileId);
            }
            
            // Save profile
                if (Object.keys(updateData).length > 0) {
                const response = await fetch(`${API_SERVER}/api/auth/set-profile`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${getToken()}`,
                        },
                        body: JSON.stringify(updateData),
                    });
                
                if (!response.ok) throw new Error('Ошибка сохранения');
                
                updateProfileCache(serverProfile.username, {});
                setShowSuccess(true);
                
                const updatedProfile = await fetchProfile();
                if (updatedProfile) {
                    setServerProfile(updatedProfile);
                    
                    // Перезагружаем бейджики
                    const badgesData = await fetchBadges(updatedProfile.username);
                    if (badgesData) {
                        setServerProfile(prev => prev ? { ...prev, badges: badgesData } : null);
                    }
                }
                
                setAvatarFile(null);
                setBannerFile(null);
                setAnimatedAvatarFile(null);
                setAnimatedBannerFile(null);
                setHasUnsavedChanges(false);
            }
        } catch {
            alert('Ошибка сохранения изменений');
        } finally {
            setSaving(false);
        }
    };

    const handleChangeLogin = async () => {
        if (!newLogin || !loginPassword || !loginCaptchaToken) {
            alert('Заполните все поля и пройдите капчу');
            return;
        }
        
        try {
            const res = await fetch(`${API_SERVER}/api/auth/change-login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${getToken()}`,
                },
                body: JSON.stringify({ 
                    newLogin, 
                    password: loginPassword,
                    captchaToken: loginCaptchaToken 
                }),
            });
            
            if (!res.ok) {
                const error = await res.text();
                alert(`Ошибка: ${error}`);
                return;
            }
            
            alert('Логин успешно изменен! Войдите заново.');
            setTimeout(() => performLogout(), 1000);
        } catch {
            alert('Ошибка изменения логина');
        } finally {
            setShowLoginModal(false);
            setNewLogin('');
            setLoginPassword('');
            setLoginCaptchaToken(null);
            loginCaptchaRef.current?.resetCaptcha();
        }
    };

    const handleChangePassword = async () => {
        if (!oldPassword || !newPassword || !passwordCaptchaToken) {
            alert('Заполните все поля и пройдите капчу');
            return;
        }
        
        try {
            const res = await fetch(`${API_SERVER}/api/auth/change-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${getToken()}`,
                },
                body: JSON.stringify({ 
                    oldPassword, 
                    newPassword,
                    captchaToken: passwordCaptchaToken 
                }),
            });
            
            if (!res.ok) {
                const error = await res.text();
                alert(`Ошибка: ${error}`);
                return;
            }
            
            alert('Пароль успешно изменен! Войдите заново.');
            setTimeout(() => performLogout(), 1000);
        } catch {
            alert('Ошибка изменения пароля');
        } finally {
            setShowPasswordModal(false);
            setOldPassword('');
            setNewPassword('');
            setPasswordCaptchaToken(null);
            passwordCaptchaRef.current?.resetCaptcha();
        }
    };

    return (
        <>
            {/* Video Trim Modal */}
            {showTrimModal && trimModalFile && (
                <VideoTrimModal
                    file={trimModalFile}
                    type={trimModalType}
                    onConfirm={handleVideoTrimConfirm}
                    onCancel={() => {
                        setShowTrimModal(false);
                        setTrimModalFile(null);
                    }}
                    isProcessing={isProcessingVideo}
                />
            )}

            {/* Success Modal */}
            {showSuccess && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.85)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10000,
                    backdropFilter: 'blur(4px)'
                }}>
                    <div style={{
                        background: 'var(--bg-secondary, #1a1a1a)',
                        padding: '32px',
                        borderRadius: '12px',
                        border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                        maxWidth: '400px',
                        textAlign: 'center'
                    }}>
                        <div style={{
                            width: '64px',
                            height: '64px',
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            borderRadius: '50%',
                            margin: '0 auto 20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '32px'
                        }}>
                            ✓
                        </div>
                        <h2 style={{
                            fontSize: '24px',
                            fontWeight: 700,
                            marginBottom: '12px',
                            color: 'var(--text-primary, #fff)'
                        }}>
                            Успешно сохранено!
                        </h2>
                        <p style={{
                            color: 'var(--text-secondary, rgba(255,255,255,0.7))',
                            marginBottom: '24px'
                        }}>
                            Изменения успешно применены
                        </p>
                        <button
                            onClick={() => setShowSuccess(false)}
                            style={{
                                padding: '12px 32px',
                                background: 'var(--accent-color, #5865F2)',
                                border: 'none',
                                borderRadius: '8px',
                                color: '#fff',
                                fontSize: '14px',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            OK
                        </button>
                    </div>
                </div>
            )}

        {/* Breadcrumbs */}
        <nav className="yumeko-collection-service-breadcrumbs" style={{ padding: '24px 24px 24px', marginBottom: '25px', position: 'relative', zIndex: 10 }}>
            <Link href="/" className="breadcrumb-link">Главная</Link>
            <span className="breadcrumb-separator">/</span>
            <Link href={serverProfile?.username ? `/profile/${serverProfile.username}` : '/profile'} className="breadcrumb-link">Профиль</Link>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-current">Настройки</span>
        </nav>

        <div className="pc-acc-sett-providerr-container" style={{ position: 'relative' }}>
                {/* Sidebar */}
            <div className="pc-acc-sett-providerr-left">
                    <div className="pc-acc-sett-providerr-category">
                        <LucideIcons.Settings size={12} style={{marginRight: '6px', display: 'inline'}} />
                        Настройки пользователя
                    </div>
                    <button 
                        className={`pc-acc-sett-providerr-tab-btn ${activeTab === 'profile' ? 'active' : ''}`} 
                        onClick={() => setActiveTab('profile')}
                    >
                        <LucideIcons.User size={18} style={{marginRight: '10px', display: 'inline'}} />
                        Профиль
                    </button>
                    <button 
                        className={`pc-acc-sett-providerr-tab-btn ${activeTab === 'account' ? 'active' : ''}`} 
                        onClick={() => setActiveTab('account')}
                    >
                        <LucideIcons.Shield size={18} style={{marginRight: '10px', display: 'inline'}} />
                        Аккаунт
                    </button>
            </div>

                {/* Main Content */}
            <div className="pc-acc-sett-providerr-right">
                {activeTab === 'profile' && (
                    <div className="pc-acc-sett-providerr-tab-content">
                        <div className="pc-acc-sett-providerr-split">
                                {/* Left: Form */}
                            <div className="pc-acc-sett-providerr-form">
                                    <div className="pc-acc-sett-providerr-tab-header">Мой профиль</div>
                                    
                                    {/* Nickname */}
                                    <div>
                                <label className="pc-acc-sett-providerr-label">Никнейм</label>
                                        <input 
                                            className="pc-acc-sett-providerr-input" 
                                            type="text" 
                                            value={nicknameInput} 
                                            onChange={(e) => setNicknameInput(e.target.value)} 
                                            placeholder={serverProfile?.nickname || serverProfile?.username || 'Введите никнейм'} 
                                        />
                                    </div>
                                    
                                    {/* Bio */}
                                    <div>
                                        <label className="pc-acc-sett-providerr-label">
                                            Описание 
                                            <span className="pc-acc-sett-providerr-char-count">({bioInput.length}/200)</span>
                                        </label>
                                        <textarea 
                                            className="pc-acc-sett-providerr-textarea" 
                                            value={bioInput} 
                                            onChange={(e) => e.target.value.length <= 200 && setBioInput(e.target.value)} 
                                            placeholder="Gacha Gamer ❤️ | Carlotta is Life 💙 | Developer" 
                                        />
                                    </div>
                                    
                                    {/* Theme Selection */}
                                    <div>
                                        <label className="pc-acc-sett-providerr-label">
                                            <LucideIcons.Palette size={16} style={{marginRight: '8px'}} />
                                            Цветовая схема профиля
                                        </label>
                                        <div style={{display: 'flex', gap: '10px'}}>
                                    <button 
                                        type="button"
                                        className={`pc-acc-sett-providerr-color-scheme-btn ${profileColorScheme === null ? 'active' : ''}`}
                                        onClick={() => setProfileColorScheme(null)}
                                        style={{
                                            flex: 1,
                                                    padding: '12px',
                                                    border: profileColorScheme === null ? '2px solid var(--profile-color-1, var(--accent-color, #5865F2))' : '1px solid var(--border-color, rgba(255,255,255,0.2))',
                                                    borderRadius: '10px',
                                            background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
                                            color: '#fff',
                                            cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                    fontSize: '13px',
                                                    fontWeight: 600,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '6px'
                                                }}
                                            >
                                                <LucideIcons.Settings size={14} />
                                                По умолчанию
                                    </button>
                                    <button 
                                        type="button"
                                        className={`pc-acc-sett-providerr-color-scheme-btn ${profileColorScheme === 'light' ? 'active' : ''}`}
                                        onClick={() => setProfileColorScheme('light')}
                                        style={{
                                            flex: 1,
                                                    padding: '12px',
                                                    border: profileColorScheme === 'light' ? '2px solid var(--profile-color-1, var(--accent-color, #5865F2))' : '1px solid var(--border-color, rgba(255,255,255,0.2))',
                                                    borderRadius: '10px',
                                            background: 'linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)',
                                            color: '#333',
                                            cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                    fontSize: '13px',
                                                    fontWeight: 600,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '6px'
                                                }}
                                            >
                                                <LucideIcons.Sun size={14} />
                                        Светлый
                                    </button>
                                    <button 
                                        type="button"
                                        className={`pc-acc-sett-providerr-color-scheme-btn ${profileColorScheme === 'dark' ? 'active' : ''}`}
                                        onClick={() => setProfileColorScheme('dark')}
                                        style={{
                                            flex: 1,
                                                    padding: '12px',
                                                    border: profileColorScheme === 'dark' ? '2px solid var(--profile-color-1, var(--accent-color, #5865F2))' : '1px solid var(--border-color, rgba(255,255,255,0.2))',
                                                    borderRadius: '10px',
                                            background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
                                            color: '#fff',
                                            cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                    fontSize: '13px',
                                                    fontWeight: 600,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '6px'
                                                }}
                                            >
                                                <LucideIcons.Moon size={14} />
                                        Темный
                                    </button>
                                </div>
                                </div>
                                
                                    {/* Profile Colors */}
                                    <div className="pc-acc-sett-color-section">
                                        <label className="pc-acc-sett-providerr-label">
                                            <LucideIcons.Palette size={16} style={{marginRight: '8px'}} />
                                            Цвета профиля
                                        </label>
                                        <p style={{fontSize: '12px', color: 'var(--text-secondary, rgba(255,255,255,0.5))', marginBottom: '16px', lineHeight: '1.4'}}>
                                            Выберите 2 цвета для кастомизации вашего профиля
                                        </p>
                                        
                                        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px'}}>
                                            {/* Primary Color */}
                                            <div>
                                                <label style={{fontSize: '11px', color: 'var(--text-secondary, rgba(255,255,255,0.6))', marginBottom: '8px', display: 'flex', alignItems: 'center', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600}}>
                                                    <LucideIcons.Circle size={12} style={{marginRight: '6px', color: profileColor1 || '#667eea'}} />
                                                    Основной
                                                </label>
                                                <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                                                    <div style={{position: 'relative'}}>
                                                        <input 
                                                            type="color" 
                                                            value={profileColor1 || '#667eea'}
                                                            onChange={(e) => setProfileColor1(e.target.value)}
                                                            style={{
                                                                width: '50px',
                                                                height: '40px',
                                                                border: '2px solid var(--profile-color-1, var(--border-color, rgba(255,255,255,0.1)))',
                                                                borderRadius: '8px',
                                                                cursor: 'pointer',
                                                                background: 'none'
                                                            }}
                                                        />
                                                        <LucideIcons.Palette size={14} style={{
                                                            position: 'absolute',
                                                            top: '50%',
                                                            left: '50%',
                                                            transform: 'translate(-50%, -50%)',
                                                            pointerEvents: 'none',
                                                            opacity: 0.7
                                                        }} />
                                                    </div>
                                                    <input 
                                                        type="text" 
                                                        value={profileColor1 || ''}
                                                        onChange={(e) => setProfileColor1(e.target.value)}
                                                        placeholder="Не выбран"
                                                        maxLength={7}
                                                        style={{
                                                            flex: 1,
                                                            padding: '10px 12px',
                                                            border: '1px solid var(--border-color, rgba(255,255,255,0.2))',
                                                            borderRadius: '8px',
                                                            background: 'var(--input-bg, rgba(255,255,255,0.05))',
                                                            color: 'var(--text-primary, #fff)',
                                                            fontSize: '12px',
                                                            fontWeight: 500
                                                        }}
                                                    />
                                                </div>
                                </div>
                                
                                            {/* Accent Color */}
                                            <div>
                                                <label style={{fontSize: '11px', color: 'var(--text-secondary, rgba(255,255,255,0.6))', marginBottom: '8px', display: 'flex', alignItems: 'center', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600}}>
                                                    <LucideIcons.Circle size={12} style={{marginRight: '6px', color: profileColor2 || '#764ba2'}} />
                                                    Акцентный
                                                </label>
                                                <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                                                    <div style={{position: 'relative'}}>
                                                        <input 
                                                            type="color" 
                                                            value={profileColor2 || '#764ba2'}
                                                            onChange={(e) => setProfileColor2(e.target.value)}
                                                            style={{
                                                                width: '50px',
                                                                height: '40px',
                                                                border: '2px solid var(--profile-color-2, var(--border-color, rgba(255,255,255,0.1)))',
                                                                borderRadius: '8px',
                                                                cursor: 'pointer',
                                                                background: 'none'
                                                            }}
                                                        />
                                                        <LucideIcons.Palette size={14} style={{
                                                            position: 'absolute',
                                                            top: '50%',
                                                            left: '50%',
                                                            transform: 'translate(-50%, -50%)',
                                                            pointerEvents: 'none',
                                                            opacity: 0.7
                                                        }} />
                                                    </div>
                                                    <input 
                                                        type="text" 
                                                        value={profileColor2 || ''}
                                                        onChange={(e) => setProfileColor2(e.target.value)}
                                                        placeholder="Не выбран"
                                                        maxLength={7}
                                                        style={{
                                                            flex: 1,
                                                            padding: '10px 12px',
                                                            border: '1px solid var(--border-color, rgba(255,255,255,0.2))',
                                                            borderRadius: '8px',
                                                            background: 'var(--input-bg, rgba(255,255,255,0.05))',
                                                            color: 'var(--text-primary, #fff)',
                                                            fontSize: '12px',
                                                            fontWeight: 500
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                </div>

                                        {/* Quick Presets */}
                                        <div style={{display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px'}}>
                                            {[
                                                { name: 'Фиолетовый', c1: '#667eea', c2: '#764ba2' },
                                                { name: 'Закат', c1: '#FF6B6B', c2: '#FFD93D' },
                                                { name: 'Океан', c1: '#4A90E2', c2: '#50E3C2' },
                                                { name: 'Мята', c1: '#00F5A0', c2: '#00D9F5' },
                                                { name: 'Огонь', c1: '#FA0D3D', c2: '#FF5E00' },
                                                { name: 'Розовый', c1: '#FF6584', c2: '#EB459E' },
                                                { name: 'Лес', c1: '#11998e', c2: '#38ef7d' },
                                                { name: 'Небо', c1: '#667eea', c2: '#5865F2' },
                                                { name: 'Золото', c1: '#FFD700', c2: '#FF8C00' },
                                                { name: 'Киберпанк', c1: '#FF00FF', c2: '#00FFFF' },
                                            ].map((preset) => (
                                                <button
                                                    key={preset.name}
                                                    type="button"
                                                    className="pc-acc-sett-preset-btn"
                                                    onClick={() => {
                                                        setProfileColor1(preset.c1);
                                                        setProfileColor2(preset.c2);
                                                    }}
                                                    style={{
                                                        position: 'relative',
                                                        padding: '8px 14px',
                                                        border: '2px solid rgba(255,255,255,0.15)',
                                                        borderRadius: '8px',
                                                        background: `linear-gradient(135deg, ${preset.c1} 0%, ${preset.c2} 100%)`,
                                                        color: '#fff',
                                                        fontSize: '11px',
                                                        fontWeight: 700,
                                                        cursor: 'pointer',
                                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                        textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                                                        overflow: 'hidden',
                                                        boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                                                    }}
                                                >
                                                    <span style={{position: 'relative', zIndex: 1}}>{preset.name}</span>
                                                </button>
                                            ))}
                                </div>
                                
                                        {/* Reset Button */}
                                        {(profileColor1 || profileColor2) && (
                                            <button
                                                type="button"
                                                className="pc-acc-sett-reset-btn"
                                                onClick={() => {
                                                    setProfileColor1(null);
                                                    setProfileColor2(null);
                                                    // НЕ обновляем serverProfile - пусть остается предупреждение
                                                    // setHasUnsavedChanges будет установлен автоматически через useEffect
                                                }}
                                                style={{
                                                    padding: '10px 16px',
                                                    border: '2px solid rgba(239, 68, 68, 0.3)',
                                                    borderRadius: '8px',
                                                    background: 'rgba(239, 68, 68, 0.1)',
                                                    color: '#ef4444',
                                                    fontSize: '12px',
                                                    fontWeight: 700,
                                                    cursor: 'pointer',
                                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                    width: '100%',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '8px'
                                                }}
                                            >
                                                <LucideIcons.RotateCcw size={16} className="reset-icon" />
                                                Сбросить цвета
                                            </button>
                                        )}
                                </div>
                                
                                    {/* Avatar */}
                                    <div>
                                        <label className="pc-acc-sett-providerr-label">Аватар (JPG, PNG, GIF, MP4)</label>
                                <div className="pc-acc-sett-providerr-file-wrapper">
                                            <button 
                                                type="button" 
                                                className="pc-acc-sett-providerr-file-btn" 
                                                onClick={() => document.getElementById('pc-acc-sett-providerr-avatar')?.click()}
                                            >
                                                Выбрать файл
                                            </button>
                                            <span className="pc-acc-sett-providerr-file-name">
                                                {avatarFile ? avatarFile.name : animatedAvatarFile ? animatedAvatarFile.name : 'Файл не выбран'}
                                            </span>
                                            <input 
                                                id="pc-acc-sett-providerr-avatar" 
                                                className="pc-acc-sett-providerr-file" 
                                                type="file" 
                                                accept="image/jpeg,image/png,image/jpg,image/gif,video/mp4,video/webm" 
                                                onChange={handleAvatarChange} 
                                            />
                                        </div>
                                </div>
                                
                                    {/* Banner */}
                                    <div>
                                        <label className="pc-acc-sett-providerr-label">Баннер (JPG, PNG, GIF, MP4)</label>
                                <div className="pc-acc-sett-providerr-file-wrapper">
                                            <button 
                                                type="button" 
                                                className="pc-acc-sett-providerr-file-btn" 
                                                onClick={() => document.getElementById('pc-acc-sett-providerr-banner')?.click()}
                                            >
                                                Выбрать файл
                                            </button>
                                            <span className="pc-acc-sett-providerr-file-name">
                                                {bannerFile ? bannerFile.name : animatedBannerFile ? animatedBannerFile.name : 'Файл не выбран'}
                                            </span>
                                            <input 
                                                id="pc-acc-sett-providerr-banner" 
                                                className="pc-acc-sett-providerr-file" 
                                                type="file" 
                                                accept="image/jpeg,image/png,image/jpg,image/gif,video/mp4,video/webm" 
                                                onChange={handleBannerChange} 
                                            />
                                </div>
                            </div>
                                
                                    {/* Profile Background */}
                                    <div>
                                        <label className="pc-acc-sett-providerr-label">
                                            <LucideIcons.Image size={16} style={{marginRight: '8px'}} />
                                            Фоновое изображение профиля (JPG, PNG, GIF, MP4)
                                        </label>
                                        <p style={{fontSize: '12px', color: 'var(--text-secondary, rgba(255,255,255,0.5))', marginBottom: '12px'}}>
                                            Фон будет отображаться на всей странице вашего профиля
                                        </p>
                                        <div className="pc-acc-sett-providerr-file-wrapper">
                                            <button 
                                                type="button" 
                                                className="pc-acc-sett-providerr-file-btn" 
                                                onClick={() => document.getElementById('pc-acc-sett-providerr-background')?.click()}
                                            >
                                                <LucideIcons.Upload size={16} style={{marginRight: '6px'}} />
                                                Выбрать файл
                                            </button>
                                            <span className="pc-acc-sett-providerr-file-name">
                                                {backgroundFile ? backgroundFile.name : animatedBackgroundFile ? animatedBackgroundFile.name : 'Файл не выбран'}
                                            </span>
                                            <input 
                                                id="pc-acc-sett-providerr-background" 
                                                className="pc-acc-sett-providerr-file" 
                                                type="file" 
                                                accept="image/jpeg,image/png,image/jpg,image/gif,video/mp4,video/webm" 
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (!file) return;
                                                    
                                                    if (file.type.startsWith('video/')) {
                                                        setTrimModalFile(file);
                                                        setTrimModalType('banner'); // Используем тип banner для фона
                                                        setShowTrimModal(true);
                                                    } else {
                                                        setBackgroundFile(file);
                                                        setAnimatedBackgroundFile(null);
                                                    }
                                                }} 
                                            />
                                        </div>
                                    </div>
                                
                            </div>

                                {/* Right: Preview Card */}
                            <div className="pc-acc-sett-providerr-preview">
                                    <div 
                                        className="pc-acc-sett-providerr-preview-card"
                                        style={{
                                            '--profile-color-1': profileColor1 || '#667eea',
                                            '--profile-color-2': profileColor2 || '#667eea',
                                            '--profile-color-1-rgb': profileColor1 ? 
                                                `${parseInt(profileColor1.slice(1, 3), 16)}, ${parseInt(profileColor1.slice(3, 5), 16)}, ${parseInt(profileColor1.slice(5, 7), 16)}` : 
                                                '102, 126, 234',
                                            '--profile-color-2-rgb': profileColor2 ? 
                                                `${parseInt(profileColor2.slice(1, 3), 16)}, ${parseInt(profileColor2.slice(3, 5), 16)}, ${parseInt(profileColor2.slice(5, 7), 16)}` : 
                                                '102, 126, 234'
                                        } as React.CSSProperties}
                                    >
                                        {/* Banner */}
                                        <div className="pc-acc-sett-providerr-preview-banner">
                                            {animatedBannerPreviewUrl || animatedBannerServerUrl ? (
                                                <AnimatedMedia 
                                                    src={(animatedBannerPreviewUrl || animatedBannerServerUrl)!}
                                                    alt="Баннер" 
                                                    fill 
                                                    className="pc-acc-sett-providerr-banner-img" 
                                                    objectFit="cover"
                                                />
                                            ) : (bannerPreviewUrl || bannerServerUrl) ? (
                                                <OptimizedImage 
                                                    src={bannerPreviewUrl || bannerServerUrl || ''} 
                                                    alt="Баннер" 
                                                    fill 
                                                    className="pc-acc-sett-providerr-banner-img"
                                                    style={{objectFit: 'cover'}}
                                                />
                                            ) : (
                                                <div className="pc-acc-sett-providerr-preview-banner-placeholder">
                                                    <LucideIcons.Image size={32} color="rgba(255,255,255,0.3)" />
                            </div>
                                            )}
                        </div>

                                        {/* Avatar + Info */}
                                        <div className="pc-acc-sett-providerr-preview-content">
                                            <div className="pc-acc-sett-providerr-preview-avatar">
                                                {animatedAvatarPreviewUrl || animatedAvatarServerUrl ? (
                                                    <AnimatedMedia 
                                                        src={(animatedAvatarPreviewUrl || animatedAvatarServerUrl)!}
                                                        alt="Аватар" 
                                                        width={80} 
                                                        height={80} 
                                                        className="pc-acc-sett-providerr-avatar-img"
                                                    />
                                                ) : (avatarPreviewUrl || avatarServerUrl) ? (
                                                    <OptimizedImage 
                                                        src={avatarPreviewUrl || avatarServerUrl || ''} 
                                                        alt="Аватар" 
                                                        width={80} 
                                                        height={80} 
                                                        className="pc-acc-sett-providerr-avatar-img" 
                                                        fallbackSrc="/default-avatar.png"
                                                    />
                                                ) : (
                                                    <div className="pc-acc-sett-providerr-preview-avatar-placeholder">
                                                        <LucideIcons.User size={32} color="rgba(255,255,255,0.3)" />
                                </div>
                                                )}
                            </div>

                                            <div className="pc-acc-sett-providerr-preview-texts">
                                                {/* Nickname + Verified */}
                                                <div className="pc-acc-sett-providerr-preview-nick-line">
                                                    <span className="pc-acc-sett-providerr-preview-nick">
                                                        {nicknameInput || serverProfile?.nickname || serverProfile?.username || 'Пушилка [Юля-Хантер]'}
                                                    </span>
                                                    {serverProfile?.verified && (
                                                        <LucideIcons.BadgeCheck size={18} color="#3b82f6" />
                                                    )}
                                                </div>

                                                {/* Badges */}
                                                {serverProfile?.badges && serverProfile.badges.length > 0 && (
                                                    <div className="pc-acc-sett-providerr-badges-row">
                                                        {serverProfile.badges.map((badge, idx) => {
                                                            const meta = BADGE_META[badge.toLowerCase()];
                                                            if (!meta) return null;
                                                            const LucideIcon = LucideIcons[meta.icon as keyof typeof LucideIcons] as LucideIconComponent;
                                                            if (!LucideIcon) return null;
                                                            return (
                                                                <div
                                                                    key={badge + idx}
                                                                    className="pc-acc-sett-providerr-badge"
                                                                    title={meta.title + (meta.description ? ' — ' + meta.description : '')}
                                                                >
                                                                    <LucideIcon size={16} strokeWidth={2} />
                                                                </div>
                                                            );
                                                        })}
                    </div>
                )}

                                                {/* Roles (excluding "user") */}
                                                {serverProfile?.roles && serverProfile.roles.filter(role => role.toLowerCase() !== 'user' && role.toLowerCase() !== 'пользователь').length > 0 && (
                                                    <div className="pc-acc-sett-providerr-roles-row">
                                                        {serverProfile.roles
                                                            .filter(role => role.toLowerCase() !== 'user' && role.toLowerCase() !== 'пользователь')
                                                            .map((role, idx) => {
                                                                // Translate role names to Russian
                                                                const displayRole = role.toLowerCase() === 'admin' 
                                                                    ? 'Администратор'
                                                                    : role.toLowerCase() === 'moderator'
                                                                    ? 'Модератор'
                                                                    : role.toLowerCase() === 'uploader'
                                                                    ? 'Заливщик'
                                                                    : role.toLowerCase() === 'администратор'
                                                                    ? 'Администратор'
                                                                    : role.toLowerCase() === 'модератор'
                                                                    ? 'Модератор'
                                                                    : role.toLowerCase() === 'заливщик'
                                                                    ? 'Заливщик'
                                                                    : role;
                                                                
                                                                return (
                                                                    <span 
                                                                        key={idx} 
                                                                        className={`pc-acc-sett-providerr-role role-${role.toLowerCase()}`}
                                                                    >
                                                                        {displayRole}
                                                                    </span>
                                                                );
                                                            })}
                                                    </div>
                                                )}

                                                {/* Bio */}
                                                {bioInput && (
                                                    <p className="pc-acc-sett-providerr-preview-bio">{bioInput}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                {activeTab === 'account' && (
                    <div className="pc-acc-sett-providerr-tab-content">
                        <div className="pc-acc-sett-providerr-tab-header">
                            <LucideIcons.Shield size={24} style={{marginRight: '12px', display: 'inline'}} />
                            Настройки аккаунта
                        </div>
                            
                            <div className="pc-acc-sett-providerr-form">
                                {/* Login */}
                                <div className="pc-acc-sett-account-field">
                                    <div className="pc-acc-sett-field-header">
                                        <label className="pc-acc-sett-providerr-label">
                                            <LucideIcons.User size={16} style={{marginRight: '8px'}} />
                                            Логин
                                        </label>
                                        <button 
                                            className="pc-acc-sett-change-btn"
                                            onClick={() => setShowLoginModal(true)}
                                        >
                                            <LucideIcons.Edit2 size={14} style={{marginRight: '6px'}} />
                                            Изменить
                                        </button>
                                    </div>
                                    <div className="pc-acc-sett-input-wrapper">
                                        <LucideIcons.AtSign size={18} className="pc-acc-sett-input-icon" />
                                        <input
                                            className="pc-acc-sett-providerr-input pc-acc-sett-input-with-icon"
                                            type="text"
                                            value={loginInput}
                                            disabled
                                            readOnly
                                        />
                                    </div>
                                </div>
                                
                                {/* Password */}
                                <div className="pc-acc-sett-account-field">
                                    <div className="pc-acc-sett-field-header">
                                        <label className="pc-acc-sett-providerr-label">
                                            <LucideIcons.Lock size={16} style={{marginRight: '8px'}} />
                                            Пароль
                                        </label>
                                        <button 
                                            className="pc-acc-sett-change-btn"
                                            onClick={() => setShowPasswordModal(true)}
                                        >
                                            <LucideIcons.Edit2 size={14} style={{marginRight: '6px'}} />
                                            Изменить
                                        </button>
                                    </div>
                                    <div className="pc-acc-sett-input-wrapper">
                                        <LucideIcons.KeyRound size={18} className="pc-acc-sett-input-icon" />
                                        <input
                                            className="pc-acc-sett-providerr-input pc-acc-sett-input-with-icon" 
                                            type="password" 
                                            value="••••••••••"
                                            disabled
                                            readOnly
                                        />
                                    </div>
                                </div>
                                
                                {/* Danger Zone */}
                                <div className="pc-acc-sett-danger-zone">
                                    <div className="pc-acc-sett-danger-header">
                                        <LucideIcons.AlertTriangle size={20} style={{marginRight: '10px'}} />
                                        <div>
                                            <h3>Опасная зона</h3>
                                            <p>Необратимые действия с вашим аккаунтом</p>
                                        </div>
                                    </div>
                                    <button 
                                        type="button" 
                                        className="pc-acc-sett-danger-btn"
                                        onClick={() => {
                                            if (confirm('Вы уверены, что хотите выйти из аккаунта?')) {
                                                performLogout();
                                            }
                                        }}
                                    >
                                        <LucideIcons.LogOut size={18} style={{marginRight: '8px'}} />
                                        Выйти из аккаунта
                                    </button>
                                </div>
                    </div>
            </div>
            )}
        </div>
            </div>
            
            {/* Unsaved Changes Warning */}
            {hasUnsavedChanges && (
                <div className="pc-acc-sett-providerr-unsaved-warning">
                    <span className="pc-acc-sett-providerr-unsaved-text">
                        ⚠️ Осторожно! Вы не сохранили изменения!
                    </span>
                    <button 
                        className="pc-acc-sett-providerr-unsaved-save"
                        onClick={handleUnsavedSave}
                        disabled={saving}
                    >
                        {saving ? 'Сохранение...' : 'Сохранить'}
                    </button>
                    <button 
                        className="pc-acc-sett-providerr-unsaved-cancel"
                        onClick={handleUnsavedCancel}
                    >
                        Отменить
                    </button>
                </div>
            )}
            
            {/* Change Login Modal */}
            {showLoginModal && (
                <div className="pc-acc-sett-modal-overlay" onClick={() => setShowLoginModal(false)}>
                    <div className="pc-acc-sett-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="pc-acc-sett-modal-header">
                            <h2>
                                <LucideIcons.User size={24} style={{marginRight: '12px', display: 'inline'}} />
                                Изменить логин
                            </h2>
                            <button 
                                className="pc-acc-sett-modal-close"
                                onClick={() => setShowLoginModal(false)}
                            >
                                <LucideIcons.X size={20} />
                            </button>
                        </div>
                        
                        <div className="pc-acc-sett-modal-body">
                            <div className="pc-acc-sett-modal-field">
                                <label>Новый логин</label>
                                <div className="pc-acc-sett-input-wrapper">
                                    <LucideIcons.AtSign size={18} className="pc-acc-sett-input-icon" />
                                    <input
                                        className="pc-acc-sett-providerr-input pc-acc-sett-input-with-icon"
                                        type="text"
                                        value={newLogin}
                                        onChange={(e) => setNewLogin(e.target.value)}
                                        placeholder="Введите новый логин"
                                    />
                                </div>
                            </div>
                            
                            <div className="pc-acc-sett-modal-field">
                                <label>Текущий пароль</label>
                                <div className="pc-acc-sett-input-wrapper">
                                    <LucideIcons.KeyRound size={18} className="pc-acc-sett-input-icon" />
                                    <input
                                        className="pc-acc-sett-providerr-input pc-acc-sett-input-with-icon"
                                        type="password"
                                        value={loginPassword}
                                        onChange={(e) => setLoginPassword(e.target.value)}
                                        placeholder="Введите текущий пароль"
                                    />
                                </div>
                            </div>
                            
                            <div className="pc-acc-sett-modal-captcha">
                                <HCaptcha
                                    ref={loginCaptchaRef}
                                    sitekey={HCAPTCHA_SITE_KEY}
                                    onVerify={(token) => setLoginCaptchaToken(token)}
                                    onExpire={() => setLoginCaptchaToken(null)}
                                    theme="dark"
                                />
                            </div>
                        </div>
                        
                        <div className="pc-acc-sett-modal-footer">
                            <button 
                                className="pc-acc-sett-modal-btn-cancel"
                                onClick={() => setShowLoginModal(false)}
                            >
                                Отмена
                            </button>
                            <button 
                                className="pc-acc-sett-modal-btn-submit"
                                onClick={handleChangeLogin}
                                disabled={!newLogin || !loginPassword || !loginCaptchaToken}
                            >
                                <LucideIcons.Check size={16} style={{marginRight: '6px'}} />
                                Изменить логин
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Change Password Modal */}
            {showPasswordModal && (
                <div className="pc-acc-sett-modal-overlay" onClick={() => setShowPasswordModal(false)}>
                    <div className="pc-acc-sett-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="pc-acc-sett-modal-header">
                            <h2>
                                <LucideIcons.Lock size={24} style={{marginRight: '12px', display: 'inline'}} />
                                Изменить пароль
                            </h2>
                            <button 
                                className="pc-acc-sett-modal-close"
                                onClick={() => setShowPasswordModal(false)}
                            >
                                <LucideIcons.X size={20} />
                            </button>
                        </div>
                        
                        <div className="pc-acc-sett-modal-body">
                            <div className="pc-acc-sett-modal-field">
                                <label>Старый пароль</label>
                                <div className="pc-acc-sett-input-wrapper">
                                    <LucideIcons.KeyRound size={18} className="pc-acc-sett-input-icon" />
                                    <input
                                        className="pc-acc-sett-providerr-input pc-acc-sett-input-with-icon"
                                        type="password"
                                        value={oldPassword}
                                        onChange={(e) => setOldPassword(e.target.value)}
                                        placeholder="Введите старый пароль"
                                    />
                                </div>
                            </div>
                            
                            <div className="pc-acc-sett-modal-field">
                                <label>Новый пароль</label>
                                <div className="pc-acc-sett-input-wrapper">
                                    <LucideIcons.Lock size={18} className="pc-acc-sett-input-icon" />
                                    <input
                                        className="pc-acc-sett-providerr-input pc-acc-sett-input-with-icon"
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Введите новый пароль"
                                    />
                                </div>
                            </div>
                            
                            <div className="pc-acc-sett-modal-captcha">
                                <HCaptcha
                                    ref={passwordCaptchaRef}
                                    sitekey={HCAPTCHA_SITE_KEY}
                                    onVerify={(token) => setPasswordCaptchaToken(token)}
                                    onExpire={() => setPasswordCaptchaToken(null)}
                                    theme="dark"
                                />
                            </div>
                        </div>
                        
                        <div className="pc-acc-sett-modal-footer">
                            <button 
                                className="pc-acc-sett-modal-btn-cancel"
                                onClick={() => setShowPasswordModal(false)}
                            >
                                Отмена
                            </button>
                            <button 
                                className="pc-acc-sett-modal-btn-submit"
                                onClick={handleChangePassword}
                                disabled={!oldPassword || !newPassword || !passwordCaptchaToken}
                            >
                                <LucideIcons.Check size={16} style={{marginRight: '6px'}} />
                                Изменить пароль
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
