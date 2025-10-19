// utils/accessLocal.ts

const ACCESS_KEY = "anicat_access_passed";
const ACCESS_TIMEOUT = 3 * 60 * 60 * 1000; // 3 часа в мс

export function setAccessTest(test: boolean) {
    localStorage.setItem(ACCESS_KEY, JSON.stringify({
        test,
        ts: Date.now(),
    }));
}

export function getAccessTest(): { test: boolean, ts: number } | null {
    try {
        const data = localStorage.getItem(ACCESS_KEY);
        if (!data) return null;
        return JSON.parse(data);
    } catch {
        return null;
    }
}

export function clearAccessTest() {
    localStorage.removeItem(ACCESS_KEY);
}

export function isAccessTestValid() {
    const info = getAccessTest();
    if (!info) return false;
    return info.test === true && (Date.now() - info.ts) < ACCESS_TIMEOUT;
}
