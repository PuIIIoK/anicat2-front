"use client";

import React, { useEffect } from "react";
import { AnimePlayerProps } from "../../utils/player/types";
import { useAnimePlayer } from "../../hooks/anicat-player";

const AnimePlayer: React.FC<AnimePlayerProps> = ({ animeId }) => {
    const {
        selectedPlayer,
        kodikIframeUrl,
        handlePlayerChange,
    } = useAnimePlayer(animeId);

    useEffect(() => {
        if (selectedPlayer !== "kodik") {
            handlePlayerChange("kodik");
        }
    }, [selectedPlayer, handlePlayerChange]);

    return (
        <div className="kodik-fullscreen-wrapper">
            {selectedPlayer === "kodik" && kodikIframeUrl && (
                <iframe
                    src={kodikIframeUrl}
                    className="kodik-fullscreen-iframe"
                    allowFullScreen
                    frameBorder="0"
                />
            )}
        </div>
    );
};

export default AnimePlayer;
