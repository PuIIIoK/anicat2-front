'use client';
import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Upload, Image, X, Camera, Edit3 } from 'lucide-react';

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
    setCoverPreview: React.Dispatch<React.SetStateAction<string>>;
    setBannerPreview: React.Dispatch<React.SetStateAction<string>>;
    setScreenshotPreviews: React.Dispatch<React.SetStateAction<string[]>>;
    keepScreenshotIds: number[];
    setKeepScreenshotIds: React.Dispatch<React.SetStateAction<number[]>>;
    deletedCover: boolean;
    setDeletedCover: React.Dispatch<React.SetStateAction<boolean>>;
    deletedBanner: boolean;
    setDeletedBanner: React.Dispatch<React.SetStateAction<boolean>>;
}

const AnimeFileAndEpisode: React.FC<Props> = ({
    cover, banner, screenshots, setCover, setBanner, setScreenshots,
    coverPreview, bannerPreview, screenshotPreviews, setCoverPreview, setBannerPreview,
    setScreenshotPreviews, keepScreenshotIds, setKeepScreenshotIds, deletedCover, 
    setDeletedCover, deletedBanner, setDeletedBanner
}) => {
    const coverInputRef = useRef<HTMLInputElement>(null);
    const screenshotsInputRef = useRef<HTMLInputElement>(null);
    const bannerInputRef = useRef<HTMLInputElement>(null);

    const [dragOver, setDragOver] = useState<string | null>(null);
    const [focusedField, setFocusedField] = useState<string | null>(null);

    // Update preview when new files are selected
    useEffect(() => {
        if (cover) {
            setCoverPreview(URL.createObjectURL(cover));
        }
    }, [cover, setCoverPreview]);

    useEffect(() => {
        if (banner) {
            setBannerPreview(URL.createObjectURL(banner));
        }
    }, [banner, setBannerPreview]);

    // Paste image handler
    const handlePaste = useCallback((e: ClipboardEvent) => {
        if (!focusedField) return;

        const items = e.clipboardData?.items;
        if (!items) return;

        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                e.preventDefault();
                const blob = items[i].getAsFile();
                if (blob) {
                    // Create a File object from the blob
                    const file = new File([blob], `pasted-image-${Date.now()}.png`, { type: blob.type });
                    
                    if (focusedField === 'banner') {
                        setBanner(file);
                        setDeletedBanner(false);
                    } else if (focusedField === 'cover') {
                        setCover(file);
                        setDeletedCover(false);
                    }
                }
                break;
            }
        }
    }, [focusedField, setBanner, setCover, setDeletedBanner, setDeletedCover]);

    // Add paste event listener
    useEffect(() => {
        document.addEventListener('paste', handlePaste);
        return () => {
            document.removeEventListener('paste', handlePaste);
        };
    }, [handlePaste]);

    // Context menu paste handler
    const handleContextMenu = useCallback((e: React.MouseEvent, targetType: string) => {
        e.preventDefault();
        
        // Request paste permission and trigger paste
        navigator.clipboard.read().then(clipboardItems => {
            for (const clipboardItem of clipboardItems) {
                for (const mimeType of clipboardItem.types) {
                    if (mimeType.startsWith('image/')) {
                        clipboardItem.getType(mimeType).then(blob => {
                            const file = new File([blob], `pasted-image-${Date.now()}.png`, { type: blob.type });
                            
                            if (targetType === 'banner') {
                                setBanner(file);
                                setDeletedBanner(false);
                            } else if (targetType === 'cover') {
                                setCover(file);
                                setDeletedCover(false);
                            }
                        });
                        break;
                    }
                }
            }
        }).catch(() => {
            // Fallback: show instruction to use Ctrl+V
            alert('Используйте Ctrl+V для вставки изображения из буфера обмена');
        });
    }, [setBanner, setCover, setDeletedBanner, setDeletedCover]);

    // Drag & Drop обработчики
    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>, type: string) => {
        e.preventDefault();
        setDragOver(type);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setDragOver(null);
    }, []);

    // Function to download image from URL and convert to File
    const downloadImageFromUrl = useCallback(async (imageUrl: string, fileName: string): Promise<File | null> => {
        try {
            const response = await fetch(imageUrl, { mode: 'cors' });
            if (!response.ok) throw new Error('Failed to fetch image');
            
            const blob = await response.blob();
            if (!blob.type.startsWith('image/')) throw new Error('Not an image file');
            
            return new File([blob], fileName, { type: blob.type });
        } catch (error) {
            console.error('Error downloading image:', error);
            alert('Не удалось скачать изображение. Попробуйте сохранить изображение локально и загрузить его.');
            return null;
        }
    }, []);

    const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>, type: string) => {
        e.preventDefault();
        setDragOver(null);
        
        // Check for files first
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            if (type === 'banner') {
                setBanner(files[0]);
                setDeletedBanner(false);
            } else if (type === 'cover') {
                setCover(files[0]);
                setDeletedCover(false);
            } else if (type === 'screenshots') {
                setScreenshots([...screenshots, ...files]);
            }
            return;
        }
        
        // Check for image URLs (drag from web pages)
        const urlList = e.dataTransfer.getData('text/uri-list');
        const htmlData = e.dataTransfer.getData('text/html');
        
        let imageUrl = '';
        
        if (urlList && urlList.startsWith('http')) {
            imageUrl = urlList.split('\n')[0]; // Take first URL
        } else if (htmlData) {
            // Extract image src from HTML
            const imgMatch = htmlData.match(/<img[^>]+src="([^"]+)"/i);
            if (imgMatch) {
                imageUrl = imgMatch[1];
            }
        }
        
        if (imageUrl && (type === 'banner' || type === 'cover')) {
            console.log('Downloading image from URL:', imageUrl);
            const fileName = `${type}-${Date.now()}.jpg`;
            const file = await downloadImageFromUrl(imageUrl, fileName);
            
            if (file) {
                if (type === 'banner') {
                    setBanner(file);
                    setDeletedBanner(false);
                } else if (type === 'cover') {
                    setCover(file);
                    setDeletedCover(false);
                }
            }
        }
    }, [screenshots, setBanner, setCover, setScreenshots, setDeletedBanner, setDeletedCover, downloadImageFromUrl]);

    // Обработчики файлов
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        if (type === 'banner') {
            setBanner(files[0]);
            setDeletedBanner(false);
        } else if (type === 'cover') {
            setCover(files[0]);
            setDeletedCover(false);
        } else if (type === 'screenshots') {
            setScreenshots([...screenshots, ...files]);
        }
    };

    const handleRemoveFile = (type: string, index?: number) => {
        if (type === 'banner') {
            setBanner(null);
            setDeletedBanner(true);
            if (bannerInputRef.current) bannerInputRef.current.value = '';
        } else if (type === 'cover') {
            setCover(null);
            setDeletedCover(true);
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

    // Удаление существующего скриншота
    const handleRemoveExistingScreenshot = (index: number) => {
        // Удаляем из списка ID для сохранения
        const newKeepIds = [...keepScreenshotIds];
        newKeepIds.splice(index, 1);
        setKeepScreenshotIds(newKeepIds);
        
        // Удаляем из превью для корректного отображения
        const newPreviews = [...screenshotPreviews];
        newPreviews.splice(index, 1);
        setScreenshotPreviews(newPreviews);
    };

    // Добавление новых скриншотов
    const handleAddScreenshots = (newFiles: FileList | null) => {
        if (!newFiles || newFiles.length === 0) return;
        
        const filesArray = Array.from(newFiles);
        const currentTotal = keepScreenshotIds.length + screenshots.length;
        const availableSlots = 10 - currentTotal;
        
        if (availableSlots <= 0) {
            alert('Максимальное количество скриншотов: 10');
            return;
        }
        
        const filesToAdd = filesArray.slice(0, availableSlots);
        const newScreenshots = [...screenshots, ...filesToAdd];
        setScreenshots(newScreenshots);
    };

    // Удаление нового скриншота
    const handleRemoveNewScreenshot = (index: number) => {
        const newScreenshots = [...screenshots];
        newScreenshots.splice(index, 1);
        setScreenshots(newScreenshots);
    };

    // Компонент загрузки файлов для редактирования
    const EditFileUploadCard = ({ type, file, title, subtitle, icon, preview, isDeleted }: {
        type: string;
        file: File | null;
        title: string;
        subtitle: string;
        icon: React.ReactNode;
        preview: string;
        isDeleted: boolean;
    }) => (
        <div
            className={`upload-card ${(file || (preview && !isDeleted)) ? 'has-file' : ''} ${type === 'banner' ? 'banner-upload' : ''} ${isDeleted ? 'deleted' : ''} ${focusedField === type ? 'focused' : ''}`}
            onDragOver={(e) => handleDragOver(e, type)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, type)}
            onContextMenu={(e) => handleContextMenu(e, type)}
            onFocus={() => setFocusedField(type)}
            onBlur={() => setFocusedField(null)}
            onMouseEnter={() => setFocusedField(type)}
            onMouseLeave={() => setFocusedField(null)}
            tabIndex={0}
            style={{
                borderColor: dragOver === type ? 'rgba(255, 149, 0, 0.8)' : focusedField === type ? 'rgba(175, 82, 222, 0.6)' : undefined,
                background: dragOver === type ? 'rgba(255, 149, 0, 0.1)' : focusedField === type ? 'rgba(175, 82, 222, 0.05)' : undefined
            }}
        >
            {file ? (
                // Новый файл
                <div className="file-preview new-file">
                    <img 
                        src={URL.createObjectURL(file)} 
                        alt={`${title} preview`}
                    />
                    <div className="file-info">
                        <span className="file-status new">Новый файл</span>
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
            ) : preview && !isDeleted ? (
                // Существующий файл
                <div className="file-preview existing-file">
                    <img 
                        src={preview} 
                        alt={`Текущий ${title.toLowerCase()}`}
                    />
                    <div className="file-info">
                        <span className="file-name">Текущий {title.toLowerCase()}</span>
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
                // Пустое состояние или удаленный файл
                <>
                    {isDeleted && (
                        <div className="deleted-indicator">
                            <X className="w-6 h-6" />
                            <span>Файл будет удален</span>
                        </div>
                    )}
                    <div className="upload-icon">
                        <Edit3 className="edit-indicator" />
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
                        <div className="file-input-button edit-button">
                            <Upload className="w-4 h-4" />
                            {isDeleted ? 'Загрузить новый' : dragOver === type ? 'Отпустите файл' : 'Заменить файл'}
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
                <EditFileUploadCard
                    type="banner"
                    file={banner}
                    title="Баннер"
                    subtitle="Широкое изображение для шапки (рекомендуемый размер: 1920x400)"
                    icon={<Image />}
                    preview={bannerPreview}
                    isDeleted={deletedBanner}
                />
            </div>

            {/* Обложка и скриншоты */}
            <div className="cover-screenshots-section">
                {/* Обложка */}
                <div className="cover-section">
                    <EditFileUploadCard
                        type="cover"
                        file={cover}
                        title="Обложка"
                        subtitle="Постер аниме (рекомендуемый размер: 300x450)"
                        icon={<Image />}
                        preview={coverPreview}
                        isDeleted={deletedCover}
                    />
                </div>

                {/* Скриншоты */}
                <div className="screenshots-section">
                    <div
                        className={`edit-upload-card ${(screenshots.length > 0 || screenshotPreviews.length > 0) ? 'has-file' : ''}`}
                        onDragOver={(e) => handleDragOver(e, 'screenshots')}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, 'screenshots')}
                        style={{
                            borderColor: dragOver === 'screenshots' ? 'rgba(255, 149, 0, 0.8)' : undefined,
                            background: dragOver === 'screenshots' ? 'rgba(255, 149, 0, 0.1)' : undefined
                        }}
                    >
                        {(screenshots.length > 0 || screenshotPreviews.length > 0) ? (
                            <>
                                <div className="screenshots-header">
                                    <h3 className="upload-title">
                                        <Camera className="w-4 h-4" />
                                        Скриншоты
                                        <span className="count">
                                            ({screenshotPreviews.length + screenshots.length})
                                        </span>
                                    </h3>
                                </div>
                                
                                <div className="screenshots-grid-display">
                                    {/* Существующие скриншоты */}
                                    {screenshotPreviews.map((src, index) => (
                                        <div key={`existing-${index}`} className="screenshot-item existing">
                                            <img 
                                                src={src} 
                                                alt={`Существующий скриншот ${index + 1}`}
                                            />
                                            <div className="screenshot-overlay">
                                                <span className="screenshot-status">Текущий</span>
                                                <button 
                                                    className="remove-screenshot" 
                                                    onClick={() => handleRemoveExistingScreenshot(index)}
                                                    type="button"
                                                    title="Удалить скриншот"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    
                                    {/* Новые скриншоты */}
                                    {screenshots.map((file, index) => (
                                        <div key={`new-${index}`} className="screenshot-item new">
                                            <img 
                                                src={URL.createObjectURL(file)} 
                                                alt={`Новый скриншот ${index + 1}`}
                                            />
                                            <div className="screenshot-overlay">
                                                <span className="screenshot-status new-label">Новый</span>
                                                <button 
                                                    className="remove-screenshot" 
                                                    onClick={() => handleRemoveNewScreenshot(index)}
                                                    type="button"
                                                    title="Удалить скриншот"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                
                                <div className="file-input add-more">
                                    <input
                                        ref={screenshotsInputRef}
                                        type="file"
                                        accept="image/webp,image/png,image/jpeg"
                                        multiple
                                        onChange={(e) => handleAddScreenshots(e.target.files)}
                                    />
                                    <div className="file-input-button edit-button">
                                        <Upload className="w-4 h-4" />
                                        Добавить еще
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="upload-icon">
                                    <Edit3 className="edit-indicator" />
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
                                        onChange={(e) => handleAddScreenshots(e.target.files)}
                                    />
                                    <div className="file-input-button edit-button">
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