'use client';

import React from 'react';
import './ProfileLoadingTransition.scss';

const ProfileLoadingTransition: React.FC = () => {
    return (
        <div className="profile-loading-transition">
            <div className="profile-loading-content">
                <div className="profile-loading-spinner">
                    <div className="spinner-ring"></div>
                    <div className="spinner-ring"></div>
                    <div className="spinner-ring"></div>
                </div>
                <div className="profile-loading-text">
                    <h2>Загрузка профиля</h2>
                    <p>Подготавливаем ваши данные...</p>
                </div>
            </div>
        </div>
    );
};

export default ProfileLoadingTransition;
