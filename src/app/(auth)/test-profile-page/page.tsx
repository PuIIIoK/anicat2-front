'use client';

import React, { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import ProfileBanner from '../../component/profile-page-new/profile-top-banner';
import ProfileLeftBlock from '../../component/profile-page-new/profile-block-left';
import ProfileRightBlock from '../../component/profile-page-new/profile-block-right';
import ProfileModal from '../../component/profile-page-new/profile-model';

const Test = () => {
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstanceRef = useRef<Chart | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalContent, setModalContent] = useState<'edit' | 'settings' | null>(null);
    const [unsavedChanges, setUnsavedChanges] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const [nickname, setNickname] = useState('');
    const [avatar, setAvatar] = useState('');
    const [about, setAbout] = useState('');
    const [banner, setBanner] = useState('');
    const [favoriteAnime, setFavoriteAnime] = useState('');

    const [login, setLogin] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [telegram, setTelegram] = useState('');
    const [discord, setDiscord] = useState('');

    const openModal = (content: 'edit' | 'settings') => {
        setModalContent(content);
        setModalOpen(true);
        setErrorMessage('');
        setUnsavedChanges(false);
    };

    const closeModal = () => {
        if (unsavedChanges) {
            setErrorMessage('Сначала сохраните изменения');
            return;
        }
        setModalOpen(false);
        setModalContent(null);
        setErrorMessage('');
    };

    const handleInputChange =
        (setter: React.Dispatch<React.SetStateAction<string>>) =>
            (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
                setter(e.target.value);
                setUnsavedChanges(true);
            };

    const handleSaveEdit = (e: React.FormEvent) => {
        e.preventDefault();
        localStorage.setItem('nickname', nickname);
        localStorage.setItem('avatar', avatar);
        localStorage.setItem('about', about);
        localStorage.setItem('banner', banner);
        localStorage.setItem('favoriteAnime', favoriteAnime);
        setUnsavedChanges(false);
        closeModal();
    };

    const handleSaveSettings = (e: React.FormEvent) => {
        e.preventDefault();
        localStorage.setItem('login', login);
        localStorage.setItem('email', email);
        localStorage.setItem('phone', phone);
        localStorage.setItem('telegram', telegram);
        localStorage.setItem('discord', discord);
        setUnsavedChanges(false);
        closeModal();
    };

    useEffect(() => {
        if (chartRef.current) {
            // Удаляем предыдущий чарт, если есть
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy();
            }

            chartInstanceRef.current = new Chart(chartRef.current, {
                type: 'doughnut',
                data: {
                    labels: ['Completed', 'Planned', 'Watching', 'Dropped'],
                    datasets: [
                        {
                            data: [85, 43, 12, 7],
                            backgroundColor: ['#4caf50', '#ff9800', '#2196f3', '#f44336'],
                            borderWidth: 0,
                        },
                    ],
                },
                options: {
                    plugins: { legend: { display: false } },
                    cutout: '65%',
                },
            });
        }

        // Удаляем чарт при размонтировании
        return () => {
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy();
                chartInstanceRef.current = null;
            }
        };
    }, []);

    return (

        <div className="anime-profile-page">
            <div className="profile-back-admin">
                <a href="/admin_panel" className="back-to-admin-button">← Вернуться в админ панель</a>
            </div>
            <ProfileBanner openModal={openModal}/>
            <div className="profile-main-layout">
                <ProfileLeftBlock
                    {...{
                        nickname, avatar, about, banner, favoriteAnime,
                        login, email, phone, telegram, discord,
                        chartRef, modalOpen, modalContent, openModal, closeModal,
                        setNickname, setAvatar, setAbout, setBanner, setFavoriteAnime,
                        setLogin, setEmail, setPhone, setTelegram, setDiscord
                    }}
                />
                <ProfileRightBlock/>
            </div>
            <ProfileModal
                modalOpen={modalOpen}
                modalContent={modalContent}
                closeModal={closeModal}
                handleSaveEdit={handleSaveEdit}
                handleSaveSettings={handleSaveSettings}
                handleInputChange={handleInputChange}
                nickname={nickname}
                avatar={avatar}
                about={about}
                banner={banner}
                favoriteAnime={favoriteAnime}
                login={login}
                email={email}
                phone={phone}
                telegram={telegram}
                discord={discord}
                errorMessage={errorMessage}
                setNickname={setNickname}
                setAvatar={setAvatar}
                setAbout={setAbout}
                setBanner={setBanner}
                setFavoriteAnime={setFavoriteAnime}
                setLogin={setLogin}
                setEmail={setEmail}
                setPhone={setPhone}
                setTelegram={setTelegram}
                setDiscord={setDiscord}
            />
        </div>
    );
};

export default Test;