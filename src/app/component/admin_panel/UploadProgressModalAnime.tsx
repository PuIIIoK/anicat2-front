'use client';

import React from 'react';


interface UploadProgressModalProps {
    isVisible: boolean;
    progress: number;
    currentStep: React.ReactNode;
}

const UploadProgressModal: React.FC<UploadProgressModalProps> = ({
                                                                     isVisible,
                                                                     progress,
                                                                     currentStep,
                                                                 }) => {
    if (!isVisible) return null;

    return (
        <div className="upload-progress-modal">
            <div className="modal-content">
                <h2 className="modal-title">Загрузка аниме</h2>
                <div className="progress-bar">
                    <div
                        className="progress-fill"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <div className="current-step">
                    {currentStep}
                </div>
                {progress === 100 && (
                    <div className="current-step" style={{ color: '#10b981', marginTop: '0.5rem' }}>
                        ✅ Аниме успешно загружено!
                    </div>
                )}
            </div>
        </div>
    );
};

export default UploadProgressModal;
