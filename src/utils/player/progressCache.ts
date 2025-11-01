type ProgressKey = {
  animeId: string;
  source: 'kodik' | 'libria' | 'yumeko';
  voice?: string | null;
  episodeId: number;
};

export type EpisodeProgress = {
  time: number;       // seconds
  duration: number;   // seconds
  updatedAt: number;  // epoch ms
  opened?: boolean;   // whether episode has ever been opened
};

type CacheShape = Record<string, EpisodeProgress>;

const STORAGE_KEY = 'anicat_player_progress_v1';

function makeKey(k: ProgressKey): string {
  const voice = (k.voice ?? '').trim().toLowerCase();
  return `${k.animeId}::${k.source}::${voice}::${k.episodeId}`;
}

function readCache(): CacheShape {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed ? parsed as CacheShape : {};
  } catch {
    return {};
  }
}

function writeCache(cache: CacheShape) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cache)); } catch {}
}

export function getEpisodeProgress(key: ProgressKey): EpisodeProgress | null {
  const cache = readCache();
  const k = makeKey(key);
  return cache[k] ?? null;
}

export function setEpisodeProgress(key: ProgressKey, progress: EpisodeProgress) {
  const cache = readCache();
  const k = makeKey(key);
  cache[k] = { ...progress, opened: progress.opened ?? true };
  writeCache(cache);
}

export function upsertEpisodeProgress(key: ProgressKey, time: number, duration: number) {
  const now = Date.now();
  setEpisodeProgress(key, { time, duration, updatedAt: now, opened: true });
}

// ---- Server sync helpers ----

import { fetchProgressForAnime, upsertProgressEntry, upsertProgressBulk } from '@/app/(player)/test-new-player/playerApi';

async function sendProgressToServer(key: ProgressKey, progress: EpisodeProgress): Promise<void> {
  try {
    // delegate network call to playerApi helper
    const payload = {
      animeId: key.animeId,
      source: key.source,
      voice: key.voice ?? null,
      episodeId: key.episodeId,
      time: progress.time,
      duration: progress.duration,
      updatedAt: progress.updatedAt,
      opened: progress.opened ?? true
    };
    await upsertProgressEntry(payload);
  } catch {
    // ignore network errors; retry on next change
  }
}

async function fetchProgressForAnimeFromServer(animeId: string): Promise<Array<{ key: ProgressKey; progress: EpisodeProgress }>> {
  try {
    const list = await fetchProgressForAnime(animeId);
    if (!Array.isArray(list) || !list.length) return [];
    return list.map((entry) => {
      const src: 'kodik' | 'libria' | 'yumeko' = (entry.source === 'libria' || entry.source === 'kodik' || entry.source === 'yumeko') ? entry.source as 'kodik' | 'libria' | 'yumeko' : 'kodik';
      const key: ProgressKey = { animeId: entry.animeId, source: src, voice: entry.voice ?? null, episodeId: Number(entry.episodeId) };
      const progress: EpisodeProgress = { time: Number(entry.time ?? 0), duration: Number(entry.duration ?? 0), updatedAt: Number(entry.updatedAt ?? Date.now()), opened: Boolean(entry.opened) };
      return { key, progress };
    });
  } catch {
    return [];
  }
}

// Merge local cache with server: for each entry choose the most recently updated version.
export async function initialSyncForAnime(animeId: string) {
  try {
    const serverList = await fetchProgressForAnimeFromServer(animeId);
    if (!serverList || !serverList.length) {
      // If server empty, push local cache for this anime
      const cache = readCache();
      Object.entries(cache).forEach(([k, v]) => {
        if (!k.startsWith(`${animeId}::`)) return;
        try { sendProgressToServer(parseKeyString(k), v); } catch {}
      });
      return;
    }

    // Build map of local keys
    const local = readCache();
    serverList.forEach(({ key, progress }) => {
      const kstr = `${key.animeId}::${key.source}::${(key.voice ?? '').trim().toLowerCase()}::${key.episodeId}`;
      const localEntry = local[kstr];
      if (!localEntry) {
        // server has entry we don't have locally — import it
        local[kstr] = progress;
      } else {
        // both exist — use newest
        if ((progress.updatedAt ?? 0) > (localEntry.updatedAt ?? 0)) {
          local[kstr] = progress;
        } else if ((localEntry.updatedAt ?? 0) > (progress.updatedAt ?? 0)) {
          // local newer — push to server
          try { sendProgressToServer(key, localEntry); } catch {}
        }
      }
    });
    writeCache(local);
  } catch {}
}

