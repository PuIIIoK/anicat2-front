'use client';

import React, { useState, useEffect } from 'react';
import { UploadCloud, XCircle } from 'lucide-react';

interface FloatingActionButtonsProps {
    onSave: () => void;
    onCancel: () => void;
    saving: boolean;
}

const FloatingActionButtons: React.FC<FloatingActionButtonsProps> = ({
    onSave,
    onCancel,
    saving
}) => {
    const [position, setPosition] = useState<'bottom-right' | 'bottom-center'>('bottom-right');

    useEffect(() => {
        const handleScroll = () => {
            const windowHeight = window.innerHeight;
            const documentHeight = document.documentElement.scrollHeight;
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            
            // Если мы близко к концу страницы (в пределах 200px от низа)
            const distanceFromBottom = documentHeight - (scrollTop + windowHeight);
            
            if (distanceFromBottom <= 200) {
                setPosition('bottom-center');
            } else {
                setPosition('bottom-right');
            }
        };

        // Проверяем при загрузке
        handleScroll();
        
        // Добавляем слушатель скролла
        window.addEventListener('scroll', handleScroll);
        window.addEventListener('resize', handleScroll);
        
        return () => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('resize', handleScroll);
        };
    }, []);

    return (
        <div className={`floating-action-buttons ${position}`}>
            <button
                className="btn btn-primary floating-btn"
                onClick={onSave}
                disabled={saving}
            >
                <UploadCloud className="w-4 h-4" />
                {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
            <button
                className="btn btn-secondary floating-btn"
                onClick={onCancel}
                disabled={saving}
            >
                <XCircle className="w-4 h-4" />
                Отменить
            </button>
        </div>
    );
};

export default FloatingActionButtons;
