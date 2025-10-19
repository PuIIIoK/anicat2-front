'use client';
import React, { useRef, useState, useCallback } from 'react';
import { Upload, Image, X, Camera } from 'lucide-react';

interface Props {
    cover: File | null;
    screenshots: File[];
    banner: File | null;
    setCover: (file: File | null) => void;
    setScreenshots: (files: File[]) => void;
    setBanner: (file: File | null) => void;
}

const AnimeFileAndEpisode: React.FC<Props> = ({
                                                  cover, screenshots, banner, setCover, setScreenshots, setBanner
                                              }) => {
    const coverInputRef = useRef<HTMLInputElement>(null);
    const screenshotsInputRef = useRef<HTMLInputElement>(null);
    const bannerInputRef = useRef<HTMLInputElement>(null);

    const [dragOver, setDragOver] = useState<string | null>(null);

    // Drag & Drop обработчики
    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>, type: string) => {
        e.preventDefault();
        setDragOver(type);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setDragOver(null);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>, type: string) => {
        e.preventDefault();
        setDragOver(null);
        
        const files = Array.from(e.dataTransfer.files);
        if (files.length === 0) return;

        if (type === 'banner') {
            setBanner(files[0]);
        } else if (type === 'cover') {
            setCover(files[0]);
        } else if (type === 'screenshots') {
            setScreenshots([...screenshots, ...files]);
        }
    }, [screenshots, setBanner, setCover, setScreenshots]);

    // Обработчики файлов
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        if (type === 'banner') {
            setBanner(files[0]);
        } else if (type === 'cover') {
            setCover(files[0]);
        } else if (type === 'screenshots') {
            setScreenshots([...screenshots, ...files]);
        }
    };

    const handleRemoveFile = (type: string, index?: number) => {
        if (type === 'banner') {
            setBanner(null);
            if (bannerInputRef.current) bannerInputRef.current.value = '';
        } else if (type === 'cover') {
            setCover(null);
            if (coverInputRef.current) coverInputRef.current.value = '';
        } else if (type === 'screenshots' && typeof index === 'number') {
            const updated = [...screenshots];
            updated.splice(index, 1);
            setScreenshots(updated);
            if (updated.length === 0 && screenshotsInputRef.current) {
                screenshotsInputRef.current.value = '';
            }
        }
    };

    // Компонент загрузки файлов
    const FileUploadCard = ({ type, file, title, subtitle, icon }: {
        type: string;
        file: File | null;
        title: string;
        subtitle: string;
        icon: React.ReactNode;
    }) => (
        <div
            className={`upload-card ${file ? 'has-file' : ''} ${type === 'banner' ? 'banner-upload' : ''}`}
            onDragOver={(e) => handleDragOver(e, type)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, type)}
            style={{
                borderColor: dragOver === type ? 'rgba(102, 126, 234, 0.8)' : undefined,
                background: dragOver === type ? 'rgba(102, 126, 234, 0.1)' : undefined
            }}
        >
            {file ? (
                <div className="file-preview">
                    <img 
                        src={URL.createObjectURL(file)} 
                        alt={`${title} preview`}
                    />
                    <div className="file-info">
                        <span className="file-name">{file.name}</span>
                        <button 
                            className="remove-button" 
                            onClick={() => handleRemoveFile(type)}
                            type="button"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    <div className="upload-icon">
                        {icon}
                    </div>
                    <h3 className="upload-title">{title}</h3>
                    <p className="upload-subtitle">{subtitle}</p>
                    <div className="file-input">
                        <input
                            ref={type === 'banner' ? bannerInputRef : type === 'cover' ? coverInputRef : screenshotsInputRef}
                            type="file"
                            accept="image/webp,image/png,image/jpeg"
                            multiple={type === 'screenshots'}
                            onChange={(e) => handleFileSelect(e, type)}
                        />
                        <div className="file-input-button">
                            <Upload className="w-4 h-4" />
                            {dragOver === type ? 'Отпустите файл' : 'Выберите файл'}
                        </div>
                    </div>
                </>
            )}
        </div>
    );

    return (
        <div className="media-upload-layout">
            {/* Баннер сверху на всю ширину */}
            <div className="banner-section">
                <FileUploadCard
                    type="banner"
                    file={banner}
                    title="Баннер"
                    subtitle="Широкое изображение для шапки (рекомендуемый размер: 1920x400)"
                    icon={<Image />}
                />
            </div>

            {/* Обложка и скриншоты */}
            <div className="cover-screenshots-section">
                {/* Обложка */}
                <div className="cover-section">
                    <FileUploadCard
                        type="cover"
                        file={cover}
                        title="Обложка"
                        subtitle="Постер аниме (рекомендуемый размер: 300x450)"
                        icon={<Image />}
                    />
                </div>

                {/* Скриншоты */}
                <div className="screenshots-section">
                    <div
                        className={`upload-card ${screenshots.length > 0 ? 'has-file' : ''}`}
                        onDragOver={(e) => handleDragOver(e, 'screenshots')}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, 'screenshots')}
                        style={{
                            borderColor: dragOver === 'screenshots' ? 'rgba(102, 126, 234, 0.8)' : undefined,
                            background: dragOver === 'screenshots' ? 'rgba(102, 126, 234, 0.1)' : undefined
                        }}
                    >
                        {screenshots.length > 0 ? (
                            <>
                                <h3 className="upload-title">Скриншоты ({screenshots.length})</h3>
                                <div className="screenshots-grid-display">
                                    {screenshots.map((file, index) => (
                                        <div key={index} className="screenshot-item">
                                            <img 
                                                src={URL.createObjectURL(file)} 
                                                alt={`Скриншот ${index + 1}`}
                                            />
                                            <button 
                                                className="remove-screenshot" 
                                                onClick={() => handleRemoveFile('screenshots', index)}
                                                type="button"
                                            >
                                                <X />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <div className="file-input" style={{ marginTop: '1rem' }}>
                                    <input
                                        ref={screenshotsInputRef}
                                        type="file"
                                        accept="image/webp,image/png,image/jpeg"
                                        multiple
                                        onChange={(e) => handleFileSelect(e, 'screenshots')}
                                    />
                                    <div className="file-input-button">
                                        <Upload className="w-4 h-4" />
                                        Добавить еще
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="upload-icon">
                                    <Camera />
                                </div>
                                <h3 className="upload-title">Скриншоты</h3>
                                <p className="upload-subtitle">Изображения из аниме (можно загрузить несколько)</p>
                                <div className="file-input">
                                    <input
                                        ref={screenshotsInputRef}
                                        type="file"
                                        accept="image/webp,image/png,image/jpeg"
                                        multiple
                                        onChange={(e) => handleFileSelect(e, 'screenshots')}
                                    />
                                    <div className="file-input-button">
                                        <Upload className="w-4 h-4" />
                                        {dragOver === 'screenshots' ? 'Отпустите файлы' : 'Выберите файлы'}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnimeFileAndEpisode;