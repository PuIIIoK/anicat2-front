'use client';

import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { X, Plus, Upload, Trash2, CheckCircle, Clock, AlertCircle, Film, Mic, XCircle, RefreshCw, Edit2, Check, Users } from 'lucide-react';
import { SERVER_URL2 } from '@/hosts/constants';
import { useYumekoUpload } from '../../context/YumekoUploadContext';
import UploadQueueViewer from './UploadQueueViewer';
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

// Тип для задачи в очереди конвертации
interface ConversionTask {
    uploadId: string;
    episodeId: number;
    voiceName: string;
    episodeNumber: number;
    quality: string;
}

const YumekoVideoManager: React.FC<Props> = ({ animeId, onClose }) => {
    const { uploads, addUpload, updateUpload, removeUpload } = useYumekoUpload();
    const uploadXhrRef = useRef<Map<string, XMLHttpRequest>>(new Map()); // Для отмены загрузки по uploadId
    const trackingIntervalRef = useRef<Map<string, NodeJS.Timeout>>(new Map()); // Для отслеживания статуса по uploadId
    const episodeIdRef = useRef<Map<string, number>>(new Map()); // Для хранения episodeId по uploadId для отмены
    const cancelledRef = useRef<Map<string, boolean>>(new Map()); // Флаг отмены для каждого uploadId
    
    // Очередь конвертации (только для конвертации, загрузка идет параллельно)
    const conversionQueueRef = useRef<ConversionTask[]>([]);
    const isConvertingRef = useRef<boolean>(false);
    
    const [voices, setVoices] = useState<Voice[]>([]);
    const [selectedVoiceId, setSelectedVoiceId] = useState<number | null>(null);
    const [viewMode, setViewMode] = useState<'list' | 'voice' | 'queue'>('list'); // режим просмотра + очередь
    const [episodes, setEpisodes] = useState<Episode[]>([]);
    const [showAddVoice, setShowAddVoice] = useState(false);
    const [showAddEpisode, setShowAddEpisode] = useState(false);
    
    // Форма добавления озвучки
    const [newVoiceName, setNewVoiceName] = useState('');
    
    // Форма редактирования озвучки
    const [editingVoiceId, setEditingVoiceId] = useState<number | null>(null);
    const [editVoiceName, setEditVoiceName] = useState('');
    
    // Форма добавления эпизода
    const [newEpisodeNumber, setNewEpisodeNumber] = useState('');
    const [newEpisodeQuality, setNewEpisodeQuality] = useState('1080p');
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false); // Состояние для drag-n-drop

    useEffect(() => {
        loadVoices();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [animeId]);

    useEffect(() => {
        // ВАЖНО: Сначала очищаем список эпизодов при переключении озвучки
        setEpisodes([]);
        
        // Сохраняем текущее значение ref для использования в cleanup
        const currentIntervals = trackingIntervalRef.current;
        
        if (selectedVoiceId) {
            // Загружаем эпизоды сразу
            loadEpisodes(selectedVoiceId).then((episodesData) => {
                // Проверяем наличие конвертирующихся эпизодов
                const hasConverting = episodesData.some((ep: Episode) => 
                    ep.videoStatus === 'converting' || ep.videoStatus === 'uploading'
                );
                
                if (hasConverting) {
                    console.log('🔄 Найдены конвертирующиеся эпизоды, запускаем автообновление');
                }
            });
            
            // Периодическое обновление списка для динамического отображения прогресса конвертации
            const refreshInterval = setInterval(async () => {
                const episodesData = await loadEpisodes(selectedVoiceId);
                
                // Останавливаем обновление если нет конвертирующихся эпизодов
                const hasConverting = episodesData.some((ep: Episode) => 
                    ep.videoStatus === 'converting' || ep.videoStatus === 'uploading'
                );
                
                if (!hasConverting && uploads.filter(u => u.voiceName === selectedVoice?.name).length === 0) {
                    console.log('✅ Нет активных конвертаций, автообновление продолжается на случай новых загрузок');
                }
            }, 2000); // Обновляем каждые 2 секунды
            
            // Cleanup при размонтировании
            return () => {
                clearInterval(refreshInterval);
                currentIntervals.forEach((interval) => {
                    clearInterval(interval);
                });
                currentIntervals.clear();
            };
        }
        
        // Cleanup если озвучка не выбрана
        return () => {
            currentIntervals.forEach((interval) => {
                clearInterval(interval);
            });
            currentIntervals.clear();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedVoiceId]);

    // Восстанавливаем отслеживание для загрузок из localStorage
    useEffect(() => {
        if (!selectedVoiceId) return;
        
        // Проверяем загрузки для текущей озвучки
        const voiceUploads = uploads.filter(u => 
            u.animeId === animeId && 
            (u.status === 'uploading' || u.status === 'converting')
        );
        
        voiceUploads.forEach(upload => {
            // Проверяем, не отслеживаем ли мы уже этот эпизод
            if (trackingIntervalRef.current.has(upload.uploadId)) {
                return; // Уже отслеживаем
            }
            
            console.log('🔄 Возобновляем отслеживание для загрузки:', upload.uploadId);
            
            // Если статус converting, запускаем отслеживание конвертации
            if (upload.status === 'converting' && upload.episodeId > 0) {
                const selectedVoice = voices.find(v => v.id === selectedVoiceId);
                if (selectedVoice) {
                    startConversionTracking({
                        uploadId: upload.uploadId,
                        episodeId: upload.episodeId,
                        voiceName: selectedVoice.name,
                        episodeNumber: upload.episodeNumber,
                        quality: upload.quality
                    });
                }
            }
            // Для uploading статуса XHR уже потерян, но отслеживание конвертации начнется автоматически
            // когда мы увидим episodeId в БД
        });
    }, [uploads, selectedVoiceId, animeId]); // eslint-disable-line react-hooks/exhaustive-deps

    const loadVoices = async () => {
        try {
            const token = getTokenFromCookie();
            const res = await fetch(`${SERVER_URL2}/api/admin/yumeko/anime/${animeId}/voices`, {
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
            const res = await fetch(`${SERVER_URL2}/api/admin/yumeko/voices/${voiceId}/episodes`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setEpisodes(data);
            
            // Связываем восстановленные загрузки с эпизодами в БД
            uploads.forEach(upload => {
                if (upload.animeId !== animeId) return;
                
                // Ищем эпизод по номеру
                const episode = data.find((ep: Episode) => ep.episodeNumber === upload.episodeNumber);
                
                if (episode) {
                    // Если нашли эпизод и у загрузки еще нет episodeId, обновляем
                    if (upload.episodeId === 0 || upload.episodeId !== episode.id) {
                        console.log('🔗 Связываем загрузку с эпизодом:', upload.uploadId, '→', episode.id);
                        
                        episodeIdRef.current.set(upload.uploadId, episode.id);
                        updateUpload(upload.uploadId, {
                            episodeId: episode.id,
                            status: 'converting',
                            step: 'Конвертация в очереди...',
                            screenshotUrl: episode.screenshotPath 
                                ? `${SERVER_URL2}/api/video/screenshot/${episode.screenshotPath}` 
                                : undefined,
                            duration: episode.durationSeconds
                        });
                        
                        // Начинаем отслеживание конвертации
                        if (!trackingIntervalRef.current.has(upload.uploadId)) {
                            const selectedVoice = voices.find(v => v.id === voiceId);
                            if (selectedVoice) {
                                startConversionTracking({
                                    uploadId: upload.uploadId,
                                    episodeId: episode.id,
                                    voiceName: selectedVoice.name,
                                    episodeNumber: upload.episodeNumber,
                                    quality: upload.quality
                                });
                            }
                        }
                    }
                }
            });
            
            // Очищаем висящие загрузки, которых нет в БД
            const existingEpisodeIds = new Set(data.map((ep: Episode) => ep.id));
            
            uploads.forEach(upload => {
                // Проверяем только загрузки для текущей озвучки с установленным episodeId
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
            
            return data;
        } catch (error) {
            console.error('Ошибка загрузки эпизодов:', error);
            return [];
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
            const res = await fetch(`${SERVER_URL2}/api/admin/yumeko/anime/${animeId}/voices`, {
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
            await fetch(`${SERVER_URL2}/api/admin/yumeko/voices/${voiceId}`, {
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

    const handleStartEditVoice = (voiceId: number, currentName: string) => {
        setEditingVoiceId(voiceId);
        setEditVoiceName(currentName);
    };

    const handleCancelEditVoice = () => {
        setEditingVoiceId(null);
        setEditVoiceName('');
    };

    const handleSaveEditVoice = async () => {
        if (!editingVoiceId || !editVoiceName.trim()) return;

        try {
            const token = getTokenFromCookie();
            const res = await fetch(`${SERVER_URL2}/api/admin/yumeko/voices/${editingVoiceId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: editVoiceName.trim()
                })
            });
            
            if (res.ok) {
                setEditingVoiceId(null);
                setEditVoiceName('');
                await loadVoices();
            } else {
                console.error('Ошибка обновления озвучки');
            }
        } catch (error) {
            console.error('Ошибка обновления озвучки:', error);
        }
    };

    // Функция для подсчета загружающихся эпизодов для конкретной озвучки
    const getUploadingCountForVoice = (voiceName: string) => {
        return uploads.filter(u => 
            u.voiceName === voiceName && 
            (u.status === 'uploading' || u.status === 'converting')
        ).length;
    };

    // Функция для подсчета задач в очереди конвертации для конкретной озвучки
    const getQueuedCountForVoice = (voiceName: string) => {
        return conversionQueueRef.current.filter(t => t.voiceName === voiceName).length;
    };

    // Функция для обработки следующей задачи в очереди конвертации
    const processNextConversion = async () => {
        if (isConvertingRef.current || conversionQueueRef.current.length === 0) {
            return;
        }
        
        isConvertingRef.current = true;
        const task = conversionQueueRef.current.shift()!;
        
        console.log('🎬 Начинаем конвертацию из очереди:', task.uploadId, 'Episode ID:', task.episodeId);
        
        // Обновляем статус - конвертация начинается
        updateUpload(task.uploadId, {
            step: 'Запуск конвертации...',
            progress: 20,
            status: 'converting'
        });
        
        // Отправляем запрос на начало конвертации
        try {
            const token = getTokenFromCookie();
            await fetch(`${SERVER_URL2}/api/admin/yumeko/episodes/${task.episodeId}/start-conversion`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } catch (error) {
            console.error('Ошибка запуска конвертации:', error);
        }
        
        // Начинаем отслеживать статус конвертации
        await startConversionTracking(task);
    };

    // Функция отслеживания статуса конвертации
    const startConversionTracking = async (task: ConversionTask) => {
        const { uploadId, episodeId } = task;
        const token = getTokenFromCookie();
        
        const checkStatus = async () => {
            try {
                const res = await fetch(`${SERVER_URL2}/api/admin/yumeko/episodes/${episodeId}/status`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (!res.ok) {
                    if (res.status === 404) {
                        console.log('ℹ️ Эпизод не найден (404) в БД');
                        const currentInterval = trackingIntervalRef.current.get(uploadId);
                        if (currentInterval) {
                            clearInterval(currentInterval);
                            trackingIntervalRef.current.delete(uploadId);
                        }
                        removeUpload(uploadId);
                        isConvertingRef.current = false;
                        processNextConversion();
                        return true;
                    }
                    return false;
                }
                
                const episode = await res.json();
                console.log('📊 Статус конвертации:', episode.videoStatus, 'Прогресс:', episode.conversionProgress);
                
                // Проверяем отмену
                if (cancelledRef.current.get(uploadId)) {
                    console.log('ℹ️ Конвертация отменена');
                    return true;
                }
                
                // Обновляем список эпизодов, чтобы подтянуть скриншот и другие данные
                if (selectedVoiceId) await loadEpisodes(selectedVoiceId);
                
                switch (episode.videoStatus) {
                    case 'uploading':
                        updateUpload(uploadId, {
                            step: 'Получение данных эпизода...',
                            progress: 18,
                            status: 'uploading',
                            screenshotUrl: episode.screenshotPath 
                                ? `${SERVER_URL2}/api/video/screenshot/${episode.screenshotPath}` 
                                : undefined
                        });
                        return false;
                        
                    case 'converting':
                        const progress = episode.conversionProgress || 0;
                        let step: string;
                        
                        if (progress === 0) {
                            // В очереди на конвертацию
                            step = 'Конвертация в очереди...';
                        } else if (progress >= 95) {
                            // При 95%+ показываем "Обработка" без процентов
                            step = 'Обработка';
                        } else {
                            // Идёт конвертация
                            step = `Конвертация видео...`;
                        }
                        
                        updateUpload(uploadId, {
                            step,
                            progress: progress,
                            status: 'converting',
                            screenshotUrl: episode.screenshotPath 
                                ? `${SERVER_URL2}/api/video/screenshot/${episode.screenshotPath}` 
                                : undefined,
                            duration: episode.durationSeconds
                        });
                        return false;
                        
                    case 'ready':
                        console.log('✅ Конвертация завершена!');
                        updateUpload(uploadId, {
                            step: 'Готово!',
                            progress: 100,
                            status: 'ready'
                        });
                        
                        if (selectedVoiceId) await loadEpisodes(selectedVoiceId);
                        
                        // Автоматически удаляем из списка через 1 секунду
                        setTimeout(() => {
                            removeUpload(uploadId);
                        }, 1000);
                        
                        // Запускаем следующую конвертацию
                        isConvertingRef.current = false;
                        processNextConversion();
                        return true;
                        
                    case 'error':
                        updateUpload(uploadId, {
                            step: 'Ошибка',
                            progress: 0,
                            status: 'error',
                            errorMessage: episode.errorMessage || 'Неизвестная ошибка'
                        });
                        
                        // Запускаем следующую конвертацию даже при ошибке
                        isConvertingRef.current = false;
                        processNextConversion();
                        return true;
                        
                    default:
                        return false;
                }
            } catch (error) {
                console.error('❌ Ошибка проверки статуса:', error);
                return false;
            }
        };
        
        // Первый запрос
        const initialDone = await checkStatus();
        if (initialDone) return;
        
        // Затем проверяем каждые 1.5 секунды
        const interval = setInterval(async () => {
            if (cancelledRef.current.get(uploadId)) {
                clearInterval(interval);
                trackingIntervalRef.current.delete(uploadId);
                cancelledRef.current.delete(uploadId);
                isConvertingRef.current = false;
                processNextConversion();
                return;
            }
            
            const done = await checkStatus();
            if (done) {
                clearInterval(interval);
                trackingIntervalRef.current.delete(uploadId);
                cancelledRef.current.delete(uploadId);
            }
        }, 1500);
        
        trackingIntervalRef.current.set(uploadId, interval);
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
        
        // Запускаем загрузку файла ПАРАЛЛЕЛЬНО (не в очереди)
        startFileUpload(uploadId, episodeNumberToUpload, qualityToUpload, fileToUpload, voiceNameToUpload, selectedVoiceId);
    };
    
    // Функция загрузки файла на сервер (выполняется параллельно)
    const startFileUpload = async (
        uploadId: string,
        episodeNumber: number,
        quality: string,
        file: File,
        voiceName: string,
        voiceId: number
    ) => {
        try {
            const token = getTokenFromCookie();
            const formData = new FormData();
            formData.append('episodeNumber', episodeNumber.toString());
            formData.append('maxQuality', quality);
            formData.append('video', file);
            
            const xhr = new XMLHttpRequest();
            uploadXhrRef.current.set(uploadId, xhr);
            
            // Функция отмены загрузки
            const cancelUploadFn = async () => {
                console.log('🛑 Отмена загрузки:', uploadId);
                cancelledRef.current.set(uploadId, true);
                
                const currentXhr = uploadXhrRef.current.get(uploadId);
                if (currentXhr) {
                    currentXhr.abort();
                    uploadXhrRef.current.delete(uploadId);
                }
                
                const currentInterval = trackingIntervalRef.current.get(uploadId);
                if (currentInterval) {
                    clearInterval(currentInterval);
                    trackingIntervalRef.current.delete(uploadId);
                }
                
                // Удаляем из очереди конвертации если там есть
                const queueIndex = conversionQueueRef.current.findIndex(t => t.uploadId === uploadId);
                if (queueIndex !== -1) {
                    conversionQueueRef.current.splice(queueIndex, 1);
                }
                
                updateUpload(uploadId, {
                    step: 'Отменено',
                    progress: 0,
                    status: 'error',
                    errorMessage: 'Загрузка отменена пользователем'
                });
                
                // Удаляем эпизод с сервера если он был создан
                const episodeId = episodeIdRef.current.get(uploadId);
                if (episodeId && episodeId > 0) {
                    try {
                        const token = getTokenFromCookie();
                        const checkRes = await fetch(`${SERVER_URL2}/api/admin/yumeko/episodes/${episodeId}/status`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        
                        if (checkRes.ok) {
                            await fetch(`${SERVER_URL2}/api/admin/yumeko/episodes/${episodeId}`, {
                                method: 'DELETE',
                                headers: { 'Authorization': `Bearer ${token}` }
                            });
                            
                                if (selectedVoiceId) {
                                    await loadEpisodes(selectedVoiceId);
                                    await loadVoices();
                                }
                        }
                        
                        episodeIdRef.current.delete(uploadId);
                    } catch (error) {
                        console.error('❌ Ошибка при удалении эпизода:', error);
                    }
                }
                
                removeUpload(uploadId);
                cancelledRef.current.delete(uploadId);
            };
            
            // Добавляем в список загрузок
            addUpload({
                uploadId,
                episodeId: 0,
                voiceName,
                episodeNumber,
                animeId: animeId,
                quality,
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
                    episodeIdRef.current.set(uploadId, episode.id);
                    
                    updateUpload(uploadId, {
                        episodeId: episode.id,
                        step: 'В очереди на конвертацию...',
                        progress: 15,
                        status: 'uploading',
                        onCancel: cancelUploadFn
                    });
                    
                    if (selectedVoiceId) {
                        await loadEpisodes(selectedVoiceId);
                    }
                    
                    uploadXhrRef.current.delete(uploadId);
                    
                    // Добавляем в очередь конвертации
                    const conversionTask: ConversionTask = {
                        uploadId,
                        episodeId: episode.id,
                        voiceName,
                        episodeNumber,
                        quality
                    };
                    
                    conversionQueueRef.current.push(conversionTask);
                    console.log(`🎬 Добавлено в очередь конвертации. Всего в очереди: ${conversionQueueRef.current.length}`);
                    
                    // Запускаем конвертацию если она еще не запущена
                    processNextConversion();
                } else {
                    console.error('Ошибка сервера:', xhr.status, xhr.responseText);
                    
                    let errorMessage = 'Ошибка сервера';
                    try {
                        const errorData = JSON.parse(xhr.responseText);
                        errorMessage = errorData.message || errorData.error || xhr.statusText;
                    } catch {
                        errorMessage = xhr.responseText || xhr.statusText;
                    }
                    
                    if (errorMessage.includes('уже существует') || errorMessage.includes('duplicate')) {
                        errorMessage = `Эпизод ${episodeNumber} уже существует для данной озвучки`;
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
            
            // Используем SERVER_URL2 для загрузки видео
            xhr.open('POST', `${SERVER_URL2}/api/admin/yumeko/voices/${voiceId}/episodes`);
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

    const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = e.dataTransfer.files;
        if (!files || files.length === 0) return;
        
        if (!selectedVoiceId) return;
        const selectedVoice = getSelectedVoice();
        if (!selectedVoice) return;
        
        // Фильтруем только MP4 файлы
        const mp4Files = Array.from(files).filter(file => 
            file.type === 'video/mp4' || file.name.toLowerCase().endsWith('.mp4')
        );
        
        if (mp4Files.length === 0) {
            alert('Пожалуйста, выберите MP4 файл(ы)');
            return;
        }
        
        // Если один файл - устанавливаем в форму
        if (mp4Files.length === 1) {
            setVideoFile(mp4Files[0]);
            return;
        }
        
        // Если несколько файлов - спрашиваем пользователя
        const autoNumbering = confirm(
            `Вы загружаете ${mp4Files.length} файлов. ` +
            `Хотите автоматически присвоить им последовательные номера эпизодов? ` +
            `(Нажмите ОК для автонумерации или Отмена для ручного выбора каждого)`
        );
        
        if (autoNumbering) {
            // Находим максимальный номер эпизода и начинаем с него
            const maxEpisodeNumber = episodes.length > 0 
                ? Math.max(...episodes.map(ep => ep.episodeNumber))
                : 0;
            
            const startingEpisode = prompt(
                `Начать нумерацию с эпизода:`,
                `${maxEpisodeNumber + 1}`
            );
            
            if (!startingEpisode) return;
            
            const startNum = parseInt(startingEpisode);
            if (isNaN(startNum) || startNum < 1) {
                alert('Некорректный номер эпизода');
                return;
            }
            
            // Закрываем форму
            setShowAddEpisode(false);
            
            // Запускаем загрузку всех файлов ПАРАЛЛЕЛЬНО
            mp4Files.forEach((file, index) => {
                const episodeNumber = startNum + index;
                
                // Проверяем существование эпизода
                const existingEpisode = episodes.find(ep => ep.episodeNumber === episodeNumber);
                if (existingEpisode) {
                    console.log(`⚠️ Эпизод ${episodeNumber} уже существует, пропускаем файл ${file.name}`);
            return;
        }
        
                const uploadId = `${animeId}-${selectedVoiceId}-${episodeNumber}-${Date.now()}-${index}`;
                
                // Запускаем загрузку параллельно
                startFileUpload(uploadId, episodeNumber, newEpisodeQuality, file, selectedVoice.name, selectedVoiceId);
            });
            
            console.log(`📤 Начата параллельная загрузка ${mp4Files.length} файлов`);
            } else {
            // Ручной режим - загружаем первый файл в форму
            setVideoFile(mp4Files[0]);
            alert(`Выбран файл ${mp4Files[0].name}. Укажите номер эпизода вручную.`);
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
            const res = await fetch(`${SERVER_URL2}/api/admin/yumeko/episodes/${episodeId}`, {
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

    const getStatusText = (status: string, progress?: number) => {
        switch (status) {
            case 'ready': return 'Готово';
            case 'converting': 
                if (progress === 0 || progress === undefined) {
                    return 'Конвертация в очереди...';
                } else if (progress >= 95) {
                    return 'Обработка';
                } else {
                    return 'Конвертация видео...';
                }
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
                    ) : viewMode === 'queue' ? (
                        <>
                            <h2><Users /> Очередь загрузки</h2>
                            <button className="btn-back" onClick={handleBackToList}>
                                ← Назад к списку
                            </button>
                        </>
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
                                <div className="header-buttons">
                                    <button 
                                        className="btn-view-queue"
                                        onClick={() => setViewMode('queue')}
                                    >
                                        <Users size={16} /> Очередь загрузки
                                    </button>
                                    <button 
                                        className="btn-add-voice"
                                        onClick={() => setShowAddVoice(!showAddVoice)}
                                    >
                                        <Plus size={16} /> Добавить озвучку
                                    </button>
                                </div>
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
                                    const queuedCount = getQueuedCountForVoice(voice.name);
                                    return (
                                        <div 
                                            key={voice.id}
                                            className="voice-card"
                                            onClick={() => handleSelectVoice(voice.id)}
                                        >
                                            <div className="voice-info">
                                                {editingVoiceId === voice.id ? (
                                                    <input
                                                        type="text"
                                                        value={editVoiceName}
                                                        onChange={(e) => setEditVoiceName(e.target.value)}
                                                        onKeyPress={(e) => e.key === 'Enter' && handleSaveEditVoice()}
                                                        className="voice-edit-input"
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <div className="voice-name">{voice.name}</div>
                                                )}
                                                <div className="voice-meta">
                                                    {voice.episodesCount} {voice.episodesCount === 1 ? 'эпизод' : voice.episodesCount > 1 && voice.episodesCount < 5 ? 'эпизода' : 'эпизодов'}
                                                    {uploadingCount > 0 && (
                                                        <span className="uploading-indicator">
                                                            {' '}+ {uploadingCount} обрабатывается
                                                        </span>
                                                    )}
                                                    {queuedCount > 0 && (
                                                        <span className="queued-indicator">
                                                            {' '}({queuedCount} в очереди)
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="voice-actions">
                                                {editingVoiceId === voice.id ? (
                                                    <>
                                                        <button
                                                            className="btn-save-voice"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleSaveEditVoice();
                                                            }}
                                                        >
                                                            <Check size={16} />
                                                        </button>
                                                        <button
                                                            className="btn-cancel-voice"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleCancelEditVoice();
                                                            }}
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button
                                                            className="btn-edit-voice"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleStartEditVoice(voice.id, voice.name);
                                                            }}
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button
                                                            className="btn-delete-voice"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeleteVoice(voice.id);
                                                            }}
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
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
                    ) : viewMode === 'queue' ? (
                        /* Секция очереди загрузки */
                        <div className="queue-section">
                            <UploadQueueViewer animeId={animeId} serverUrl={SERVER_URL2} />
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
                                            {' '}({getUploadingCountForVoice(selectedVoice.name)} обрабатывается)
                                        </span>
                                    )}
                                    {selectedVoice && getQueuedCountForVoice(selectedVoice.name) > 0 && (
                                        <span className="queued-indicator">
                                            {' '}({getQueuedCountForVoice(selectedVoice.name)} в очереди)
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
                                            multiple
                                            onChange={(e) => {
                                                const files = e.target.files;
                                                if (files && files.length > 0) {
                                                    // Если один файл - устанавливаем в форму
                                                    if (files.length === 1) {
                                                        setVideoFile(files[0]);
                                                    } else {
                                                        // Множественная загрузка через handleDrop
                                                        const event = {
                                                            preventDefault: () => {},
                                                            stopPropagation: () => {},
                                                            dataTransfer: { files }
                                                        } as React.DragEvent<HTMLDivElement>;
                                                        handleDrop(event);
                                                    }
                                                }
                                            }}
                                            id="video-file-input"
                                            className="file-input"
                                        />
                                        <label htmlFor="video-file-input" className={`file-upload-label ${videoFile ? 'has-file' : ''}`}>
                                            <Upload size={20} />
                                            <span>{videoFile ? videoFile.name : isDragging ? 'Отпустите файл(ы) здесь' : 'Выберите или перетащите MP4 файл(ы)'}</span>
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
                                {/* Готовые эпизоды (исключая те, что сейчас загружаются) */}
                                {episodes
                                    .filter(episode => {
                                        // Проверяем, нет ли этого эпизода в списке загружаемых (любой статус)
                                        const isInUploads = uploads.some(u => 
                                            u.voiceName === selectedVoice?.name && 
                                            u.episodeNumber === episode.episodeNumber
                                        );
                                        return !isInUploads;
                                    })
                                    .map(episode => (
                                    <div key={episode.id} className={`episode-card ${episode.videoStatus === 'ready' ? 'ready' : episode.videoStatus}`}>
                                        <div className="episode-thumbnail">
                                            {episode.screenshotPath ? (
                                                <img 
                                                    src={`${SERVER_URL2}/api/video/screenshot/${episode.screenshotPath}`} 
                                                    alt={`Episode ${episode.episodeNumber}`}
                                                    onError={(e) => {
                                                        e.currentTarget.style.display = 'none';
                                                    }}
                                                />
                                            ) : (
                                                <Film size={32} />
                                            )}
                                        </div>
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
                                            <div className="episode-status-detailed">
                                                {getStatusIcon(episode.videoStatus)}
                                                <div className="status-text-wrapper">
                                                    <span className="status-main">{getStatusText(episode.videoStatus, episode.conversionProgress)}</span>
                                                    {episode.videoStatus === 'converting' && episode.conversionProgress != null && episode.conversionProgress > 0 && episode.conversionProgress < 95 && (
                                                        <div className="conversion-progress">
                                                            <div className="mini-progress-bar">
                                                                <div 
                                                                    className="mini-progress-fill" 
                                                                    style={{ width: `${episode.conversionProgress}%` }}
                                                                />
                                                            </div>
                                                            <span>{Math.round(episode.conversionProgress)}%</span>
                                                        </div>
                                                    )}
                                                    {episode.videoStatus === 'converting' && episode.conversionProgress != null && episode.conversionProgress >= 95 && (
                                                        <div className="processing-indicator">
                                                            <RefreshCw size={14} className="spinning-icon" />
                                                        </div>
                                                    )}
                                                </div>
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
                                
                                {/* Загружающиеся эпизоды внизу */}
                                {uploads
                                    .filter(u => selectedVoice && u.voiceName === selectedVoice.name)
                                    .map(upload => (
                                        <div key={upload.uploadId} className={`episode-card ${upload.status}`}>
                                            <div className={`episode-thumbnail ${upload.screenshotUrl ? '' : 'uploading-placeholder'}`}>
                                                {upload.screenshotUrl ? (
                                                    <img 
                                                        src={upload.screenshotUrl} 
                                                        alt={`Episode ${upload.episodeNumber}`}
                                                        className="fade-in"
                                                        onError={(e) => {
                                                            e.currentTarget.style.display = 'none';
                                                        }}
                                                    />
                                                ) : (
                                                    <Upload size={32} />
                                                )}
                                            </div>
                                            <div className="episode-info">
                                                <h4>Эпизод {upload.episodeNumber}</h4>
                                                <div className="episode-meta">
                                                    <span className="quality-badge">{upload.quality}</span>
                                                    {upload.duration && upload.duration > 0 && (
                                                        <span className="duration">
                                                            {Math.floor(upload.duration / 60)} мин {upload.duration % 60} сек
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="episode-status-detailed">
                                                    {getStatusIcon(upload.status)}
                                                    <div className="status-text-wrapper">
                                                        <span className="status-main">{upload.step}</span>
                                                        {upload.status === 'converting' && upload.progress > 0 && upload.progress < 95 && (
                                                            <div className="conversion-progress">
                                                                <div className="mini-progress-bar">
                                                                    <div 
                                                                        className="mini-progress-fill" 
                                                                        style={{ width: `${upload.progress}%` }}
                                                                    />
                                                                </div>
                                                                <span>{Math.round(upload.progress)}%</span>
                                                            </div>
                                                        )}
                                                        {upload.step === 'Обработка' && (
                                                            <div className="processing-indicator">
                                                                <RefreshCw size={14} className="spinning-icon" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            {upload.status === 'ready' ? (
                                                <button
                                                    className="btn-delete-episode"
                                                    onClick={() => removeUpload(upload.uploadId)}
                                                    title="Закрыть"
                                                >
                                                    <X size={16} />
                                                </button>
                                            ) : upload.onCancel && (upload.status === 'uploading' || upload.status === 'converting') && (
                                                <button
                                                    className="btn-delete-episode btn-cancel-upload"
                                                    onClick={() => {
                                                        if (confirm('Вы уверены, что хотите отменить загрузку?')) {
                                                            upload.onCancel?.();
                                                        }
                                                    }}
                                                    title="Отменить загрузку"
                                                >
                                                    <X size={16} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    
                                {episodes.length === 0 && uploads.filter(u => selectedVoice && u.voiceName === selectedVoice.name).length === 0 && (
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

