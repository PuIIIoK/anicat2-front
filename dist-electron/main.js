"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
// FRONTEND_URL по умолчанию (можно изменить в hosts/constants.ts и пересобрать)
const FRONTEND_URL = 'https://yumeko.ru';
let mainWindow = null;
let splashWindow = null;
function createSplashWindow() {
    const { width, height } = electron_1.screen.getPrimaryDisplay().workAreaSize;
    splashWindow = new electron_1.BrowserWindow({
        width: 500,
        height: 350,
        x: Math.floor((width - 500) / 2),
        y: Math.floor((height - 350) / 2),
        transparent: true,
        frame: false,
        alwaysOnTop: true,
        resizable: false,
        skipTaskbar: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path_1.default.join(__dirname, 'preload.js'),
        },
    });
    splashWindow.loadFile(path_1.default.join(__dirname, '../electron/splash.html'));
    splashWindow.setIgnoreMouseEvents(false);
}
function createMainWindow() {
    const { width, height } = electron_1.screen.getPrimaryDisplay().workAreaSize;
    mainWindow = new electron_1.BrowserWindow({
        width: Math.floor(width * 0.85),
        height: Math.floor(height * 0.90),
        minWidth: 1200,
        minHeight: 700,
        show: false, // Не показываем до загрузки
        backgroundColor: '#0a0a0f',
        frame: false, // Без рамки для кастомного дизайна
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path_1.default.join(__dirname, 'preload.js'),
            webSecurity: true,
            allowRunningInsecureContent: false,
        },
        icon: path_1.default.join(__dirname, '../public/icon.png'),
    });
    // Определяем URL из констант (FRONTEND_URL) или переменной окружения
    const startUrl = process.env.ELECTRON_START_URL || FRONTEND_URL;
    mainWindow.loadURL(startUrl);
    console.log('🚀 Electron запускается на:', startUrl);
    // Открываем DevTools в режиме разработки
    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
    }
    // Показываем главное окно после полной загрузки
    mainWindow.once('ready-to-show', () => {
        setTimeout(() => {
            if (splashWindow && !splashWindow.isDestroyed()) {
                splashWindow.close();
                splashWindow = null;
            }
            if (mainWindow) {
                mainWindow.show();
                mainWindow.focus();
            }
        }, 6000); // 6 секунд как запросил пользователь
    });
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}
// Обработка событий окна
electron_1.ipcMain.on('minimize-window', () => {
    if (mainWindow)
        mainWindow.minimize();
});
electron_1.ipcMain.on('maximize-window', () => {
    if (mainWindow) {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        }
        else {
            mainWindow.maximize();
        }
    }
});
electron_1.ipcMain.on('close-window', () => {
    if (mainWindow)
        mainWindow.close();
});
electron_1.app.on('ready', () => {
    createSplashWindow();
    createMainWindow();
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
electron_1.app.on('activate', () => {
    if (electron_1.BrowserWindow.getAllWindows().length === 0) {
        createSplashWindow();
        createMainWindow();
    }
});
// Безопасность: предотвращение открытия новых окон
electron_1.app.on('web-contents-created', (event, contents) => {
    contents.setWindowOpenHandler(({ url }) => {
        // Разрешаем только безопасные URL
        if (url.startsWith('http://localhost:') || url.startsWith('https://')) {
            return { action: 'allow' };
        }
        return { action: 'deny' };
    });
});
