'use client';

import React, { useState, useEffect } from 'react';
import { API_SERVER } from '@/hosts/constants';
import '../../../app/styles/franchise-chains.scss';
import {
    Plus,
    Search,
    Trash2,
    X,
    Save,
    Link,
    Users,
    GripVertical,
    Star
} from 'lucide-react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface FranchiseChain {
    id: number;
    name: string;
    description: string;
    createdAt: string;
    updatedAt: string;
    animeCount: number;
}

interface AnimeInChain {
    id: number;
    title: string;
    alttitle?: string;
    year?: string;
    status?: string;
    current_episode?: string;
    episode_all?: string;
    rating?: string;
    position?: number; // Порядок в цепочке
}

interface ChainWithAnimes {
    franchiseChain: FranchiseChain;
    animes: AnimeInChain[];
}

interface Props {
    animeId: number;
}

const getTokenFromCookie = () => {
    const match = document.cookie.match(/token=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
};

// Компонент для сортируемого элемента аниме
interface SortableAnimeItemProps {
    anime: AnimeInChain;
    index: number;
    isCurrentAnime: boolean;
}

const SortableAnimeItem: React.FC<SortableAnimeItemProps> = ({ anime, index, isCurrentAnime }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: anime.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.8 : 1,
        zIndex: isDragging ? 1000 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`anime-item ${isDragging ? 'dragging' : ''} ${isCurrentAnime ? 'current' : ''}`}
            {...attributes}
        >
            <div className="drag-handle" {...listeners}>
                <GripVertical className="w-4 h-4" />
            </div>

            <div className="anime-order">
                {index + 1}.
            </div>

            <div className="anime-details">
                <div className="anime-title-row">
                    <div className="anime-title">
                        {anime.title}
                        {isCurrentAnime && (
                            <span className="current-marker">
                                <Star className="w-3 h-3 ml-2" />
                                ВЫ ТУТ
                            </span>
                        )}
                    </div>
                </div>
                {anime.alttitle && (
                    <div className="anime-alttitle">{anime.alttitle}</div>
                )}
                <div className="anime-meta">
                    {anime.year && <span className="anime-year">{anime.year}</span>}
                    {anime.status && (
                        <>
                            <span className="separator">•</span>
                            <span className="anime-status">{anime.status}</span>
                        </>
                    )}
                    {anime.current_episode && anime.episode_all && (
                        <>
                            <span className="separator">•</span>
                            <span className="episodes">
                                {anime.current_episode}/{anime.episode_all} эп.
                            </span>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

const FranchiseChainManager: React.FC<Props> = ({ animeId }) => {
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );
    const [currentChains, setCurrentChains] = useState<FranchiseChain[]>([]);
    const [chainsWithAnimes, setChainsWithAnimes] = useState<ChainWithAnimes[]>([]);
    const [allChains, setAllChains] = useState<FranchiseChain[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showAddToChainModal, setShowAddToChainModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isSearching, setIsSearching] = useState(false);
    
    // Состояние для создания новой цепочки
    const [newChain, setNewChain] = useState({
        name: '',
        description: ''
    });

    useEffect(() => {
        loadCurrentChains();
        loadAllChains();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [animeId]);

    const loadCurrentChains = async () => {
        setLoading(true);
        console.log('🔍 Загружаем цепочки для аниме ID:', animeId);
        
        try {
            const token = getTokenFromCookie();
            const response = await fetch(`${API_SERVER}/api/admin/anime/${animeId}/franchise-chains`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            console.log('📡 Ответ от сервера (цепочки аниме):', response.status);

            if (response.ok) {
                const data: FranchiseChain[] = await response.json();
                console.log('📋 Получены цепочки:', data);
                setCurrentChains(data);
                
                if (data.length === 0) {
                    console.log('⚠️ Аниме не состоит ни в одной цепочке');
                    setChainsWithAnimes([]);
                } else {
                    // Загружаем детали каждой цепочки
                    console.log('🔄 Загружаем детали цепочек...');
                    const chainsDetails = await Promise.all(
                        data.filter(chain => chain && chain.id).map(async (chain) => {
                            try {
                                console.log(`📡 Загружаем цепочку ${chain.name} (ID: ${chain.id})`);
                                const chainResponse = await fetch(`${API_SERVER}/api/anime/franchise-chain/${chain.id}`);
                                
                                if (chainResponse.ok) {
                                    const chainData: ChainWithAnimes = await chainResponse.json();
                                    console.log(`✅ Цепочка загружена:`, chainData);
                                    
                                    // Сортируем аниме по position
                                    if (chainData.animes && Array.isArray(chainData.animes)) {
                                        chainData.animes.sort((a, b) => {
                                            // Если у обоих есть position - сортируем по нему
                                            if (a.position !== undefined && b.position !== undefined) {
                                                return a.position - b.position;
                                            }
                                            // Если position есть только у одного - он идет первым
                                            if (a.position !== undefined) return -1;
                                            if (b.position !== undefined) return 1;
                                            // Если у обоих нет position - оставляем как есть
                                            return 0;
                                        });
                                        console.log(`🔄 Отсортированные аниме в цепочке ${chain.name}:`, 
                                            chainData.animes.map(a => ({ id: a.id, title: a.title, position: a.position }))
                                        );
                                    }
                                    
                                    return chainData;
                                } else {
                                    console.error(`❌ Ошибка загрузки цепочки ${chain.id}:`, chainResponse.status);
                                    return null;
                                }
                            } catch (error) {
                                console.error(`❌ Ошибка загрузки цепочки ${chain.id}:`, error);
                                return null;
                            }
                        })
                    );
                    
                    const validChains = chainsDetails.filter(Boolean) as ChainWithAnimes[];
                    console.log('✅ Финальный результат цепочек:', validChains);
                    setChainsWithAnimes(validChains);
                }
            } else {
                console.error('❌ Не удалось загрузить цепочки:', response.status);
                setCurrentChains([]);
                setChainsWithAnimes([]);
            }
        } catch (error) {
            console.error('❌ Ошибка при загрузке цепочек:', error);
            setCurrentChains([]);
            setChainsWithAnimes([]);
        } finally {
            setLoading(false);
        }
    };

    const loadAllChains = async () => {
        console.log('🔍 Загружаем ВСЕ цепочки...');
        try {
            const token = getTokenFromCookie();
            const response = await fetch(`${API_SERVER}/api/admin/franchise-chains`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const data: FranchiseChain[] = await response.json();
                console.log(`📋 Загружены все цепочки (${data.length} шт.):`, data);
                setAllChains(data || []);
            } else {
                console.error('❌ Ошибка загрузки всех цепочек:', response.status);
                setAllChains([]);
            }
        } catch (error) {
            console.error('❌ Исключение при загрузке всех цепочек:', error);
            setAllChains([]);
        }
    };

    const searchChains = async (query: string) => {
        if (!query.trim()) {
            // Если поиск очищен - загружаем все цепочки заново
            await loadAllChains();
            return;
        }

        setIsSearching(true);
        try {
            const token = getTokenFromCookie();
            const response = await fetch(`${API_SERVER}/api/admin/franchise-chains/search?query=${encodeURIComponent(query)}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const data: FranchiseChain[] = await response.json();
                console.log('🔍 Результаты поиска:', data);
                setAllChains(data || []);
            } else {
                console.error('Failed to search chains');
                setAllChains([]);
            }
        } catch (error) {
            console.error('Error searching chains:', error);
            setAllChains([]);
        } finally {
            setIsSearching(false);
        }
    };

    const createNewChain = async () => {
        if (!newChain.name.trim()) {
            alert('Введите название цепочки');
            return;
        }

        try {
            const token = getTokenFromCookie();
            
            const requestData = {
                name: newChain.name.trim(),
                description: newChain.description?.trim() || ''
            };
            
            console.log('📤 Отправка запроса на создание цепочки:', requestData);
            
            const response = await fetch(`${API_SERVER}/api/admin/franchise-chains`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData),
            });

            console.log('📥 Ответ сервера:', response.status, response.statusText);

            if (response.ok) {
                const createdChain: FranchiseChain = await response.json();
                console.log('✅ Цепочка создана:', createdChain);
                
                // Сразу добавляем текущее аниме в новую цепочку
                const addResponse = await fetch(`${API_SERVER}/api/admin/franchise-chains/${createdChain.id}/anime/${animeId}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });

                if (addResponse.ok) {
                    console.log('✅ Аниме добавлено в новую цепочку');
                } else {
                    console.error('❌ Ошибка добавления аниме в цепочку');
                    const errorText = await addResponse.text();
                    console.error('❌ Текст ошибки:', errorText);
                }
                
                setShowCreateModal(false);
                setNewChain({ name: '', description: '' });
                
                // Увеличенная задержка перед перезагрузкой данных
                console.log('⏳ Ожидание 500ms перед перезагрузкой данных...');
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Перезагружаем данные
                console.log('🔄 Перезагрузка данных цепочек...');
                await loadCurrentChains();
                await loadAllChains();
                
                // Дополнительная перезагрузка через 1 секунду для гарантии
                setTimeout(async () => {
                    console.log('🔄 Дополнительная перезагрузка данных...');
                    await loadCurrentChains();
                    await loadAllChains();
                    console.log('✅ Все данные перезагружены');
                }, 1000);
            } else {
                // Пытаемся получить текст ошибки
                let errorMessage = 'Неизвестная ошибка';
                try {
                    const errorText = await response.text();
                    if (errorText) {
                        errorMessage = errorText;
                    }
                } catch (e) {
                    console.error('Не удалось прочитать тело ответа:', e);
                }
                
                console.error('❌ Ошибка создания цепочки:', errorMessage);
                
                // Проверяем возможные причины ошибки
                if (response.status === 400) {
                    alert('Цепочка франшизы с таким названием уже существует или данные некорректны');
                } else {
                    alert(`Ошибка создания цепочки (${response.status}): ${errorMessage}`);
                }
            }
        } catch (error) {
            console.error('❌ Исключение при создании цепочки:', error);
            alert('Произошла ошибка при создании цепочки');
        }
    };

    const addToChain = async (chainId: number) => {
        try {
            const token = getTokenFromCookie();
            console.log(`📤 Добавление аниме ${animeId} в цепочку ${chainId}`);
            
            const response = await fetch(`${API_SERVER}/api/admin/franchise-chains/${chainId}/anime/${animeId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                console.log('✅ Аниме добавлено в цепочку');
                
                setShowAddToChainModal(false);
                setSearchQuery(''); // Очищаем поиск
                
                // Увеличенная задержка перед перезагрузкой данных
                console.log('⏳ Ожидание 500ms перед перезагрузкой данных...');
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Перезагружаем данные
                console.log('🔄 Перезагрузка данных после добавления в цепочку...');
                await loadCurrentChains();
                await loadAllChains();
                
                // Дополнительная перезагрузка через 1 секунду для гарантии
                setTimeout(async () => {
                    console.log('🔄 Дополнительная перезагрузка данных...');
                    await loadCurrentChains();
                    await loadAllChains();
                    console.log('✅ Все данные перезагружены');
                }, 1000);
            } else {
                const errorText = await response.text();
                console.error('❌ Ошибка добавления в цепочку:', errorText);
                alert(`Ошибка добавления в цепочку: ${errorText}`);
            }
        } catch (error) {
            console.error('❌ Исключение при добавлении в цепочку:', error);
            alert('Произошла ошибка при добавлении в цепочку');
        }
    };

    const removeFromChain = async (chainId: number) => {
        if (!confirm('Удалить аниме из этой цепочки франшизы?')) {
            return;
        }

        try {
            const token = getTokenFromCookie();
            const response = await fetch(`${API_SERVER}/api/admin/franchise-chains/${chainId}/anime/${animeId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                loadCurrentChains();
                loadAllChains(); // Обновляем список всех цепочек
            } else {
                const errorText = await response.text();
                alert(`Ошибка удаления из цепочки: ${errorText}`);
            }
        } catch (error) {
            console.error('Error removing from chain:', error);
            alert('Произошла ошибка при удалении из цепочки');
        }
    };

    const deleteChain = async (chainId: number, chainName: string) => {
        if (!confirm(`Удалить цепочку "${chainName}"? Это действие нельзя отменить.`)) {
            return;
        }

        try {
            const token = getTokenFromCookie();
            const response = await fetch(`${API_SERVER}/api/admin/franchise-chains/${chainId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                loadCurrentChains();
                loadAllChains(); // Обновляем список всех цепочек
            } else {
                const errorText = await response.text();
                alert(`Ошибка удаления цепочки: ${errorText}`);
            }
        } catch (error) {
            console.error('Error deleting chain:', error);
            alert('Произошла ошибка при удалении цепочки');
        }
    };

    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
        
        if (value.trim()) {
            searchChains(value);
        } else {
            loadAllChains();
        }
    };

    const handleDragEnd = async (event: DragEndEvent, chainId: number) => {
        const { active, over } = event;

        if (!over || active.id === over.id) {
            return;
        }

        const chainData = chainsWithAnimes.find(c => c.franchiseChain.id === chainId);
        if (!chainData) return;

        const items = chainData.animes;
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);

        if (oldIndex === -1 || newIndex === -1) return;

        const newItems = arrayMove(items, oldIndex, newIndex);
        
        // Обновляем position для каждого аниме в новом порядке
        const itemsWithUpdatedPositions = newItems.map((anime, index) => ({
            ...anime,
            position: index
        }));

        // Обновляем состояние сразу для плавности UI
        setChainsWithAnimes(prev => 
            prev.filter(chain => chain && chain.franchiseChain).map(chain => 
                chain.franchiseChain.id === chainId 
                    ? { ...chain, animes: itemsWithUpdatedPositions }
                    : chain
            )
        );
        
        console.log('🔄 Локально обновленный порядок:', itemsWithUpdatedPositions.map(a => ({ id: a.id, title: a.title, position: a.position })));

        // Отправляем новый порядок на сервер
        try {
            const animeIds = newItems.filter(anime => anime && anime.id).map(anime => anime.id);
            const token = getTokenFromCookie();
            
            console.log('🔄 Сохраняем новый порядок аниме в цепочке:', animeIds);
            
            const response = await fetch(`${API_SERVER}/api/admin/franchise-chains/${chainId}/reorder-anime`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(animeIds),
            });

            if (!response.ok) {
                console.error('❌ Ошибка сохранения порядка');
                // Откатываем изменения в случае ошибки
                loadCurrentChains();
            } else {
                console.log('✅ Порядок сохранен на сервере');
                // Перезагружаем данные с сервера для синхронизации position
                await loadCurrentChains();
                console.log('✅ Данные цепочек перезагружены с обновленными позициями');
            }
        } catch (error) {
            console.error('❌ Ошибка при сохранении порядка:', error);
            // Откатываем изменения в случае ошибки
            loadCurrentChains();
        }
    };


    // Показываем ВСЕ цепочки (не фильтруем)
    const availableChains = allChains.filter(chain => chain && chain.id);
    
    // Функция проверки, находится ли аниме уже в цепочке
    const isAnimeInChain = (chainId: number): boolean => {
        return currentChains.some(current => current && current.id === chainId);
    };
    
    // Debug logging
    useEffect(() => {
        console.log('🔍 Available chains:', availableChains.length);
        console.log('📦 All chains:', allChains.length);
        console.log('📌 Current chains:', currentChains.length);
        console.log('📋 Chains with animes:', chainsWithAnimes.length);
    }, [availableChains, allChains, currentChains, chainsWithAnimes]);

    return (
        <div className="franchise-chain-manager">
            <div className="section-header">
                <h3>
                    <Link className="w-5 h-5 mr-2" />
                    Цепочки франшизы
                </h3>
                <div className="header-actions">
                    <button 
                        className="btn-create-chain" 
                        onClick={() => setShowCreateModal(true)}
                        title="Создать новую цепочку"
                    >
                        <Plus className="w-4 h-4" />
                        Создать цепочку
                    </button>
                    <button 
                        className="btn-add-to-chain" 
                        onClick={async () => {
                            console.log('🔄 Подготовка к открытию модалки добавления в цепочку');
                            // Сначала загружаем данные
                            await loadAllChains();
                            await loadCurrentChains();
                            console.log('✅ Данные загружены, открываем модалку');
                            // Потом открываем модалку
                            setShowAddToChainModal(true);
                        }}
                        title="Добавить в существующую цепочку"
                    >
                        <Users className="w-4 h-4" />
                        Добавить в цепочку
                    </button>
                </div>
            </div>

            {/* Текущие цепочки с аниме */}
            <div className="current-chains">
                {loading ? (
                    <p className="loading-text">Загрузка цепочек...</p>
                ) : chainsWithAnimes.length === 0 ? (
                    <p className="empty-text">Аниме не состоит ни в одной цепочке франшизы</p>
                ) : (
                    chainsWithAnimes.filter(chainData => chainData && chainData.franchiseChain).map((chainData) => (
                        <div key={chainData.franchiseChain.id} className="franchise-chain-card">
                            <div className="chain-header">
                                <div className="chain-info">
                                    <div className="chain-name">
                                        <Link className="w-4 h-4 mr-2 text-blue-400" />
                                        {chainData.franchiseChain.name}
                                    </div>
                                    {chainData.franchiseChain.description && (
                                        <div className="chain-description">
                                            {chainData.franchiseChain.description}
                                        </div>
                                    )}
                                    <div className="chain-meta">
                                        <span className="anime-count">
                                            {chainData.animes.length} аниме
                                        </span>
                                        <span className="separator">•</span>
                                        <span className="created-date">
                                            Создано: {new Date(chainData.franchiseChain.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                                <div className="chain-actions">
                                    <button
                                        className="btn-remove"
                                        onClick={() => removeFromChain(chainData.franchiseChain.id)}
                                        title="Удалить аниме из цепочки"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                    <button
                                        className="btn-delete-chain"
                                        onClick={() => deleteChain(chainData.franchiseChain.id, chainData.franchiseChain.name)}
                                        title="Удалить цепочку"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Список аниме в цепочке */}
                            <div className="animes-in-chain">
                                <div className="animes-header">
                                    <h4>Аниме в цепочке:</h4>
                                </div>
                                
                                {chainData.animes && chainData.animes.length > 0 ? (
                                    <DndContext
                                        sensors={sensors}
                                        collisionDetection={closestCenter}
                                        onDragEnd={(event) => handleDragEnd(event, chainData.franchiseChain.id)}
                                    >
                                        <SortableContext
                                            items={chainData.animes.filter(anime => anime && anime.id).map(anime => anime.id)}
                                            strategy={verticalListSortingStrategy}
                                        >
                                            <div className="animes-list">
                                                {chainData.animes.filter(anime => anime && anime.id).map((anime, index) => (
                                                    <SortableAnimeItem
                                                        key={anime.id}
                                                        anime={anime}
                                                        index={index}
                                                        isCurrentAnime={anime.id === animeId}
                                                    />
                                                ))}
                                            </div>
                                        </SortableContext>
                                    </DndContext>
                                ) : (
                                    <p className="empty-text">Нет аниме в цепочке</p>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Модальное окно создания цепочки */}
            {showCreateModal && (
                <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Создать цепочку франшизы</h3>
                            <button 
                                className="modal-close"
                                onClick={() => setShowCreateModal(false)}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Название цепочки*</label>
                                <input
                                    type="text"
                                    value={newChain.name}
                                    onChange={(e) => setNewChain(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="Например: Attack on Titan"
                                    className="form-input"
                                />
                            </div>
                            
                            <div className="form-group">
                                <label>Описание (необязательно)</label>
                                <textarea
                                    value={newChain.description}
                                    onChange={(e) => setNewChain(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Краткое описание франшизы..."
                                    className="form-textarea"
                                    rows={3}
                                />
                            </div>
                        </div>
                        
                        <div className="modal-footer">
                            <button 
                                className="btn-save"
                                onClick={createNewChain}
                                disabled={!newChain.name.trim()}
                            >
                                <Save className="w-4 h-4" />
                                Создать и добавить аниме
                            </button>
                            <button 
                                className="btn-cancel"
                                onClick={() => setShowCreateModal(false)}
                            >
                                Отмена
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Модальное окно добавления в цепочку */}
            {showAddToChainModal && (
                <div className="modal-overlay" onClick={() => setShowAddToChainModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Добавить в цепочку франшизы</h3>
                            <button 
                                className="modal-close"
                                onClick={() => setShowAddToChainModal(false)}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="modal-body">
                            <div className="search-container">
                                <div className="search-input-container">
                                    <input
                                        type="text"
                                        placeholder="Поиск цепочек..."
                                        value={searchQuery}
                                        onChange={(e) => handleSearchChange(e.target.value)}
                                        className="search-input"
                                    />
                                    <Search className="search-icon" />
                                </div>
                                
                                {isSearching && (
                                    <div className="search-loading">Поиск...</div>
                                )}
                                
                                <div className="chains-list">
                                    {availableChains.length === 0 ? (
                                        <p className="empty-text">
                                            {searchQuery ? 'Цепочки не найдены' : 'Нет доступных цепочек. Создайте новую цепочку.'}
                                        </p>
                                    ) : (
                                        <div className="chains-scroll-container">
                                            {availableChains.filter(chain => chain && chain.id && chain.name).map((chain) => {
                                                const isAlreadyInChain = isAnimeInChain(chain.id);
                                                
                                                return (
                                                    <div 
                                                        key={chain.id} 
                                                        className={`chain-item selectable ${isAlreadyInChain ? 'disabled' : ''}`}
                                                        onClick={() => {
                                                            if (isAlreadyInChain) {
                                                                alert(`Аниме уже находится в цепочке "${chain.name}"`);
                                                                return;
                                                            }
                                                            console.log('🔄 Добавление в цепочку:', chain.name, chain.id);
                                                            addToChain(chain.id);
                                                        }}
                                                    >
                                                        <div className="chain-info">
                                                            <div className="chain-name">
                                                                <Link className="w-4 h-4 mr-2" />
                                                                {chain.name}
                                                                {isAlreadyInChain && (
                                                                    <span className="badge-added"> • Добавлено</span>
                                                                )}
                                                            </div>
                                                            {chain.description && (
                                                                <div className="chain-description">{chain.description}</div>
                                                            )}
                                                            <div className="chain-meta">
                                                                <span className="anime-count">
                                                                    {chain.animeCount || 0} аниме
                                                                </span>
                                                                <span className="separator">•</span>
                                                                <span className="created-date">
                                                                    Создано: {new Date(chain.createdAt).toLocaleDateString()}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        <div className="modal-footer">
                            <button 
                                className="btn-cancel"
                                onClick={() => setShowAddToChainModal(false)}
                            >
                                Закрыть
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FranchiseChainManager;