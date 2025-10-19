'use client';
import React from 'react';
import { useTheme, Theme, ColorScheme } from '../context/ThemeContext';
import { X, Info, Sun, Moon, Palette } from 'lucide-react';
import '../styles/components/theme-modal.scss';

interface ThemeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ThemeModal: React.FC<ThemeModalProps> = ({ isOpen, onClose }) => {
  const { theme, colorScheme, setTheme, setColorScheme } = useTheme();
  
  React.useEffect(() => {
    console.log('Current theme:', theme, 'Current color scheme:', colorScheme);
  }, [theme, colorScheme]);

  if (!isOpen) return null;

  const themes: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: 'dark', label: 'Тёмная', icon: <Moon size={20} /> },
    { value: 'light', label: 'Светлая', icon: <Sun size={20} /> },
  ];

  const colorSchemes: { 
    value: ColorScheme; 
    label: string; 
    description: string;
    color: string;
    darkColor?: string;
    lightColor?: string;
  }[] = [
    { 
      value: 'orange', 
      label: 'Оранжевая', 
      description: 'В стиле Crunchyroll',
      color: '#ff9500',
      darkColor: '#ff9500',
      lightColor: '#ff7700'
    },
    { 
      value: 'purple', 
      label: 'Фиолетовая', 
      description: 'В стиле Animix',
      color: '#af52de',
      darkColor: '#af52de',
      lightColor: '#9030c0'
    },
    { 
      value: 'red', 
      label: 'Красная', 
      description: 'Яркая схема',
      color: '#ff3b30',
      darkColor: '#ff3b30',
      lightColor: '#e63025'
    },
    { 
      value: 'blue', 
      label: 'Синяя', 
      description: 'Классическая схема',
      color: '#007aff',
      darkColor: '#007aff',
      lightColor: '#0066dd'
    }
  ];

  return (
    <div className="theme-modal-overlay" onClick={onClose}>
      <div className="theme-modal" onClick={(e) => e.stopPropagation()}>
        <div className="theme-modal-header">
          <h2 className="theme-modal-title">
            <Palette size={24} />
            Настройки темы
          </h2>
          <button className="theme-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="theme-modal-content">
          {/* Примечание слева */}
          <div className="theme-modal-notice">
            <div className="notice-icon">
              <Info size={20} />
            </div>
            <div className="notice-content">
              <h3>Внимание!</h3>
              <p>
                Пока-что доступно несколько значений и функций, но в будущем дополнятся и будет больше цветовой схемы а так-же доп параметры кастомизации.
              </p>
            </div>
          </div>

          {/* Основной контент справа */}
          <div className="theme-modal-settings">
            {/* Выбор темы */}
            <div className="theme-section">
              <h3 className="section-title">Тема</h3>
              <div className="theme-options">
                {themes.map((themeOption) => (
                  <div
                    key={themeOption.value}
                    className={`theme-option ${theme === themeOption.value ? 'active' : ''}`}
                    onClick={() => setTheme(themeOption.value)}
                  >
                    <div className="theme-option-icon">
                      {themeOption.icon}
                    </div>
                    <span className="theme-option-label">{themeOption.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Выбор цветовой схемы */}
            <div className="color-section">
              <h3 className="section-title">Цветовая схема</h3>
              <div className="color-options">
                {colorSchemes.map((color) => (
                  <div key={color.value} className="color-option-wrapper">
                    <div
                      className={`color-option ${colorScheme === color.value ? 'active' : ''}`}
                      onClick={() => setColorScheme(color.value)}
                    >
                      <div 
                        className="color-preview" 
                        style={{ 
                          backgroundColor: theme === 'dark' ? 
                            (color.darkColor || color.color) : 
                            (color.lightColor || color.color)
                        }}
                      >
                        {colorScheme === color.value && (
                          <div className="color-check">✓</div>
                        )}
                      </div>
                    </div>
                    <div className="color-info">
                      <span className="color-name">{color.label}</span>
                      <span className="color-description">{color.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="theme-modal-footer">
          <button className="theme-modal-done" onClick={onClose}>
            Готово
          </button>
        </div>
      </div>
    </div>
  );
};

export default ThemeModal;
