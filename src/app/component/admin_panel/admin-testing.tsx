'use client'

import React from 'react'
import Link from 'next/link'

const AdminTesting = () => {
    const testPages = [
        { name: 'Профиль', url: '/admin_panel/test' },
        { name: 'Коллекции', url: '/collections' },
        // сюда можно добавлять новые страницы
    ];

    return (
        <div className="admin-section admin-testing-container">
            {/* Десктопная версия */}
            <div className="desktop-only">
                <h2>Тестовые страницы</h2>
                <div className="testing-cards">
                    {testPages.map((page, idx) => (
                        <Link href={page.url} key={idx} className="testing-card">
                            <div className="testing-card-content">
                                <span className="testing-card-icon"></span>
                                <span className="testing-card-title">{page.name}</span>
                                <span className="testing-card-link">Открыть →</span>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Мобильная версия */}
            <div className="mobile-only">
                <div className="mobile-testing-list">
                    {testPages.map((page, idx) => (
                        <Link href={page.url} key={idx} className="mobile-testing-card">
                            <div className="mobile-testing-content">
                                <span className="mobile-testing-title">{page.name}</span>
                                <span className="mobile-testing-arrow">→</span>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AdminTesting;
