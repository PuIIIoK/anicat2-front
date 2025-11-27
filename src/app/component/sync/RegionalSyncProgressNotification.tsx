'use client';

import React from 'react';
import SyncProgressNotification from './SyncProgressNotification';
import { useServerUrl } from '../../context/RegionalServerContext';

/**
 * Обертка для SyncProgressNotification, которая автоматически
 * использует региональный сервер в зависимости от местоположения пользователя
 */
const RegionalSyncProgressNotification: React.FC = () => {
    const serverUrl = useServerUrl();

    return <SyncProgressNotification apiServer={serverUrl} />;
};

export default RegionalSyncProgressNotification;
