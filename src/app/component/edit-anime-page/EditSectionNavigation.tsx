'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Info, ChevronRight, Link } from 'lucide-react';

interface NavigationItem {
    id: string;
    label: string;
    icon: React.ReactNode;
}

const EditSectionNavigation: React.FC = () => {
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
            const headerOffset = 100;
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

        setTimeout(() => checkActiveSection(), 100);
        
        window.addEventListener('scroll', handleScroll);
        
        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    return (
        <div className={`section-navigation ${!isVisible ? 'hidden' : ''}`}>
            <div className="navigation-header">
                <button 
                    className="toggle-nav"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsVisible(!isVisible);
                    }}
                    title={isVisible ? 'Скрыть навигацию' : 'Показать навигацию'}
                    type="button"
                >
                    <ChevronRight className={`w-4 h-4 ${isVisible ? 'rotated' : ''}`} />
                </button>
                {isVisible && <span className="nav-title">Редактирование</span>}
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

export default EditSectionNavigation;