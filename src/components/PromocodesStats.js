'use client';

import { useState, useEffect } from 'react';

export default function PromocodesStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/promocodes/stats');
      
      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }

      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        Ошибка загрузки статистики: {error}
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const statItems = [
    {
      label: 'Всего промокодов',
      value: stats.stats.total,
      color: 'bg-blue-500',
      icon: '🎫'
    },
    {
      label: 'Активных',
      value: stats.stats.active,
      color: 'bg-green-500',
      icon: '✅'
    },
    {
      label: 'Истекших',
      value: stats.stats.expired,
      color: 'bg-red-500',
      icon: '⏰'
    },
    {
      label: 'Использованных',
      value: stats.stats.used,
      color: 'bg-orange-500',
      icon: '🔒'
    },
    {
      label: 'Доступных',
      value: stats.stats.available,
      color: 'bg-purple-500',
      icon: '🎯'
    }
  ];

  return (
    <div className="bg-white p-6 rounded-lg shadow mb-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Статистика промокодов</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {statItems.map((item, index) => (
          <div key={index} className="text-center">
            <div className={`${item.color} text-white rounded-lg p-3 mb-2`}>
              <div className="text-2xl">{item.icon}</div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{item.value}</div>
            <div className="text-sm text-gray-600">{item.label}</div>
          </div>
        ))}
      </div>

      {/* Топ промокодов */}
      {stats.topPromocodes && stats.topPromocodes.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Топ промокодов по популярности</h3>
          <div className="space-y-2">
            {stats.topPromocodes.map((promo, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-gray-400">#{index + 1}</span>
                  <div>
                    <div className="font-medium text-gray-900">{promo.code}</div>
                    <div className="text-sm text-gray-600">{promo.description || 'Без описания'}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">
                    {promo.current_uses} / {promo.max_uses}
                  </div>
                  <div className="text-lg font-bold text-blue-600">
                    {promo.usage_percentage}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Статистика по месяцам */}
      {stats.monthlyStats && stats.monthlyStats.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Статистика по месяцам</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {stats.monthlyStats.slice(0, 6).map((month, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">{month.month}</div>
                <div className="text-lg font-bold text-gray-900">{month.created_count}</div>
                <div className="text-sm text-gray-500">промокодов создано</div>
                <div className="text-sm text-blue-600">{month.total_cards} карточек</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
