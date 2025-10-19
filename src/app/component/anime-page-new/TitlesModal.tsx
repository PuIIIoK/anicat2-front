'use client';

import React, { useState } from 'react';
import { X, Copy } from 'lucide-react';

interface TitlesModalProps {
    isOpen: boolean;
    onClose: () => void;
    mainTitle: string;
    altTitle?: string;
}

const TitlesModal: React.FC<TitlesModalProps> = ({
    isOpen,
    onClose,
    mainTitle,
    altTitle
}) => {
    const [copiedStates, setCopiedStates] = useState<{[key: string]: boolean}>({});

    if (!isOpen) return null;

    const copyToClipboard = async (text: string, key: string) => {
        try {
            await navigator.clipboard.writeText(text);
            
            // Устанавливаем состояние "скопировано"
            setCopiedStates(prev => ({ ...prev, [key]: true }));
            
            // Через 1 секунду возвращаем обратно
            setTimeout(() => {
                setCopiedStates(prev => ({ ...prev, [key]: false }));
            }, 1000);
        } catch (err) {
            console.error('Ошибка копирования:', err);
        }
    };

    const titles = [
        { label: 'Основное название', value: mainTitle, key: 'main' },
        ...(altTitle ? [{ label: 'Альтернативное название', value: altTitle, key: 'alt' }] : []),
    ];

    return (
        <div className="titles-modal-overlay" onClick={onClose}>
            <div className="titles-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="titles-modal-header">
                    <h3>Названия аниме</h3>
                    <button className="titles-modal-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>
                
                <div className="titles-modal-body">
                    {titles.map((title) => (
                        <div key={title.key} className="title-item">
                            <div className="title-info">
                                <span className="title-label">{title.label}</span>
                                <span className="title-value">{title.value}</span>
                            </div>
                            <button 
                                className={`copy-button ${copiedStates[title.key] ? 'copied' : ''}`}
                                onClick={() => copyToClipboard(title.value, title.key)}
                                disabled={copiedStates[title.key]}
                            >
                                <Copy size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default TitlesModal;
