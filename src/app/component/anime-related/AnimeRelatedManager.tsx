'use client';

import React, { useState, useEffect } from 'react';
import { API_SERVER } from "../../../tools/constants";
import {
    Plus,
    Trash2,
    Save,
    X,
    Search,
    GripVertical,
    XCircle
} from 'lucide-react';

interface RelatedAnime {
    id: number;
    relatedAnimeId: number;
    relatedAnimeTitle: string;
    relatedAnimeAlttitle: string;
    orderIndex: number;
}

interface AnimeOption {
    id: number;
    title: string;
    alttitle: string;
    year: string;
    status: string;
}

interface SearchAnimeResult {
    id: number;
    title: string;
    alttitle?: string;
    year?: string;
    status?: string;
    type?: string;
    genres?: string;
    description?: string;
    current_episode?: string;
    episode_all?: string;
}

interface Props {
    animeId: number;
}

const getTokenFromCookie = () => {
    const match = document.cookie.match(/token=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
};


const AnimeRelatedManager: React.FC<Props> = ({ animeId }) => {
    const [relatedAnimes, setRelatedAnimes] = useState<RelatedAnime[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [animeOptions, setAnimeOptions] = useState<AnimeOption[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [searchTimeoutId, setSearchTimeoutId] = useState<NodeJS.Timeout | null>(null);

    // Новые данные для добавления/редактирования
    const [newRelated, setNewRelated] = useState({
        relatedAnimeId: 0,
        orderIndex: 1
    });

    useEffect(() => {
        loadRelatedAnimes();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [animeId]);

    const loadRelatedAnimes = async () => {
        try {
            const token = getTokenFromCookie();
            const response = await fetch(`${API_SERVER}/api/admin/related-animes/${animeId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const data = await response.json();
                setRelatedAnimes(data);
            }
        } catch (error) {
            console.error('Ошибка при загрузке связанных релизов:', error);
        } finally {
            setLoading(false);
        }
    };

    const performAnimeSearch = async (query: string) => {
        if (!query.trim()) {
            setAnimeOptions([]);
            setShowDropdown(false);
            return;
        }

        setIsSearching(true);

        try {
            const response = await fetch(`${API_SERVER}/api/anime/search?query=${encodeURIComponent(query)}`);
            
            if (response.ok) {
                const data = await response.json();
                const results = data.anime || data || [];
                
                // Фильтруем текущее аниме из результатов поиска
                const filteredResults = results.filter((anime: SearchAnimeResult) => anime.id !== animeId);
                
                // Преобразуем к нужному формату
                const animeOptions: AnimeOption[] = filteredResults.map((anime: SearchAnimeResult) => ({
                    id: anime.id,
                    title: anime.title,
                    alttitle: anime.alttitle || '',
                    year: anime.year || '',
                    status: anime.status || ''
                }));
                
                setAnimeOptions(animeOptions);
                setShowDropdown(true); // Всегда показываем dropdown после поиска
            } else {
                console.error('Failed to search anime');
                setAnimeOptions([]);
                setShowDropdown(false);
            }
        } catch (error) {
            console.error('Error searching anime:', error);
            setAnimeOptions([]);
            setShowDropdown(true); // Показываем dropdown с сообщением об ошибке
        } finally {
            setIsSearching(false);
        }
    };

    const handleSearchInputChange = (value: string) => {
        setSearchQuery(value);
        setNewRelated(prev => ({ ...prev, relatedAnimeId: 0 })); // Сбрасываем выбранное аниме при изменении поиска

        // Отменяем предыдущий таймер поиска
        if (searchTimeoutId) {
            clearTimeout(searchTimeoutId);
        }

        if (!value.trim()) {
            setAnimeOptions([]);
            setShowDropdown(false);
            setIsSearching(false);
            return;
        }

        // Устанавливаем задержку для debounce (1 секунда как на главной)
        const timeoutId = setTimeout(() => {
            performAnimeSearch(value.trim());
        }, 1000);
        
        setSearchTimeoutId(timeoutId);
    };

    const handleAddRelated = async () => {
        if (newRelated.relatedAnimeId === 0) {
            alert('Выберите аниме для добавления');
            return;
        }

        try {
            const token = getTokenFromCookie();
            const response = await fetch(`${API_SERVER}/api/admin/related-animes/${animeId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newRelated),
            });

            if (response.ok) {
                setIsAddingNew(false);
                setNewRelated({ relatedAnimeId: 0, orderIndex: 1 });
                setSearchQuery('');
                await loadRelatedAnimes();
            } else {
                alert('Ошибка при добавлении связанного релиза');
            }
        } catch (error) {
            console.error('Ошибка при добавлении:', error);
            alert('Ошибка при добавлении связанного релиза');
        }
    };

    const handleDeleteRelated = async (relatedId: number) => {
        if (!confirm('Удалить связанный релиз?')) return;

        try {
            const token = getTokenFromCookie();
            const response = await fetch(`${API_SERVER}/api/admin/related-animes/${relatedId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                await loadRelatedAnimes();
            } else {
                alert('Ошибка при удалении связанного релиза');
            }
        } catch (error) {
            console.error('Ошибка при удалении:', error);
            alert('Ошибка при удалении связанного релиза');
        }
    };

    const handleUpdateOrder = async (newOrder: RelatedAnime[]) => {
        const relatedIds = newOrder.map(item => item.id);
        
        try {
            const token = getTokenFromCookie();
            const response = await fetch(`${API_SERVER}/api/admin/related-animes/${animeId}/reorder`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(relatedIds),
            });

            if (response.ok) {
                setRelatedAnimes(newOrder);
            } else {
                alert('Ошибка при изменении порядка');
            }
        } catch (error) {
            console.error('Ошибка при изменении порядка:', error);
            alert('Ошибка при изменении порядка');
        }
    };

    // Drag & Drop handlers
    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, dropIndex: number) => {
        e.preventDefault();
        
        if (draggedIndex === null || draggedIndex === dropIndex) {
            setDraggedIndex(null);
            return;
        }

        const newOrder = [...relatedAnimes];
        const draggedItem = newOrder[draggedIndex];
        
        // Удаляем элемент из старой позиции
        newOrder.splice(draggedIndex, 1);
        // Вставляем на новую позицию
        newOrder.splice(dropIndex, 0, draggedItem);
        
        // Обновляем порядковые номера
        const updatedOrder = newOrder.map((item, index) => ({
            ...item,
            orderIndex: index + 1
        }));

        handleUpdateOrder(updatedOrder);
        setDraggedIndex(null);
    };

    // Очистка таймера при размонтировании компонента
    useEffect(() => {
        return () => {
            if (searchTimeoutId) {
                clearTimeout(searchTimeoutId);
            }
        };
    }, [searchTimeoutId]);

    const selectedAnime = animeOptions.find(anime => anime.id === newRelated.relatedAnimeId);

    if (loading) {
        return <div className="anime-related-loading">Загрузка связанных релизов...</div>;
    }

    return (
        <div className="anime-related-manager">
            <div className="section-header">
                <h3>Связанные релизы</h3>
                <button 
                    className="btn-add-related"
                    onClick={() => setIsAddingNew(true)}
                    disabled={isAddingNew}
                >
                    <Plus className="w-4 h-4" />
                    Добавить связанный релиз
                </button>
            </div>

            {/* Форма добавления нового связанного релиза */}
            {isAddingNew && (
                <div className="add-related-form">
                    <div className="form-row">
                        <div className="anime-search-container">
                            <label>Выберите аниме:</label>
                            <div className="search-dropdown">
                                <div className="search-input-container">
                                    <input
                                        type="text"
                                        placeholder="Поиск аниме..."
                                        value={searchQuery}
                                        onChange={(e) => handleSearchInputChange(e.target.value)}
                                        onFocus={() => {
                                            if (searchQuery.length > 0) {
                                                setShowDropdown(true);
                                            }
                                        }}
                                        onBlur={() => {
                                            // Задержка чтобы клик по элементу dropdown успел обработаться
                                            setTimeout(() => setShowDropdown(false), 200);
                                        }}
                                        className="search-input"
                                    />
                                    {searchQuery ? (
                                        <XCircle 
                                            className="search-icon clear-search-icon" 
                                            onClick={() => {
                                                setSearchQuery('');
                                                setAnimeOptions([]);
                                                setShowDropdown(false);
                                                setNewRelated(prev => ({ ...prev, relatedAnimeId: 0 }));
                                                if (searchTimeoutId) {
                                                    clearTimeout(searchTimeoutId);
                                                    setSearchTimeoutId(null);
                                                }
                                            }}
                                        />
                                    ) : (
                                        <Search className="search-icon" />
                                    )}
                                </div>
                                
                                {selectedAnime && (
                                    <div className="selected-anime">
                                        Выбрано: {selectedAnime.title} ({selectedAnime.year})
                                    </div>
                                )}

                                {isSearching && searchQuery && (
                                    <div className="dropdown-list">
                                        <div className="search-loader-container">
                                            <div className="search-spinner"></div>
                                            <p>Поиск аниме...</p>
                                        </div>
                                    </div>
                                )}
                                
                                {showDropdown && searchQuery && !isSearching && (
                                    <div className="dropdown-list">
                                        {animeOptions.length === 0 ? (
                                            <div className="dropdown-item no-results">
                                                <p>Аниме не найдено по запросу &ldquo;{searchQuery}&rdquo;</p>
                                            </div>
                                        ) : (
                                            animeOptions.slice(0, 8).map((anime) => (
                                                <div
                                                    key={anime.id}
                                                    className="dropdown-item anime-search-result"
                                                    onClick={() => {
                                                        setNewRelated({
                                                            ...newRelated,
                                                            relatedAnimeId: anime.id
                                                        });
                                                        setSearchQuery(anime.title);
                                                        setShowDropdown(false);
                                                    }}
                                                >
                                                    <div className="anime-details">
                                                        <div className="anime-header">
                                                            <div className="anime-title">{anime.title}</div>
                                                            {anime.alttitle && (
                                                                <div className="anime-alttitle">{anime.alttitle}</div>
                                                            )}
                                                        </div>
                                                        <div className="anime-meta">
                                                            <span className="anime-year">{anime.year}</span>
                                                            <span className="separator">•</span>
                                                            <span className="anime-status">{anime.status}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="form-actions">
                        <button className="btn-save" onClick={handleAddRelated}>
                            <Save className="w-4 h-4" />
                            Добавить
                        </button>
                        <button 
                            className="btn-cancel" 
                            onClick={() => {
                                setIsAddingNew(false);
                                setNewRelated({ relatedAnimeId: 0, orderIndex: 1 });
                                setSearchQuery('');
                                setAnimeOptions([]);
                                setShowDropdown(false);
                                if (searchTimeoutId) {
                                    clearTimeout(searchTimeoutId);
                                    setSearchTimeoutId(null);
                                }
                            }}
                        >
                            <X className="w-4 h-4" />
                            Отмена
                        </button>
                    </div>
                </div>
            )}

            {/* Список связанных релизов */}
            <div className="related-animes-list">
                {relatedAnimes.length === 0 ? (
                    <div className="no-related">
                        Связанные релизы не добавлены
                    </div>
                ) : (
                    relatedAnimes.map((related, index) => (
                        <div
                            key={related.id}
                            className={`related-item ${draggedIndex === index ? 'dragging' : ''}`}
                            draggable
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, index)}
                        >
                            <div className="drag-handle">
                                <GripVertical className="w-4 h-4" />
                            </div>
                            
                            <div className="related-info">
                                <div className="anime-title">{related.relatedAnimeTitle}</div>
                                {related.relatedAnimeAlttitle && (
                                    <div className="anime-alttitle">{related.relatedAnimeAlttitle}</div>
                                )}
                            </div>

                            <div className="order-indicator">#{related.orderIndex}</div>

                            <div className="item-actions">
                                <button
                                    className="btn-delete"
                                    onClick={() => handleDeleteRelated(related.id)}
                                    title="Удалить"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default AnimeRelatedManager;
