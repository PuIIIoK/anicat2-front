'use client';
import React, { useRef, useState } from 'react';

interface Props {
    cover: File | null;
    screenshots: File[];
    setCover: (file: File | null) => void;
    setScreenshots: (files: File[]) => void;
}

const AnimeFileAndEpisode: React.FC<Props> = ({
                                                  cover, screenshots, setCover, setScreenshots
                                              }) => {
    const coverInputRef = useRef<HTMLInputElement>(null);
    const screenshotsInputRef = useRef<HTMLInputElement>(null);

    const [screenshotDeleteCountdown, setScreenshotDeleteCountdown] = useState<number | null>(null);
    const [coverDeleteCountdown, setCoverDeleteCountdown] = useState<number | null>(null);

    const handleScreenshotRemove = (index: number) => {
        const updated = [...screenshots];
        updated.splice(index, 1);
        setScreenshots(updated);

        // если файлов больше нет — запускаем отсчёт
        if (updated.length === 0 && screenshotsInputRef.current) {
            let counter = 3;
            setScreenshotDeleteCountdown(counter);
            const countdownInterval = setInterval(() => {
                counter--;
                setScreenshotDeleteCountdown(counter);
                if (counter === 0) {
                    clearInterval(countdownInterval);
                    setScreenshotDeleteCountdown(null);
                    screenshotsInputRef.current!.value = '';
                }
            }, 500);
        }
    };

    const handleCoverRemove = () => {
        setCover(null);
        if (coverInputRef.current) {
            let counter = 3;
            setCoverDeleteCountdown(counter);
            const countdownInterval = setInterval(() => {
                counter--;
                setCoverDeleteCountdown(counter);
                if (counter === 0) {
                    clearInterval(countdownInterval);
                    setCoverDeleteCountdown(null);
                    coverInputRef.current!.value = '';
                }
            }, 500);
        }
    };

    return (
        <div className="admin-file-upload">
            <div className="cover-upload">
                <h3>Обложка</h3>
                <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/webp,image/png,image/jpeg"
                    onChange={(e) => setCover(e.target.files?.[0] || null)}
                />
                {cover ? (
                    <div className="cover-preview">
                        <img src={URL.createObjectURL(cover)} alt="Предосмотр обложки" />
                        <div className="cover-actions">
                            <p>{cover.name}</p>
                            <button className="remove" onClick={handleCoverRemove}>Удалить обложку</button>
                        </div>
                    </div>
                ) : (
                    <p className="no-cover">
                        {coverDeleteCountdown !== null ? `Файл ${coverDeleteCountdown}...` : 'Обложка не выбрана'}
                    </p>
                )}
            </div>

            <div className="screenshot-upload">
                <h3>Скриншоты</h3>
                <input
                    ref={screenshotsInputRef}
                    type="file"
                    multiple
                    accept="image/webp,image/png,image/jpeg"
                    onChange={(e) => setScreenshots(Array.from(e.target.files || []))}
                />
                <div className="screenshot-preview">
                    {screenshots.length > 0 ? (
                        screenshots.map((file, index) => (
                            <div key={index} className="screenshot-item">
                                <img src={URL.createObjectURL(file)} alt={`Скриншот ${index + 1}`} />
                                <button className="remove" onClick={() => handleScreenshotRemove(index)}>✖</button>
                                <p>{file.name}</p>
                            </div>
                        ))
                    ) : (
                        <p className="no-shots">
                            {screenshotDeleteCountdown !== null ? `Файл ${screenshotDeleteCountdown}...` : 'Скриншоты не выбраны'}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AnimeFileAndEpisode;
