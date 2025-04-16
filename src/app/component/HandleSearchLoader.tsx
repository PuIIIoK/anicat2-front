'use client';

import React from 'react';

const HandleSearchLoader: React.FC = () => {
    return (
        <div className="search-loader-container">
            <div className="search-spinner"></div>
            <p>Загрузка аниме...</p>
        </div>
    );
};

export default HandleSearchLoader;
