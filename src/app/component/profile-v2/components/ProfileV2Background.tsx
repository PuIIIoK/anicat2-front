'use client';

import React, { useState } from 'react';

interface ProfileV2BackgroundProps {
    backgroundAnimatedUrl: string | null;
    backgroundStaticUrl: string | null;
    backgroundUrl: string | null;
}

const ProfileV2Background: React.FC<ProfileV2BackgroundProps> = ({
    backgroundAnimatedUrl,
    backgroundStaticUrl,
    backgroundUrl
}) => {
    const [videoLoaded, setVideoLoaded] = useState(false);

    const hasBackground = backgroundAnimatedUrl || backgroundStaticUrl || backgroundUrl;

    if (!hasBackground) {
        return (
            <div className="profile-v2-background profile-v2-background--default">
                <div className="background-gradient" />
            </div>
        );
    }

    return (
        <div className="profile-v2-background">
            {backgroundAnimatedUrl ? (
                <>
                    {backgroundStaticUrl && !videoLoaded && (
                        <img 
                            src={backgroundStaticUrl} 
                            alt="Background" 
                            className="background-image background-image--static"
                        />
                    )}
                    <video
                        src={backgroundAnimatedUrl}
                        autoPlay
                        loop
                        muted
                        playsInline
                        onLoadedData={() => setVideoLoaded(true)}
                        className={`background-video ${videoLoaded ? 'loaded' : ''}`}
                    />
                </>
            ) : (
                <img 
                    src={backgroundUrl || backgroundStaticUrl || ''} 
                    alt="Background" 
                    className="background-image"
                />
            )}
            <div className="background-overlay" />
        </div>
    );
};

export default ProfileV2Background;
