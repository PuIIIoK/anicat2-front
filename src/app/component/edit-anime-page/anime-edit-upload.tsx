'use client';
import React, { useRef, useState } from 'react';

interface Props {
    cover: File | null;
    banner: File | null;
    screenshots: File[];
    setCover: (file: File | null) => void;
    setBanner: (file: File | null) => void;
    setScreenshots: (files: File[]) => void;
    coverPreview: string;
    bannerPreview: string;
    screenshotPreviews: string[];
    keepScreenshotIds: number[];
    setKeepScreenshotIds: React.Dispatch<React.SetStateAction<number[]>>;
    deletedCover: boolean;
    setDeletedCover: React.Dispatch<React.SetStateAction<boolean>>;
    deletedBanner: boolean;
    setDeletedBanner: React.Dispatch<React.SetStateAction<boolean>>;
}

const AnimeFileAndEpisode: React.FC<Props> = ({
                                                  cover, banner, screenshots,
                                                  setCover, setBanner, setScreenshots,
                                                  coverPreview, bannerPreview, screenshotPreviews = [],
                                                  deletedCover, setDeletedCover,
                                                  deletedBanner, setDeletedBanner
                                              }) => {
    const coverInputRef = useRef<HTMLInputElement>(null);
    const bannerInputRef = useRef<HTMLInputElement>(null);
    const screenshotInputRef = useRef<HTMLInputElement>(null);

    const [deletedPreviews, setDeletedPreviews] = useState<number[]>([]);
    const [showSaveCancelButtons, setShowSaveCancelButtons] = useState(false);
    const [tempDeletedScreenshot, setTempDeletedScreenshot] = useState<number | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [isAgreed, setIsAgreed] = useState(false);
    const [tempScreenshots, setTempScreenshots] = useState<File[]>([]); // Сохраняем состояние скриншотов перед удалением

    const handleRemovePreview = (index: number) => {
        setTempDeletedScreenshot(index);
        setTempScreenshots(screenshots); // Сохраняем текущее состояние скриншотов
        setShowSaveCancelButtons(true);
    };

    const handleAddScreenshot = (files: FileList | null) => {
        if (files) {
            setScreenshots([...screenshots, ...Array.from(files)]);
            setShowSaveCancelButtons(true);
        }
    };

    const handleSaveDeletion = () => {
        if (tempDeletedScreenshot !== null) {
            setDeletedPreviews(prev => [...prev, tempDeletedScreenshot]);
            const updated = screenshots.filter((_, index) => index !== tempDeletedScreenshot);
            setScreenshots(updated);
        }
        setShowSaveCancelButtons(false);
        setShowModal(true);
    };

    const handleCancelDeletion = () => {
        setTempDeletedScreenshot(null);
        setShowSaveCancelButtons(false);
    };

    const handleModalConfirm = () => {
        if (isAgreed) {
            // Подтверждение удаления
            setTempDeletedScreenshot(null);
            setTempScreenshots([]); // Очищаем временное состояние
            setShowModal(false);
            setIsAgreed(false);
        }
    };

    const handleModalCancel = () => {
        if (tempDeletedScreenshot !== null) {
            // Восстанавливаем скриншоты
            setScreenshots(tempScreenshots);
            setDeletedPreviews(prev => prev.filter(i => i !== tempDeletedScreenshot));
        }
        setTempDeletedScreenshot(null);
        setTempScreenshots([]);
        setShowModal(false);
        setIsAgreed(false);
    };

    const handleAgreementChange = () => {
        setIsAgreed(!isAgreed);
    };

    return (
        <div className="admin-file-upload">
            {/* Баннер */}
            <div className="banner-upload">
                <h3>Баннер</h3>
                <input
                    ref={bannerInputRef}
                    type="file"
                    accept="image/webp,image/png,image/jpeg"
                    onChange={(e) => setBanner(e.target.files?.[0] || null)}
                />
                {!deletedBanner && (banner ? (
                    <div className="banner-preview">
                        <img src={URL.createObjectURL(banner)} alt="Предосмотр баннера" />
                        <div className="banner-actions">
                            <p>{banner.name}</p>
                            <button className="remove" onClick={() => { setBanner(null); setDeletedBanner(true); }}>✖</button>
                        </div>
                    </div>
                ) : bannerPreview && (
                    <div className="banner-preview">
                        <img src={bannerPreview} alt="Текущий баннер" />
                        <div className="banner-actions">
                            <p className="no-banner">Текущий баннер</p>
                            <button className="remove" onClick={() => setDeletedBanner(true)}>✖</button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Обложка */}
            <div className="image-upload-row">
                <div className="cover-upload">
                    <h3>Обложка</h3>
                    <input
                        ref={coverInputRef}
                        type="file"
                        accept="image/webp,image/png,image/jpeg"
                        onChange={(e) => setCover(e.target.files?.[0] || null)}
                    />
                    {!deletedCover && (cover ? (
                        <div className="cover-preview">
                            <img src={URL.createObjectURL(cover)} alt="Предосмотр обложки" />
                            <div className="cover-actions">
                                <p>{cover.name}</p>
                                <button className="remove" onClick={() => { setCover(null); setDeletedCover(true); }}>✖</button>
                            </div>
                        </div>
                    ) : coverPreview && (
                        <div className="cover-preview">
                            <img src={coverPreview} alt="Текущая обложка" />
                            <div className="cover-actions">
                                <p className="no-cover">Текущая обложка</p>
                                <button className="remove" onClick={() => setDeletedCover(true)}>✖</button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Скриншоты */}
                <div className="screenshot-upload">
                    <h3>Скриншоты</h3>
                    <input
                        ref={screenshotInputRef}
                        type="file"
                        accept="image/webp,image/png,image/jpeg"
                        multiple
                        onChange={(e) => handleAddScreenshot(e.target.files)}
                    />
                    <div className="screenshot-preview">
                        {/* Старые скриншоты */}
                        {screenshotPreviews.map((src, i) =>
                                !deletedPreviews.includes(i) && (
                                    <div key={`preview-${i}`} className="screenshot-item">
                                        <img src={src} alt={`Скриншот #${i + 1}`} />
                                        <button className="remove" onClick={() => handleRemovePreview(i)}>✖</button>
                                        <p>Скриншот #{i + 1}</p>
                                    </div>
                                )
                        )}

                        {/* Новые скриншоты */}
                        {screenshots.map((file, index) => (
                            <div key={`file-${index}`} className="screenshot-item">
                                <img src={URL.createObjectURL(file)} alt={`Скриншот #${index + 1}`} />
                                <button className="remove" onClick={() => handleRemovePreview(index)}>✖</button>
                                <p>{file.name}</p>
                            </div>
                        ))}

                        {/* Если нет ничего */}
                        {screenshots.length === 0 && screenshotPreviews.length === 0 && (
                            <p className="no-shots">Скриншоты не выбраны</p>
                        )}
                    </div>
                </div>

                {/* Кнопки Сохранить и Отмена */}
                {showSaveCancelButtons && (
                    <div className="save-cancel-buttons">
                        <button className="save" onClick={handleSaveDeletion}>Сохранить</button>
                        <button className="cancel" onClick={handleCancelDeletion}>Отмена</button>
                    </div>
                )}

                {/* Модальное окно с предупреждением */}
                {showModal && (
                    <div className="modal-overlay">
                        <div className="modal">
                            <p>❗️ Внимание: Вы пытаетесь удалить скриншот. При подтверждении изменения будут необратимы.</p>
                            <label>
                                <input type="checkbox" checked={isAgreed} onChange={handleAgreementChange} />
                                Я согласен с данными последствиями
                            </label>
                            <div>
                                <button
                                    onClick={handleModalConfirm}
                                    disabled={!isAgreed}
                                    className={`confirm-btn ${isAgreed ? 'enabled' : 'disabled'}`}
                                >
                                    Подтвердить
                                </button>
                                <button
                                    onClick={handleModalCancel}
                                    className="cancel-btn"
                                >
                                    Отмена
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AnimeFileAndEpisode;