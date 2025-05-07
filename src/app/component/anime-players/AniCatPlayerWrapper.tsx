'use client';

import React, { useEffect, useState, useRef } from 'react';

const AniCatPlayerWrapper = ({ children }: { children: React.ReactNode }) => {
    const [contextVisible, setContextVisible] = useState(false);
    const [contextPos, setContextPos] = useState({ x: 0, y: 0 });
    const wrapperRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!window.customElements.get('anicat-player')) {
            class AniCatPlayerElement extends HTMLElement {}
            window.customElements.define('anicat-player', AniCatPlayerElement);
        }

        const handleClickOutside = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setContextVisible(false);
            }
        };

        window.addEventListener('click', handleClickOutside);
        return () => {
            window.removeEventListener('click', handleClickOutside);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        setContextVisible(true);
        setContextPos({ x: e.clientX, y: e.clientY });

        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            setContextVisible(false);
        }, 1500);
    };

    return (
        <anicat-player onContextMenu={handleContextMenu} style={{ display: 'block', position: 'relative' }} ref={wrapperRef}>
            {children}

            {contextVisible && (
                <div
                    className="anicat-context-menu"
                    style={{
                        position: 'absolute',
                        top: contextPos.y,
                        left: contextPos.x,
                        background: '#111',
                        color: '#f55',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                        zIndex: 9999,
                        fontSize: '14px',
                        pointerEvents: 'none',
                        userSelect: 'none',
                    }}
                >
                    AniCat Player — copy is not worked
                </div>
            )}
        </anicat-player>
    );
};

export default AniCatPlayerWrapper;
