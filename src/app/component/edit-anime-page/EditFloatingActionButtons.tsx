'use client';

import React, { useState, useEffect } from 'react';
import { Save, RotateCcw } from 'lucide-react';

interface EditFloatingActionButtonsProps {
    onSave: () => void;
    onCancel: () => void;
    saving: boolean;
}

const EditFloatingActionButtons: React.FC<EditFloatingActionButtonsProps> = ({
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
            
            const distanceFromBottom = documentHeight - (scrollTop + windowHeight);
            
            if (distanceFromBottom <= 200) {
                setPosition('bottom-center');
            } else {
                setPosition('bottom-right');
            }
        };

        handleScroll();
        
        window.addEventListener('scroll', handleScroll);
        window.addEventListener('resize', handleScroll);
        
        return () => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('resize', handleScroll);
        };
    }, []);

    return (
        <div className={`edit-floating-action-buttons ${position}`}>
            <button
                className="btn btn-edit-primary floating-btn"
                onClick={onSave}
                disabled={saving}
            >
                <Save className="w-4 h-4" />
                {saving ? 'Обновление...' : 'Сохранить'}
            </button>
            <button
                className="btn btn-edit-secondary floating-btn"
                onClick={onCancel}
                disabled={saving}
            >
                <RotateCcw className="w-4 h-4" />
                Отменить
            </button>
        </div>
    );
};

export default EditFloatingActionButtons;