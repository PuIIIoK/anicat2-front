'use client';

import React, { useEffect, useState } from 'react';
import { Copy, Minimize2, Maximize2, X } from 'lucide-react';
import '../styles/components/titlebar.scss';

export default function CustomTitleBar() {
    const [isElectron, setIsElectron] = useState(false);
    const [url, setUrl] = useState<string>('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const electron = typeof window !== 'undefined' && window.electron?.isElectron;
        setIsElectron(!!electron);
        
        if (electron) {
            setUrl(window.location.href);

            // Слежение за изменением URL
            const updateUrl = () => setUrl(window.location.href);
            window.addEventListener('popstate', updateUrl);
            
            // Наблюдаем за изменениями в истории
            const observer = new MutationObserver(updateUrl);
            observer.observe(document.body, { childList: true, subtree: true });

            return () => {
                window.removeEventListener('popstate', updateUrl);
                observer.disconnect();
            };
        }
    }, []);

    const copyUrl = () => {
        navigator.clipboard.writeText(url).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const handleMinimize = () => window.electron?.minimizeWindow();
    const handleMaximize = () => window.electron?.maximizeWindow();
    const handleClose = () => window.electron?.closeWindow();

    if (!isElectron) return null;

    return (
        <div className="custom-titlebar">
            <div className="titlebar-drag-region">
                <div className="titlebar-left">
                    <div className="app-icon">Y</div>
                    <div className="app-name">Yumeko</div>
                </div>

                <div className="titlebar-center">
                    <div className="url-container">
                        <span className="url-text" title={url}>{url}</span>
                        <button 
                            className={`copy-btn ${copied ? 'copied' : ''}`}
                            onClick={copyUrl} 
                            aria-label="Скопировать ссылку"
                        >
                            <Copy size={14} strokeWidth={2} />
                        </button>
                        {copied && (
                            <div className="copy-notification">
                                Скопировано!
                            </div>
                        )}
                    </div>
                </div>

                <div className="titlebar-right">
                    <button 
                        className="titlebar-btn minimize" 
                        onClick={handleMinimize}
                        aria-label="Свернуть"
                    >
                        <Minimize2 size={14} strokeWidth={2} />
                    </button>
                    <button 
                        className="titlebar-btn maximize" 
                        onClick={handleMaximize}
                        aria-label="Развернуть"
                    >
                        <Maximize2 size={14} strokeWidth={2} />
                    </button>
                    <button 
                        className="titlebar-btn close" 
                        onClick={handleClose}
                        aria-label="Закрыть"
                    >
                        <X size={16} strokeWidth={2} />
                    </button>
                </div>
            </div>
        </div>
    );
}
