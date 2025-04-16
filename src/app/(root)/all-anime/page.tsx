'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

const AnimeListPage: React.FC = () => {
    return (
        <main className="anime-list">
            <div className="anime-list">
                <h1 className="anime-title">Все аниме</h1>
                <Link href="/anime-page" className="anime-title-card">
                    <Image
                        src="/anime-cover-default.jpg"
                        className="anime-thumbnail"
                        alt="Аниме"
                        width={200}
                        height={300}
                    />
                    <div className="anime-info">
                        <p className="anime-title-text">
                            Ангел по соседству
                            <br/>
                            <span className="season-text">[1 сезон]</span>
                        </p>
                        <p className="anime-title-text-no-season">Ангел по соседству</p>
                        <div className="anime-detailed-info">
                            <p className="anime-type">Тип: ТВ</p>
                            <p className="anime-episodes">Эпизоды: 12/12</p>
                            <p className="anime-genre">Жанр: Романтика, Повседневность</p>
                            <p className="anime-year">Год: 2024</p>
                        </div>
                        <p className="anime-hover-text">Смотреть</p>
                    </div>
                </Link>
            </div>
                {/* Добавьте дополнительные карточки аниме здесь */}
        </main>
);
};

export default AnimeListPage;
