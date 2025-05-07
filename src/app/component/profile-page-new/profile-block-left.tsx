'use client';

import React from "react";

interface ProfileLeftBlockProps {
    nickname: string;
    about: string;
    chartRef: React.RefObject<HTMLCanvasElement>;
    openModal: (type: 'edit' | 'settings') => void;
}

const ProfileLeftBlock: React.FC<ProfileLeftBlockProps> = ({
                                                               nickname,
                                                               about,
                                                               chartRef,
                                                               openModal,
                                                           }) => (
    <div className="left-column">
        <div className="profile-avatar-block">
            <div className="avatar-wrapper">
                <img src="/logo.png" className="avatar-img" alt="avatar" />
                <div className="status-wrapper">
                    <span className="online-indicator">Online</span>
                    <span className="star-icon" title="Премиум подписчик с 2023-08-01">⭐</span>
                </div>
                <span className="level-indicator">Level 42</span>
            </div>

            <h2 className="nickname">{nickname || 'xPullloKx'}</h2>
            <p className="join-date">Joined 2023</p>
            <p className="about-text">{about}</p>

            <div className="badges-grid">
                <span className="badges admin">Администратор</span>
                <span className="badges moderator">Модератор</span>
                <span className="badges uploader">Заливщик</span>
            </div>

            <div className="profile-actions">
                <button onClick={() => openModal('edit')}>Edit</button>
                <button onClick={() => openModal('settings')}>Settings</button>
            </div>
        </div>

        <div className="profile-stats">
            <h3>Stats</h3>
            <p><strong>Hours Watched:</strong> 120</p>
            <p><strong>Anime Completed:</strong> 85</p>
            <p><strong>Favorites Anime:</strong> 120</p>
            <p><strong>Total Watch Episodes:</strong> 85</p>
        </div>

        <div className="friends-list">
            <h3>Friends</h3>
            <ul>
                <li>AnimeFan42 <span className="dot green" /></li>
                <li>MangaReader <span className="dot green" /></li>
                <li>OtakuKing <span className="dot green" /></li>
            </ul>
            <a href="#">View all friends</a>
        </div>

        <div className="anime-statistics">
            <h3>Anime Stats</h3>
            <canvas ref={chartRef}></canvas>
            <ul className="anime-stats-details">
                <li><span className="label watching">Смотрю</span> <span className="value">12</span></li>
                <li><span className="label completed">Просмотренно</span> <span className="value">85</span></li>
                <li><span className="label planned">Запланировано</span> <span className="value">43</span></li>
                <li><span className="label dropped">Брошено</span> <span className="value">7</span></li>
            </ul>
            <button className="view-collection-button">Посмотреть коллекцию</button>
        </div>
    </div>
);

export default ProfileLeftBlock;
