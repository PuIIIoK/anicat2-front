'use client';

import React from 'react';
import { Rocket, Sparkles, Plus, X, CheckCircle } from 'lucide-react';

interface UpdateInfo {
  version: string;
  type: string;
  releaseNotes: string;
}

interface UpdateNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  updateInfo: UpdateInfo | null;
}

const UpdateNotificationModal: React.FC<UpdateNotificationModalProps> = ({ 
  isOpen, 
  onClose, 
  updateInfo 
}) => {
  if (!isOpen || !updateInfo) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Преобразуем список изменений в массив
  const releaseNotes = updateInfo.releaseNotes
    .split('\n')
    .filter(line => line.trim())
    .map(line => line.replace(/^-\s*/, '').trim());

  const isMajorUpdate = updateInfo.type === 'Крупное';

  return (
    <div className="update-modal-overlay" onClick={handleBackdropClick}>
      <div className={`update-modal ${isMajorUpdate ? 'major-update' : 'regular-update'}`}>
        {/* Кнопка закрытия */}
        <button className="update-modal-close" onClick={onClose}>
          <X size={24} />
        </button>

        {/* Заголовок */}
        <div className="update-modal-header">
          <div className="update-type-badge">
            {isMajorUpdate ? (
              <>
                <Rocket className="update-icon rocket" size={28} />
                <span>КРУПНОЕ ОБНОВЛЕНИЕ</span>
              </>
            ) : (
              <>
                <Plus className="update-icon plus" size={28} />
                <span>ОБНОВЛЕНИЕ</span>
              </>
            )}
          </div>
          
          <h1>AniCat {updateInfo.version} уже на сайте!</h1>
          <div className="update-sparkles">
            <Sparkles className="sparkle sparkle-1" size={20} />
            <Sparkles className="sparkle sparkle-2" size={16} />
            <Sparkles className="sparkle sparkle-3" size={18} />
          </div>
        </div>

        {/* Список изменений */}
        <div className="update-modal-content">
          <h3>Что добавлено?</h3>
          <div className="changes-list">
            {releaseNotes.map((change, index) => (
              <div key={index} className="change-item">
                <CheckCircle className="check-icon" size={18} />
                <span>{change}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Кнопка ОК */}
        <div className="update-modal-footer">
          <button className="update-ok-btn" onClick={onClose}>
            {isMajorUpdate ? (
              <>
                <Rocket size={20} />
                Супер! Попробуем новое
              </>
            ) : (
              <>
                <CheckCircle size={20} />
                Отлично, спасибо!
              </>
            )}
          </button>
        </div>

        {/* Декоративные элементы для крупного обновления */}
        {isMajorUpdate && (
          <>
            <div className="update-glow update-glow-1"></div>
            <div className="update-glow update-glow-2"></div>
            <div className="update-particle update-particle-1"></div>
            <div className="update-particle update-particle-2"></div>
            <div className="update-particle update-particle-3"></div>
          </>
        )}
      </div>
    </div>
  );
};

export default UpdateNotificationModal;
