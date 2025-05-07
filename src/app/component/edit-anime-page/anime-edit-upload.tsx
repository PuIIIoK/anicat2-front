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
                                                  coverPreview, bannerPreview, screenshotPreviews = []
                                              }) => {
    const coverInputRef = useRef<HTMLInputElement>(null);
    const bannerInputRef = useRef<HTMLInputElement>(null);
    const screenshotsInputRef = useRef<HTMLInputElement>(null);

    const [deletedPreviews, setDeletedPreviews] = useState<number[]>([]); // удалённые старые
    const [deletedCover, setDeletedCover] = useState(false);
    const [deletedBanner, setDeletedBanner] = useState(false);

    const handleAddScreenshots = (files: FileList | null) => {
        if (files) {
            setScreenshots([...screenshots, ...Array.from(files)]);
        }
    };

    const handleRemoveScreenshotFile = (index: number) => {
        const updated = [...screenshots];
        updated.splice(index, 1);
        setScreenshots(updated);
    };

    const handleRemovePreview = (index: number) => {
        setDeletedPreviews(prev => [...prev, index]);
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
                        ref={screenshotsInputRef}
                        type="file"
                        multiple
                        accept="image/webp,image/png,image/jpeg"
                        onChange={(e) => handleAddScreenshots(e.target.files)}
                    />

                    <div className="screenshot-preview">
                        {/* Старые */}
                        {screenshotPreviews.map((src, i) =>
                                !deletedPreviews.includes(i) && (
                                    <div key={`preview-${i}`} className="screenshot-item">
                                        <img src={src} alt={`Скриншот #${i + 1}`} />
                                        <button className="remove" onClick={() => handleRemovePreview(i)}>✖</button>
                                        <p>Скриншот #{i + 1}</p>
                                    </div>
                                )
                        )}

                        {/* Новые */}
                        {screenshots.map((file, index) => (
                            <div key={`file-${index}`} className="screenshot-item">
                                <img src={URL.createObjectURL(file)} alt={`Скриншот #${index + 1}`} />
                                <button className="remove" onClick={() => handleRemoveScreenshotFile(index)}>✖</button>
                                <p>{file.name}</p>
                            </div>
                        ))}

                        {/* Если нет ничего */}
                        {screenshots.length === 0 && screenshotPreviews.length === 0 && (
                            <p className="no-shots">Скриншоты не выбраны</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnimeFileAndEpisode;
