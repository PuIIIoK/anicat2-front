'use client';

import React from 'react';
import { Heart, Sparkles, Smartphone, Monitor, Zap, Star, X } from 'lucide-react';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="welcome-modal-overlay" onClick={handleBackdropClick}>
      <div className="welcome-modal">
        {/* Кнопка закрытия */}
        <button className="welcome-modal-close" onClick={onClose}>
          <X size={20} />
        </button>

        {/* Заголовок с иконками */}
        <div className="welcome-modal-header">
          <div className="welcome-icons">
            <Heart className="welcome-icon heart" size={24} />
            <Sparkles className="welcome-icon sparkles" size={26} />
            <Star className="welcome-icon star" size={22} />
          </div>
          <h1>Добро пожаловать на AniCat!</h1>
          <p className="welcome-subtitle">Мы рады вас видеть 😊</p>
        </div>

        {/* Основной контент */}
        <div className="welcome-modal-content">
          <div className="welcome-feature">
            <div className="welcome-feature-icon">
              <Monitor size={24} />
            </div>
            <p>
              Смотрите свои любимые аниме в <strong>хорошем качестве</strong> 
              и с полной синхронизацией с телефона и компьютера
            </p>
          </div>

          <div className="welcome-feature">
            <div className="welcome-feature-icon mobile">
              <Smartphone size={24} />
            </div>
            <p>
              <strong>МИНИМУМ</strong> рекламы и <strong>МАКСИМУМ</strong> возможностей
            </p>
          </div>

          <div className="welcome-feature">
            <div className="welcome-feature-icon performance">
              <Zap size={24} />
            </div>
            <p>
              Быстрая загрузка, удобный интерфейс и постоянные обновления специально для вас
            </p>
          </div>
        </div>

        {/* Кнопка ОК */}
        <div className="welcome-modal-footer">
          <button className="welcome-ok-btn" onClick={onClose}>
            <Heart size={20} />
            Понятно, спасибо!
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeModal;
