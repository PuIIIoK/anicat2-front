declare global {
    interface Window {
        require?: NodeRequire;
        process?: {
            versions?: {
                electron?: string;
            };
        };
    }
}

export {};
