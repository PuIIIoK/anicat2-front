'use client';

import React, { useEffect, useState } from 'react';
import { Pie, PieChart, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { API_SERVER } from '@/hosts/constants';

interface StatsItem {
  name: string;
  value: number;
}

interface StatsChartProps {
  username?: string;
  colors: string[];
}

export const StatsChart: React.FC<StatsChartProps> = ({ username, colors }) => {
  const [data, setData] = useState<StatsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!username) return;

    const fetchStats = async () => {
      try {
        const response = await fetch(`${API_SERVER}/api/collection/stats/user/${username}`);
        if (!response.ok) throw new Error('Ошибка загрузки статистики');
        
        const stats = await response.json();
        
        // Преобразуем данные в формат для графика
        const chartData: StatsItem[] = Object.entries(stats).map(([type, count]) => ({
          name: getCollectionTypeName(type),
          value: count as number
        }));
        
        setData(chartData);
      } catch (error) {
        console.error('Ошибка загрузки статистики:', error);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [username]);

  const getCollectionTypeName = (type: string): string => {
    switch (type) {
      case 'PLANNED': return 'В планах';
      case 'WATCHING': return 'Смотрю';
      case 'PAUSED': return 'Отложено';
      case 'COMPLETED': return 'Просмотрено';
      case 'DROPPED': return 'Брошено';
      case 'FAVORITE': return 'Избранное';
      default: return type;
    }
  };

  const handleViewCollection = () => {
    // Переход на вкладку коллекций без открытия новой вкладки
    const collectionTab = document.querySelector('[data-tab="collection"]') as HTMLElement;
    if (collectionTab) {
      collectionTab.click();
    } else {
      // Если таб не найден, попробуем найти по тексту
      const tabs = document.querySelectorAll('.profile-tab');
      tabs.forEach(tab => {
        if (tab.textContent?.includes('Коллекции')) {
          (tab as HTMLElement).click();
        }
      });
    }
  };

  if (loading) {
    return (
      <div className="stats-chart-container">
        <h2>Статистика</h2>
        <div className="loading-stats">Загрузка статистики...</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="stats-chart-container">
        <h2>Статистика</h2>
        <div className="no-stats">Нет данных для отображения</div>
        <button 
          className="view-collection-btn"
          onClick={handleViewCollection}
        >
          Посмотреть коллекцию
        </button>
      </div>
    );
  }

  return (
    <div className="stats-chart-container">
      <h2>Статистика</h2>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart width={220} height={220}>
          <Pie data={data} cx="50%" cy="50%" outerRadius={80} dataKey="value">
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
      <div className="stats-list">
        {data.map((item, idx) => (
          <div key={idx} className="stat-line">
            <span style={{ color: colors[idx] }}>{item.name}</span>
            <span>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};


