'use client';

import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { X, CheckCircle, Clock, AlertCircle, Mic, Minimize2, Maximize2, RefreshCw } from 'lucide-react';
import { useYumekoUpload } from '../../context/YumekoUploadContext';
import { API_SERVER } from '../../../tools/constants';
import './yumeko-upload-notification.scss';

const getTokenFromCookie = () => {
    const match = document.cookie.match(/(?:^|; )token=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : null;
};

const YumekoUploadNotification: React.FC = () => {
    const { uploads, isMinimized, setIsMinimized, activeTab, setActiveTab, removeUpload, updateUpload } = useYumekoUpload();
    const [isChecking, setIsChecking] = useState(false);

    if (uploads.length === 0) return null;
    
    const currentUpload = uploads.find(u => u.uploadId === activeTab) || uploads[0];

    const getStepStatus = (stepProgress: number, isConversionStep?: boolean) => {
        // Специальная логика для шага конвертации - он активен в диапазоне 35-95%
        if (isConversionStep && currentUpload.progress > 35 && currentUpload.progress < 95) {
            return 'active';
        }
        
        if (currentUpload.progress >= stepProgress) {
            return 'completed';
        } else if (currentUpload.progress >= stepProgress - 5) {
            return 'active';
        }
        return 'pending';
    };

    const handleCheckStatus = async () => {
        if (!currentUpload || !currentUpload.episodeId || isChecking) return;
        
        setIsChecking(true);
        try {
            const token = getTokenFromCookie();
            const response = await fetch(`${API_SERVER}/api/admin/yumeko/episodes/${currentUpload.episodeId}/status`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                if (response.status === 404) {
                    alert('Эпизод не найден. Возможно, он был удален.');
                    removeUpload(currentUpload.uploadId);
                    return;
                }
                throw new Error('Ошибка получения статуса');
            }

            const episode = await response.json();
            console.log('✅ Проверка статуса:', episode);

            // Обновляем статус в зависимости от ответа
            if (episode.videoStatus === 'ready') {
                updateUpload(currentUpload.uploadId, {
                    step: 'Готово! Можно закрыть окно',
                    progress: 100,
                    status: 'ready'
                });
                alert('✅ Конвертация завершена! Эпизод готов к просмотру.');
            } else if (episode.videoStatus === 'converting') {
                const progress = episode.conversionProgress || 0;
                
                let step: string;
                let totalProgress: number;
                
                if (progress === 0) {
                    step = 'Запуск конвертации в HLS формат...';
                    totalProgress = 35;
                } else if (progress >= 95) {
                    // При 95%+ показываем "Обработка" без процентов
                    step = 'Обработка';
                    totalProgress = 95;
                } else {
                    step = `Конвертация видео... ${Math.round(progress)}%`;
                    // Конвертация занимает диапазон 35-95%
                    totalProgress = 35 + (progress * 0.6);
                }
                
                updateUpload(currentUpload.uploadId, {
                    step,
                    progress: Math.min(95, totalProgress),
                    status: 'converting'
                });
                
                if (progress >= 95) {
                    alert(`⏳ Финальная обработка видео...`);
                } else {
                    alert(`⏳ Конвертация в процессе: ${Math.round(progress)}%`);
                }
            } else if (episode.videoStatus === 'error') {
                updateUpload(currentUpload.uploadId, {
                    step: 'Ошибка',
                    progress: 0,
                    status: 'error',
                    errorMessage: episode.errorMessage || 'Неизвестная ошибка'
                });
                alert(`❌ Ошибка: ${episode.errorMessage || 'Неизвестная ошибка'}`);
            } else {
                alert(`ℹ️ Статус: ${episode.videoStatus}`);
            }
        } catch (error) {
            console.error('Ошибка проверки статуса:', error);
            alert('❌ Не удалось проверить статус. Попробуйте еще раз.');
        } finally {
            setIsChecking(false);
        }
    };

    const notificationContent = (
        <div className={`yumeko-upload-notification ${isMinimized ? 'minimized' : 'expanded'} ${uploads.length > 1 ? 'has-tabs' : ''}`}>
            <div className="upload-notification-header" onClick={() => isMinimized && setIsMinimized(false)}>
                <div className="header-content">
                    <Mic className="header-icon" size={18} />
                    <div className="header-text">
                        <h4>Загрузка эпизодов ({uploads.length})</h4>
                        {!isMinimized && (
                            <p>{currentUpload.voiceName} - Эпизод {currentUpload.episodeNumber} ({currentUpload.quality})</p>
                        )}
                    </div>
                </div>
                <div className="header-actions">
                    {(currentUpload.status === 'uploading' || currentUpload.status === 'converting') && (
                        <button
                            className="btn-cancel-notification"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('Вы уверены, что хотите отменить загрузку и конвертацию?')) {
                                    currentUpload.onCancel?.();
                                }
                            }}
                            title="Отменить загрузку"
                        >
                            <X size={16} />
                        </button>
                    )}
                    <button
                        className="btn-minimize"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsMinimized(!isMinimized);
                        }}
                        title={isMinimized ? 'Развернуть' : 'Свернуть'}
                    >
                        {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
                    </button>
                    {(currentUpload.status === 'ready' || currentUpload.status === 'error') && (
                        <button
                            className="btn-close-notification"
                            onClick={(e) => {
                                e.stopPropagation();
                                removeUpload(currentUpload.uploadId);
                            }}
                            title="Закрыть"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* Вкладки для множественных загрузок */}
            {uploads.length > 1 && !isMinimized && (
                <div className="upload-tabs">
                    {uploads.map(upload => (
                        <div
                            key={upload.uploadId}
                            className={`upload-tab ${upload.uploadId === currentUpload.uploadId ? 'active' : ''} ${upload.status}`}
                            onClick={() => setActiveTab(upload.uploadId)}
                        >
                            <div className="tab-info">
                                <span className="tab-voice">{upload.voiceName}</span>
                                <span className="tab-episode">Эп. {upload.episodeNumber}</span>
                                <span className="tab-quality">{upload.quality}</span>
                            </div>
                            {(upload.status === 'ready' || upload.status === 'error') && (
                                <button
                                    className="btn-close-tab"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeUpload(upload.uploadId);
                                    }}
                                    title="Закрыть"
                                >
                                    <X size={14} />
                                </button>
                            )}
                            {(upload.status === 'uploading' || upload.status === 'converting') && (
                                <button
                                    className="btn-cancel-tab"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (confirm('Вы уверены, что хотите отменить загрузку?')) {
                                            upload.onCancel?.();
                                        }
                                    }}
                                    title="Отменить"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {!isMinimized && (
                <div className="upload-notification-body">
                    {currentUpload.status === 'error' ? (
                        <div className="upload-error-state">
                            <AlertCircle size={48} />
                            <h3>Произошла ошибка</h3>
                            <p>{currentUpload.errorMessage || 'Неизвестная ошибка'}</p>
                        </div>
                    ) : currentUpload.status === 'ready' ? (
                        <div className="upload-success-state">
                            <CheckCircle size={48} />
                            <h3>Эпизод успешно загружен!</h3>
                        </div>
                    ) : (
                        <>
                            <div className="upload-steps">
                                <div className={`upload-step ${getStepStatus(15)}`}>
                                    <div className="step-icon">
                                        {getStepStatus(15) === 'completed' ? <CheckCircle size={18} /> : <Clock size={18} />}
                                    </div>
                                    <div className="step-text">Загрузка видео на сервер</div>
                                </div>
                                <div className={`upload-step ${getStepStatus(20)}`}>
                                    <div className="step-icon">
                                        {getStepStatus(20) === 'completed' ? <CheckCircle size={18} /> : <Clock size={18} />}
                                    </div>
                                    <div className="step-text">Получение видео</div>
                                </div>
                                <div className={`upload-step ${getStepStatus(35)}`}>
                                    <div className="step-icon">
                                        {getStepStatus(35) === 'completed' ? <CheckCircle size={18} /> : <Clock size={18} />}
                                    </div>
                                    <div className="step-text">Запуск конвертации в HLS формат</div>
                                </div>
                                <div className={`upload-step ${getStepStatus(95, true)}`}>
                                    <div className="step-icon">
                                        {getStepStatus(95, true) === 'completed' ? <CheckCircle size={18} /> : <Clock size={18} />}
                                    </div>
                                    <div className="step-text">Конвертация видео</div>
                                    {currentUpload.progress > 35 && currentUpload.progress < 95 && (
                                        <div className="step-progress-bar">
                                            <div 
                                                className="step-progress-fill" 
                                                style={{ width: `${Math.max(0, (currentUpload.progress - 35) / 0.6)}%` }}
                                            />
                                        </div>
                                    )}
                                </div>
                                <div className={`upload-step ${getStepStatus(90)}`}>
                                    <div className="step-icon">
                                        {getStepStatus(90) === 'completed' ? <CheckCircle size={18} /> : <Clock size={18} />}
                                    </div>
                                    <div className="step-text">Получение скриншота</div>
                                </div>
                            </div>

                            <div className="upload-progress-section">
                                <div className="progress-text">
                                    {currentUpload.step}
                                    {currentUpload.step === 'Обработка' && (
                                        <RefreshCw size={16} className="processing-spinner" />
                                    )}
                                </div>
                                <div className="progress-bar-wrapper">
                                    <div className="progress-bar">
                                        <div 
                                            className="progress-fill" 
                                            style={{ width: `${currentUpload.progress}%` }}
                                        />
                                    </div>
                                    {currentUpload.step !== 'Обработка' && (
                                        <div className="progress-percent">{Math.round(currentUpload.progress)}%</div>
                                    )}
                                </div>
                                
                                {/* Кнопка проверки статуса */}
                                {currentUpload.episodeId > 0 && (
                                    <button 
                                        className="btn-check-status"
                                        onClick={handleCheckStatus}
                                        disabled={isChecking}
                                        title="Проверить актуальный статус конвертации"
                                    >
                                        <RefreshCw size={16} className={isChecking ? 'spinning' : ''} />
                                        {isChecking ? 'Проверка...' : 'Проверить статус'}
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Минимизированная версия - только прогресс */}
            {isMinimized && currentUpload.status !== 'ready' && currentUpload.status !== 'error' && (
                <div className="minimized-progress">
                    <div className="mini-progress-bar">
                        <div 
                            className="mini-progress-fill" 
                            style={{ width: `${currentUpload.progress}%` }}
                        />
                    </div>
                    <div className="mini-progress-text">{Math.round(currentUpload.progress)}%</div>
                </div>
            )}
        </div>
    );

    // Рендерим через Portal
    if (typeof document === 'undefined') return null;
    return ReactDOM.createPortal(notificationContent, document.body);
};

export default YumekoUploadNotification;

