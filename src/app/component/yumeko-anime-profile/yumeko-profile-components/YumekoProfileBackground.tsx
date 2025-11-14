'use client';

import React from 'react';
import AnimatedMedia from '@/components/AnimatedMedia';
import Image from 'next/image';

interface YumekoProfileBackgroundProps {
    backgroundAnimatedUrl: string | null;
    backgroundStaticUrl: string | null;
    backgroundUrl: string | null;
}

const YumekoProfileBackground: React.FC<YumekoProfileBackgroundProps> = ({
    backgroundAnimatedUrl,
    backgroundStaticUrl,
    backgroundUrl
}) => {
    if (!backgroundAnimatedUrl && !backgroundStaticUrl && !backgroundUrl) {
        return null;
    }

    return (
        <div className="yumeko-profile-background">
            {backgroundAnimatedUrl ? (
                <AnimatedMedia 
                    src={backgroundAnimatedUrl} 
                    alt="Фон профиля" 
                    fill 
                    objectFit="cover" 
                />
            ) : (
                <Image 
                    src={backgroundUrl || backgroundStaticUrl || ''} 
                    alt="Фон профиля" 
                    fill 
                    style={{ objectFit: 'cover' }}
                />
            )}
        </div>
    );
};

export default YumekoProfileBackground;
