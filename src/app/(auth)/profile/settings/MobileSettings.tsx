'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { API_SERVER } from '../../../../tools/constants';
import { performLogout } from '../../../utils/logoutUtils';
import { updateProfileCache } from '../../../component/profile-page-old/hooks/useProfile';
import VideoTrimModal from '../../../../components/VideoTrimModal';
import AnimatedMedia from '../../../../components/AnimatedMedia';
import { OptimizedImage } from '../../../component/profile-page-old/components/OptimizedImage';
import * as LucideIcons from 'lucide-react';
import { BADGE_META } from '../../../component/profile-page-old/badgeMeta';
import HCaptcha from '@hcaptcha/react-hcaptcha';

type View = 'group' | 'profile' | 'account';
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

const getToken = () => document.cookie.match(/token=([^;]+)/)?.[1] || '';

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

const uploadImage = async (file: File, type: 'cover' | 'banner' | 'background', id: string) => {
    const form = new FormData();
    form.append('file', file);
    form.append('id', id);
    const endpoint = type === 'cover' ? 'upload-avatar' : type === 'banner' ? 'upload-banner' : 'upload-background';
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

export default function MobileSettings() {
    const router = useRouter();
    const [view, setView] = useState<View>('group');
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
    const [trimModalType, setTrimModalType] = useState<'avatar' | 'banner' | 'background'>('avatar');
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
    
    const HCAPTCHA_SITE_KEY = '10000000-ffff-ffff-ffff-000000000001';

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

            const [avatarData, bannerData, badgesData] = await Promise.all([
                fetchAvatarUrl(p.username), 
                fetchBannerUrl(p.username),
                fetchBadges(p.username)
            ]);
            
            if (avatarData?.url) setAvatarServerUrl(avatarData.url);
            if (avatarData?.animatedUrl) setAnimatedAvatarServerUrl(avatarData.animatedUrl);
            if (bannerData?.url) setBannerServerUrl(bannerData.url);
            if (bannerData?.animatedUrl) setAnimatedBannerServerUrl(bannerData.animatedUrl);
            
            if (badgesData) {
                setServerProfile(prev => prev ? { ...prev, badges: badgesData } : null);
            }
        })();
    }, []);

    // Hide header/nav on mobile
    useEffect(() => {
        const headerEl = document.querySelector('.header') as HTMLElement | null;
        const bottomEl = document.querySelector('.mobile-only') as HTMLElement | null;
        const prevHeaderDisplay = headerEl?.style.display;
        const prevBottomDisplay = bottomEl?.style.display;
        if (headerEl) headerEl.style.display = 'none';
        if (bottomEl) bottomEl.style.display = 'none';
        return () => {
            if (headerEl) headerEl.style.display = prevHeaderDisplay || '';
            if (bottomEl) bottomEl.style.display = prevBottomDisplay || '';
        };
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
            animatedBannerFile !== null ||
            backgroundFile !== null ||
            animatedBackgroundFile !== null;
            
        setHasUnsavedChanges(hasChanges);
    }, [nicknameInput, bioInput, profileColorScheme, profileColor1, profileColor2, avatarFile, bannerFile, animatedAvatarFile, animatedBannerFile, backgroundFile, animatedBackgroundFile, serverProfile]);

    // Create preview URLs
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
            
            const endpoint = trimModalType === 'avatar' 
                ? 'upload-avatar-animated' 
                : trimModalType === 'banner'
                ? 'upload-banner-animated'
                : 'upload-background-animated';
            const res = await fetch(`${API_SERVER}/api/profiles/${endpoint}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${getToken()}` },
                body: formData,
            });
            
            if (!res.ok) throw new Error('Ошибка обработки видео');
            
            if (trimModalType === 'avatar') {
                setAnimatedAvatarFile(trimModalFile);
            } else if (trimModalType === 'banner') {
                setAnimatedBannerFile(trimModalFile);
            } else {
                setAnimatedBackgroundFile(trimModalFile);
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
        setBackgroundFile(null);
        setAnimatedBackgroundFile(null);
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
            if (profileColor1 !== (serverProfile.profileColor1 || null)) {
                updateData.profileColor1 = profileColor1 === null ? '' : profileColor1;
            }
            if (profileColor2 !== (serverProfile.profileColor2 || null)) {
                updateData.profileColor2 = profileColor2 === null ? '' : profileColor2;
            }
            
            if (avatarFile) {
                await uploadImage(avatarFile, 'cover', String(serverProfile.profileId));
                updateData.avatarId = String(serverProfile.profileId);
            }
            if (bannerFile) {
                await uploadImage(bannerFile, 'banner', String(serverProfile.profileId));
                updateData.bannerId = String(serverProfile.profileId);
            }
            if (backgroundFile) {
                await uploadImage(backgroundFile, 'background', String(serverProfile.profileId));
            }
            
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
                    
                    const badgesData = await fetchBadges(updatedProfile.username);
                    if (badgesData) {
                        setServerProfile(prev => prev ? { ...prev, badges: badgesData } : null);
                    }
                }
                
                setAvatarFile(null);
                setBannerFile(null);
                setAnimatedAvatarFile(null);
                setAnimatedBannerFile(null);
                setBackgroundFile(null);
                setAnimatedBackgroundFile(null);
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

    const title = view === 'group' ? 'Настройки Yumeko' : view === 'profile' ? 'Профиль' : 'Аккаунт';

    const onBack = () => {
        if (view === 'group') {
            router.push('/profile');
        } else {
            setView('group');
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
                <div className="mset-success-overlay" onClick={() => setShowSuccess(false)}>
                    <div className="mset-success-modal">
                        <div className="mset-success-icon">
                            <LucideIcons.CheckCircle size={48} />
                        </div>
                        <h2>Успешно сохранено!</h2>
                        <p>Изменения успешно применены</p>
                        <button onClick={() => setShowSuccess(false)}>OK</button>
                    </div>
                </div>
            )}

            <div className="mset-container">
                <div className="mset-topbar">
                    <button className="mset-back" onClick={onBack}>
                        <LucideIcons.ArrowLeft size={20} />
                    </button>
                    <div className="mset-title">{title}</div>
                </div>

                {view === 'group' && (
                    <div className="mset-group">
                        <div className="mset-category">
                            <LucideIcons.Settings size={14} />
                            Профиль и аккаунт
                        </div>
                        <button className="mset-tab" onClick={() => setView('profile')}>
                            <LucideIcons.User size={18} />
                            Профиль
                        </button>
                        <button className="mset-tab" onClick={() => setView('account')}>
                            <LucideIcons.Shield size={18} />
                            Аккаунт
                        </button>
                    </div>
                )}

                {view === 'profile' && (
                    <div className="mset-content">
                        {/* Preview Card */}
                        <div 
                            className="mset-preview-card"
                            style={{
                                '--profile-color-1': profileColor1 || '#667eea',
                                '--profile-color-2': profileColor2 || '#667eea',
                                '--profile-color-1-rgb': profileColor1 ? 
                                    `${parseInt(profileColor1.slice(1, 3), 16)}, ${parseInt(profileColor1.slice(3, 5), 16)}, ${parseInt(profileColor1.slice(5, 7), 16)}` : 
                                    '102, 126, 234',
                                '--profile-color-2-rgb': profileColor2 ? 
                                    `${parseInt(profileColor2.slice(1, 3), 16)}, ${parseInt(profileColor2.slice(3, 5), 16)}, ${parseInt(profileColor2.slice(5, 7), 16)}` : 
                                    '118, 75, 162'
                            } as React.CSSProperties}
                        >
                            <div className="mset-preview-banner">
                                {animatedBannerPreviewUrl || animatedBannerServerUrl ? (
                                    <AnimatedMedia 
                                        src={(animatedBannerPreviewUrl || animatedBannerServerUrl)!}
                                        alt="Баннер" 
                                        fill 
                                        className="mset-banner-img" 
                                        objectFit="cover"
                                    />
                                ) : (bannerPreviewUrl || bannerServerUrl) ? (
                                    <OptimizedImage 
                                        src={bannerPreviewUrl || bannerServerUrl || ''} 
                                        alt="Баннер" 
                                        fill 
                                        className="mset-banner-img"
                                        style={{objectFit: 'cover'}}
                                    />
                                ) : (
                                    <div className="mset-banner-ph">
                                        <LucideIcons.Image size={24} color="rgba(255,255,255,0.3)" />
                                    </div>
                                )}
                            </div>

                            <div className="mset-preview-row">
                                <div className="mset-preview-avatar">
                                    {animatedAvatarPreviewUrl || animatedAvatarServerUrl ? (
                                        <AnimatedMedia 
                                            src={(animatedAvatarPreviewUrl || animatedAvatarServerUrl)!}
                                            alt="Аватар" 
                                            width={56} 
                                            height={56} 
                                            className="mset-avatar-img"
                                        />
                                    ) : (avatarPreviewUrl || avatarServerUrl) ? (
                                        <OptimizedImage 
                                            src={avatarPreviewUrl || avatarServerUrl || ''} 
                                            alt="Аватар" 
                                            width={56} 
                                            height={56} 
                                            className="mset-avatar-img" 
                                            fallbackSrc="/default-avatar.png"
                                        />
                                    ) : (
                                        <div className="mset-avatar-ph">
                                            <LucideIcons.User size={24} color="rgba(255,255,255,0.3)" />
                                        </div>
                                    )}
                                </div>
                                <div className="mset-preview-texts">
                                    <div className="mset-nick">
                                        {nicknameInput || serverProfile?.nickname || serverProfile?.username || 'Никнейм'}
                                        {serverProfile?.verified && (
                                            <LucideIcons.BadgeCheck size={16} color="#3b82f6" />
                                        )}
                                    </div>
                                    
                                    {/* Badges */}
                                    {serverProfile?.badges && serverProfile.badges.length > 0 && (
                                        <div className="mset-badges-row">
                                            {serverProfile.badges.map((badge, idx) => {
                                                const meta = BADGE_META[badge.toLowerCase()];
                                                if (!meta) return null;
                                                const LucideIcon = LucideIcons[meta.icon as keyof typeof LucideIcons] as LucideIconComponent;
                                                if (!LucideIcon) return null;
                                                return (
                                                    <div
                                                        key={badge + idx}
                                                        className="mset-badge"
                                                        title={meta.title + (meta.description ? ' — ' + meta.description : '')}
                                                    >
                                                        <LucideIcon size={14} strokeWidth={2} />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                    
                                    <div className="mset-bio">{bioInput || 'Без описания'}</div>
                                </div>
                            </div>
                        </div>

                        {/* Nickname */}
                        <div className="mset-section">
                            <label className="mset-label">Никнейм</label>
                            <input 
                                className="mset-input" 
                                type="text" 
                                value={nicknameInput} 
                                onChange={(e) => setNicknameInput(e.target.value)} 
                                placeholder={serverProfile?.nickname || serverProfile?.username || 'Введите никнейм'}
                            />
                        </div>

                        {/* Bio */}
                        <div className="mset-section">
                            <label className="mset-label">
                                Описание 
                                <span className="mset-count">({bioInput.length}/200)</span>
                            </label>
                            <textarea 
                                className="mset-textarea" 
                                value={bioInput} 
                                onChange={(e) => e.target.value.length <= 200 && setBioInput(e.target.value)} 
                                placeholder="Gacha Gamer ❤️ | Carlotta is Life 💙 | Developer"
                            />
                        </div>

                        {/* Theme Selection */}
                        <div className="mset-section">
                            <label className="mset-label">
                                <LucideIcons.Palette size={14} />
                                Цветовая схема профиля
                            </label>
                            <div className="mset-color-scheme-grid">
                                <button 
                                    className={`mset-color-scheme-btn ${profileColorScheme === null ? 'active' : ''}`}
                                    onClick={() => setProfileColorScheme(null)}
                                >
                                    <LucideIcons.Settings size={16} />
                                    По умолчанию
                                </button>
                                <button 
                                    className={`mset-color-scheme-btn light ${profileColorScheme === 'light' ? 'active' : ''}`}
                                    onClick={() => setProfileColorScheme('light')}
                                >
                                    <LucideIcons.Sun size={16} />
                                    Светлый
                                </button>
                                <button 
                                    className={`mset-color-scheme-btn dark ${profileColorScheme === 'dark' ? 'active' : ''}`}
                                    onClick={() => setProfileColorScheme('dark')}
                                >
                                    <LucideIcons.Moon size={16} />
                                    Темный
                                </button>
                            </div>
                        </div>

                        {/* Profile Colors */}
                        <div className="mset-section">
                            <label className="mset-label">
                                <LucideIcons.Palette size={14} />
                                Цвета профиля
                            </label>
                            <p className="mset-hint">Выберите 2 цвета для кастомизации вашего профиля</p>
                            
                            <div className="mset-colors-grid">
                                <div className="mset-color-picker">
                                    <label>
                                        <LucideIcons.Circle size={10} style={{color: profileColor1 || '#667eea'}} />
                                        Основной
                                    </label>
                                    <div className="mset-color-input-row">
                                        <input 
                                            type="color" 
                                            value={profileColor1 || '#667eea'}
                                            onChange={(e) => setProfileColor1(e.target.value)}
                                        />
                                        <input 
                                            type="text" 
                                            value={profileColor1 || ''}
                                            onChange={(e) => setProfileColor1(e.target.value)}
                                            placeholder="Не выбран"
                                            maxLength={7}
                                        />
                                    </div>
                                </div>
                                
                                <div className="mset-color-picker">
                                    <label>
                                        <LucideIcons.Circle size={10} style={{color: profileColor2 || '#764ba2'}} />
                                        2 цвет
                                    </label>
                                    <div className="mset-color-input-row">
                                        <input 
                                            type="color" 
                                            value={profileColor2 || '#764ba2'}
                                            onChange={(e) => setProfileColor2(e.target.value)}
                                        />
                                        <input 
                                            type="text" 
                                            value={profileColor2 || ''}
                                            onChange={(e) => setProfileColor2(e.target.value)}
                                            placeholder="Не выбран"
                                            maxLength={7}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Presets */}
                            <div className="mset-presets">
                                {[
                                    { name: 'Фиолетовый', c1: '#667eea', c2: '#764ba2' },
                                    { name: 'Закат', c1: '#FF6B6B', c2: '#FFD93D' },
                                    { name: 'Океан', c1: '#4A90E2', c2: '#50E3C2' },
                                    { name: 'Мята', c1: '#00F5A0', c2: '#00D9F5' },
                                    { name: 'Огонь', c1: '#FA0D3D', c2: '#FF5E00' },
                                    { name: 'Розовый', c1: '#FF6584', c2: '#EB459E' },
                                ].map((preset) => (
                                    <button
                                        key={preset.name}
                                        className="mset-preset-btn"
                                        onClick={() => {
                                            setProfileColor1(preset.c1);
                                            setProfileColor2(preset.c2);
                                        }}
                                        style={{
                                            background: `linear-gradient(135deg, ${preset.c1} 0%, ${preset.c2} 100%)`
                                        }}
                                    >
                                        {preset.name}
                                    </button>
                                ))}
                            </div>

                            {/* Reset Button */}
                            {(profileColor1 || profileColor2) && (
                                <button
                                    className="mset-reset-btn"
                                    onClick={() => {
                                        setProfileColor1(null);
                                        setProfileColor2(null);
                                    }}
                                >
                                    <LucideIcons.RotateCcw size={14} />
                                    Сбросить цвета
                                </button>
                            )}
                        </div>

                        {/* Avatar */}
                        <div className="mset-section">
                            <label className="mset-label">Аватар (JPG, PNG, GIF, MP4)</label>
                            <div className="mset-file-row">
                                <button 
                                    type="button" 
                                    className="mset-file-btn" 
                                    onClick={() => document.getElementById('mset-avatar')?.click()}
                                >
                                    Выбрать файл
                                </button>
                                <span className="mset-file-name">
                                    {avatarFile ? avatarFile.name : animatedAvatarFile ? animatedAvatarFile.name : 'Файл не выбран'}
                                </span>
                                <input 
                                    id="mset-avatar" 
                                    className="mset-file" 
                                    type="file" 
                                    accept="image/jpeg,image/png,image/jpg,image/gif,video/mp4,video/webm" 
                                    onChange={handleAvatarChange} 
                                />
                            </div>
                        </div>

                        {/* Banner */}
                        <div className="mset-section">
                            <label className="mset-label">Баннер (JPG, PNG, GIF, MP4)</label>
                            <div className="mset-file-row">
                                <button 
                                    type="button" 
                                    className="mset-file-btn" 
                                    onClick={() => document.getElementById('mset-banner')?.click()}
                                >
                                    Выбрать файл
                                </button>
                                <span className="mset-file-name">
                                    {bannerFile ? bannerFile.name : animatedBannerFile ? animatedBannerFile.name : 'Файл не выбран'}
                                </span>
                                <input 
                                    id="mset-banner" 
                                    className="mset-file" 
                                    type="file" 
                                    accept="image/jpeg,image/png,image/jpg,image/gif,video/mp4,video/webm" 
                                    onChange={handleBannerChange} 
                                />
                            </div>
                        </div>

                        {/* Profile Background */}
                        <div className="mset-section">
                            <label className="mset-label">
                                <LucideIcons.Image size={14} />
                                Фоновое изображение профиля (JPG, PNG, GIF, MP4)
                            </label>
                            <p className="mset-hint">
                                Фон будет отображаться на всей странице вашего профиля
                            </p>
                            <div className="mset-file-row">
                                <button 
                                    type="button" 
                                    className="mset-file-btn" 
                                    onClick={() => document.getElementById('mset-background')?.click()}
                                >
                                    <LucideIcons.Upload size={14} style={{marginRight: '4px'}} />
                                    Выбрать файл
                                </button>
                                <span className="mset-file-name">
                                    {backgroundFile ? backgroundFile.name : animatedBackgroundFile ? animatedBackgroundFile.name : 'Файл не выбран'}
                                </span>
                                <input 
                                    id="mset-background" 
                                    className="mset-file" 
                                    type="file" 
                                    accept="image/jpeg,image/png,image/jpg,image/gif,video/mp4,video/webm" 
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        
                                        if (file.type.startsWith('video/')) {
                                            setTrimModalFile(file);
                                            setTrimModalType('background');
                                            setShowTrimModal(true);
                                        } else {
                                            setBackgroundFile(file);
                                            setAnimatedBackgroundFile(null);
                                        }
                                    }} 
                                />
                            </div>
                        </div>

                        {/* Unsaved Changes */}
                        {hasUnsavedChanges && (
                            <div className="mset-sticky">
                                <div className="mset-warning">
                                    <LucideIcons.AlertTriangle size={16} />
                                    Осторожно! Вы не сохранили изменения!
                                </div>
                                <div className="mset-actions">
                                    <button className="mset-save" onClick={handleSaveProfile} disabled={saving}>
                                        {saving ? 'Сохраняем...' : 'Сохранить'}
                                    </button>
                                    <button className="mset-cancel" onClick={handleUnsavedCancel}>Отмена</button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {view === 'account' && (
                    <div className="mset-content">
                        {/* Login */}
                        <div className="mset-account-field">
                            <div className="mset-field-header">
                                <label className="mset-label">
                                    <LucideIcons.User size={14} />
                                    Логин
                                </label>
                                <button 
                                    className="mset-change-btn"
                                    onClick={() => setShowLoginModal(true)}
                                >
                                    <LucideIcons.Edit2 size={14} />
                                    Изменить
                                </button>
                            </div>
                            <div className="mset-input-wrapper">
                                <LucideIcons.AtSign size={16} className="mset-input-icon" />
                                <input
                                    className="mset-input with-icon"
                                    type="text"
                                    value={loginInput}
                                    disabled
                                    readOnly
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="mset-account-field">
                            <div className="mset-field-header">
                                <label className="mset-label">
                                    <LucideIcons.Lock size={14} />
                                    Пароль
                                </label>
                                <button 
                                    className="mset-change-btn"
                                    onClick={() => setShowPasswordModal(true)}
                                >
                                    <LucideIcons.Edit2 size={14} />
                                    Изменить
                                </button>
                            </div>
                            <div className="mset-input-wrapper">
                                <LucideIcons.KeyRound size={16} className="mset-input-icon" />
                                <input
                                    className="mset-input with-icon" 
                                    type="password" 
                                    value="••••••••••"
                                    disabled
                                    readOnly
                                />
                            </div>
                        </div>

                        {/* Danger Zone */}
                        <div className="mset-danger-zone">
                            <div className="mset-danger-header">
                                <LucideIcons.AlertTriangle size={18} />
                                <div>
                                    <h3>Опасная зона</h3>
                                    <p>Необратимые действия с вашим аккаунтом</p>
                                </div>
                            </div>
                            <button 
                                className="mset-danger-btn"
                                onClick={() => {
                                    if (confirm('Вы уверены, что хотите выйти из аккаунта?')) {
                                        performLogout();
                                    }
                                }}
                            >
                                <LucideIcons.LogOut size={16} />
                                Выйти из аккаунта
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Change Login Modal */}
            {showLoginModal && (
                <div className="mset-modal-overlay" onClick={() => setShowLoginModal(false)}>
                    <div className="mset-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="mset-modal-header">
                            <h2>
                                <LucideIcons.User size={20} />
                                Изменить логин
                            </h2>
                            <button onClick={() => setShowLoginModal(false)}>
                                <LucideIcons.X size={18} />
                            </button>
                        </div>
                        
                        <div className="mset-modal-body">
                            <div className="mset-modal-field">
                                <label>Новый логин</label>
                                <div className="mset-input-wrapper">
                                    <LucideIcons.AtSign size={16} className="mset-input-icon" />
                                    <input
                                        className="mset-input with-icon"
                                        type="text"
                                        value={newLogin}
                                        onChange={(e) => setNewLogin(e.target.value)}
                                        placeholder="Введите новый логин"
                                    />
                                </div>
                            </div>
                            
                            <div className="mset-modal-field">
                                <label>Текущий пароль</label>
                                <div className="mset-input-wrapper">
                                    <LucideIcons.KeyRound size={16} className="mset-input-icon" />
                                    <input
                                        className="mset-input with-icon"
                                        type="password"
                                        value={loginPassword}
                                        onChange={(e) => setLoginPassword(e.target.value)}
                                        placeholder="Введите текущий пароль"
                                    />
                                </div>
                            </div>
                            
                            <div className="mset-modal-captcha">
                                <HCaptcha
                                    ref={loginCaptchaRef}
                                    sitekey={HCAPTCHA_SITE_KEY}
                                    onVerify={(token) => setLoginCaptchaToken(token)}
                                    onExpire={() => setLoginCaptchaToken(null)}
                                    theme="dark"
                                />
                            </div>
                        </div>
                        
                        <div className="mset-modal-footer">
                            <button 
                                className="mset-modal-cancel"
                                onClick={() => setShowLoginModal(false)}
                            >
                                Отмена
                            </button>
                            <button 
                                className="mset-modal-submit"
                                onClick={handleChangeLogin}
                                disabled={!newLogin || !loginPassword || !loginCaptchaToken}
                            >
                                <LucideIcons.Check size={14} />
                                Изменить логин
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Change Password Modal */}
            {showPasswordModal && (
                <div className="mset-modal-overlay" onClick={() => setShowPasswordModal(false)}>
                    <div className="mset-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="mset-modal-header">
                            <h2>
                                <LucideIcons.Lock size={20} />
                                Изменить пароль
                            </h2>
                            <button onClick={() => setShowPasswordModal(false)}>
                                <LucideIcons.X size={18} />
                            </button>
                        </div>
                        
                        <div className="mset-modal-body">
                            <div className="mset-modal-field">
                                <label>Старый пароль</label>
                                <div className="mset-input-wrapper">
                                    <LucideIcons.KeyRound size={16} className="mset-input-icon" />
                                    <input
                                        className="mset-input with-icon"
                                        type="password"
                                        value={oldPassword}
                                        onChange={(e) => setOldPassword(e.target.value)}
                                        placeholder="Введите старый пароль"
                                    />
                                </div>
                            </div>
                            
                            <div className="mset-modal-field">
                                <label>Новый пароль</label>
                                <div className="mset-input-wrapper">
                                    <LucideIcons.Lock size={16} className="mset-input-icon" />
                                    <input
                                        className="mset-input with-icon"
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Введите новый пароль"
                                    />
                                </div>
                            </div>
                            
                            <div className="mset-modal-captcha">
                                <HCaptcha
                                    ref={passwordCaptchaRef}
                                    sitekey={HCAPTCHA_SITE_KEY}
                                    onVerify={(token) => setPasswordCaptchaToken(token)}
                                    onExpire={() => setPasswordCaptchaToken(null)}
                                    theme="dark"
                                />
                            </div>
                        </div>
                        
                        <div className="mset-modal-footer">
                            <button 
                                className="mset-modal-cancel"
                                onClick={() => setShowPasswordModal(false)}
                            >
                                Отмена
                            </button>
                            <button 
                                className="mset-modal-submit"
                                onClick={handleChangePassword}
                                disabled={!oldPassword || !newPassword || !passwordCaptchaToken}
                            >
                                <LucideIcons.Check size={14} />
                                Изменить пароль
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
