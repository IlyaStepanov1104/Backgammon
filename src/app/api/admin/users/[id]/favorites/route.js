import { NextResponse } from 'next/server';
import { query } from '../../../../../../database/config';

// Простая проверка авторизации
function checkAuth(request) {
  // TODO: Реализовать реальную проверку сессии
  return true;
}

// GET - получение избранных карточек пользователя
export async function GET(request, { params }) {
  try {
    if (!checkAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = await params.id;
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Получаем избранные карточки пользователя
    const sql = `
      SELECT c.id, c.title, c.description, c.image_url, c.difficulty_level,
             uf.added_at as favorite_added_at
      FROM user_favorites uf
      JOIN cards c ON uf.card_id = c.id
      WHERE uf.user_id = ?
      ORDER BY uf.added_at DESC
    `;

    const favorites = await query(sql, [userId]);

    return NextResponse.json({ favorites });
  } catch (error) {
    console.error('Error fetching user favorites:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - удаление карточки из избранного
export async function DELETE(request, { params }) {
  try {
    if (!checkAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = params.id;
    const { searchParams } = new URL(request.url);
    const cardId = searchParams.get('cardId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (!cardId) {
      return NextResponse.json({ error: 'Card ID is required' }, { status: 400 });
    }

    // Удаляем карточку из избранного
    const sql = 'DELETE FROM user_favorites WHERE user_id = ? AND card_id = ?';
    await query(sql, [userId, cardId]);

    return NextResponse.json({
      success: true,
      message: 'Card removed from favorites'
    });
  } catch (error) {
    console.error('Error removing from favorites:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

