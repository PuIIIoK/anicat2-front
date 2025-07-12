// utils/isElectron.ts
export const isElectron = () =>
    typeof window !== 'undefined' &&
    window.process?.versions?.electron !== undefined;
