'use client';

import React from "react";

const ProfileRightBlock = () => (
    <div className="right-column">
        <div className="right-column">
            {/* Ачивки */}
            <div className="section currently-watching">
                <div className="currently-watching">
                    <h3>Currently Watching</h3>
                    <div className="watching-list">
                        <div className="watching-card">
                            <div className="cover-container">
                                <img src="/anime-cover-default.jpg" alt="Chainsaw Man" className="cover-img"/>
                            </div>
                            <div className="info">
                                <h4 className="title">Ангел по соседству [1 сезон]</h4>
                                <div className="progress-bar">
                                    <div className="progress-fill" style={{width: '66%'}}></div>
                                </div>
                                <p className="progress-text">Progress: 8 / 12</p>
                                <button className="watch-btn">▶ Continue Watching</button>
                            </div>
                        </div>
                        <div className="watching-card">
                            <div className="cover-container">
                                <img src="/anime-cover-default.jpg" alt="Chainsaw Man" className="cover-img"/>
                            </div>
                            <div className="info">
                                <h4 className="title">Мастера Меча Онлайн [1 сезон]</h4>
                                <div className="progress-bar">
                                    <div className="progress-fill" style={{width: '66%'}}></div>
                                </div>
                                <p className="progress-text">Progress: 8 / 12</p>
                                <button className="watch-btn">▶ Continue Watching</button>
                            </div>
                        </div>
                        <div className="watching-card">
                            <div className="cover-container">
                                <img src="/anime-cover-default.jpg" alt="Chainsaw Man" className="cover-img"/>
                            </div>
                            <div className="info">
                                <h4 className="title">Ванпис [1 сезон]</h4>
                                <div className="progress-bar">
                                    <div className="progress-fill" style={{width: '66%'}}></div>
                                </div>
                                <p className="progress-text">Progress: 8 / 12</p>
                                <button className="watch-btn">▶ Continue Watching</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="section recent-activity">
                <div className="header-activity">
                    <h3>Recent Activity</h3>
                </div>
                <ul className="activity-list">
                    <li className="activity-item">
                        <span className="icon">⭐</span>
                        <div className="activity-content">
                            <div className="text">Поставил оценку аниме <strong>«Ангел по
                                соседству»</strong> 8/10
                            </div>
                            <span className="timestamp">2 часа назад</span>
                        </div>
                    </li>
                    <li className="activity-item">
                        <span className="icon">🎬</span>
                        <div className="activity-content">
                            <div className="text">Просмотрел все серии аниме <strong>«Ангел по
                                соседству»</strong></div>
                            <span className="timestamp">Вчера</span>
                        </div>
                    </li>
                    <li className="activity-item tooltip-wrapper">
                        <span className="icon">🏅</span>
                        <div className="activity-content">
                            <div className="text achievement-name">
                                Получил ачивку <span className="highlight">«Храбрый рыцарь»</span>
                                <div className="tooltip">
                                    <strong>Описание:</strong> Посмотри 20 боевых аниме.<br/>
                                    <strong>Бонус:</strong> +10 к уровню
                                </div>
                            </div>
                            <span className="timestamp">2 дня назад</span>
                        </div>
                    </li>
                    <li className="activity-item">
                        <span className="icon">📌</span>
                        <div className="activity-content">
                            <div className="text">Добавил в
                                коллекцию <strong>«Запланировано»</strong> аниме <strong>«Ангел по
                                    соседству»</strong></div>
                            <span className="timestamp">3 дня назад</span>
                        </div>
                    </li>
                </ul>
            </div>

            <div className="section achievements-showcase">
                <div className="achievements-showcase">
                    <h3>Achievements Showcase</h3>
                    <div className="achievements-grid">
                        <div className="achievement uncommon">
                            <img src="https://cdn-icons-png.flaticon.com/512/6420/6420530.png"
                                 className="achievement-icon" alt="Mecha Master"/>
                            <p className="title">Mecha Master</p>
                            <div className="stars">★★</div>
                        </div>
                        <div className="achievement common">
                            <img src="https://cdn-icons-png.flaticon.com/512/6420/6420530.png"
                                 className="achievement-icon" alt="Mecha Master"/>
                            <p className="title">Shonen Specialist</p>
                            <div className="stars">★</div>
                        </div>
                        <div className="achievement rare">
                            <img src="https://cdn-icons-png.flaticon.com/512/6420/6420530.png"
                                 className="achievement-icon" alt="Mecha Master"/>
                            <p className="title">Romance Expert</p>
                            <div className="stars">★★★</div>
                        </div>
                        <div className="achievement epic">
                            <img src="https://cdn-icons-png.flaticon.com/512/6420/6420530.png"
                                 className="achievement-icon" alt="Mecha Master"/>
                            <p className="title">Horror Survivor</p>
                            <div className="stars">★★★★</div>
                        </div>
                        <div className="achievement legendary">
                            <img src="https://cdn-icons-png.flaticon.com/512/6420/6420530.png"
                                 className="achievement-icon" alt="Mecha Master"/>
                            <p className="title">Slice of Life Guru</p>
                            <div className="stars">★★★★★</div>
                        </div>
                        <div className="achievement common">
                            <img src="https://cdn-icons-png.flaticon.com/512/6420/6420530.png"
                                 className="achievement-icon" alt="Mecha Master"/>
                            <p className="title">Isekai Explorer</p>
                            <div className="stars">★</div>
                        </div>
                    </div>
                </div>
            </div>
            {/* Избранное аниме */}

            <div className="section favorite-anime">
                <div className="favorite-anime">
                    <div className="header-favorite">
                        <h3>Favorite Anime</h3>
                        <a href="#">View all</a>
                    </div>
                    <div className="anime-cards">
                        <div className="card">
                            <div className="tag">TV</div>
                            <img src="/anime-cover-default.jpg" alt="anime"/>
                            <p>Attack on Titan</p>
                        </div>
                        <div className="card">
                            <div className="tag">TV</div>
                            <img src="/anime-cover-default.jpg" alt="anime"/>
                            <p>Demon Slayer</p>
                        </div>
                        <div className="card">
                            <div className="tag">Movie</div>
                            <img src="/anime-cover-default.jpg" alt="anime"/>
                            <p>Your Name</p>
                        </div>
                        <div className="card">
                            <div className="tag">TV</div>
                            <img src="/anime-cover-default.jpg" alt="anime"/>
                            <p>Jujutsu Kaisen</p>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    </div>
);

export default ProfileRightBlock;
