'use client';

import React from 'react';

interface EpisodeSelectorProps {
    selectedEpisode: number;
    onChange: (episode: number) => void;
    availableEpisodes: number[];
}

const EpisodeSelector: React.FC<EpisodeSelectorProps> = ({ selectedEpisode, onChange, availableEpisodes }) => {
    return (
        <div className="">
            <div className="episode-label">Выбор эпизода</div>
            <div className="episode-toggle">
                {availableEpisodes.map((ep) => (
                    <button
                        key={ep}
                        className={`episode-btn ${selectedEpisode === ep ? 'active' : ''}`}
                        onClick={() => onChange(ep)}
                    >
                        {ep}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default EpisodeSelector;
