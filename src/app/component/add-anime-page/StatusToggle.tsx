'use client';

import React from 'react';
import { Clock, CheckCircle, Calendar } from 'lucide-react';

interface StatusToggleProps {
    selectedStatus: 'ongoing' | 'completed' | 'announce' | null;
    onChange: (status: 'ongoing' | 'completed' | 'announce') => void;
}

const StatusToggle: React.FC<StatusToggleProps> = ({ selectedStatus, onChange }) => {
    const statusOptions = [
        {
            key: 'ongoing' as const,
            label: 'Онгоинг',
            icon: <Clock className="w-4 h-4" />,
            description: 'Аниме выходит в данный момент',
            color: '#3b82f6'
        },
        {
            key: 'completed' as const,
            label: 'Завершён',
            icon: <CheckCircle className="w-4 h-4" />,
            description: 'Аниме полностью вышло',
            color: '#10b981'
        },
        {
            key: 'announce' as const,
            label: 'Анонс',
            icon: <Calendar className="w-4 h-4" />,
            description: 'Аниме анонсировано, но дата выхода не определена',
            color: '#f59e0b'
        }
    ];

    return (
        <div className="status-toggle-group">
            <h4 className="status-toggle-title">Статус выхода</h4>
            <div className="status-options">
                {statusOptions.map((option) => {
                    const isActive = selectedStatus === option.key;
                    
                    return (
                        <div
                            key={option.key}
                            className={`status-option ${isActive ? 'active' : ''}`}
                            onClick={() => onChange(option.key)}
                            style={isActive ? { 
                                borderColor: option.color, 
                                backgroundColor: `${option.color}15` 
                            } : {}}
                        >
                            <div className="status-option-header">
                                <div 
                                    className="status-icon"
                                    style={isActive ? { color: option.color } : {}}
                                >
                                    {option.icon}
                                </div>
                                <span 
                                    className="status-label"
                                    style={isActive ? { color: option.color } : {}}
                                >
                                    {option.label}
                                </span>
                            </div>
                            <p className="status-description">
                                {option.description}
                            </p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default StatusToggle;
