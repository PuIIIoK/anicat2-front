'use client';

import React from 'react';
import '../styles/components/footer.scss';

const Footer: React.FC = () => {
    return (
        <footer className="footer">
            <div className="footer-wrapper">
                {/* Слева — Название и права */}
                <div className="footer-column left">
                    <p className="footer-logo">© 2024 - 2025 <strong>AniCat</strong></p>
                    <p className="footer-sub">Все права защищены.</p>
                </div>

                {/* Центр — Описание */}
                <div className="footer-column center">
                    <p className="footer-description">
                        Мы предоставляем с собой аниме-социальную платформу<br />
                        для общения и просмотра аниме.
                    </p>
                    <p className="footer-warning">
                        Для правообладателей, требований что-то удалить, и прочим коммерческим, и юр вопросам —<br/>
                        обращаться по контактам, указанным в тексте который находится справа.<br/>
                    </p>
                </div>

                {/* Справа — Контакты и реквизиты */}
                <div className="footer-column right">
                    <p><strong>ИП Воронюк Д.С</strong></p>
                    <p>ИНН: 345928800757</p>
                    <p>Telegram(по коммерчиским вопросам): <a href="https://t.me/puiiiok686" target="_blank">@puiiiok686</a></p>
                    <p>Telegram(по вопросам о работе сайта): <a href="https://t.me/dvaceW" target="_blank">@dvaceW</a></p>
                    <p>Почта: <a href="mailto:puiiiokiq@ro.ru">puiiiokiq@ro.ru</a></p>

                    {/* Новый блок веток */}
                    <div className="footer-branches">
                        Ветки сайта: <a href="/branches" className="footer-branches-link">посмотреть</a>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
