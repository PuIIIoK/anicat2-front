import React from 'react';


const ServerReconnect: React.FC = () => {
    return (
        <div className="server-reconnect-overlay">
            <div className="server-reconnect-box">
                <h2>Отсутствует подключение к серверу</h2>
                <p className="reconnect-text">Попытка переподключения...</p>
            </div>
        </div>
    );
};

export default ServerReconnect;
