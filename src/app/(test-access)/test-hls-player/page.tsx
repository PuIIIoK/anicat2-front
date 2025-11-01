'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import '@/styles/components/test-hls-player.scss';

const API_SERVER = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export default function TestHLSPlayer() {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const hlsRef = useRef<Hls | null>(null);
    const [videoUrl, setVideoUrl] = useState(`${API_SERVER}/api/video/hls/testing/angel_1080_1.mp4/master.m3u8`);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentQuality, setCurrentQuality] = useState('auto');
    const [availableQualities, setAvailableQualities] = useState<Array<{ level: number; height: number; bitrate: number }>>([]);
    const [logs, setLogs] = useState<string[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [modalStatus, setModalStatus] = useState('checking');
    const [modalMessage, setModalMessage] = useState('Проверка HLS потока...');
    const [modalProgress, setModalProgress] = useState(0);
    const statusCheckInterval = useRef<NodeJS.Timeout | null>(null);
    
    // Новые состояния для контролов
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isBuffering, setIsBuffering] = useState(false);
    const [bufferedPercent, setBufferedPercent] = useState(0);

    const addLog = (message: string) => {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`].slice(-10));
        console.log(message);
    };

    useEffect(() => {
        checkConversionStatus();
        return () => {
            if (statusCheckInterval.current) {
                clearInterval(statusCheckInterval.current);
            }
            if (hlsRef.current) {
                hlsRef.current.destroy();
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // НЕ автоматически обновляем плеер - только после 100% в initializePlayer

    const checkConversionStatus = async () => {
        setShowModal(true);
        setModalStatus('checking');
        setModalMessage('Проверка HLS потока...');
        setModalProgress(0);

        try {
            const response = await fetch(`${API_SERVER}/api/video/hls/testing/angel_1080_1.mp4/status`);
            const data = await response.json();

            if (data.progress === 100) {
                // HLS готов - инициализируем плеер
                setModalStatus('ready');
                setModalMessage('Готово! Запускаем видео...');
                setModalProgress(100);
                setTimeout(() => {
                    setShowModal(false);
                    // URL уже установлен изначально, добавляем timestamp
                    const timestamp = Date.now();
                    const newUrl = `${API_SERVER}/api/video/hls/testing/angel_1080_1.mp4/master.m3u8?t=${timestamp}`;
                    setVideoUrl(newUrl);
                    addLog(`HLS готов! Загружаем: ${newUrl}`);
                    initializePlayer(newUrl);
                }, 1000);
            } else if (data.progress === 0 || data.status === 'not_started') {
                // Конвертация не начата - backend автоматически запустит при следующем запросе
                setModalStatus('not_found');
                setModalMessage('Поток не найден, поиск видео...');
                setModalProgress(5);
                // Запускаем проверку прогресса - backend уже начал конвертацию
                setTimeout(() => {
                    startProgressCheck();
                }, 1000);
            } else if (data.status === 'starting' || data.progress === 5) {
                // Конвертация только запускается
                setModalStatus('found');
                setModalMessage('Видео найдено! Запуск конвертации...');
                setModalProgress(data.progress || 5);
                startProgressCheck();
            } else {
                // Конвертация в процессе - показываем прогресс
                setModalStatus('converting');
                setModalMessage(`Конвертация в HLS 1080p... ${data.progress}%`);
                setModalProgress(data.progress);
                // НЕ инициализируем плеер - ждем завершения конвертации
                startProgressCheck();
            }
        } catch (error) {
            console.error('Ошибка проверки статуса:', error);
            setModalStatus('error');
            setModalMessage('Ошибка проверки статуса. Попробуйте обновить страницу.');
            // НЕ инициализируем плеер при ошибке
        }
    };

    const startProgressCheck = () => {
        statusCheckInterval.current = setInterval(async () => {
            try {
                const response = await fetch(`${API_SERVER}/api/video/hls/testing/angel_1080_1.mp4/status`);
                const data = await response.json();
                
                setModalProgress(data.progress);
                
                if (data.progress === 100) {
                    // Конвертация завершена - инициализируем плеер
                    setModalStatus('ready');
                    setModalMessage('Готово! Запускаем видео...');
                    if (statusCheckInterval.current) {
                        clearInterval(statusCheckInterval.current);
                        statusCheckInterval.current = null;
                    }
                    
                    // Уничтожаем старый плеер если есть
                    if (hlsRef.current) {
                        hlsRef.current.destroy();
                        hlsRef.current = null;
                    }
                    
                    setTimeout(() => {
                        setShowModal(false);
                        // Обновляем URL с timestamp для сброса кэша
                        const timestamp = Date.now();
                        const newUrl = `${API_SERVER}/api/video/hls/testing/angel_1080_1.mp4/master.m3u8?t=${timestamp}`;
                        setVideoUrl(newUrl);
                        addLog(`Конвертация завершена! Загружаем HLS: ${newUrl}`);
                        // Инициализируем плеер с новым URL напрямую
                        initializePlayer(newUrl);
                    }, 1000);
                } else if (data.progress === -1) {
                    setModalStatus('error');
                    setModalMessage('Ошибка конвертации. Проверьте логи backend.');
                    if (statusCheckInterval.current) {
                        clearInterval(statusCheckInterval.current);
                    }
                } else {
                    // Обновляем сообщение для прогресса
                    setModalStatus('converting');
                    setModalMessage(`Конвертация в HLS 1080p... ${data.progress}%`);
                }
            } catch (error) {
                console.error('Ошибка проверки прогресса:', error);
            }
        }, 3000); // Проверяем каждые 3 секунды
    };

    const initializePlayer = (urlToLoad?: string) => {
        const video = videoRef.current;
        if (!video) {
            addLog('Видео элемент не найден');
            return;
        }

        // Уничтожаем старый плеер если он есть
        if (hlsRef.current) {
            addLog('Уничтожение старого экземпляра плеера');
            hlsRef.current.destroy();
            hlsRef.current = null;
        }

        const sourceUrl = urlToLoad || videoUrl;
        addLog(`Инициализация плеера с URL: ${sourceUrl}`);

        // Устанавливаем громкость
        video.volume = volume;

        // Подписываемся на события видео
        video.addEventListener('timeupdate', () => {
            setCurrentTime(video.currentTime);
        });

        video.addEventListener('durationchange', () => {
            setDuration(video.duration);
        });

        video.addEventListener('waiting', () => {
            setIsBuffering(true);
            addLog('Буферизация...');
        });

        video.addEventListener('playing', () => {
            setIsBuffering(false);
            setIsPlaying(true);
        });

        video.addEventListener('pause', () => {
            setIsPlaying(false);
        });

        video.addEventListener('progress', () => {
            if (video.buffered.length > 0) {
                const bufferedEnd = video.buffered.end(video.buffered.length - 1);
                const percent = (bufferedEnd / video.duration) * 100;
                setBufferedPercent(percent);
            }
        });

        if (Hls.isSupported()) {
            addLog('HLS.js поддерживается');
            const hls = new Hls({
                debug: false, // Отключаем debug чтобы не засорять консоль
                enableWorker: true,
                lowLatencyMode: false,
                backBufferLength: 90,
                maxBufferLength: 30,
                maxMaxBufferLength: 60,
            });

            hlsRef.current = hls;

            hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
                addLog(`Манифест загружен: ${data.levels.length} качеств`);
                const qualities = data.levels.map((level, index) => ({
                    level: index,
                    height: level.height,
                    bitrate: level.bitrate
                }));
                setAvailableQualities(qualities);
            });

            hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
                addLog(`Качество изменено: ${data.level} (${hls.levels[data.level]?.height}p)`);
            });

            hls.on(Hls.Events.ERROR, (event, data) => {
                // НЕ логируем каждую ошибку чтобы избежать спама
                
                if (data.fatal) {
                    // Проверяем конкретный тип ошибки
                    if (data.details === 'levelEmptyError') {
                        addLog('HLS плейлист пуст или не готов. Видео еще конвертируется.');
                        // НЕ пытаемся восстановить - ждем завершения конвертации
                        hls.destroy();
                        hlsRef.current = null;
                        return;
                    }
                    
                    addLog(`Критическая ошибка: ${data.type} - ${data.details}`);
                    
                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            // Только если это НЕ levelEmptyError
                            if (data.details !== 'levelLoadError' && data.details !== 'manifestLoadError') {
                                addLog('Попытка восстановления после сетевой ошибки...');
                                hls.startLoad();
                            } else {
                                addLog('Не удалось загрузить манифест. Остановка плеера.');
                                hls.destroy();
                                hlsRef.current = null;
                            }
                            break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            addLog('Попытка восстановления после медиа ошибки...');
                            hls.recoverMediaError();
                            break;
                        default:
                            addLog('Критическая ошибка, уничтожение плеера...');
                            hls.destroy();
                            hlsRef.current = null;
                            break;
                    }
                }
            });

            hls.on(Hls.Events.FRAG_LOADED, (event, data) => {
                addLog(`Фрагмент загружен: ${data.frag.sn} (${Math.round(data.frag.duration)}s)`);
            });

            hls.loadSource(sourceUrl);
            hls.attachMedia(video);

            return () => {
                hls.destroy();
            };
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            addLog('Нативная поддержка HLS (Safari)');
            video.src = videoUrl;
        } else {
            addLog('HLS не поддерживается в этом браузере');
        }
    };

    const handlePlayPause = () => {
        const video = videoRef.current;
        if (!video) return;

        if (video.paused) {
            video.play();
            setIsPlaying(true);
            addLog('Воспроизведение запущено');
        } else {
            video.pause();
            setIsPlaying(false);
            addLog('Воспроизведение приостановлено');
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const video = videoRef.current;
        if (!video) return;

        const time = parseFloat(e.target.value);
        video.currentTime = time;
        setCurrentTime(time);
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const video = videoRef.current;
        if (!video) return;

        const newVolume = parseFloat(e.target.value);
        video.volume = newVolume;
        setVolume(newVolume);
    };

    const formatTime = (seconds: number) => {
        if (isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleQualityChange = (level: number) => {
        if (!hlsRef.current) return;
        
        if (level === -1) {
            hlsRef.current.currentLevel = -1;
            setCurrentQuality('auto');
            addLog('Качество: Авто');
        } else {
            hlsRef.current.currentLevel = level;
            setCurrentQuality(`${hlsRef.current.levels[level]?.height}p`);
            addLog(`Качество установлено: ${hlsRef.current.levels[level]?.height}p`);
        }
    };

    const handleUrlChange = () => {
        const newUrl = prompt('Введите URL HLS потока:', videoUrl);
        if (newUrl && newUrl !== videoUrl) {
            setVideoUrl(newUrl);
            addLog(`URL изменен: ${newUrl}`);
        }
    };

    return (
        <div className="test-hls-container">
            {showModal && (
                <div className="conversion-modal-overlay">
                    <div className="conversion-modal">
                        <div className="conversion-modal-icon">
                            {modalStatus === 'checking' && <div className="spinner"></div>}
                            {modalStatus === 'not_found' && <div className="spinner"></div>}
                            {modalStatus === 'found' && '🎬'}
                            {modalStatus === 'converting' && <div className="spinner"></div>}
                            {modalStatus === 'ready' && '✓'}
                            {modalStatus === 'error' && '✗'}
                        </div>
                        <div className="conversion-modal-message">{modalMessage}</div>
                        {(modalStatus === 'converting' || modalStatus === 'found') && (
                            <div className="conversion-progress">
                                <div className="conversion-progress-bar" style={{ width: `${modalProgress}%` }}></div>
                                <div className="conversion-progress-text">{modalProgress}%</div>
                            </div>
                        )}
                        {modalStatus === 'ready' && (
                            <div className="conversion-success">Воспроизведение начнется через секунду...</div>
                        )}
                        {modalStatus === 'error' && (
                            <div className="conversion-error" style={{color: '#ff4444', marginTop: '12px'}}>
                                Не обновляйте страницу. Попробуйте очистить через: 
                                <br/>
                                <code style={{background: '#333', padding: '4px 8px', borderRadius: '4px', fontSize: '12px'}}>
                                    /api/video/hls/.../reset
                                </code>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <h1 className="test-hls-title">Тест HLS Плеера</h1>
            
            <div className="test-hls-player">
                <div className="video-wrapper">
                    <video
                        ref={videoRef}
                        className="test-hls-video"
                        controls={false}
                        playsInline
                    />
                    
                    {isBuffering && (
                        <div className="buffering-overlay">
                            <div className="spinner"></div>
                            <div>Буферизация...</div>
                        </div>
                    )}
                </div>
                
                <div className="test-hls-controls">
                    {/* Progress Bar */}
                    <div className="progress-container">
                        <div className="time-display">{formatTime(currentTime)}</div>
                        <div className="progress-wrapper">
                            <div 
                                className="progress-buffered" 
                                style={{ width: `${bufferedPercent}%` }}
                            />
                            <input
                                type="range"
                                min="0"
                                max={duration || 0}
                                value={currentTime}
                                onChange={handleSeek}
                                className="progress-bar"
                            />
                            <div 
                                className="progress-played" 
                                style={{ width: `${(currentTime / duration) * 100}%` }}
                            />
                        </div>
                        <div className="time-display">{formatTime(duration)}</div>
                    </div>
                    
                    {/* Control Buttons */}
                    <div className="control-row">
                        <button onClick={handlePlayPause} className="test-hls-btn">
                            {isPlaying ? '⏸ Пауза' : '▶ Играть'}
                        </button>
                        
                        {/* Volume Control */}
                        <div className="volume-control">
                            <span>🔊</span>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.1"
                                value={volume}
                                onChange={handleVolumeChange}
                                className="volume-slider"
                            />
                            <span>{Math.round(volume * 100)}%</span>
                        </div>
                        
                        <div className="test-hls-quality">
                            <label>Качество: </label>
                            <select 
                                value={currentQuality} 
                                onChange={(e) => {
                                    const value = e.target.value;
                                    if (value === 'auto') {
                                        handleQualityChange(-1);
                                    } else {
                                        const level = availableQualities.findIndex(q => `${q.height}p` === value);
                                        if (level !== -1) handleQualityChange(level);
                                    }
                                }}
                                className="test-hls-select"
                            >
                                <option value="auto">Авто</option>
                                {availableQualities.map(q => (
                                    <option key={q.level} value={`${q.height}p`}>
                                        {q.height}p ({Math.round(q.bitrate / 1000)} kbps)
                                    </option>
                                ))}
                            </select>
                        </div>
                        
                        <button onClick={handleUrlChange} className="test-hls-btn">
                            Изменить URL
                        </button>
                    </div>
                </div>
            </div>

            <div className="test-hls-info">
                <h2>Информация</h2>
                <div className="test-hls-info-item">
                    <strong>Текущий URL:</strong>
                    <div className="test-hls-url">{videoUrl}</div>
                </div>
                <div className="test-hls-info-item">
                    <strong>Текущее качество:</strong> {currentQuality}
                </div>
                <div className="test-hls-info-item">
                    <strong>Доступные качества:</strong> {availableQualities.length}
                </div>
            </div>

            <div className="test-hls-logs">
                <h2>Логи</h2>
                <div className="test-hls-logs-content">
                    {logs.map((log, index) => (
                        <div key={index} className="test-hls-log-item">{log}</div>
                    ))}
                </div>
            </div>

            <div className="test-hls-instructions">
                <h2>Инструкции</h2>
                <ol>
                    <li>Убедитесь, что backend запущен (http://localhost:8080)</li>
                    <li>Конвертируйте видео в HLS формат с помощью скрипта</li>
                    <li>Загрузите HLS файлы в S3</li>
                    <li>Нажмите &quot;Играть&quot; для начала воспроизведения</li>
                    <li>Выберите качество из выпадающего списка</li>
                </ol>
            </div>
        </div>
    );
}

