'use client';

import React, { useEffect, useState } from 'react';
import { Copy } from 'lucide-react';

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

export default function CustomTitleBar() {
    const [remote, setRemote] = useState<typeof import('@electron/remote') | null>(null);
    const [url, setUrl] = useState<string>('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const isElectron = typeof window !== 'undefined' && !!window.process?.versions?.electron;
        if (isElectron && window.require) {
            try {
                const r = window.require('@electron/remote') as typeof import('@electron/remote');
                setRemote(r);
                setUrl(window.location.href);

                // Слежение за изменением URL
                const observer = new MutationObserver(() => {
                    setUrl(window.location.href);
                });
                observer.observe(document.body, { childList: true, subtree: true });

                return () => observer.disconnect();
            } catch (e) {
                console.error('Failed to load @electron/remote:', e);
            }
        }
    }, []);

    const copyUrl = () => {
        navigator.clipboard.writeText(url).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 3000);
        });
    };

    if (!remote) return null;

    return (
        <div className="title-bar">
            <div className="left">
                <div className="address-wrapper">
                    <span className="address-bar" title={url}>{url}</span>
                    <div className="copy-container">
                        <button className="copy-btn" onClick={copyUrl} aria-label="Скопировать ссылку">
                            <Copy size={16} strokeWidth={1.5} />
                        </button>
                        {copied && <div className="copy-tooltip">Ссылка скопирована!</div>}
                    </div>
                </div>
            </div>

            <div className="center" />

            <div className="right">
                <button onClick={() => remote.getCurrentWindow().minimize()}>–</button>
                <button onClick={() => {
                    const win = remote.getCurrentWindow();
                    win.setFullScreen(!win.isFullScreen());
                }}>⛶</button>
                <button onClick={() => remote.getCurrentWindow().close()}>✕</button>
            </div>
        </div>
    );
}
