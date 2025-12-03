"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Экспонируем безопасные методы в renderer process
electron_1.contextBridge.exposeInMainWorld('electron', {
    // Управление окном
    minimizeWindow: () => electron_1.ipcRenderer.send('minimize-window'),
    maximizeWindow: () => electron_1.ipcRenderer.send('maximize-window'),
    closeWindow: () => electron_1.ipcRenderer.send('close-window'),
    // Информация о платформе
    platform: process.platform,
    // Проверка что мы в Electron
    isElectron: true,
});
// Для Discord RPC и других модулей
electron_1.contextBridge.exposeInMainWorld('process', {
    versions: {
        electron: process.versions.electron,
        chrome: process.versions.chrome,
        node: process.versions.node,
    },
    platform: process.platform,
});
// Безопасность: блокируем eval
window.eval = global.eval = function () {
    throw new Error('eval() is disabled for security');
};
