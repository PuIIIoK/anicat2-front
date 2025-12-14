'use client';

import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { X, Plus, Upload, Trash2, CheckCircle, Clock, AlertCircle, Film, Mic, XCircle, RefreshCw, Edit2, Check, Users, FolderOpen, HardDrive } from 'lucide-react';
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

interface ConversionQuality {
    name: string;
    status: 'pending' | 'processing' | 'done' | 'error';
}

interface S3Progress {
    uploaded: number;
    total: number;
    percent: number;
    currentFile: string;
}

interface ConversionDetails {
    stage: 'starting' | 'converting' | 'uploading' | 'done' | 'error';
    qualities: ConversionQuality[];
    s3Progress?: S3Progress;
}

interface Episode {
    id: number;
    episodeNumber: number;
    maxQuality: string;
    minQuality?: string;
    videoStatus: string;
    conversionProgress: number;
    conversionDetails?: string; // JSON string
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
    const [multiResolution, setMultiResolution] = useState(false); // Режим мультирезолюции
    const [minQuality, setMinQuality] = useState('720p'); // Минимальное качество для даунскейла
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false); // Состояние для drag-n-drop
    
    // Локальные файлы (temp/videos)
    const [useLocalFile, setUseLocalFile] = useState(false); // Режим локального файла
    const [localFiles, setLocalFiles] = useState<{fileName: string; fileSize: number; lastModified: number}[]>([]);
    const [selectedLocalFile, setSelectedLocalFile] = useState<string>('');
    const [loadingLocalFiles, setLoadingLocalFiles] = useState(false);

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


    const loadVoices = async () => {
        try {
            const token = getTokenFromCookie();
            const res = await fetch(`${SERVER_URL2}/api/admin/yumeko/anime/${animeId}/voices`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) {
                console.error('Ошибка загрузки озвучек:', res.status);
                setVoices([]);
                return;
            }
            const data = await res.json();
            const voicesArray = Array.isArray(data) ? data : [];
            setVoices(voicesArray);
            if (voicesArray.length > 0 && !selectedVoiceId) {
                setSelectedVoiceId(voicesArray[0].id);
            }
        } catch (error) {
            console.error('Ошибка загрузки озвучек:', error);
            setVoices([]);
        }
    };

    const loadEpisodes = async (voiceId: number) => {
        try {
            const token = getTokenFromCookie();
            const res = await fetch(`${SERVER_URL2}/api/admin/yumeko/voices/${voiceId}/episodes`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!res.ok) {
                console.error('Ошибка загрузки эпизодов:', res.status);
                setEpisodes([]);
                return [];
            }
            
            const data = await res.json();
            const episodesArray = Array.isArray(data) ? data : [];
            setEpisodes(episodesArray);
            
            // Очищаем висящие загрузки, которых нет в БД
            const existingEpisodeIds = new Set(episodesArray.map((ep: Episode) => ep.id));
            
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
            
            return episodesArray;
        } catch (error) {
            console.error('Ошибка загрузки эпизодов:', error);
            setEpisodes([]);
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
        if (!Array.isArray(voices)) return undefined;
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
                console.log('📊 Статус конвертации:', episode.videoStatus, 'Прогресс:', episode.conversionProgress, 'Details:', episode.conversionDetails);
                
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
                        
                        // Парсим conversionDetails для определения этапа
                        let conversionStage: string | null = null;
                        let s3Progress: { uploaded: number; total: number; percent: number; currentFile: string } | null = null;
                        
                        if (episode.conversionDetails) {
                            try {
                                const details = JSON.parse(episode.conversionDetails);
                                conversionStage = details.stage;
                                if (details.s3Progress) {
                                    s3Progress = details.s3Progress;
                                }
                            } catch (e) {
                                console.warn('Failed to parse conversionDetails:', e);
                            }
                        }
                        
                        if (conversionStage === 'uploading' && s3Progress) {
                            // Загрузка в S3 с прогрессом
                            step = `☁️ S3: ${s3Progress.uploaded}/${s3Progress.total} файлов (${s3Progress.percent}%)`;
                        } else if (conversionStage === 'uploading') {
                            // Загрузка в S3 без деталей
                            step = '☁️ Загрузка в S3 Yandex Cloud...';
                        } else if (progress === 0) {
                            // В очереди на конвертацию
                            step = 'Конвертация в очереди...';
                        } else if (progress >= 95) {
                            // При 95%+ показываем "Финализация"
                            step = 'Финализация...';
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
                            duration: episode.durationSeconds,
                            conversionDetails: episode.conversionDetails
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

    // Загрузка списка локальных файлов с сервера
    const loadLocalFiles = async () => {
        setLoadingLocalFiles(true);
        try {
            const token = getTokenFromCookie();
            const res = await fetch(`${SERVER_URL2}/api/admin/yumeko/local-videos`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const files = await res.json();
                setLocalFiles(files);
                console.log(`📁 Загружено ${files.length} локальных файлов`);
            }
        } catch (error) {
            console.error('Ошибка загрузки локальных файлов:', error);
        } finally {
            setLoadingLocalFiles(false);
        }
    };
    
    // Конвертация из локального файла
    const handleUploadFromLocal = async () => {
        if (!selectedVoiceId || !newEpisodeNumber || !selectedLocalFile) return;
        
        const selectedVoice = getSelectedVoice();
        if (!selectedVoice) return;
        
        const episodeNumberToUpload = parseInt(newEpisodeNumber);
        const existingEpisode = episodes.find(ep => ep.episodeNumber === episodeNumberToUpload);
        if (existingEpisode) {
            alert(`Эпизод ${episodeNumberToUpload} уже существует!`);
            return;
        }
        
        setShowAddEpisode(false);
        
        const uploadId = `local-${animeId}-${selectedVoiceId}-${episodeNumberToUpload}-${Date.now()}`;
        const qualityToUpload = newEpisodeQuality;
        const minQualityToUpload = multiResolution ? minQuality : null;
        const localFileName = selectedLocalFile;
        const voiceNameToUpload = selectedVoice.name;
        
        // Очищаем форму
        setNewEpisodeNumber('');
        setNewEpisodeQuality('1080p');
        setMultiResolution(false);
        setMinQuality('720p');
        setSelectedLocalFile('');
        setUseLocalFile(false);
        
        // Запускаем конвертацию из локального файла
        startLocalFileConversion(uploadId, episodeNumberToUpload, qualityToUpload, minQualityToUpload, localFileName, voiceNameToUpload, selectedVoiceId);
    };
    
    // Функция запуска конвертации из локального файла
    const startLocalFileConversion = async (
        uploadId: string,
        episodeNumber: number,
        quality: string,
        minQualityParam: string | null,
        localFileName: string,
        voiceName: string,
        voiceId: number
    ) => {
        try {
            const token = getTokenFromCookie();
            
            // Добавляем в список загрузок
            addUpload({
                uploadId,
                episodeId: 0,
                voiceName,
                episodeNumber,
                animeId: animeId,
                quality,
                step: 'Запуск конвертации из локального файла...',
                progress: 5,
                status: 'uploading'
            });
            
            // Формируем URL с параметрами
            const params = new URLSearchParams({
                episodeNumber: episodeNumber.toString(),
                maxQuality: quality,
                localFileName: localFileName
            });
            if (minQualityParam) {
                params.append('minQuality', minQualityParam);
            }
            
            const res = await fetch(`${SERVER_URL2}/api/admin/yumeko/voices/${voiceId}/episodes/local?${params}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (res.ok) {
                const episode = await res.json();
                episodeIdRef.current.set(uploadId, episode.id);
                
                updateUpload(uploadId, {
                    episodeId: episode.id,
                    step: 'Конвертация запущена...',
                    progress: 15,
                    status: 'converting',
                    conversionDetails: episode.conversionDetails
                });
                
                if (selectedVoiceId) {
                    await loadEpisodes(selectedVoiceId);
                }
                
                // Добавляем в очередь конвертации для отслеживания
                const conversionTask: ConversionTask = {
                    uploadId,
                    episodeId: episode.id,
                    voiceName,
                    episodeNumber,
                    quality
                };
                conversionQueueRef.current.push(conversionTask);
                processNextConversion();
                
            } else {
                const errorText = await res.text();
                console.error('Ошибка запуска конвертации:', errorText);
                updateUpload(uploadId, {
                    step: 'Ошибка',
                    progress: 0,
                    status: 'error',
                    errorMessage: 'Ошибка запуска конвертации'
                });
            }
        } catch (error) {
            console.error('Ошибка конвертации из локального файла:', error);
            updateUpload(uploadId, {
                step: 'Ошибка',
                progress: 0,
                status: 'error',
                errorMessage: 'Ошибка конвертации'
            });
        }
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
        const minQualityToUpload = multiResolution ? minQuality : null;
        const fileToUpload = videoFile;
        const voiceNameToUpload = selectedVoice.name;
        
        // Очищаем форму сразу
        setNewEpisodeNumber('');
        setNewEpisodeQuality('1080p');
        setMultiResolution(false);
        setMinQuality('720p');
        setVideoFile(null);
        
        // Запускаем загрузку файла ПАРАЛЛЕЛЬНО (не в очереди)
        startFileUpload(uploadId, episodeNumberToUpload, qualityToUpload, minQualityToUpload, fileToUpload, voiceNameToUpload, selectedVoiceId);
    };
    
    // Функция загрузки файла на сервер (выполняется параллельно)
    const startFileUpload = async (
        uploadId: string,
        episodeNumber: number,
        quality: string,
        minQualityParam: string | null,
        file: File,
        voiceName: string,
        voiceId: number
    ) => {
        try {
            const token = getTokenFromCookie();
            const formData = new FormData();
            formData.append('episodeNumber', episodeNumber.toString());
            formData.append('maxQuality', quality);
            if (minQualityParam) {
                formData.append('minQuality', minQualityParam);
            }
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
                        onCancel: cancelUploadFn,
                        conversionDetails: episode.conversionDetails
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
                
                // Запускаем загрузку параллельно (null для minQuality - однорезолюция при bulk upload)
                const minQualityForBulk = multiResolution ? minQuality : null;
                startFileUpload(uploadId, episodeNumber, newEpisodeQuality, minQualityForBulk, file, selectedVoice.name, selectedVoiceId);
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
            case 'converting': return <RefreshCw className="status-icon converting spinning-icon" />;
            case 'uploading': return <Upload className="status-icon uploading" />;
            case 'error': return <AlertCircle className="status-icon error" />;
            case 'queued': return <Clock className="status-icon queued" />;
            default: return <Clock className="status-icon" />;
        }
    };

    const getStatusText = (status: string, progress?: number, step?: string) => {
        // Если есть кастомный step - используем его
        if (step && step !== 'Конвертация видео...') return step;
        
        switch (status) {
            case 'ready': return 'Готово';
            case 'converting': 
                if (progress === 0 || progress === undefined) {
                    return 'В очереди на конвертацию';
                } else if (progress >= 95) {
                    return 'Финализация...';
                } else {
                    return 'Конвертация';
                }
            case 'uploading': return 'Загрузка на сервер';
            case 'error': return 'Ошибка';
            case 'queued': return 'В очереди';
            default: return status;
        }
    };
    
    // Форматирование времени
    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };
    
    // Получить список качеств между max и min
    const getQualitiesList = (maxQuality: string, minQuality?: string): string[] => {
        const allQualities = ['2160p', '1440p', '1080p', '720p'];
        const qualityNames: Record<string, string> = {
            '2160p': '4K', '1440p': '2K', '1080p': '1080p', '720p': '720p'
        };
        const getIndex = (q: string) => {
            if (q === '2160p' || q === '4K') return 0;
            if (q === '1440p' || q === '2K') return 1;
            if (q === '1080p') return 2;
            if (q === '720p') return 3;
            return 2;
        };
        const maxIdx = getIndex(maxQuality);
        const minIdx = minQuality ? getIndex(minQuality) : maxIdx;
        const result: string[] = [];
        for (let i = maxIdx; i <= minIdx && i < allQualities.length; i++) {
            result.push(qualityNames[allQualities[i]]);
        }
        return result.length > 0 ? result : [maxQuality];
    };
    
    // Единый компонент карточки эпизода
    const renderEpisodeCard = (data: {
        key: string;
        episodeNumber: number;
        quality: string;
        minQuality?: string;
        status: string;
        progress: number;
        step?: string;
        duration?: number;
        screenshotUrl?: string;
        conversionDetails?: string;
        onDelete?: () => void;
        onCancel?: () => void;
        isUpload?: boolean;
    }) => {
        const details = data.conversionDetails ? parseConversionDetails(data.conversionDetails) : null;
        const showProgress = data.status === 'converting' && data.progress > 0 && data.progress < 100;
        const isQueued = data.status === 'converting' && data.progress === 0;
        const qualities = getQualitiesList(data.quality, data.minQuality);
        
        return (
            <div key={data.key} className={`episode-card episode-card--${data.status} ${isQueued ? 'episode-card--queued' : ''}`}>
                <div className={`episode-thumbnail ${!data.screenshotUrl ? 'placeholder' : ''}`}>
                    {data.screenshotUrl ? (
                        <img 
                            src={data.screenshotUrl} 
                            alt={`Episode ${data.episodeNumber}`}
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                    ) : (
                        <Film size={32} />
                    )}
                </div>
                
                <div className="episode-info">
                    <div className="episode-header">
                        <h4>Эпизод {data.episodeNumber}</h4>
                        <div className="quality-badges">
                            {qualities.map((q, idx) => (
                                <span key={idx} className="quality-badge">{q}</span>
                            ))}
                        </div>
                    </div>
                    
                    {data.duration && data.duration > 0 && (
                        <div className="episode-duration">
                            <Clock size={12} />
                            <span>{formatDuration(data.duration)}</span>
                        </div>
                    )}
                    
                    {/* Статус "Готово" для ready эпизодов */}
                    {data.status === 'ready' && (
                        <div className="episode-status episode-status--ready">
                            <CheckCircle size={14} className="status-icon-ready" />
                            <span className="status-label status-label--ready">Готово</span>
                        </div>
                    )}
                    
                    {/* Статус - только если нет деталей качества и не ready */}
                    {!details && data.status !== 'ready' && (
                        <div className={`episode-status episode-status--${data.status}`}>
                            {getStatusIcon(isQueued ? 'queued' : data.status)}
                            <span className="status-label">
                                {getStatusText(data.status, data.progress, data.step)}
                            </span>
                            {showProgress && (
                                <span className="status-progress">{Math.round(data.progress)}%</span>
                            )}
                        </div>
                    )}
                    
                    {/* Прогресс-бар - только если нет деталей качества */}
                    {!details && showProgress && (
                        <div className="progress-bar-container">
                            <div className="progress-bar">
                                <div 
                                    className="progress-bar-fill"
                                    style={{ width: `${data.progress}%` }}
                                />
                            </div>
                        </div>
                    )}
                    
                    {/* Детальное отображение качеств с прогрессом */}
                    {details && data.status === 'converting' && (
                        <div className="conversion-stages">
                            {/* Общий прогресс */}
                            <div className="overall-progress">
                                <div className="overall-progress-header">
                                    <span className="overall-label">Общий прогресс</span>
                                    <span className="overall-percent">{Math.round(data.progress)}%</span>
                                </div>
                                <div className="overall-progress-bar">
                                    <div 
                                        className="overall-progress-fill"
                                        style={{ width: `${data.progress}%` }}
                                    />
                                </div>
                            </div>
                            
                            {/* Этап 1: Конвертация */}
                            <div className={`stage-block ${details.stage === 'converting' ? 'stage-block--active' : details.stage === 'uploading' ? 'stage-block--done' : ''}`}>
                                <div className="stage-header">
                                    <span className="stage-number">1</span>
                                    {details.stage === 'uploading' ? <CheckCircle size={14} className="stage-done" /> : <RefreshCw size={14} className="spinning-icon" />}
                                    <span>Конвертация видео</span>
                                </div>
                                <div className="quality-grid">
                                    {details.qualities.map((q, idx) => (
                                        <div key={idx} className={`quality-chip quality-chip--${q.status}`}>
                                            {q.status === 'done' ? <CheckCircle size={10} /> :
                                             q.status === 'processing' ? <RefreshCw size={10} className="spinning-icon" /> :
                                             <Clock size={10} />}
                                            <span>{q.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            {/* Этап 2: Загрузка в S3 */}
                            <div className={`stage-block ${details.stage === 'uploading' ? 'stage-block--active' : ''}`}>
                                <div className="stage-header">
                                    <span className="stage-number">2</span>
                                    {details.stage === 'uploading' ? <RefreshCw size={14} className="spinning-icon" /> : <Clock size={14} />}
                                    <span>Загрузка в S3 Yandex Cloud</span>
                                    {details.s3Progress && (
                                        <span className="s3-counter">{details.s3Progress.uploaded}/{details.s3Progress.total}</span>
                                    )}
                                </div>
                                {details.stage === 'uploading' && details.s3Progress && (
                                    <div className="s3-progress">
                                        <div className="s3-progress-bar">
                                            <div 
                                                className="s3-progress-fill"
                                                style={{ width: `${details.s3Progress.percent}%` }}
                                            />
                                        </div>
                                        <span className="s3-percent">{details.s3Progress.percent}%</span>
                                    </div>
                                )}
                                {details.stage !== 'uploading' && (
                                    <div className="quality-grid quality-grid--pending">
                                        {details.qualities.map((q, idx) => (
                                            <div key={idx} className="quality-chip quality-chip--pending">
                                                <Clock size={10} />
                                                <span>{q.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                
                {/* Кнопки действий */}
                <div className="episode-actions">
                    {data.status === 'ready' && data.onDelete && (
                        <button className="btn-action btn-delete" onClick={data.onDelete} title="Удалить">
                            <Trash2 size={16} />
                        </button>
                    )}
                    {data.status === 'ready' && data.isUpload && data.onCancel && (
                        <button className="btn-action btn-close" onClick={data.onCancel} title="Закрыть">
                            <X size={16} />
                        </button>
                    )}
                    {(data.status === 'uploading' || data.status === 'converting') && data.onCancel && (
                        <button 
                            className="btn-action btn-cancel" 
                            onClick={() => {
                                if (confirm('Отменить обработку?')) data.onCancel?.();
                            }} 
                            title="Отменить"
                        >
                            <XCircle size={16} />
                        </button>
                    )}
                    {data.status !== 'ready' && !data.onCancel && data.onDelete && (
                        <button className="btn-action btn-delete" onClick={data.onDelete} title="Удалить">
                            <Trash2 size={16} />
                        </button>
                    )}
                </div>
            </div>
        );
    };

    // Парсинг деталей конвертации из JSON
    const parseConversionDetails = (detailsJson?: string): ConversionDetails | null => {
        if (!detailsJson) return null;
        try {
            return JSON.parse(detailsJson) as ConversionDetails;
        } catch (e) {
            console.warn('Failed to parse conversion details:', e);
            return null;
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
                                {Array.isArray(voices) && voices.map(voice => {
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
                                            <option value="2160p">4K (2160p)</option>
                                            <option value="1440p">2K (1440p)</option>
                                            <option value="1080p">1080p</option>
                                            <option value="720p">720p</option>
                                        </select>
                                    </div>
                                    
                                    {/* Режим мультирезолюции */}
                                    <div className="form-row multi-resolution-row">
                                        <label className="multi-resolution-toggle">
                                            <input
                                                type="checkbox"
                                                checked={multiResolution}
                                                onChange={(e) => setMultiResolution(e.target.checked)}
                                            />
                                            <span className="toggle-label">Мультирезолюция (как на YouTube)</span>
                                        </label>
                                        
                                        {multiResolution && (
                                            <div className="min-quality-selector">
                                                <span>До:</span>
                                                <select 
                                                    value={minQuality} 
                                                    onChange={(e) => setMinQuality(e.target.value)}
                                                >
                                                    {newEpisodeQuality === '2160p' && <option value="1440p">2K (1440p)</option>}
                                                    {(newEpisodeQuality === '2160p' || newEpisodeQuality === '1440p') && <option value="1080p">1080p</option>}
                                                    <option value="720p">720p</option>
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {multiResolution && (
                                        <div className="quality-preview">
                                            <span className="preview-label">Качества:</span>
                                            <span className="preview-qualities">
                                                {newEpisodeQuality}
                                                {newEpisodeQuality === '2160p' && minQuality !== '2160p' && ' → 1440p'}
                                                {(newEpisodeQuality === '2160p' || newEpisodeQuality === '1440p') && 
                                                    (minQuality === '1080p' || minQuality === '720p') && ' → 1080p'}
                                                {minQuality === '720p' && ' → 720p'}
                                            </span>
                                        </div>
                                    )}
                                    
                                    {/* Переключатель: загрузка файла / локальный файл */}
                                    <div className="source-toggle">
                                        <button 
                                            type="button"
                                            className={`toggle-btn ${!useLocalFile ? 'active' : ''}`}
                                            onClick={() => {
                                                setUseLocalFile(false);
                                                setSelectedLocalFile('');
                                            }}
                                        >
                                            <Upload size={16} />
                                            Загрузить файл
                                        </button>
                                        <button 
                                            type="button"
                                            className={`toggle-btn ${useLocalFile ? 'active' : ''}`}
                                            onClick={() => {
                                                setUseLocalFile(true);
                                                setVideoFile(null);
                                                loadLocalFiles();
                                            }}
                                        >
                                            <HardDrive size={16} />
                                            Локальный файл
                                        </button>
                                    </div>
                                    
                                    {!useLocalFile ? (
                                        /* Обычная загрузка файла */
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
                                                        if (files.length === 1) {
                                                            setVideoFile(files[0]);
                                                        } else {
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
                                    ) : (
                                        /* Выбор локального файла из temp/videos */
                                        <div className="local-file-selector">
                                            <div className="local-file-header">
                                                <FolderOpen size={16} />
                                                <span>Папка: temp/videos</span>
                                                <button 
                                                    type="button" 
                                                    className="btn-refresh-files"
                                                    onClick={loadLocalFiles}
                                                    disabled={loadingLocalFiles}
                                                    title="Обновить список"
                                                >
                                                    <RefreshCw size={14} className={loadingLocalFiles ? 'spinning-icon' : ''} />
                                                </button>
                                            </div>
                                            {loadingLocalFiles ? (
                                                <div className="local-files-loading">
                                                    <RefreshCw size={20} className="spinning-icon" />
                                                    <span>Загрузка списка файлов...</span>
                                                </div>
                                            ) : localFiles.length > 0 ? (
                                                <div className="local-files-list">
                                                    {localFiles.map(file => (
                                                        <div 
                                                            key={file.fileName}
                                                            className={`local-file-item ${selectedLocalFile === file.fileName ? 'selected' : ''}`}
                                                            onClick={() => setSelectedLocalFile(file.fileName)}
                                                        >
                                                            <Film size={16} />
                                                            <span className="file-name">{file.fileName}</span>
                                                            <span className="file-size">{Math.round(file.fileSize / 1024 / 1024)} MB</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="local-files-empty">
                                                    <span>Нет MP4 файлов в папке temp/videos</span>
                                                    <span className="hint">Поместите файлы в папку и нажмите обновить</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    
                                    <div className="form-actions">
                                        <button 
                                            className="btn-cancel"
                                            onClick={() => {
                                                setShowAddEpisode(false);
                                                setNewEpisodeNumber('');
                                                setVideoFile(null);
                                                setSelectedLocalFile('');
                                                setUseLocalFile(false);
                                            }}
                                        >
                                            Отмена
                                        </button>
                                        {!useLocalFile ? (
                                            <button 
                                                className="btn-upload"
                                                onClick={handleUploadEpisode}
                                                disabled={!videoFile || !newEpisodeNumber}
                                            >
                                                <Upload size={16} />
                                                Загрузить эпизод
                                            </button>
                                        ) : (
                                            <button 
                                                className="btn-upload btn-convert"
                                                onClick={handleUploadFromLocal}
                                                disabled={!selectedLocalFile || !newEpisodeNumber}
                                            >
                                                <HardDrive size={16} />
                                                Конвертировать
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="episodes-list">
                                {/* Эпизоды из базы (исключая те, что в процессе загрузки) */}
                                {episodes
                                    .filter(episode => {
                                        const isInUploads = uploads.some(u => 
                                            u.voiceName === selectedVoice?.name && 
                                            u.episodeNumber === episode.episodeNumber
                                        );
                                        return !isInUploads;
                                    })
                                    .map(episode => renderEpisodeCard({
                                        key: `ep-${episode.id}`,
                                        episodeNumber: episode.episodeNumber,
                                        quality: episode.maxQuality,
                                        minQuality: episode.minQuality,
                                        status: episode.videoStatus,
                                        progress: episode.conversionProgress || 0,
                                        duration: episode.durationSeconds,
                                        screenshotUrl: episode.screenshotPath 
                                            ? `${SERVER_URL2}/api/video/screenshot/${episode.screenshotPath}` 
                                            : undefined,
                                        conversionDetails: episode.conversionDetails,
                                        onDelete: () => handleDeleteEpisode(episode.id)
                                    }))}
                                
                                {/* Активные загрузки/конвертации */}
                                {uploads
                                    .filter(u => selectedVoice && u.voiceName === selectedVoice.name)
                                    .map(upload => renderEpisodeCard({
                                        key: upload.uploadId,
                                        episodeNumber: upload.episodeNumber,
                                        quality: upload.quality,
                                        status: upload.status,
                                        progress: upload.progress,
                                        step: upload.step,
                                        duration: upload.duration,
                                        screenshotUrl: upload.screenshotUrl,
                                        conversionDetails: upload.conversionDetails,
                                        isUpload: true,
                                        onCancel: upload.status === 'ready' 
                                            ? () => removeUpload(upload.uploadId)
                                            : upload.onCancel
                                    }))}
                                    
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

