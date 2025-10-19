import React, { useState } from 'react';

interface ScreenshotItemProps {
    screenshot: {
        id: number;
        url: string;
        name: string;
    };
    index: number;
}

const ScreenshotItem: React.FC<ScreenshotItemProps> = ({ screenshot, index }) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);
    
    console.log(`🖼️ ScreenshotItem рендер для скриншота ${index + 1}:`, {
        id: screenshot.id,
        url: screenshot.url,
        name: screenshot.name,
        imageLoaded,
        imageError
    });

    const handleImageLoad = () => {
        console.log('✅ Скриншот УСПЕШНО загружен:', screenshot.url);
        setImageLoaded(true);
        setImageError(false);
    };

    const handleImageError = () => {
        console.error('❌ ОШИБКА загрузки скриншота:', screenshot.url);
        setImageError(true);
        setImageLoaded(false);
    };

    const handleClick = () => {
        if (imageLoaded && !imageError) {
            window.open(screenshot.url, '_blank');
        }
    };

    if (!screenshot.url) {
        console.error('❌ Нет URL для скриншота:', screenshot);
        return (
            <div className="anime-screenshot-item">
                <div className="screenshot-error">
                    <span>📷</span>
                    <span>Нет URL</span>
                </div>
            </div>
        );
    }

    return (
        <div 
            className="anime-screenshot-item"
            onClick={handleClick}
            title={screenshot.name || `Скриншот ${index + 1}`}
        >
            {/* Спиннер показывается пока изображение не загружено и нет ошибки */}
            {!imageLoaded && !imageError && (
                <div className="screenshot-loading">
                    <div className="screenshot-spinner"></div>
                    <span>Загрузка...</span>
                </div>
            )}
            
            {/* Ошибка показывается если изображение не загрузилось */}
            {imageError && (
                <div className="screenshot-error">
                    <span>📷</span>
                    <span>Не удалось загрузить</span>
                </div>
            )}
            
            {/* Изображение всегда присутствует в DOM, но скрыто пока не загрузится */}
            <img 
                src={screenshot.url} 
                alt={screenshot.name || `Скриншот ${index + 1}`} 
                loading="lazy"
                className="screenshot-image"
                style={{ 
                    opacity: imageLoaded ? 1 : 0,
                    visibility: imageLoaded ? 'visible' : 'hidden',
                }}
                onError={handleImageError}
                onLoad={handleImageLoad}
            />
        </div>
    );
};

export default ScreenshotItem;
