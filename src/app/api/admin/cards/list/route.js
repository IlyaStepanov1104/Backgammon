import { NextResponse } from 'next/server';
import { query } from '@/services/database';

// Простая проверка авторизации (заглушка)
function checkAuth(request) {
  // TODO: Реализовать реальную проверку сессии
  return true;
}

// GET - получение списка карточек для выбора
export async function GET(request) {
  try {
    if (!checkAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit')) || 100;

    let sql = `
      SELECT 
        id, 
        title, 
        description,
        difficulty_level,
        created_at
      FROM cards
    `;

    let params = [];

    // Добавляем поиск
    if (search) {
      sql += ' WHERE title LIKE ? OR description LIKE ?';
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    const cards = await query(sql, params);

    return NextResponse.json({
      success: true,
      cards
    });

  } catch (error) {
    console.error('Get cards list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
