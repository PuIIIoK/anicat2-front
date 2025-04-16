'use client';

import React, {useEffect} from 'react';
import Image from 'next/image';

const FakeCollectionPage = () => {
    const tabs = ['Смотрю', 'Запланированно', 'Просмотренно', 'Отложено', 'Брошено'];
    const activeTab = 'Просмотренно';

    const fakeCollections = [
        {
            title: 'Магическая битва',
            rating: 9.3,
            image: '/anime-cover-default.jpg',
            labelColor: '#ffc107',
        },
        {
            title: 'Клятвенный поцелуй',
            rating: 6.8,
            image: '/anime-cover-default.jpg',
            labelColor: '#90caf9',
        },
        {
            title: 'Прощай, Армагеддон',
            rating: 6.7,
            image: '/anime-cover-default.jpg',
            labelColor: '#90caf9',
        },
        {
            title: 'Темнее чёрного',
            rating: 8.0,
            image: '/anime-cover-default.jpg',
            labelColor: '#f06292',
        },
        {
            title: 'Эльфийская песнь',
            rating: 7.5,
            image: '/anime-cover-default.jpg',
            labelColor: '#ff9800',
        },
    ];

    useEffect(() => {
        document.body.classList.add('no-scroll');
        return () => {
            document.body.classList.remove('no-scroll');
        };
    }, []);


    return (
        <div className="fake-collection-page">
            <div className="center-coming-soon">
                <h1>Скоро будет</h1>
                <p>На данный момент команда уже ими заниматься и в ближайшее время они появятся, пока без них(</p>
            </div>

            <div className="blur-background">
                {/* Таб меню */}
                <div className="collection-tabs">
                    {tabs.map((tab) => (
                        <button
                            key={tab}
                            className={`collection-tab ${tab === activeTab ? 'active' : ''}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Карточки */}
                <div className="collection-grid-fake">
                    {fakeCollections.map((anime, index) => (
                        <div key={index} className="anime-card-fake">
                            <Image
                                src={anime.image}
                                alt={anime.title}
                                width={200}
                                height={300}
                                className="anime-image"
                            />
                            <div className="anime-card-overlay">
                                <span className="rating-label" style={{ backgroundColor: anime.labelColor }}>
                                    ⭐ {anime.rating}
                                </span>
                                <h3 className="anime-title">{anime.title}</h3>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default FakeCollectionPage;
