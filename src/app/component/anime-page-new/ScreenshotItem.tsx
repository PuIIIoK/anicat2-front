'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';

interface ScreenshotItemProps {
    screenshot: {
        id: number;
        url: string;
        name: string;
    };
    index: number;
}

const ScreenshotItem: React.FC<ScreenshotItemProps> = ({ screenshot, index }) => {
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);

    const openLightbox = () => {
        setIsLightboxOpen(true);
        document.body.style.overflow = 'hidden';
    };

    const closeLightbox = () => {
        setIsLightboxOpen(false);
        document.body.style.overflow = '';
    };

    if (!screenshot.url) {
        return (
            <div className="screenshot-item-modern error">
                <span>📷</span>
            </div>
        );
    }

    return (
        <>
            <div
                className="screenshot-item-modern"
                onClick={openLightbox}
                title={screenshot.name || `Скриншот ${index + 1}`}
            >
                <img
                    src={screenshot.url}
                    alt={screenshot.name || `Скриншот ${index + 1}`}
                    loading="lazy"
                />
            </div>

            {/* Lightbox */}
            {isLightboxOpen && (
                <div className="screenshot-lightbox" onClick={closeLightbox}>
                    <button className="lightbox-close" onClick={closeLightbox}>
                        <X size={24} />
                    </button>
                    <img
                        src={screenshot.url}
                        alt={screenshot.name || `Скриншот ${index + 1}`}
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </>
    );
};

export default ScreenshotItem;
