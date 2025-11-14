// Глобальные типы для Window в Electron окружении
declare global {
  interface Window {
    // Electron API через preload
    electron?: {
      minimizeWindow: () => void;
      maximizeWindow: () => void;
      closeWindow: () => void;
      isElectron: boolean;
      platform: string;
    };

    // Process информация для проверки Electron
    process?: {
      versions?: {
        electron?: string;
        chrome?: string;
        node?: string;
      };
      platform?: string;
    };

    // Require для старых модулей (если нужно)
    require?: NodeRequire;

    // Менеджер уведомлений
    notificationManager?: {
      show: (message: string, type?: string) => void;
    };

    // Кеш профилей
    __profileCache?: Map<string, { data: Record<string, unknown> }>;
  }
}

export {};
