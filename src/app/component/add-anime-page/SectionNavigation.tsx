'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Info, ChevronRight, Link } from 'lucide-react';

interface NavigationItem {
    id: string;
    label: string;
    icon: React.ReactNode;
}

const SectionNavigation: React.FC = () => {
    const [activeSection, setActiveSection] = useState<string>('');
    const [isVisible, setIsVisible] = useState(true);

    const navigationItems: NavigationItem[] = [
        {
            id: 'status-section',
            label: 'Статус и доступность',
            icon: <Settings className="w-4 h-4" />
        },
        {
            id: 'main-info-section', 
            label: 'Основная информация',
            icon: <Info className="w-4 h-4" />
        },
                {
                    id: 'franchise-chains-section',
                    label: 'Цепочки франшизы',
                    icon: <Link className="w-4 h-4" />
                }
    ];

    const scrollToSection = (sectionId: string) => {
        const element = document.getElementById(sectionId);
        if (element) {
            const headerOffset = 100; // Отступ от верха
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    };

    const checkActiveSection = () => {
        const sections = navigationItems.map(item => item.id);
        const headerOffset = 200;
        let currentActiveSection = '';
        
        // Определяем какая секция сейчас видна
        for (const sectionId of sections) {
            const element = document.getElementById(sectionId);
            if (element) {
                const rect = element.getBoundingClientRect();
                const isVisible = rect.top <= headerOffset && rect.bottom > 100;
                
                if (isVisible) {
                    currentActiveSection = sectionId;
                }
            }
        }
        
        // Если ни одна секция не активна, но мы в начале страницы, активируем первую
        if (!currentActiveSection && window.pageYOffset < 100) {
            currentActiveSection = sections[0] || '';
        }
        
        if (currentActiveSection) {
            setActiveSection(currentActiveSection);
        }
    };

    useEffect(() => {
        const handleScroll = () => {
            checkActiveSection();
        };

        // Проверяем при загрузке
        setTimeout(() => checkActiveSection(), 100);
        
        // Добавляем слушатель скролла
        window.addEventListener('scroll', handleScroll);
        
        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    console.log('🧭 Navigation render, isVisible:', isVisible, 'activeSection:', activeSection);

    return (
        <div className={`section-navigation ${!isVisible ? 'hidden' : ''}`}>
            <div className="navigation-header">
                <button 
                    className="toggle-nav"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('🔄 Toggle clicked!');
                        console.log('📍 Current state:', isVisible);
                        console.log('➡️ Setting to:', !isVisible);
                        const newState = !isVisible;
                        setIsVisible(newState);
                        console.log('✅ State set to:', newState);
                    }}
                    title={isVisible ? 'Скрыть навигацию' : 'Показать навигацию'}
                    type="button"
                    style={{ cursor: 'pointer' }}
                >
                    <ChevronRight className={`w-4 h-4 ${isVisible ? 'rotated' : ''}`} />
                </button>
                {isVisible && <span className="nav-title">Навигация</span>}
            </div>
            
            {isVisible && (
                <div className="navigation-content">
                    {navigationItems.map((item) => (
                        <button
                            key={item.id}
                            className={`nav-item ${activeSection === item.id ? 'active' : ''}`}
                            onClick={() => scrollToSection(item.id)}
                        >
                            <div className="nav-item-icon">
                                {item.icon}
                            </div>
                            <span className="nav-item-label">{item.label}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SectionNavigation;
