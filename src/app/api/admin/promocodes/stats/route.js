import { NextResponse } from 'next/server';
import { query } from '@/services/database';

// Простая проверка авторизации (заглушка)
function checkAuth(request) {
  // TODO: Реализовать реальную проверку сессии
  return true;
}

// GET - получение статистики по промокодам
export async function GET(request) {
  try {
    if (!checkAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Общая статистика
    const totalPromocodes = await query('SELECT COUNT(*) as count FROM promo_codes');
    const activePromocodes = await query('SELECT COUNT(*) as count FROM promo_codes WHERE is_active = 1');
    const expiredPromocodes = await query('SELECT COUNT(*) as count FROM promo_codes WHERE expires_at IS NOT NULL AND expires_at <= NOW()');
    const usedPromocodes = await query('SELECT COUNT(*) as count FROM promo_codes WHERE current_uses >= max_uses');

    // Статистика по использованию
    const usageStats = await query(`
      SELECT 
        p.code,
        p.max_uses,
        p.current_uses,
        p.card_package_size,
        p.expires_at,
        p.is_active,
        (p.current_uses * p.card_package_size) as total_cards_given
      FROM promo_codes p
      ORDER BY p.current_uses DESC
      LIMIT 10
    `);

    // Статистика по месяцам
    const monthlyStats = await query(`
      SELECT 
        DATE_FORMAT(created_at, '%Y-%m') as month,
        COUNT(*) as created_count,
        SUM(card_package_size) as total_cards
      FROM promo_codes
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(created_at, '%Y-%m')
      ORDER BY month DESC
    `);

    // Топ промокодов по популярности
    const topPromocodes = await query(`
      SELECT 
        p.code,
        p.description,
        p.current_uses,
        p.max_uses,
        p.card_package_size,
        ROUND((p.current_uses / p.max_uses) * 100, 2) as usage_percentage
      FROM promo_codes p
      WHERE p.max_uses > 0
      ORDER BY p.current_uses DESC
      LIMIT 5
    `);

    return NextResponse.json({
      success: true,
      stats: {
        total: totalPromocodes[0].count,
        active: activePromocodes[0].count,
        expired: expiredPromocodes[0].count,
        used: usedPromocodes[0].count,
        available: totalPromocodes[0].count - usedPromocodes[0].count
      },
      usageStats,
      monthlyStats,
      topPromocodes
    });

  } catch (error) {
    console.error('Get promocodes stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
