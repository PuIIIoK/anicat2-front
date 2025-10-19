'use client';

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { HelpCircle, X } from 'lucide-react';

const StatusFAQ: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [modalRoot, setModalRoot] = useState<HTMLElement | null>(null);

    // Создаем корень для портала
    useEffect(() => {
        const root = document.createElement('div');
        root.id = 'faq-modal-root';
        document.body.appendChild(root);
        setModalRoot(root);

        return () => {
            if (document.body.contains(root)) {
                document.body.removeChild(root);
            }
        };
    }, []);

    // Отключаем скролл при открытии модала
    useEffect(() => {
        if (isOpen) {
            // Сохраняем текущую позицию скролла
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            
            // Отключаем скролл
            document.body.style.overflow = 'hidden';
            document.body.style.position = 'fixed';
            document.body.style.top = `-${scrollTop}px`;
            document.body.style.width = '100%';
            
            return () => {
                // Восстанавливаем скролл
                const scrollTop = parseInt(document.body.style.top || '0') * -1;
                document.body.style.overflow = '';
                document.body.style.position = '';
                document.body.style.top = '';
                document.body.style.width = '';
                window.scrollTo(0, scrollTop);
            };
        }
    }, [isOpen]);

    // Закрытие по Escape
    useEffect(() => {
        if (isOpen) {
            const handleEscape = (e: KeyboardEvent) => {
                if (e.key === 'Escape') {
                    handleClose();
                }
            };

            document.addEventListener('keydown', handleEscape);
            return () => document.removeEventListener('keydown', handleEscape);
        }
    }, [isOpen]);

    const handleClose = () => {
        setIsOpen(false);
    };

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            handleClose();
        }
    };

    const modalContent = isOpen && modalRoot ? (
        <div className="faq-overlay" onClick={handleOverlayClick}>
            <div className="faq-modal" onClick={(e) => e.stopPropagation()}>
                <div className="faq-header">
                    <h3>Настройки доступности</h3>
                    <button
                        type="button"
                        className="faq-close"
                        onClick={handleClose}
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
                
                <div className="faq-content">
                    <div className="faq-item">
                        <h4>🔓 Открыто для просмотра</h4>
                        <p>
                            Определяет , открыто ли аниме для просмотра пользователям. Использывать данный тумблер , если аниме еще не вышло, или нету источников для просмотров.
                        </p>
                    </div>
                    
                    <div className="faq-item">
                        <h4>🚫 Заблокировано для просмотра</h4>
                        <p>
                            Показывает, есть ли географические ограничения для этого аниме.
                            Автоматически включается при указании заблокированных стран.
                            Это визуальный индикатор для удобства администрирования.
                        </p>
                    </div>
                    
                    <div className="faq-item">
                        <h4>🌍 Выбор стран</h4>
                        <p>
                            Позволяет указать страны, где аниме недоступно для просмотра
                            по лицензионным или другим ограничениям. Коды стран отправляются
                            на сервер для обработки доступности контента.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    ) : null;

    return (
        <>
            <button
                type="button"
                className="faq-trigger"
                onClick={() => setIsOpen(true)}
                title="Подробнее о настройках доступности"
            >
                <HelpCircle className="w-4 h-4" />
            </button>

            {modalContent && modalRoot && ReactDOM.createPortal(modalContent, modalRoot)}
        </>
    );
};

export default StatusFAQ;
