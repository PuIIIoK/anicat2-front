// src/app/page.tsx
'use client';

import React from 'react';

const PageWrapper: React.FC = () => {
    const services = [
        {
            title: "Обслуживание техники",
            description: "Комплексная чистка устройств, настройка и оптимизация.",
        },
        {
            title: "Ремонт техники",
            description: "Замена комплектующих, устранение аппаратных неисправностей.",
        },
        {
            title: "Установка программного обеспечения",
            description: "Установка и настройка ОС, драйверов и ПО.",
        },
        {
            title: "Консультации по эксплуатации",
            description: "Рекомендации по использованию техники и ПО.",
        },
    ];

    return (
        <div className="services-page">
            <h1 className="page-title">Что мы предоставляем?</h1>
            <ul className="services-list">
                {services.map((service, index) => (
                    <li className="service-item" key={index}>
                        <h2 className="service-title">{service.title}</h2>
                        <p className="service-description">{service.description}</p>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default PageWrapper;
