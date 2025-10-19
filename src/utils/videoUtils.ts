/**
 * Утилиты для работы с видео и анимированными изображениями
 */

export interface VideoProcessingOptions {
  maxDuration: number; // максимальная длительность в секундах
  maxSize: number; // максимальный размер в байтах
  quality: number; // качество 0-1
}

/**
 * Проверяет, является ли файл анимированным
 */
export const isAnimatedFile = (file: File): boolean => {
  const animatedTypes = [
    'image/gif',
    'video/mp4',
    'video/webm',
    'image/webp'
  ];
  return animatedTypes.includes(file.type);
};

/**
 * Получает длительность видео
 */
export const getVideoDuration = (file: File): Promise<number> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };
    
    video.onerror = () => {
      reject(new Error('Не удалось загрузить видео'));
    };
    
    video.src = URL.createObjectURL(file);
  });
};

/**
 * Сжимает и обрезает видео с указанием начала и конца
 */
export const compressAndTrimVideo = async (
  file: File,
  startTime: number = 0,
  endTime?: number,
  quality: number = 0.7
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Canvas не поддерживается'));
      return;
    }

    video.preload = 'metadata';
    video.muted = true; // Отключаем звук при обработке
    video.src = URL.createObjectURL(file);
    
    video.onloadedmetadata = async () => {
      const videoDuration = video.duration;
      const finalStartTime = Math.max(0, Math.min(startTime, videoDuration));
      const finalEndTime = endTime 
        ? Math.min(endTime, videoDuration) 
        : Math.min(finalStartTime + 10, videoDuration);
      
      const duration = finalEndTime - finalStartTime;
      
      if (duration <= 0) {
        reject(new Error('Неверный диапазон времени'));
        return;
      }
      
      console.log(`🎬 Обрезка видео: ${finalStartTime.toFixed(2)}с - ${finalEndTime.toFixed(2)}с (${duration.toFixed(2)}с)`);
      
      // Масштабируем размер для уменьшения веса
      const scale = Math.min(1, 720 / Math.max(video.videoWidth, video.videoHeight));
      canvas.width = Math.floor(video.videoWidth * scale);
      canvas.height = Math.floor(video.videoHeight * scale);
      
      // Устанавливаем начальную позицию
      video.currentTime = finalStartTime;
      
      video.onseeked = () => {
        // Используем MediaRecorder для записи
        const stream = canvas.captureStream(30);
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'video/webm;codecs=vp8',
          videoBitsPerSecond: 1000000 * quality
        });
        
        const chunks: Blob[] = [];
        
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunks.push(e.data);
          }
        };
        
        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'video/webm' });
          URL.revokeObjectURL(video.src);
          console.log(`✅ Видео обработано: ${formatFileSize(blob.size)}`);
          resolve(blob);
        };
        
        mediaRecorder.onerror = () => {
          reject(new Error('Ошибка записи видео'));
        };
        
        mediaRecorder.start();
        video.play();
        
        const drawFrame = () => {
          if (video.currentTime < finalEndTime && !video.paused) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            requestAnimationFrame(drawFrame);
          } else {
            video.pause();
            mediaRecorder.stop();
          }
        };
        
        requestAnimationFrame(drawFrame);
      };
    };
    
    video.onerror = () => {
      reject(new Error('Не удалось загрузить видео'));
    };
  });
};

/**
 * Сжимает GIF используя canvas
 */
export const compressGif = async (file: File, maxSize: number = 5 * 1024 * 1024): Promise<File> => {
  if (file.size <= maxSize) {
    return file;
  }
  
  // Для GIF просто возвращаем предупреждение
  console.warn('GIF слишком большой, рекомендуется использовать файл меньше', maxSize / 1024 / 1024, 'МБ');
  return file;
};

/**
 * Оптимизирует анимированный файл
 */
export const optimizeAnimatedFile = async (
  file: File,
  options: Partial<VideoProcessingOptions> = {},
  startTime?: number,
  endTime?: number
): Promise<Blob> => {
  const defaultOptions: VideoProcessingOptions = {
    maxDuration: 10, // 10 секунд
    maxSize: 10 * 1024 * 1024, // 10 МБ
    quality: 0.7
  };
  
  const opts = { ...defaultOptions, ...options };
  
  // Для GIF просто проверяем размер
  if (file.type === 'image/gif') {
    console.log(`📦 GIF файл: ${formatFileSize(file.size)}`);
    if (file.size > opts.maxSize) {
      throw new Error(`GIF слишком большой. Максимум: ${(opts.maxSize / 1024 / 1024).toFixed(1)} МБ`);
    }
    return file;
  }
  
  // Для видео сжимаем и обрезаем
  if (file.type.startsWith('video/')) {
    try {
      const duration = await getVideoDuration(file);
      console.log(`📹 Видео: ${duration.toFixed(1)}с, ${formatFileSize(file.size)}`);
      
      const finalStartTime = startTime !== undefined ? startTime : 0;
      const finalEndTime = endTime !== undefined ? endTime : Math.min(finalStartTime + opts.maxDuration, duration);
      
      return await compressAndTrimVideo(file, finalStartTime, finalEndTime, opts.quality);
    } catch (error) {
      console.error('Ошибка обработки видео:', error);
      throw error;
    }
  }
  
  return file;
};

/**
 * Форматирует размер файла
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
};

