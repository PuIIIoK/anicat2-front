'use client';

import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { X, Plus, Upload, Trash2, CheckCircle, Clock, AlertCircle, Film, Mic, XCircle } from 'lucide-react';
import { API_SERVER } from '../../../tools/constants';
import { useYumekoUpload } from '../../context/YumekoUploadContext';
import './yumeko-video.scss';

interface Voice {
    id: number;
    name: string;
    voiceType: string;
    language: string;
    episodesCount: number;
}

interface Episode {
    id: number;
    episodeNumber: number;
    maxQuality: string;
    videoStatus: string;
    conversionProgress: number;
    screenshotPath?: string;
    durationSeconds?: number;
}

interface Props {
    animeId: number;
    onClose: () => void;
}

const getTokenFromCookie = () => {
    const match = document.cookie.match(/(?:^|; )token=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : null;
};

const YumekoVideoManager: React.FC<Props> = ({ animeId, onClose }) => {
    const { uploads, addUpload, updateUpload, removeUpload, setIsMinimized } = useYumekoUpload();
    const uploadXhrRef = useRef<Map<string, XMLHttpRequest>>(new Map()); // Для отмены загрузки по uploadId
    const trackingIntervalRef = useRef<Map<string, NodeJS.Timeout>>(new Map()); // Для отслеживания статуса по uploadId
    const episodeIdRef = useRef<Map<string, number>>(new Map()); // Для хранения episodeId по uploadId для отмены
    const cancelledRef = useRef<Map<string, boolean>>(new Map()); // Флаг отмены для каждого uploadId
    
    const [voices, setVoices] = useState<Voice[]>([]);
    const [selectedVoiceId, setSelectedVoiceId] = useState<number | null>(null);
    const [viewMode, setViewMode] = useState<'list' | 'voice'>('list'); // новый режим просмотра
    const [episodes, setEpisodes] = useState<Episode[]>([]);
    const [showAddVoice, setShowAddVoice] = useState(false);
    const [showAddEpisode, setShowAddEpisode] = useState(false);
    
    // Форма добавления озвучки
    const [newVoiceName, setNewVoiceName] = useState('');
    
    // Форма добавления эпизода
    const [newEpisodeNumber, setNewEpisodeNumber] = useState('');
    const [newEpisodeQuality, setNewEpisodeQuality] = useState('1080p');
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false); // Состояние для drag-n-drop

    useEffect(() => {
        loadVoices();
    }, [animeId]);

    useEffect(() => {
        // ВАЖНО: Сначала очищаем список эпизодов при переключении озвучки
        setEpisodes([]);
        
        if (selectedVoiceId) {
            loadEpisodes(selectedVoiceId);
            
            // Периодическое обновление списка для динамического отображения прогресса конвертации
            const refreshInterval = setInterval(() => {
                loadEpisodes(selectedVoiceId);
            }, 3000); // Обновляем каждые 3 секунды
            
            // Cleanup при размонтировании
            return () => {
                clearInterval(refreshInterval);
                // Очищаем все активные intervals трекинга
                trackingIntervalRef.current.forEach((interval) => {
                    clearInterval(interval);
                });
                trackingIntervalRef.current.clear();
            };
        }
        
        // Cleanup если озвучка не выбрана
        return () => {
            trackingIntervalRef.current.forEach((interval) => {
                clearInterval(interval);
            });
            trackingIntervalRef.current.clear();
        };
    }, [selectedVoiceId]);

    const loadVoices = async () => {
        try {
            const token = getTokenFromCookie();
            const res = await fetch(`${API_SERVER}/api/admin/yumeko/anime/${animeId}/voices`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setVoices(data);
            if (data.length > 0 && !selectedVoiceId) {
                setSelectedVoiceId(data[0].id);
            }
        } catch (error) {
            console.error('Ошибка загрузки озвучек:', error);
        }
    };

    const loadEpisodes = async (voiceId: number) => {
        try {
            const token = getTokenFromCookie();
            const res = await fetch(`${API_SERVER}/api/admin/yumeko/voices/${voiceId}/episodes`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setEpisodes(data);
            
            // Очищаем висящие загрузки, которых нет в БД
            const existingEpisodeIds = new Set(data.map((ep: Episode) => ep.id));
            
            uploads.forEach(upload => {
                // Проверяем только загрузки для текущей озвучки
                if (upload.episodeId > 0 && !existingEpisodeIds.has(upload.episodeId)) {
                    console.log('🧹 Очищаем висящую загрузку для несуществующего эпизода:', upload.episodeId);
                    
                    // Останавливаем трекинг
                    const currentInterval = trackingIntervalRef.current.get(upload.uploadId);
                    if (currentInterval) {
                        clearInterval(currentInterval);
                        trackingIntervalRef.current.delete(upload.uploadId);
                    }
                    
                    // Очищаем refs
                    cancelledRef.current.delete(upload.uploadId);
                    episodeIdRef.current.delete(upload.uploadId);
                    uploadXhrRef.current.delete(upload.uploadId);
                    
                    // Удаляем из контекста
                    removeUpload(upload.uploadId);
                }
            });
        } catch (error) {
            console.error('Ошибка загрузки эпизодов:', error);
        }
    };

    const handleCancelAddVoice = () => {
        setShowAddVoice(false);
        setNewVoiceName('');
    };

    const handleAddVoice = async () => {
        if (!newVoiceName.trim()) return;
        setShowAddVoice(false);
        
        try {
            const token = getTokenFromCookie();
            const res = await fetch(`${API_SERVER}/api/admin/yumeko/anime/${animeId}/voices`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: newVoiceName,
                    voiceType: 'dub',
                    language: 'ru'
                })
            });
            
            if (res.ok) {
                const newVoice = await res.json();
                setNewVoiceName('');
                await loadVoices();
                // Автоматически открываем созданную озвучку
                setSelectedVoiceId(newVoice.id);
                setViewMode('voice');
            } else {
                setShowAddVoice(true);
            }
        } catch (error) {
            console.error('Ошибка создания озвучки:', error);
        }
    };

    const handleDeleteVoice = async (voiceId: number) => {
        if (!confirm('Удалить озвучку и все её эпизоды?')) return;
        
        try {
            const token = getTokenFromCookie();
            await fetch(`${API_SERVER}/api/admin/yumeko/voices/${voiceId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            loadVoices();
            setSelectedVoiceId(null);
            setViewMode('list');
        } catch (error) {
            console.error('Ошибка удаления озвучки:', error);
        }
    };

    const handleSelectVoice = (voiceId: number) => {
        setSelectedVoiceId(voiceId);
        setViewMode('voice');
    };

    const handleBackToList = () => {
        setViewMode('list');
        setSelectedVoiceId(null);
        setShowAddEpisode(false);
    };

    const getSelectedVoice = () => {
        return voices.find(v => v.id === selectedVoiceId);
    };

    // Функция для подсчета загружающихся эпизодов для конкретной озвучки
    const getUploadingCountForVoice = (voiceName: string) => {
        return uploads.filter(u => 
            u.voiceName === voiceName && 
            (u.status === 'uploading' || u.status === 'converting')
        ).length;
    };

    const handleUploadEpisode = async () => {
        if (!selectedVoiceId || !newEpisodeNumber || !videoFile) return;
        
        const selectedVoice = getSelectedVoice();
        if (!selectedVoice) return;
        
        // Проверяем, не существует ли уже эпизод с таким номером
        const episodeNumberToUpload = parseInt(newEpisodeNumber);
        const existingEpisode = episodes.find(ep => ep.episodeNumber === episodeNumberToUpload);
        if (existingEpisode) {
            alert(`Эпизод ${episodeNumberToUpload} уже существует!`);
            return;
        }
        
        // НЕ блокируем форму - разрешаем загружать несколько эпизодов
        setShowAddEpisode(false);
        
        // Создаем уникальный ID для этой загрузки
        const uploadId = `${animeId}-${selectedVoiceId}-${episodeNumberToUpload}-${Date.now()}`;
        
        // Сохраняем параметры загрузки
        const qualityToUpload = newEpisodeQuality;
        const fileToUpload = videoFile;
        const voiceNameToUpload = selectedVoice.name;
        
        // Очищаем форму сразу
        setNewEpisodeNumber('');
        setNewEpisodeQuality('1080p');
        setVideoFile(null);
        
        try {
            const token = getTokenFromCookie();
            const formData = new FormData();
            formData.append('episodeNumber', episodeNumberToUpload.toString());
            formData.append('maxQuality', qualityToUpload);
            formData.append('video', fileToUpload);
            
            const xhr = new XMLHttpRequest();
            uploadXhrRef.current.set(uploadId, xhr); // Сохраняем xhr для возможности отмены
            
            // Функция отмены для этой конкретной загрузки
            const cancelUploadFn = async () => {
                console.log('🛑 Отмена загрузки:', uploadId);
                
                // Устанавливаем флаг отмены
                cancelledRef.current.set(uploadId, true);
                
                // СНАЧАЛА останавливаем все процессы
                // Отменяем загрузку файла
                const currentXhr = uploadXhrRef.current.get(uploadId);
                if (currentXhr) {
                    console.log('🛑 Отменяем XHR загрузку');
                    currentXhr.abort();
                    uploadXhrRef.current.delete(uploadId);
                }
                
                // Останавливаем трекинг статуса
                const currentInterval = trackingIntervalRef.current.get(uploadId);
                if (currentInterval) {
                    console.log('🛑 Останавливаем трекинг');
                    clearInterval(currentInterval);
                    trackingIntervalRef.current.delete(uploadId);
                }
                
                // Обновляем статус на отменено
                updateUpload(uploadId, {
                    step: 'Отменено',
                    progress: 0,
                    status: 'error',
                    errorMessage: 'Загрузка отменена пользователем'
                });
                
                // ПОТОМ проверяем и удаляем эпизод с бэкенда, если он был создан
                const episodeId = episodeIdRef.current.get(uploadId);
                if (episodeId && episodeId > 0) {
                    try {
                        console.log('🛑 Проверяем и удаляем эпизод:', episodeId);
                        const token = getTokenFromCookie();
                        
                        // Сначала проверяем, существует ли эпизод
                        const checkRes = await fetch(`${API_SERVER}/api/admin/yumeko/episodes/${episodeId}/status`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        
                        if (checkRes.ok) {
                            // Эпизод существует, удаляем его
                            console.log('🛑 Эпизод существует, удаляем');
                            const deleteRes = await fetch(`${API_SERVER}/api/admin/yumeko/episodes/${episodeId}`, {
                                method: 'DELETE',
                                headers: { 'Authorization': `Bearer ${token}` }
                            });
                            
                            if (deleteRes.ok) {
                                console.log('✅ Эпизод успешно удален');
                                // Обновляем список эпизодов после удаления
                                if (selectedVoiceId) {
                                    await loadEpisodes(selectedVoiceId);
                                    await loadVoices();
                                }
                            }
                        } else if (checkRes.status === 404) {
                            console.log('ℹ️ Эпизод уже удален или не существует');
                        }
                        
                        episodeIdRef.current.delete(uploadId);
                    } catch (error) {
                        console.error('❌ Ошибка при проверке/удалении эпизода:', error);
                        // Продолжаем даже если была ошибка
                    }
                } else {
                    console.log('ℹ️ Эпизод еще не был создан, пропускаем удаление');
                }
                
                // ВСЕГДА удаляем из контекста (закрывает модальное окно)
                console.log('🛑 Закрываем модальное окно');
                removeUpload(uploadId);
                
                // Очищаем флаг отмены
                cancelledRef.current.delete(uploadId);
                episodeIdRef.current.delete(uploadId);
            };
            
            // Добавляем новую загрузку в глобальный список
            addUpload({
                uploadId,
                episodeId: 0, // Будет обновлено после ответа сервера
                voiceName: voiceNameToUpload,
                episodeNumber: episodeNumberToUpload,
                animeId: animeId,
                quality: qualityToUpload,
                step: 'Загрузка видео на сервер...',
                progress: 0,
                status: 'uploading',
                onCancel: cancelUploadFn
            });
            
            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    const progress = Math.round((e.loaded / e.total) * 100);
                    updateUpload(uploadId, {
                        step: `Загрузка видео на сервер... ${progress}%`,
                        progress: progress * 0.15,
                        onCancel: cancelUploadFn
                    });
                }
            };
            
            xhr.onload = async () => {
                if (xhr.status === 200) {
                    const episode = JSON.parse(xhr.responseText);
                    
                    // Сохраняем episodeId в ref для возможности отмены
                    episodeIdRef.current.set(uploadId, episode.id);
                    
                    updateUpload(uploadId, {
                        episodeId: episode.id,
                        step: 'Получение видео...',
                        progress: 15
                    });
                    
                    // Сразу обновляем список эпизодов, чтобы показать новый
                    if (selectedVoiceId) {
                        await loadEpisodes(selectedVoiceId);
                    }
                    
                    // Начинаем отслеживать статус конвертации
                    await trackEpisodeStatus(uploadId, episode.id, voiceNameToUpload, episodeNumberToUpload, qualityToUpload, cancelUploadFn);
                    uploadXhrRef.current.delete(uploadId);
                } else {
                    console.error('Ошибка сервера:', xhr.status, xhr.responseText);
                    
                    let errorMessage = 'Ошибка сервера';
                    try {
                        const errorData = JSON.parse(xhr.responseText);
                        errorMessage = errorData.message || errorData.error || xhr.statusText;
                    } catch (e) {
                        errorMessage = xhr.responseText || xhr.statusText;
                    }
                    
                    // Если это ошибка дубликата, показываем специфичное сообщение
                    if (errorMessage.includes('уже существует') || errorMessage.includes('duplicate')) {
                        errorMessage = `Эпизод ${episodeNumberToUpload} уже существует для данной озвучки`;
                        alert(errorMessage);
                    }
                    
                    updateUpload(uploadId, {
                        step: 'Ошибка',
                        progress: 0,
                        status: 'error',
                        errorMessage: errorMessage
                    });
                    uploadXhrRef.current.delete(uploadId);
                }
            };
            
            xhr.onerror = () => {
                console.error('Ошибка загрузки видео');
                updateUpload(uploadId, {
                    step: 'Ошибка',
                    progress: 0,
                    status: 'error',
                    errorMessage: 'Ошибка загрузки видео'
                });
                uploadXhrRef.current.delete(uploadId);
            };
            
            xhr.onabort = () => {
                console.log('Загрузка отменена пользователем');
                uploadXhrRef.current.delete(uploadId);
            };
            
            xhr.open('POST', `${API_SERVER}/api/admin/yumeko/voices/${selectedVoiceId}/episodes`);
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            xhr.send(formData);
            
        } catch (error) {
            console.error('Ошибка загрузки эпизода:', error);
            updateUpload(uploadId, {
                step: 'Ошибка',
                progress: 0,
                status: 'error',
                errorMessage: 'Ошибка загрузки'
            });
        }
    };

    const trackEpisodeStatus = async (
        uploadId: string, 
        episodeId: number, 
        voiceName: string, 
        episodeNumber: number,
        quality: string,
        cancelFn: () => void
    ) => {
        const token = getTokenFromCookie();
        
        const checkStatus = async () => {
            try {
                const res = await fetch(`${API_SERVER}/api/admin/yumeko/episodes/${episodeId}/status`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (!res.ok) {
                    console.error('Ошибка получения статуса:', res.status);
                    if (res.status === 404) {
                        // Эпизод удален или не существует в БД
                        console.log('ℹ️ Эпизод не найден (404) в БД, удаляем загрузку');
                        
                        // Останавливаем трекинг
                        const currentInterval = trackingIntervalRef.current.get(uploadId);
                        if (currentInterval) {
                            clearInterval(currentInterval);
                            trackingIntervalRef.current.delete(uploadId);
                        }
                        
                        // Очищаем refs
                        cancelledRef.current.delete(uploadId);
                        episodeIdRef.current.delete(uploadId);
                        
                        // Удаляем из контекста (закрывает модалку)
                        removeUpload(uploadId);
                        
                        return true;
                    }
                    return false;
                }
                
                const episode = await res.json();
                console.log('📊 Статус эпизода:', episode.videoStatus, 'Прогресс:', episode.conversionProgress, 'Episode ID:', episodeId);
                
                // Проверяем, не была ли отменена загрузка
                if (cancelledRef.current.get(uploadId)) {
                    console.log('ℹ️ Загрузка отменена, игнорируем обновление статуса');
                    return true;
                }
                
                // Обновляем глобальное уведомление в зависимости от статуса
                switch (episode.videoStatus) {
                    case 'uploading':
                        updateUpload(uploadId, {
                            episodeId,
                            step: 'Получение видео...',
                            progress: 20,
                            status: 'uploading',
                            onCancel: cancelFn
                        });
                        
                        // Обновляем список эпизодов
                        if (selectedVoiceId) {
                            await loadEpisodes(selectedVoiceId);
                        }
                        
                        return false;
                        
                    case 'converting':
                        const progress = episode.conversionProgress || 0;
                        
                        // Всегда показываем конвертацию если статус "converting"
                        let step: string;
                        let totalProgress: number;
                        
                        if (progress === 0) {
                            step = 'Запуск конвертации в HLS формат...';
                            totalProgress = 35;
                        } else if (progress >= 99) {
                            // Финальная стадия - избегаем зависания на 100%
                            step = 'Финализация видео...';
                            totalProgress = 95;
                        } else {
                            step = `Конвертация видео... ${Math.round(progress)}%`;
                            // Конвертация занимает диапазон 35-95%
                            // При progress=100% -> totalProgress=95%
                            totalProgress = 35 + (progress * 0.6);
                        }
                        
                        updateUpload(uploadId, {
                            episodeId,
                            step,
                            progress: Math.min(95, totalProgress), // Ограничиваем до 95%
                            status: 'converting',
                            onCancel: cancelFn
                        });
                        
                        // Обновляем список эпизодов, чтобы показать прогресс конвертации
                        if (selectedVoiceId) {
                            await loadEpisodes(selectedVoiceId);
                        }
                        
                        return false;
                        
                    case 'ready':
                        console.log('✅ Эпизод готов! Завершаем трекинг для uploadId:', uploadId);
                        updateUpload(uploadId, {
                            episodeId,
                            step: 'Готово!',
                            progress: 100,
                            status: 'ready'
                        });
                        
                        if (selectedVoiceId) {
                            await loadEpisodes(selectedVoiceId);
                        }
                        return true; // Завершаем отслеживание (interval очистится в основной функции)
                        
                    case 'error':
                        updateUpload(uploadId, {
                            episodeId,
                            step: 'Ошибка',
                            progress: 0,
                            status: 'error',
                            errorMessage: episode.errorMessage || 'Неизвестная ошибка'
                        });
                        return true; // Завершаем отслеживание
                        
                    default:
                        console.log('⚠️ Неизвестный статус:', episode.videoStatus);
                        return false;
                }
            } catch (error) {
                console.error('❌ Ошибка проверки статуса для uploadId:', uploadId, 'episodeId:', episodeId, error);
                // Не завершаем трекинг при ошибке сети, продолжаем попытки
                return false;
            }
        };
        
        // Первый запрос сразу
        console.log('🔍 Начинаем трекинг для uploadId:', uploadId, 'episodeId:', episodeId);
        const initialDone = await checkStatus();
        if (initialDone) {
            console.log('✅ Трекинг завершен после первого запроса для uploadId:', uploadId);
            return;
        }
        
        // Затем проверяем статус каждые 1.5 секунды
        const interval = setInterval(async () => {
            // Проверяем флаг отмены
            if (cancelledRef.current.get(uploadId)) {
                console.log('ℹ️ Загрузка отменена, прекращаем трекинг для uploadId:', uploadId);
                clearInterval(interval);
                trackingIntervalRef.current.delete(uploadId);
                cancelledRef.current.delete(uploadId);
                return;
            }
            
            console.log('🔄 Проверяем статус эпизода (interval) для uploadId:', uploadId);
            const done = await checkStatus();
            if (done) {
                console.log('✅ Трекинг завершен для uploadId:', uploadId);
                clearInterval(interval);
                trackingIntervalRef.current.delete(uploadId);
                cancelledRef.current.delete(uploadId);
            }
        }, 1500);
        
        trackingIntervalRef.current.set(uploadId, interval);
        console.log('⏱️ Интервал установлен для uploadId:', uploadId);
    };

    // Drag-n-Drop обработчики
    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            const file = files[0];
            // Проверяем что это MP4 файл
            if (file.type === 'video/mp4' || file.name.toLowerCase().endsWith('.mp4')) {
                setVideoFile(file);
            } else {
                alert('Пожалуйста, выберите MP4 файл');
            }
        }
    };

    const handleDeleteEpisode = async (episodeId: number) => {
        if (!confirm('Удалить эпизод?')) return;
        
        try {
            // Находим все активные загрузки для этого эпизода
            const activeUploadsForEpisode = uploads.filter(u => u.episodeId === episodeId);
            
            // Останавливаем трекинг и удаляем из контекста для каждой загрузки
            activeUploadsForEpisode.forEach(upload => {
                // Останавливаем интервал трекинга
                const trackingInterval = trackingIntervalRef.current.get(upload.uploadId);
                if (trackingInterval) {
                    clearInterval(trackingInterval);
                    trackingIntervalRef.current.delete(upload.uploadId);
                }
                
                // Отменяем XHR загрузку если она еще идет
                const xhr = uploadXhrRef.current.get(upload.uploadId);
                if (xhr) {
                    xhr.abort();
                    uploadXhrRef.current.delete(upload.uploadId);
                }
                
                // Очищаем refs
                episodeIdRef.current.delete(upload.uploadId);
                cancelledRef.current.delete(upload.uploadId);
                
                // Удаляем из контекста (это закроет модальное окно)
                removeUpload(upload.uploadId);
            });
            
            const token = getTokenFromCookie();
            const res = await fetch(`${API_SERVER}/api/admin/yumeko/episodes/${episodeId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!res.ok) {
                throw new Error(`Ошибка удаления: ${res.status}`);
            }
            
            // Обновляем список эпизодов после успешного удаления
            if (selectedVoiceId) {
                await loadEpisodes(selectedVoiceId);
                // Обновляем список озвучек чтобы обновить счетчик эпизодов
                await loadVoices();
            }
        } catch (error) {
            console.error('Ошибка удаления эпизода:', error);
            alert('Не удалось удалить эпизод');
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'ready': return <CheckCircle className="status-icon success" />;
            case 'converting': return <Clock className="status-icon converting" />;
            case 'uploading': return <Upload className="status-icon uploading" />;
            case 'error': return <AlertCircle className="status-icon error" />;
            default: return <Clock className="status-icon" />;
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'ready': return 'Готово';
            case 'converting': return 'Конвертация...';
            case 'uploading': return 'Загрузка...';
            case 'error': return 'Ошибка';
            default: return status;
        }
    };

    // Рендерим модалку через Portal в body
    const selectedVoice = getSelectedVoice();
    
    const modalContent = (
        <div className="yumeko-modal-overlay" onClick={onClose}>
            <div className="yumeko-modal" onClick={(e) => e.stopPropagation()}>
                <div className="yumeko-modal-header">
                    {viewMode === 'list' ? (
                        <h2><Film /> Yumeko - Управление видео</h2>
                    ) : (
                        <>
                            <h2><Mic /> Озвучка: {selectedVoice?.name}</h2>
                            <button className="btn-back" onClick={handleBackToList}>
                                ← Назад к списку
                            </button>
                        </>
                    )}
                    <button className="close-btn" onClick={onClose}>
                        <X />
                    </button>
                </div>

                <div className="yumeko-modal-content">
                    {viewMode === 'list' ? (
                        /* Секция озвучек - список */
                        <div className="voices-section">
                            <div className="section-header">
                                <h3><Mic /> Озвучки</h3>
                                <button 
                                    className="btn-add-voice"
                                    onClick={() => setShowAddVoice(!showAddVoice)}
                                >
                                    <Plus size={16} /> Добавить озвучку
                                </button>
                            </div>

                            {showAddVoice && (
                                <div className="add-voice-form">
                                    <input
                                        type="text"
                                        placeholder="Название озвучки (например: AniLibria, AniDUB)"
                                        value={newVoiceName}
                                        onChange={(e) => setNewVoiceName(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleAddVoice()}
                                        autoFocus
                                    />
                                    <div className="form-buttons">
                                        <button className="btn-cancel" onClick={handleCancelAddVoice}>
                                            Отмена
                                        </button>
                                        <button className="btn-create" onClick={handleAddVoice}>
                                            Создать
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="voices-list">
                                {voices.map(voice => {
                                    const uploadingCount = getUploadingCountForVoice(voice.name);
                                    return (
                                        <div 
                                            key={voice.id}
                                            className="voice-card"
                                            onClick={() => handleSelectVoice(voice.id)}
                                        >
                                            <div className="voice-info">
                                                <div className="voice-name">{voice.name}</div>
                                                <div className="voice-meta">
                                                    {voice.episodesCount} {voice.episodesCount === 1 ? 'эпизод' : voice.episodesCount > 1 && voice.episodesCount < 5 ? 'эпизода' : 'эпизодов'}
                                                    {uploadingCount > 0 && (
                                                        <span className="uploading-indicator">
                                                            {' '}+ {uploadingCount} загружается
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                className="btn-delete-voice"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteVoice(voice.id);
                                                }}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    );
                                })}
                                {voices.length === 0 && (
                                    <div className="empty-message">
                                        Нет озвучек. Добавьте первую!
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        /* Секция эпизодов - просмотр озвучки */
                        selectedVoiceId && (
                            <div className="episodes-section">
                                <div className="section-header">
                                    <h3>{selectedVoice?.name}</h3>
                                    <button 
                                        className="btn-add-episode"
                                        onClick={() => setShowAddEpisode(!showAddEpisode)}
                                    >
                                        <Plus size={16} /> Добавить эпизод
                                    </button>
                                </div>
                                
                                <div className="episodes-subtitle">
                                    Список эпизодов:
                                    {selectedVoice && getUploadingCountForVoice(selectedVoice.name) > 0 && (
                                        <span className="uploading-indicator">
                                            {' '}({getUploadingCountForVoice(selectedVoice.name)} загружается)
                                        </span>
                                    )}
                                </div>

                            {showAddEpisode && (
                                <div className="add-episode-form">
                                    <div className="form-row">
                                        <input
                                            type="number"
                                            placeholder="Номер эпизода"
                                            value={newEpisodeNumber}
                                            onChange={(e) => setNewEpisodeNumber(e.target.value)}
                                            min="1"
                                        />
                                        <select value={newEpisodeQuality} onChange={(e) => setNewEpisodeQuality(e.target.value)}>
                                            <option value="1080p">1080p</option>
                                            <option value="1440p">2K (1440p)</option>
                                        </select>
                                    </div>
                                    <div 
                                        className={`file-upload-wrapper ${isDragging ? 'dragging' : ''}`}
                                        onDragEnter={handleDragEnter}
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onDrop={handleDrop}
                                    >
                                        <input
                                            type="file"
                                            accept=".mp4"
                                            onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                                            id="video-file-input"
                                            className="file-input"
                                        />
                                        <label htmlFor="video-file-input" className={`file-upload-label ${videoFile ? 'has-file' : ''}`}>
                                            <Upload size={20} />
                                            <span>{videoFile ? videoFile.name : isDragging ? 'Отпустите файл здесь' : 'Выберите или перетащите MP4 файл'}</span>
                                        </label>
                                        {videoFile && (
                                            <button 
                                                type="button"
                                                className="btn-clear-file"
                                                onClick={() => setVideoFile(null)}
                                                title="Очистить файл"
                                            >
                                                <XCircle size={20} />
                                            </button>
                                        )}
                                    </div>
                                    <div className="form-actions">
                                        <button 
                                            className="btn-cancel"
                                            onClick={() => {
                                                setShowAddEpisode(false);
                                                setNewEpisodeNumber('');
                                                setVideoFile(null);
                                            }}
                                        >
                                            Отмена
                                        </button>
                                        <button 
                                            className="btn-upload"
                                            onClick={handleUploadEpisode}
                                            disabled={!videoFile || !newEpisodeNumber}
                                        >
                                            <Upload size={16} />
                                            Загрузить эпизод
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="episodes-list">
                                {episodes.map(episode => (
                                    <div key={episode.id} className="episode-card">
                                        {episode.screenshotPath && (
                                            <div className="episode-thumbnail">
                                                <img 
                                                    src={`${API_SERVER}/api/video/screenshot/${episode.screenshotPath}`} 
                                                    alt={`Episode ${episode.episodeNumber}`}
                                                    onError={(e) => {
                                                        e.currentTarget.style.display = 'none';
                                                    }}
                                                />
                                            </div>
                                        )}
                                        <div className="episode-info">
                                            <h4>Эпизод {episode.episodeNumber}</h4>
                                            <div className="episode-meta">
                                                <span className="quality-badge">{episode.maxQuality}</span>
                                                {episode.durationSeconds && episode.durationSeconds > 0 && (
                                                    <span className="duration">
                                                        {Math.floor(episode.durationSeconds / 60)} мин {episode.durationSeconds % 60} сек
                                                    </span>
                                                )}
                                            </div>
                                            <div className="episode-status">
                                                {getStatusIcon(episode.videoStatus)}
                                                <span>{getStatusText(episode.videoStatus)}</span>
                                                {episode.videoStatus === 'converting' && episode.conversionProgress != null && (
                                                    <div className="conversion-progress">
                                                        <div className="mini-progress-bar">
                                                            <div 
                                                                className="mini-progress-fill" 
                                                                style={{ width: `${episode.conversionProgress}%` }}
                                                            />
                                                        </div>
                                                        <span>{episode.conversionProgress}%</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            className="btn-delete-episode"
                                            onClick={() => handleDeleteEpisode(episode.id)}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                                {episodes.length === 0 && (
                                    <div className="empty-state">
                                        Нет эпизодов. Загрузите первый!
                                    </div>
                                )}
                            </div>
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );

    // Используем Portal для рендера модалки в body
    if (typeof document === 'undefined') return null;
    
    return ReactDOM.createPortal(modalContent, document.body);
};

export default YumekoVideoManager;

