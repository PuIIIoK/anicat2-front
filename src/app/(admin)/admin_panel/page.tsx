import React, { Suspense } from 'react';
import AdminPanelClient from '@/component/admin_panel/admin-panel-provider';

export default function AdminPanelPage() {
    return (

        <Suspense fallback={<div>Загрузка панели...</div>}>
            <AdminPanelClient />
        </Suspense>
    );
}
