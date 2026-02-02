import { NextResponse } from 'next/server';
import { query } from '@/services/database';

// Простая проверка авторизации
function checkAuth(request) {
  // TODO: Реализовать реальную проверку сессии
  return true;
}

// GET - получение карточек с правильными ответами пользователя
export async function GET(request, { params }) {
  try {
    if (!checkAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {id: userId} = await params;
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Получаем карточки с правильными ответами (последний ответ на каждую карточку)
    const sql = `
      SELECT c.id, c.title, c.description, c.image_url, c.difficulty_level,
             ur.response_time
      FROM user_responses ur
      JOIN cards c ON ur.card_id = c.id
      WHERE ur.user_id = ?
        AND ur.response_status = 'correct'
        AND ur.response_time = (
          SELECT MAX(ur2.response_time)
          FROM user_responses ur2
          WHERE ur2.user_id = ur.user_id
            AND ur2.card_id = ur.card_id
        )
      ORDER BY ur.response_time DESC
    `;

    const responses = await query(sql, [userId]);

    return NextResponse.json({ responses });
  } catch (error) {
    console.error('Error fetching user correct responses:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
