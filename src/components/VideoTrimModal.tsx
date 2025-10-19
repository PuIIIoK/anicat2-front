'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, X, Scissors, Camera } from 'lucide-react';
import './VideoTrimModal.scss';

interface VideoTrimModalProps {
  file: File;
  type: 'avatar' | 'banner' | 'background';
  onConfirm: (startTime: number, endTime: number, previewFrame?: number) => void;
  onCancel: () => void;
  isProcessing?: boolean;
}

const VideoTrimModal: React.FC<VideoTrimModalProps> = ({ file, type, onConfirm, onCancel, isProcessing = false }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [duration, setDuration] = useState<number>(0);
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(10);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [previewFrameTime, setPreviewFrameTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [isDragging, setIsDragging] = useState<'start' | 'end' | 'scrubber' | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    let isInitialized = false;

    const initializeVideo = () => {
      // Инициализируем только один раз!
      if (isInitialized) return;
      
      const videoDuration = video.duration;
      if (videoDuration && videoDuration > 0 && !isNaN(videoDuration)) {
        setDuration(videoDuration);
        
        // Устанавливаем дефолтный диапазон ТОЛЬКО при первой инициализации
        if (videoDuration <= 10) {
          setStartTime(0);
          setEndTime(videoDuration);
        } else {
          setStartTime(0);
          setEndTime(10);
        }
        
        isInitialized = true;
      }
    };

    const handleLoadedMetadata = () => {
      initializeVideo();
    };

    const handleCanPlay = () => {
      // Проверяем, установлена ли длительность
      if (video.duration && video.duration > 0 && !isNaN(video.duration)) {
        initializeVideo();
      }
    };

    // Пробуем получить длительность сразу
    if (video.readyState >= 1) {
      initializeVideo();
    }

    // Принудительно загружаем метаданные
    video.load();

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('canplay', handleCanPlay);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('canplay', handleCanPlay);
    };
  }, [videoUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      
      // Автостоп при достижении конца выбранного фрагмента
      if (video.currentTime >= endTime) {
        video.pause();
        video.currentTime = startTime;
        setIsPlaying(false);
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [endTime, startTime]);

  // Обработчик перетаскивания таймлайна (поддержка mouse и touch)
  const handleTimelineDrag = useCallback((clientX: number) => {
    if (!isDragging || !timelineRef.current || duration === 0) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percentage = x / rect.width;
    const time = percentage * duration;

    if (isDragging === 'start') {
      // Начало может быть в любом месте видео
      const newStart = Math.max(0, Math.min(time, duration - 0.5));
      
      // Конец автоматически следует за началом (макс 10 секунд после начала)
      const newEnd = Math.min(newStart + 10, duration);
      
      setStartTime(newStart);
      setEndTime(newEnd);
    } else if (isDragging === 'end') {
      // Конец может быть максимум на +10 секунд от начала
      const maxEnd = Math.min(startTime + 10, duration);
      const newEnd = Math.max(startTime + 0.5, Math.min(time, maxEnd));
      setEndTime(newEnd);
    } else if (isDragging === 'scrubber') {
      // Scrubber ТОЛЬКО двигает текущую позицию, НЕ влияя на startTime/endTime
      const newTime = Math.max(0, Math.min(time, duration));
      if (videoRef.current) {
        videoRef.current.currentTime = newTime;
        setCurrentTime(newTime);
      }
    }
  }, [isDragging, duration, startTime]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    handleTimelineDrag(e.clientX);
  }, [handleTimelineDrag]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (e.touches.length > 0) {
      e.preventDefault(); // Предотвращаем скролл на мобильных
      handleTimelineDrag(e.touches[0].clientX);
    }
  }, [handleTimelineDrag]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(null);
  }, []);

  useEffect(() => {
    if (isDragging) {
      // Поддержка mouse событий
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleDragEnd);
      
      // Поддержка touch событий для мобильных
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleDragEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleDragEnd);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleDragEnd);
      };
    }
  }, [isDragging, handleMouseMove, handleTouchMove, handleDragEnd]);

  // Обработчик клавиши Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onCancel]);

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      if (video.currentTime >= endTime || video.currentTime < startTime) {
        video.currentTime = startTime;
      }
      video.play();
      setIsPlaying(true);
    }
  };

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const ms = Math.floor((time % 1) * 10);
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${ms}`;
  };

  const getFragmentDuration = (): number => {
    return endTime - startTime;
  };

  const handleSetPreviewFrame = () => {
    if (videoRef.current) {
      setPreviewFrameTime(videoRef.current.currentTime);
    }
  };

  const handleConfirm = () => {
    // Всегда гарантируем, что фрагмент не больше 10 секунд
    const fragmentDuration = endTime - startTime;
    const finalStart = startTime;
    const finalEnd = fragmentDuration > 10 ? startTime + 10 : endTime;
    
    // Если preview кадр не был явно установлен (0 или не в пределах фрагмента),
    // передаем 0, чтобы сервер выбрал случайный кадр из видео
    const finalPreviewFrame = (previewFrameTime > 0 && previewFrameTime >= finalStart && previewFrameTime <= finalEnd) 
      ? previewFrameTime 
      : 0;
    
    onConfirm(finalStart, finalEnd, finalPreviewFrame);
  };

  return (
    <div className="video-trim-modal-overlay">{/* Клик на overlay не закрывает модалку */}
      <div className="video-trim-modal" onClick={(e) => e.stopPropagation()}>
        <div className="video-trim-modal-header">
          <h2><Scissors size={20} /> Обрезка видео для {type === 'avatar' ? 'аватара' : 'баннера'}</h2>
          <button className="close-btn" onClick={onCancel}>
            <X size={20} />
          </button>
        </div>

        <div className="video-trim-modal-content">
          <div className="video-preview">
            {videoUrl && (
              <video
                ref={videoRef}
                src={videoUrl}
                className="trim-video"
                onEnded={() => setIsPlaying(false)}
              />
            )}
            
            <div className="video-controls">
              <button className="play-pause-btn" onClick={togglePlayPause}>
                {isPlaying ? <Pause size={18} /> : <Play size={18} />}
              </button>
              <div className="time-display">
                {formatTime(currentTime)} / {duration > 0 ? formatTime(duration) : '0:00.0'}
              </div>
            </div>
          </div>

          <div className="timeline-section">
            <div className="timeline-info">
              <div className="info-item">
                <span className="info-label">Длительность видео:</span>
                <span className="info-value">{duration > 0 ? formatTime(duration) : 'Загрузка...'}</span>
              </div>
              <div className="info-item highlighted">
                <span className="info-label">Фрагмент для обрезки:</span>
                <span className="info-value">
                  {duration > 0 ? `${formatTime(startTime)} - ${formatTime(endTime)} (${formatTime(getFragmentDuration())})` : 'Загрузка...'}
                </span>
              </div>
            </div>

            <div className="timeline-visualizer" ref={timelineRef}>
              <div className="timeline-track">
                {/* Неактивная область слева */}
                {duration > 0 && (
                  <div 
                    className="timeline-inactive"
                    style={{
                      width: `${(startTime / duration) * 100}%`
                    }}
                  />
                )}
                
                {/* Активная область (выбранный фрагмент) */}
                {duration > 0 && (
                  <div 
                    className="timeline-active"
                    style={{
                      left: `${(startTime / duration) * 100}%`,
                      width: `${((endTime - startTime) / duration) * 100}%`
                    }}
                  >
                    {/* Левый хендл */}
                    <div 
                      className="timeline-handle timeline-handle-start"
                      onMouseDown={() => setIsDragging('start')}
                      onTouchStart={() => setIsDragging('start')}
                    >
                      <div className="timeline-handle-line" />
                    </div>
                    
                    {/* Правый хендл */}
                    <div 
                      className="timeline-handle timeline-handle-end"
                      onMouseDown={() => setIsDragging('end')}
                      onTouchStart={() => setIsDragging('end')}
                    >
                      <div className="timeline-handle-line" />
                    </div>
                  </div>
                )}
                
                {/* Неактивная область справа */}
                {duration > 0 && (
                  <div 
                    className="timeline-inactive"
                    style={{
                      left: `${(endTime / duration) * 100}%`,
                      width: `${((duration - endTime) / duration) * 100}%`
                    }}
                  />
                )}
                
                {/* Scrubber (текущая позиция) */}
                {duration > 0 && (
                  <div 
                    className="timeline-scrubber"
                    style={{
                      left: `${(currentTime / duration) * 100}%`
                    }}
                    onMouseDown={() => setIsDragging('scrubber')}
                    onTouchStart={() => setIsDragging('scrubber')}
                  >
                    <div className="timeline-scrubber-line" />
                    <div className="timeline-scrubber-handle" />
                  </div>
                )}

                {/* Метка превью кадра */}
                {duration > 0 && previewFrameTime > 0 && (
                  <div 
                    className="timeline-preview-marker"
                    style={{
                      left: `${(previewFrameTime / duration) * 100}%`
                    }}
                    title={`Кадр превью: ${formatTime(previewFrameTime)}`}
                  >
                    <Camera size={16} />
                  </div>
                )}
              </div>
            </div>

            <div className="preview-frame-section">
              <button 
                className="preview-frame-btn"
                onClick={handleSetPreviewFrame}
                disabled={currentTime < startTime || currentTime > endTime}
              >
                <Camera size={16} /> Установить текущий кадр как превью
              </button>
              {previewFrameTime > 0 && (
                <span className="preview-frame-info">
                  <Camera size={14} /> Кадр превью: {formatTime(previewFrameTime)}
                </span>
              )}
            </div>

            {getFragmentDuration() > 10 && (
              <div className="warning-message">
                ⚠️ Фрагмент будет автоматически обрезан до 10 секунд
              </div>
            )}
          </div>
        </div>

        <div className="video-trim-modal-footer">
          <button className="cancel-btn" onClick={onCancel} disabled={isProcessing}>
            Отмена
          </button>
          <button className="confirm-btn" onClick={handleConfirm} disabled={isProcessing}>
            {isProcessing ? (
              <>
                <span className="spinner" /> Обработка...
              </>
            ) : (
              <>
                <Scissors size={16} /> Обрезать и применить
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoTrimModal;

