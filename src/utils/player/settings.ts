export type PlayerSettings = {
  skipOpening?: boolean;
  skipEnding?: boolean;
  autoPlay?: boolean;
  autoFullscreen?: boolean;
  playbackSpeed?: number;
  volume?: number;
  isMuted?: boolean;
};

const SETTINGS_KEY = 'player.settings';

export function loadSettings(): PlayerSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed ? parsed as PlayerSettings : {};
  } catch {
    return {};
  }
}

export function saveSettings(partial: PlayerSettings) {
  try {
    const current = loadSettings();
    const merged: PlayerSettings = { ...current, ...partial };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
  } catch {}
}

