'use client';

import React from 'react';

interface PlayerSwitchProps {
    playerType: 'kodik' | 'kinescope' | 'plyr';
    onChange: (type: 'kodik' | 'kinescope' | 'plyr') => void;
}

const PlayerSwitch: React.FC<PlayerSwitchProps> = ({ playerType, onChange }) => {
    return (
        <div className="player-switch-container">
            <div className="switch-label">Выбор плеера</div>
            <div className="switch-toggle">
                <div className="tooltip-container">
                    <button
                        className={`switch-btn1 ${playerType === 'kodik' ? 'active' : ''}`}
                        onClick={() => onChange('kodik')}
                    >
                        Kodik
                    </button>
                    <span className="tooltip-text">Плеер от Kodik (Качество до 720p, и множество озвучек)</span>
                </div>

                <span className="divider" />

                <div className="tooltip-container">
                    <button
                        className={`switch-btn2 ${playerType === 'plyr' ? 'active' : ''}`}
                        onClick={() => onChange('plyr')}
                    >
                        Libria
                    </button>
                    <span className="tooltip-text">Плеер от Анилибрии (Качество 1080p)</span>
                </div>

                <span className="divider" />

                <div className="tooltip-container">
                    <button
                        className={`switch-btn3 ${playerType === 'kinescope' ? 'active' : ''}`}
                        onClick={() => onChange('kinescope')}
                    >
                        AniCat QHD+
                    </button>
                    <span className="tooltip-text">Наш плеер с качеством QHD+</span>
                </div>
            </div>

            <style jsx>{`
                .tooltip-container {
                    position: relative;
                    display: inline-block;
                }

                .tooltip-text {
                    visibility: hidden;
                    width: max-content;
                    background-color: #222;
                    color: #fff;
                    text-align: center;
                    padding: 6px 10px;
                    border-radius: 8px;
                    position: absolute;
                    z-index: 10;
                    bottom: 125%;
                    left: 50%;
                    transform: translateX(-50%);
                    opacity: 0;
                    transition: opacity 0.3s ease;
                    font-size: 0.85rem;
                    white-space: nowrap;
                }

                .tooltip-container:hover .tooltip-text {
                    visibility: visible;
                    opacity: 1;
                }
            `}</style>
        </div>
    );
};

export default PlayerSwitch;
