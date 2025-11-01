'use client';

import React, { useState, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { 
    Globe, AlertTriangle, Settings, ChevronRight,
    Film, Languages, Star, Hash, Play, Tag, Tags,
    Calendar, CalendarDays, CalendarCheck, Building, FileText,
    Tv, Clapperboard, Disc3, Sparkles, Snowflake, Sun, 
    Flower2, Leaf, ChevronDown, Video
} from 'lucide-react';
import StatusFAQ from '../add-anime-page/StatusFAQ';
import CountrySelector from '../add-anime-page/CountrySelector';
import StatusToggle from '../add-anime-page/StatusToggle';
import YumekoVideoManager from '../yumeko-video/YumekoVideoManager';
import '../../styles/components/video-source-selector.scss';

interface Props {
    title: string;
    alttitle: string;
    rating: string;
    episodeAll: string;
    currentEpisode: string;
    type: string;
    status: string;
    genres: string;
    realesedFor: string;
    mouthSeason: string;
    season: string;
    year: string;
    studio: string;
    description: string;
    alias: string;
    kodik: string;
    animeId?: string | null;

    // новые пропсы
    opened?: boolean;
    anons?: string;
    countries?: string;
    zametka_blocked?: string;
    zametka?: string;
    onValidateBlocking?: (validator: () => void) => void;

    setTitle: (val: string) => void;
    setAlttitle: (val: string) => void;
    setRating: (val: string) => void;
    setEpisodeAll: (val: string) => void;
    setCurrentEpisode: (val: string) => void;
    setType: (val: string) => void;
    setStatus: (val: string) => void;
    setGenres: (val: string) => void;
    setRealesedFor: (val: string) => void;
    setMouthSeason: (val: string) => void;
    setSeason: (val: string) => void;
    setYear: (val: string) => void;
    setStudio: (val: string) => void;
    setDescription: (val: string) => void;
    setAlias: (val: string) => void;
    setKodik: (val: string) => void;

    setOpened?: (val: boolean) => void;
    setAnons?: (val: string) => void;
    setCountries?: (val: string) => void;
    setZametka_blocked?: (val: string) => void;
    setZametka?: (val: string) => void;
}

const AnimeMainInfo: React.FC<Props> = ({
                                            title, alttitle, rating, alias, kodik, episodeAll, currentEpisode,
                                            type, status, genres, realesedFor, mouthSeason,
                                            season, year, studio, description, animeId,
                                            opened = true, anons = '', countries = '', zametka_blocked = '', zametka = '', onValidateBlocking,
                                            setTitle, setAlttitle, setRating, setEpisodeAll, setCurrentEpisode,
                                            setType, setStatus, setGenres, setRealesedFor, setMouthSeason,
                                            setSeason, setYear, setStudio, setDescription, setAlias, setKodik,
                                            setOpened, setAnons, setCountries, setZametka_blocked, setZametka
                                        }) => {
    
    const [showBlockingModal, setShowBlockingModal] = useState(false);
    const [animeStatus, setAnimeStatus] = useState<'ongoing' | 'completed' | 'announce' | null>(null);
    const [showTypeDropdown, setShowTypeDropdown] = useState(false);
    const [showSeasonDropdown, setShowSeasonDropdown] = useState(false);
    const [typeDropdownPosition, setTypeDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
    const [seasonDropdownPosition, setSeasonDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
    const typeButtonRef = React.useRef<HTMLButtonElement>(null);
    const seasonButtonRef = React.useRef<HTMLButtonElement>(null);
    
    // Новое состояние для выбора источника видео
    const [videoSource, setVideoSource] = useState<'external' | 'yumeko'>('external');
    const [showYumekoModal, setShowYumekoModal] = useState(false);

    // Синхронизируем статус с переданным значением status
    React.useEffect(() => {
        if (status === 'Онгоинг') setAnimeStatus('ongoing');
        else if (status === 'Завершён') setAnimeStatus('completed');
        else if (status === 'Анонс') setAnimeStatus('announce');
        else setAnimeStatus(null);
    }, [status]);

    // Автоматически устанавливаем opened в зависимости от статуса
    React.useEffect(() => {
        if (setOpened) {
            if (animeStatus === 'ongoing' || animeStatus === 'completed') {
                setOpened(true);
            } else if (animeStatus === 'announce') {
                setOpened(false);
            }
        }
    }, [animeStatus, setOpened]);

    // Обработчик изменения статуса
    const handleStatusChange = (newStatus: 'ongoing' | 'completed' | 'announce') => {
        setAnimeStatus(newStatus);
        
        // Обновляем значение status для отправки на сервер
        if (newStatus === 'ongoing') setStatus('Онгоинг');
        else if (newStatus === 'completed') setStatus('Завершён');
        else if (newStatus === 'announce') setStatus('Анонс');
        
        // opened автоматически установится через useEffect выше
    };

    // Парсим выбранные страны из строки countries
    const selectedCountries = useMemo(() => {
        return countries.split(',')
            .map(c => c.trim().toUpperCase())
            .filter(c => c !== '');
    }, [countries]);

    // Определяем заблокировано ли аниме (есть ли выбранные страны)
    const hasCountries = selectedCountries.length > 0;
    
    // Обработчик закрытия модального окна
    const handleCloseBlockingModal = () => {
        setShowBlockingModal(false);
    };

    // Обработчик изменения выбора стран
    const handleCountriesChange = (newCountries: string[]) => {
        if (setCountries) {
            setCountries(newCountries.join(','));
        }
    };

    // Валидация - очищаем заметку при отсутствии стран
    const validateBlocking = React.useCallback(() => {
        if (!hasCountries && zametka_blocked && setZametka_blocked) {
            setZametka_blocked('');
        }
    }, [hasCountries, zametka_blocked, setZametka_blocked]);

    // Функции для позиционирования dropdown
    const updateDropdownPosition = (buttonRef: React.RefObject<HTMLButtonElement>) => {
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            return {
                top: rect.bottom + 4,
                left: rect.left,
                width: rect.width
            };
        }
        return { top: 0, left: 0, width: 0 };
    };

    const handleTypeDropdownToggle = () => {
        if (!showTypeDropdown) {
            const position = updateDropdownPosition(typeButtonRef);
            setTypeDropdownPosition(position);
        }
        setShowTypeDropdown(!showTypeDropdown);
        setShowSeasonDropdown(false);
    };

    const handleSeasonDropdownToggle = () => {
        if (!showSeasonDropdown) {
            const position = updateDropdownPosition(seasonButtonRef);
            setSeasonDropdownPosition(position);
        }
        setShowSeasonDropdown(!showSeasonDropdown);
        setShowTypeDropdown(false);
    };

    // Экспозируем функцию валидации наружу
    React.useEffect(() => {
        if (onValidateBlocking) {
            onValidateBlocking(validateBlocking);
        }
    }, [onValidateBlocking, validateBlocking]);

    // Отключаем скролл страницы при открытом модальном окне
    React.useEffect(() => {
        if (showBlockingModal) {
            document.body.style.overflow = 'hidden';
            document.body.style.position = 'fixed';
            document.body.style.width = '100%';
        } else {
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.width = '';
        }

        // Очистка при размонтировании
        return () => {
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.width = '';
        };
    }, [showBlockingModal]);

    // Создаем контейнер для модального окна
    React.useEffect(() => {
        const modalRoot = document.getElementById('blocking-modal-root');
        if (!modalRoot) {
            const div = document.createElement('div');
            div.id = 'blocking-modal-root';
            document.body.appendChild(div);
        }

        // Очистка при размонтировании компонента
        return () => {
            const modalRoot = document.getElementById('blocking-modal-root');
            if (modalRoot && modalRoot.children.length === 0) {
                document.body.removeChild(modalRoot);
            }
        };
    }, []);

    // Обработка клавиши Escape для закрытия модального окна
    React.useEffect(() => {
        const handleEscapeKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && showBlockingModal) {
                handleCloseBlockingModal();
            }
        };

        if (showBlockingModal) {
            document.addEventListener('keydown', handleEscapeKey);
        }

        return () => {
            document.removeEventListener('keydown', handleEscapeKey);
        };
    }, [showBlockingModal]);

    // Закрытие селектов при клике вне их
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Element;
            if (!target.closest('.custom-select') && !target.closest('.select-dropdown')) {
                setShowTypeDropdown(false);
                setShowSeasonDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Обновление позиции dropdown при скролле
    React.useEffect(() => {
        const handleScroll = () => {
            if (showTypeDropdown) {
                const position = updateDropdownPosition(typeButtonRef);
                setTypeDropdownPosition(position);
            }
            if (showSeasonDropdown) {
                const position = updateDropdownPosition(seasonButtonRef);
                setSeasonDropdownPosition(position);
            }
        };

        if (showTypeDropdown || showSeasonDropdown) {
            window.addEventListener('scroll', handleScroll);
            window.addEventListener('resize', handleScroll);
        }

        return () => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('resize', handleScroll);
        };
    }, [showTypeDropdown, showSeasonDropdown]);

    return (
        <>
            {/* Секция статуса и доступности */}
            <div id="status-section" className="content-section">
                <div className="section-title">
                    Статус и доступность
                    <StatusFAQ />
                </div>


                {/* Кликабельный статус блокировки */}
                {setCountries && setZametka_blocked && (
                    <div className="blocking-status">
                        <button 
                            type="button" 
                            className={`blocking-status-button ${hasCountries ? 'has-restrictions' : 'no-restrictions'}`}
                            onClick={() => setShowBlockingModal(true)}
                            title="Нажмите, чтобы настроить географические ограничения"
                        >
                            <div className="status-left">
                                <span className="status-icon">
                                    {hasCountries ? <AlertTriangle size={20} /> : <Globe size={20} />}
                                </span>
                                <div className="status-content">
                                    <span className="status-text">
                                        {hasCountries 
                                            ? 'Имеются ограничения для просмотра' 
                                            : 'Доступно для просмотра во всех регионах'
                                        }
                                    </span>
                                    <span className="status-subtitle">
                                        {hasCountries 
                                            ? `Заблокировано в ${selectedCountries.length} ${selectedCountries.length === 1 ? 'стране' : 'странах'}. Нажмите для изменения`
                                            : 'Нажмите для настройки ограничений по странам'
                                        }
                                    </span>
                                </div>
                            </div>
                            <div className="status-right">
                                <Settings size={16} className="settings-icon" />
                                <ChevronRight size={18} className="arrow-icon" />
                            </div>
                        </button>
                        {hasCountries && (
                            <div className="selected-countries-preview">
                                {selectedCountries.map((country) => (
                                    <span key={country} className="country-tag">
                                        {country}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Секция статуса выхода */}
                <div className="status-section">
                    <StatusToggle
                        selectedStatus={animeStatus}
                        onChange={handleStatusChange}
                    />
                </div>

                {/* Секция даты выхода (показывается только для анонсов) */}
                {setAnons && (
                    <div className={`release-date-section ${animeStatus === 'announce' ? 'expanded' : 'collapsed'}`}>
                        <h4 className="subsection-title">Дата выхода</h4>
                        <div className="form-grid">
                            <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                                <label>ДАТА ВЫХОДА (ЗАМЕТКА)</label>
                                <textarea
                                    value={anons}
                                    onChange={(e) => setAnons(e.target.value)}
                                    placeholder="Укажите дату выхода и дополнительную информацию (например: Январь 2025, Зима 2025, Q1 2025...)"
                                    rows={3}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Секция настроек плеера (показывается для онгоингов и завершенных) */}
                <div className={`player-settings-section ${opened ? 'expanded' : 'collapsed'}`}>
                    <h4 className="subsection-title">
                        Настройки плеера
                        {!opened && (
                            <span className="section-status">
                                (Доступно только для онгоингов и завершенных аниме)
                            </span>
                        )}
                    </h4>
                    
                    {/* Выбор источника видео */}
                    <div className="video-source-selector">
                        <label className="source-label">Источник видео</label>
                        <div className="source-options">
                            <button
                                type="button"
                                className={`source-option ${videoSource === 'external' ? 'active' : ''}`}
                                onClick={() => setVideoSource('external')}
                                disabled={!opened}
                            >
                                <Film size={20} />
                                <div>
                                    <div className="option-title">Сторонний источник</div>
                                    <div className="option-desc">Либрия, Кодик</div>
                                </div>
                            </button>
                            <button
                                type="button"
                                className={`source-option ${videoSource === 'yumeko' ? 'active' : ''}`}
                                onClick={() => setVideoSource('yumeko')}
                                disabled={!opened}
                            >
                                <Video size={20} />
                                <div>
                                    <div className="option-title">Yumeko</div>
                                    <div className="option-desc">Собственная система</div>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Настройки для стороннего источника */}
                    {videoSource === 'external' && (
                        <div className="form-grid">
                            <div className="form-field">
                                <label>Alias для плеера Anilibria*</label>
                                <input
                                    value={alias}
                                    onChange={(e) => setAlias(e.target.value)}
                                    placeholder="sousou-no-frieren"
                                    required
                                    disabled={!opened}
                                />
                            </div>

                            <div className="form-field">
                                <label>Название для плеера Kodik*</label>
                                <input
                                    value={kodik}
                                    onChange={(e) => setKodik(e.target.value)}
                                    placeholder="Фрирен [ТВ-1]"
                                    required
                                    disabled={!opened}
                                />
                            </div>
                        </div>
                    )}

                    {/* Кнопка для открытия Yumeko модалки */}
                    {videoSource === 'yumeko' && (
                        <div className="yumeko-section">
                            {animeId ? (
                                <button
                                    type="button"
                                    className="btn-yumeko-manage"
                                    onClick={() => setShowYumekoModal(true)}
                                    disabled={!opened}
                                >
                                    <Video size={20} />
                                    Управление видео Yumeko
                                </button>
                            ) : (
                                <div className="yumeko-info-box">
                                    <AlertTriangle size={20} />
                                    <p>Сначала сохраните аниме, чтобы загружать видео через Yumeko</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Модалка Yumeko */}
                {showYumekoModal && animeId && (
                    <YumekoVideoManager
                        animeId={parseInt(animeId)}
                        onClose={() => setShowYumekoModal(false)}
                    />
                )}

                {/* Модальное окно настройки блокировки через Portal */}
                {showBlockingModal && setCountries && setZametka_blocked && (() => {
                    const modalRoot = document.getElementById('blocking-modal-root');
                    if (!modalRoot) return null;

                    return ReactDOM.createPortal(
                        <div className="blocking-modal-overlay" onClick={handleCloseBlockingModal}>
                            <div className="blocking-modal" onClick={(e) => e.stopPropagation()}>
                                <div className="modal-header">
                                    <h3>Настройка географических ограничений</h3>
                                    <button 
                                        type="button" 
                                        className="modal-close-btn"
                                        onClick={handleCloseBlockingModal}
                                    >
                                        ×
                                    </button>
                                </div>
                                
                                <div className="modal-content">
                                    <div className="form-field">
                                        <label>Заблокированные страны</label>
                                        <CountrySelector
                                            selectedCountries={selectedCountries}
                                            onChange={handleCountriesChange}
                                        />
                                        <small className="field-hint">
                                            Выберите страны, где аниме будет недоступно для просмотра
                                        </small>
                                    </div>

                                    <div className="form-field">
                                        <label>Примечание к блокировке</label>
                    <textarea
                        value={zametka_blocked}
                        onChange={(e) => setZametka_blocked(e.target.value)}
                                            placeholder="Укажите причины блокировки (например: лицензионные ограничения, возрастные рейтинги, цензура и т.д.)"
                                            rows={4}
                                            className="modal-textarea"
                                        />
                                    </div>
                                </div>

                                <div className="modal-footer">
                                    <button 
                                        type="button" 
                                        className="btn-secondary"
                                        onClick={() => {
                                            setCountries('');
                                            setZametka_blocked('');
                                            setShowBlockingModal(false);
                                        }}
                                    >
                                        Очистить все
                                    </button>
                                    <button 
                                        type="button" 
                                        className="btn-primary"
                                        onClick={handleCloseBlockingModal}
                                    >
                                        Готово
                                    </button>
                                </div>
                            </div>
                        </div>,
                        modalRoot
                    );
                })()}

                {/* Дополнительная информация */}
                {setZametka && (
                    <div className="additional-info-section">
                        <div className="form-grid">
                            <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                                <label>Заметка к тайтлу</label>
                    <textarea
                        value={zametka}
                        onChange={(e) => setZametka(e.target.value)}
                                    placeholder="Важная информация или новости про аниме..."
                                    rows={3}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Секция основной информации */}
            <div id="main-info-section" className="content-section">
                <div className="section-title">
                    <Film size={20} />
                    Основная информация
                    <span className="section-subtitle">Заполните основные данные об аниме</span>
                </div>
                
                <div className="form-grid-enhanced">
                    {/* Основные названия */}
                    <div className="form-group-section">
                        <h4 className="form-group-title">
                            <Film size={16} />
                            Названия
                        </h4>
                        <div className="form-fields-row">
                            <div className="form-field-with-icon">
                                <div className="field-label">
                                    <Film size={16} />
                                    <label>Основное название*</label>
                                    <span className="field-hint">Главное название аниме</span>
                                </div>
                                <div className="input-wrapper">
                                    <input
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="Введите название аниме"
                                        required
                                        className={!title ? 'input-warning' : ''}
                                    />
                                    {!title && <span className="field-warning-text">⚠️ Обязательное поле</span>}
                                </div>
                            </div>

                            <div className="form-field-with-icon">
                                <div className="field-label">
                                    <Languages size={16} />
                                    <label>Альтернативное название</label>
                                    <span className="field-hint">Название на оригинальном языке</span>
                                </div>
                                <input
                                    value={alttitle}
                                    onChange={(e) => setAlttitle(e.target.value)}
                                    placeholder="例：進撃の巨人, Attack on Titan"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Основная классификация */}
                    <div className="form-group-section">
                        <h4 className="form-group-title">
                            <Tag size={16} />
                            Классификация
                        </h4>
                        <div className="form-fields-row">
                            <div className="form-field-with-icon">
                                <div className="field-label">
                                    <Star size={16} />
                                    <label>Возрастной рейтинг</label>
                                    <span className="field-hint">Минимальный возраст зрителей</span>
            </div>
                                <input
                                    value={rating}
                                    onChange={(e) => setRating(e.target.value)}
                                    placeholder="16+, 18+, PG-13"
                                />
            </div>

                            <div className="form-field-with-icon">
                                <div className="field-label">
                                    <Tag size={16} />
                                    <label>Тип</label>
                                    <span className="field-hint">Формат выпуска</span>
                                </div>
                                <div className="custom-select">
                                    <button 
                                        ref={typeButtonRef}
                                        type="button"
                                        className="select-trigger"
                                        onClick={handleTypeDropdownToggle}
                                    >
                                        <div className="select-value">
                                            {type ? (
                                                <div className="selected-option">
                                                    {type === 'TV' && <Tv size={16} />}
                                                    {type === 'Фильм' && <Clapperboard size={16} />}
                                                    {type === 'OVA' && <Disc3 size={16} />}
                                                    {type === 'Спин-офф' && <Sparkles size={16} />}
                                                    <span>{type === 'TV' ? 'TV Сериал' : type}</span>
                                                </div>
                                            ) : (
                                                <span className="placeholder">Выберите тип</span>
                                            )}
                                        </div>
                                        <ChevronDown size={16} className={`chevron ${showTypeDropdown ? 'open' : ''}`} />
                                    </button>
                                </div>

                                {/* Портал для dropdown */}
                                {showTypeDropdown && (() => {
                                    const dropdownRoot = document.getElementById('dropdown-root') || (() => {
                                        const div = document.createElement('div');
                                        div.id = 'dropdown-root';
                                        document.body.appendChild(div);
                                        return div;
                                    })();

                                    return ReactDOM.createPortal(
                                        <div 
                                            className="select-dropdown"
                                            style={{
                                                top: `${typeDropdownPosition.top}px`,
                                                left: `${typeDropdownPosition.left}px`,
                                                width: `${typeDropdownPosition.width}px`
                                            }}
                                        >
                                            <div 
                                                className="select-option"
                                                onClick={() => { setType('TV'); setShowTypeDropdown(false); }}
                                            >
                                                <Tv size={16} />
                                                <span>TV Сериал</span>
                                            </div>
                                            <div 
                                                className="select-option"
                                                onClick={() => { setType('Фильм'); setShowTypeDropdown(false); }}
                                            >
                                                <Clapperboard size={16} />
                                                <span>Фильм</span>
                                            </div>
                                            <div 
                                                className="select-option"
                                                onClick={() => { setType('OVA'); setShowTypeDropdown(false); }}
                                            >
                                                <Disc3 size={16} />
                                                <span>OVA</span>
                                            </div>
                                            <div 
                                                className="select-option"
                                                onClick={() => { setType('Спин-офф'); setShowTypeDropdown(false); }}
                                            >
                                                <Sparkles size={16} />
                                                <span>Спин-офф</span>
                                            </div>
                                        </div>,
                                        dropdownRoot
                                    );
                                })()}
                            </div>
                        </div>
                    </div>

                    {/* Эпизоды */}
                    <div className="form-group-section">
                        <h4 className="form-group-title">
                            <Play size={16} />
                            Эпизоды
                        </h4>
                        <div className="form-fields-row">
                            <div className="form-field-with-icon">
                                <div className="field-label">
                                    <Play size={16} />
                                    <label>Текущий эпизод</label>
                                    <span className="field-hint">Какой эпизод последний вышел</span>
                                </div>
                                <input
                                    type="number"
                                    value={currentEpisode}
                                    onChange={(e) => setCurrentEpisode(e.target.value)}
                                    placeholder="1"
                                    min="0"
                                />
                            </div>

                            <div className="form-field-with-icon">
                                <div className="field-label">
                                    <Hash size={16} />
                                    <label>Всего эпизодов</label>
                                    <span className="field-hint">Планируемое общее количество</span>
                                </div>
                                <input
                                    type="number"
                                    value={episodeAll}
                                    onChange={(e) => setEpisodeAll(e.target.value)}
                                    placeholder="12"
                                    min="1"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Дата и время */}
                    <div className="form-group-section">
                        <h4 className="form-group-title">
                            <CalendarCheck size={16} />
                            Дата выхода
                        </h4>
                        <div className="form-fields-row">
                            <div className="form-field-with-icon">
                                <div className="field-label">
                                    <CalendarCheck size={16} />
                                    <label>Год</label>
                                    <span className="field-hint">Год начала показа</span>
                                </div>
                                <input
                                    type="number"
                                    value={year}
                                    onChange={(e) => setYear(e.target.value)}
                                    placeholder="2024"
                                    min="1960"
                                    max="2030"
                                />
                            </div>

                            <div className="form-field-with-icon">
                                <div className="field-label">
                                    <Calendar size={16} />
                                    <label>{type === 'Фильм' ? 'Часть (номер)' : 'Сезон (номер)'}</label>
                                    <span className="field-hint">
                                        {type === 'Фильм' 
                                            ? 'Какая по счету часть фильма' 
                                            : 'Какой по счету сезон'}
                                    </span>
                                </div>
                                <input
                                    type="number"
                                    value={season}
                                    onChange={(e) => setSeason(e.target.value)}
                                    placeholder="1"
                                    min="1"
                                />
                            </div>

                            <div className="form-field-with-icon">
                                <div className="field-label">
                                    <CalendarDays size={16} />
                                    <label>Сезон года</label>
                                    <span className="field-hint">Время года показа</span>
                                </div>
                                <div className="custom-select">
                                    <button 
                                        ref={seasonButtonRef}
                                        type="button"
                                        className="select-trigger"
                                        onClick={handleSeasonDropdownToggle}
                                    >
                                        <div className="select-value">
                                            {mouthSeason ? (
                                                <div className="selected-option">
                                                    {mouthSeason === 'Зима' && <Snowflake size={16} />}
                                                    {mouthSeason === 'Весна' && <Flower2 size={16} />}
                                                    {mouthSeason === 'Лето' && <Sun size={16} />}
                                                    {mouthSeason === 'Осень' && <Leaf size={16} />}
                                                    <span>{mouthSeason}</span>
                                                </div>
                                            ) : (
                                                <span className="placeholder">Выберите сезон</span>
                                            )}
                                        </div>
                                        <ChevronDown size={16} className={`chevron ${showSeasonDropdown ? 'open' : ''}`} />
                                    </button>
                                </div>

                                {/* Портал для dropdown сезона */}
                                {showSeasonDropdown && (() => {
                                    const dropdownRoot = document.getElementById('dropdown-root') || (() => {
                                        const div = document.createElement('div');
                                        div.id = 'dropdown-root';
                                        document.body.appendChild(div);
                                        return div;
                                    })();

                                    return ReactDOM.createPortal(
                                        <div 
                                            className="select-dropdown"
                                            style={{
                                                top: `${seasonDropdownPosition.top}px`,
                                                left: `${seasonDropdownPosition.left}px`,
                                                width: `${seasonDropdownPosition.width}px`
                                            }}
                                        >
                                            <div 
                                                className="select-option"
                                                onClick={() => { setMouthSeason('Зима'); setShowSeasonDropdown(false); }}
                                            >
                                                <Snowflake size={16} />
                                                <span>Зима</span>
                                            </div>
                                            <div 
                                                className="select-option"
                                                onClick={() => { setMouthSeason('Весна'); setShowSeasonDropdown(false); }}
                                            >
                                                <Flower2 size={16} />
                                                <span>Весна</span>
                                            </div>
                                            <div 
                                                className="select-option"
                                                onClick={() => { setMouthSeason('Лето'); setShowSeasonDropdown(false); }}
                                            >
                                                <Sun size={16} />
                                                <span>Лето</span>
                                            </div>
                                            <div 
                                                className="select-option"
                                                onClick={() => { setMouthSeason('Осень'); setShowSeasonDropdown(false); }}
                                            >
                                                <Leaf size={16} />
                                                <span>Осень</span>
                                            </div>
                                        </div>,
                                        dropdownRoot
                                    );
                                })()}
                            </div>
                        </div>
                    </div>

                    {/* Производство */}
                    <div className="form-group-section">
                        <h4 className="form-group-title">
                            <Building size={16} />
                            Производство
                        </h4>
                        <div className="form-fields-row">
                            <div className="form-field-with-icon">
                                <div className="field-label">
                                    <Building size={16} />
                                    <label>Студия</label>
                                    <span className="field-hint">Анимационная студия</span>
                                </div>
                                <input
                                    value={studio}
                                    onChange={(e) => setStudio(e.target.value)}
                                    placeholder="Mappa, Toei Animation, Studio Pierrot"
                                />
                            </div>

                            <div className="form-field-with-icon">
                                <div className="field-label">
                                    <Film size={16} />
                                    <label>Снято по</label>
                                    <span className="field-hint">Источник адаптации</span>
                                </div>
                                <input
                                    value={realesedFor}
                                    onChange={(e) => setRealesedFor(e.target.value)}
                                    placeholder="Манге, ранобэ, игре, оригинальный сценарий"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Жанры */}
                    <div className="form-group-section full-width">
                        <h4 className="form-group-title">
                            <Tags size={16} />
                            Жанры
                        </h4>
                        <div className="form-field-with-icon">
                            <div className="field-label">
                                <Tags size={16} />
                                <label>Жанры</label>
                                <span className="field-hint">Основные жанры через запятую</span>
                            </div>
                            <input
                                value={genres}
                                onChange={(e) => setGenres(e.target.value)}
                                placeholder="Фэнтези, Приключения, Драма, Комедия, Романтика"
                                className="tags-input"
                            />
                        </div>
            </div>

                    {/* Описание */}
                    <div className="form-group-section full-width">
                        <h4 className="form-group-title">
                            <FileText size={16} />
                            Описание
                        </h4>
                        <div className="form-field-with-icon">
                            <div className="field-label">
                                <FileText size={16} />
                                <label>Описание сюжета</label>
                                <span className="field-hint">Краткий пересказ сюжета без спойлеров</span>
                            </div>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Опишите основную идею и сюжет аниме. Что происходит с главными героями? В каком мире разворачиваются события?"
                                rows={4}
                                className="description-textarea"
                            />
                        </div>
                    </div>
            </div>
        </div>
        </>
    );
};

export default AnimeMainInfo;
