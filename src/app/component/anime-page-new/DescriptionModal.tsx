'use client';

import React from 'react';
import { X } from 'lucide-react';

interface DescriptionModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    description: string;
}

const DescriptionModal: React.FC<DescriptionModalProps> = ({
    isOpen,
    onClose,
    title,
    description
}) => {
    if (!isOpen) return null;

    return (
        <div className="description-modal-overlay" onClick={onClose}>
            <div className="description-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="description-modal-header">
                    <h3>Описание</h3>
                    <button className="description-modal-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>
                
                <div className="description-modal-body">
                    <h4>{title}</h4>
                    <div className="description-modal-text">
                        {description || 'Описание отсутствует'}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DescriptionModal;
