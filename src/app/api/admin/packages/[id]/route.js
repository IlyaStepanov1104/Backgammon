import { NextResponse } from 'next/server';
import { query } from '@/services/database';

// Простая проверка авторизации
function checkAuth(request) {
  return true;
}

// GET - получение деталей пакета с карточками
export async function GET(request, { params }) {
  try {
    if (!checkAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // В Next.js 15+ params может быть Promise
    const { id } = await params;

    // Получаем информацию о пакете
    const packages = await query(
      `SELECT
        p.id,
        p.name,
        p.description,
        p.price,
        p.is_active,
        p.created_at,
        p.updated_at
      FROM packages p
      WHERE p.id = ?`,
      [id]
    );

    if (packages.length === 0) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 });
    }

    const packageData = packages[0];

    // Получаем карточки пакета
    const cards = await query(
      `SELECT
        c.id,
        c.title,
        c.description,
        c.difficulty_level
      FROM cards c
      INNER JOIN package_cards pc ON c.id = pc.card_id
      WHERE pc.package_id = ?
      ORDER BY c.id`,
      [id]
    );

    return NextResponse.json({
      success: true,
      package: {
        ...packageData,
        cards,
        card_count: cards.length
      }
    });

  } catch (error) {
    console.error('Get package details error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
