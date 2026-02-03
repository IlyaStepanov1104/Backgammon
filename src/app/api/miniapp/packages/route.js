import { NextResponse } from 'next/server';
import { query } from '@/services/database';

// GET - получение списка активных пакетов для пользователя
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Получаем список активных пакетов (не истекших)
    const packages = await query(
      `SELECT
        p.id,
        p.name,
        p.description,
        p.price,
        COUNT(pc.card_id) as card_count,
        (SELECT COUNT(*)
         FROM package_purchases pp
         WHERE pp.package_id = p.id
           AND pp.user_id = (SELECT id FROM users WHERE telegram_id = ?)
           AND pp.payment_status = 'succeeded'
        ) as is_purchased
      FROM packages p
      LEFT JOIN package_cards pc ON p.id = pc.package_id
      WHERE p.is_active = 1
        AND (p.expires_at IS NULL OR p.expires_at > NOW())
      GROUP BY p.id
      ORDER BY p.price ASC`,
      [userId]
    );

    return NextResponse.json({
      success: true,
      packages: packages.map(pkg => ({
        ...pkg,
        is_purchased: pkg.is_purchased > 0
      }))
    });

  } catch (error) {
    console.error('Get packages error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
