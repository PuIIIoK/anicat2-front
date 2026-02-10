'use client';

import React from 'react';

const Footer: React.FC = () => {
    return (
        <footer className="footer">
            <div className="footer-wrapper">
                {/* Слева — Название и права */}
                <div className="footer-column left">
                    <p className="footer-logo">© 2024 - 2025 <strong>Yumeko</strong></p>
                    <p className="footer-sub">Все права защищены.</p>
                </div>

                {/* Центр — Описание */}
                <div className="footer-column center">
                    <p className="footer-description">
                        Мы предоставляем с собой аниме-социальную платформу<br />
                        для общения и просмотра аниме.
                    </p>
                    <p className="footer-warning">
                        Для правообладателей, требований что-то удалить, и прочим коммерческим, и юр вопросам —<br />
                        обращаться по контактам, указанным в тексте который находится справа.
                    </p>
                </div>

                {/* Справа — Контакты */}
                <div className="footer-column right">
                    <p><strong>Telegram канал сайта:</strong> <a href="https://t.me/yumekoani" target="_blank" rel="noopener noreferrer">@yumekoani</a></p>
                    <p><strong>Telegram чат сайта:</strong> <a href="https://t.me/+HrVCb-fysyk1ODBi" target="_blank" rel="noopener noreferrer">Присоединиться</a></p>
                    <p className="footer-support">
                        По всем вопросам обращайтесь в тех.поддержку сайта,<br />
                        либо на почту: <a href="mailto:puiiiokiq@ro.ru">puiiiokiq@ro.ru</a>, <a href="mailto:puiiiokiq@gmail.com">puiiiokiq@gmail.com</a>
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
