export function updateDiscordStatus(status: string) {
    if (typeof window !== 'undefined' && window.process?.versions?.electron && window.require) {
        const { ipcRenderer } = window.require('electron');
        ipcRenderer.send('update-discord-status', status);
    }
}