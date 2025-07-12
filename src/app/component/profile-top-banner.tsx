'use client';

import React from "react";

interface ProfileBannerProps {
    openModal: (content: 'edit' | 'settings') => void;
}

const ProfileBanner: React.FC<ProfileBannerProps> = ({ openModal }) => (
    <div className="profile-banner">
        <img src="/default_backgr.jpg" alt="Profile Banner" className="banner-image" />
        <button onClick={() => openModal('edit')} className="edit-banner-button">
            Редактировать
        </button>
    </div>
);

export default ProfileBanner;