// Fetch server list and merge into local cache. If server has no entries — do nothing.
export async function fetchAndMergeFromServer(animeId: string) {
  try {
    const serverList = await fetchProgressForAnimeFromServer(animeId);
    if (!serverList || !serverList.length) return; // do nothing if server empty

    const cache = readCache();
    for (const { key, progress } of serverList) {
      const kstr = `${key.animeId}::${key.source}::${(key.voice ?? '').trim().toLowerCase()}::${key.episodeId}`;
      const localEntry = cache[kstr];
      if (!localEntry) {
        cache[kstr] = progress;
        continue;
      }
      const serverTs = progress.updatedAt ?? 0;
      const localTs = localEntry.updatedAt ?? 0;
      if (serverTs > localTs) {
        // server newer -> update local fields that differ
        cache[kstr] = { ...localEntry, ...progress };
      } else if (localTs > serverTs) {
        // local newer -> push to server
        try { await sendProgressToServer(parseKeyString(kstr), localEntry); } catch {}
      }
    }
    writeCache(cache);
  } catch {
    return;
  }
}

// Send whole local cache for anime to server in bulk
export async function pushAllCacheForAnimeToServer(animeId: string) {
  try {
    const list = listProgressForAnime(animeId);
    if (!list || !list.length) return;
    // prepare server payload: array of ProgressEntry-like objects
    const payload = list.map(it => ({
      animeId: it.key.animeId,
      source: it.key.source,
      voice: it.key.voice ?? null,
      episodeId: it.key.episodeId,
      time: it.progress.time,
      duration: it.progress.duration,
      updatedAt: it.progress.updatedAt,
      opened: it.progress.opened ?? true
    }));
    // use fetch to /api/player/progress/bulk
    try {
      await upsertProgressBulk(payload);
    } catch {}
  } catch {}
}

function parseKeyString(k: string): ProgressKey {
  const parts = k.split('::');
  const src = (parts[1] === 'libria' || parts[1] === 'kodik') ? parts[1] : 'kodik';
  return { animeId: parts[0], source: src, voice: parts[2] || null, episodeId: Number(parts[3] ?? 0) };
}

// enhance existing setters to attempt server sync when user is authenticated
const origSetEpisodeProgress = setEpisodeProgress;
export function setEpisodeProgressWithSync(key: ProgressKey, progress: EpisodeProgress) {
  origSetEpisodeProgress(key, progress);
  try { sendProgressToServer(key, progress); } catch {}
}

const origUpsertEpisodeProgress = upsertEpisodeProgress;
export function upsertEpisodeProgressWithSync(key: ProgressKey, time: number, duration: number) {
  origUpsertEpisodeProgress(key, time, duration);
  try { sendProgressToServer(key, { time, duration, updatedAt: Date.now(), opened: true }); } catch {}
}

export function markEpisodeOpened(key: ProgressKey) {
  const cache = readCache();
  const k = makeKey(key);
  const prev = cache[k];
  if (prev) {
    cache[k] = { ...prev, opened: true, updatedAt: Date.now() };
  } else {
    cache[k] = { time: 0, duration: 0, updatedAt: Date.now(), opened: true };
  }
  writeCache(cache);
}

export function listProgressForAnime(animeId: string): Array<{ key: ProgressKey; progress: EpisodeProgress }>{
  const cache = readCache();
  const out: Array<{ key: ProgressKey; progress: EpisodeProgress }> = [];
  Object.entries(cache).forEach(([k, v]) => {
    if (!k.startsWith(`${animeId}::`)) return;
    const [, source, voice, epStr] = k.split('::');
    const episodeId = Number(epStr);
    const src = (source === 'libria' || source === 'kodik') ? (source as 'libria' | 'kodik') : 'kodik';
    const key: ProgressKey = { animeId, source: src, voice: voice || null, episodeId };
    out.push({ key, progress: v });
  });
  return out;
}

// For Libria: find any saved progress regardless of voice (for migration/robustness)
export function getEpisodeProgressLibriaAnyVoice(animeId: string, episodeId: number): EpisodeProgress | null {
  const cache = readCache();
  let best: EpisodeProgress | null = null;
  Object.entries(cache).forEach(([k, v]) => {
    const parts = k.split('::');
    if (parts.length !== 4) return;
    const [aId, source, , epStr] = parts;
    if (aId !== animeId) return;
    if (source !== 'libria') return;
    if (Number(epStr) !== episodeId) return;
    if (!best || (v.updatedAt ?? 0) > (best.updatedAt ?? 0)) best = v as EpisodeProgress;
  });
  return best;
}


