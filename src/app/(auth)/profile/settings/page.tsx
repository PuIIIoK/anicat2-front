'use client';

import React, { useEffect, useState } from 'react';
import PcSettings from '@/app/(auth)/profile/settings/PcSettings';
import MobileSettings from '@/app/(auth)/profile/settings/MobileSettings';

const Page: React.FC = () => {
    const [isMobile, setIsMobile] = useState<boolean | null>(null);

    useEffect(() => {
        const mq = window.matchMedia('(max-width: 768px)');
        const update = () => setIsMobile(mq.matches);
        update();
        mq.addEventListener('change', update);
        return () => mq.removeEventListener('change', update);
    }, []);

    if (isMobile === null) return null;
    return isMobile ? <MobileSettings /> : <PcSettings />;
};

export default Page;
