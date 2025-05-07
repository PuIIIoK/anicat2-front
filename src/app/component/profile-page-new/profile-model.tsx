'use client';

import React from "react";

interface ProfileModalProps {
    modalOpen: boolean;
    modalContent: 'edit' | 'settings' | null;
    closeModal: () => void;
    handleSaveEdit: (e: React.FormEvent) => void;
    handleSaveSettings: (e: React.FormEvent) => void;
    handleInputChange: (
        setter: React.Dispatch<React.SetStateAction<string>>
    ) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    nickname: string;
    avatar: string;
    about: string;
    banner: string;
    favoriteAnime: string;
    login: string;
    email: string;
    phone: string;
    telegram: string;
    discord: string;
    errorMessage: string;
    setNickname: React.Dispatch<React.SetStateAction<string>>;
    setAvatar: React.Dispatch<React.SetStateAction<string>>;
    setAbout: React.Dispatch<React.SetStateAction<string>>;
    setBanner: React.Dispatch<React.SetStateAction<string>>;
    setFavoriteAnime: React.Dispatch<React.SetStateAction<string>>;
    setLogin: React.Dispatch<React.SetStateAction<string>>;
    setEmail: React.Dispatch<React.SetStateAction<string>>;
    setPhone: React.Dispatch<React.SetStateAction<string>>;
    setTelegram: React.Dispatch<React.SetStateAction<string>>;
    setDiscord: React.Dispatch<React.SetStateAction<string>>;
}

const ProfileModal: React.FC<ProfileModalProps> = ({
                                                       modalOpen,
                                                       modalContent,
                                                       closeModal,
                                                       handleSaveEdit,
                                                       handleSaveSettings,
                                                       handleInputChange,
                                                       nickname,
                                                       avatar,
                                                       about,
                                                       banner,
                                                       favoriteAnime,
                                                       login,
                                                       errorMessage,
                                                       setNickname,
                                                       setAvatar,
                                                       setAbout,
                                                       setBanner,
                                                       setFavoriteAnime,
                                                       setLogin,
                                                   }) => {
    if (!modalOpen) return null;

    return (
        <div className="anime-modal-overlay" onClick={closeModal}>
            <div className="anime-modal wide" onClick={(e) => e.stopPropagation()}>
                {modalContent === 'edit' ? (
                    <>
                        <h2 className="modal-title">Редактировать профиль</h2>
                        <form className="profile-edit-form" onSubmit={handleSaveEdit}>
                            <div className="form-grid">
                                <div className="avatar-settings">
                                    <img src={avatar || "/logo.png"} alt="avatar" className="edit-avatar" />
                                    <input
                                        type="text"
                                        placeholder="URL аватарки"
                                        title="Введите ссылку на изображение аватарки"
                                        value={avatar}
                                        onChange={handleInputChange(setAvatar)}
                                    />
                                </div>
                                <div className="form-fields">
                                    <label>Ник:
                                        <input type="text" value={nickname} title="Ваш никнейм" onChange={handleInputChange(setNickname)} />
                                    </label>
                                    <label>О себе:
                                        <textarea value={about} title="Расскажите немного о себе" onChange={handleInputChange(setAbout)} />
                                    </label>
                                    <label>Баннер:
                                        <input type="text" value={banner} title="Ссылка на фоновое изображение" onChange={handleInputChange(setBanner)} />
                                    </label>
                                    <label>Любимое аниме:
                                        <input type="text" value={favoriteAnime} title="Напишите любимое аниме" onChange={handleInputChange(setFavoriteAnime)} />
                                    </label>
                                </div>
                            </div>
                            <div className="form-buttons">
                                <button type="submit" className="save-btn">Сохранить</button>
                                <button type="button" className="modal-close" onClick={closeModal}>Отмена</button>
                            </div>
                        </form>
                    </>
                ) : (
                    <>
                        <h2 className="modal-title">Настройки аккаунта</h2>
                        <form className="profile-edit-form" onSubmit={handleSaveSettings}>
                            <div className="account-settings">
                                <div className="account-left">
                                    <label>
                                        Логин
                                        <input
                                            type="text"
                                            value={login}
                                            title="Введите логин"
                                            onChange={handleInputChange(setLogin)}
                                        />
                                    </label>
                                    <label>
                                        Пароль
                                        <input type="password" placeholder="Введите пароль"/>
                                    </label>
                                </div>

                                <div className="account-right">
                                    <div className="linked-platform">
                                        <span className="icon">💬</span>
                                        <span>Discord - <span className="status">не привязан</span></span>
                                        <button className="link-btn">Привязать</button>
                                    </div>
                                    <div className="linked-platform">
                                        <span className="icon">📨</span>
                                        <span>Telegram - <span className="status">не привязан</span></span>
                                        <button className="link-btn">Привязать</button>
                                    </div>
                                </div>
                            </div>

                            <div className="form-buttons">
                                <button type="submit" className="save-btn">Сохранить</button>
                                <button type="button" className="modal-close" onClick={closeModal}>Отмена</button>
                            </div>
                        </form>
                    </>
                )}
                {errorMessage && <div className="modal-error">{errorMessage}</div>}
            </div>
        </div>
    );
};

export default ProfileModal;