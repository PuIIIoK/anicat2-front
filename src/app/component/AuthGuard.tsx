// app/components/AuthGuard.tsx
'use client';

import React, { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
    children: ReactNode;
};

export default function AuthGuard({ children }: Props) {
    const router = useRouter();
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        const token = document.cookie.match(/(^|;\s*)token=([^;]*)/)?.[2];
        if (!token) {
            router.replace('/test-access');
        } else {
            setChecking(false);
        }
    }, [router]);

    if (checking) return null;

    return <>{children}</>;
}
