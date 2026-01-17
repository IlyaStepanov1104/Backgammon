import { NextResponse } from 'next/server';
import { query, queryWithPagination } from '../../../../database/config';

// GET - получение карточек для пользователя
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const telegramId = searchParams.get('user');
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const favorites = searchParams.get('favorites') === 'true';
    const solved = searchParams.get('solved'); // 'true' or 'false'

    if (!telegramId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    // Получаем ID пользователя
    const userQuery = 'SELECT id FROM users WHERE telegram_id = ?';
    const userResult = await query(userQuery, [telegramId]);
    
    if (userResult.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const userId = userResult[0].id;
    
    let sql, params;

    if (favorites) {
      // Получаем избранные карточки
      sql = `
        SELECT c.*,
               uf.added_at as favorite_added_at,
               ur.is_correct,
               ur.response_time
        FROM cards c
        JOIN user_favorites uf ON c.id = uf.card_id
        LEFT JOIN user_responses ur ON c.id = ur.card_id AND ur.user_id = ?
        WHERE uf.user_id = ?
      `;
      params = [userId, userId];

      if (solved === 'true') {
        sql += ' AND ur.is_correct = 1';
      } else if (solved === 'false') {
        sql += ' AND ur.is_correct IS NULL';
      }

      sql += ' ORDER BY uf.added_at DESC';
    } else {
      // Получаем доступные карточки
      sql = `
        WITH latest_responses AS (
            SELECT ur.*
            FROM (
                SELECT *,
                       ROW_NUMBER() OVER (PARTITION BY card_id ORDER BY response_time DESC) AS rn
                FROM user_responses
                WHERE user_id = ?
            ) ur
            WHERE rn = 1
        )
        SELECT c.*,
               uca.access_granted_at,
               uca.expires_at,
               uf.card_id AS is_favorite,
               lr.is_correct,
               lr.response_time
        FROM cards c
        JOIN user_card_access uca ON c.id = uca.card_id
        LEFT JOIN user_favorites uf ON c.id = uf.card_id AND uf.user_id = ?
        LEFT JOIN latest_responses lr ON c.id = lr.card_id
        WHERE uca.user_id = ? AND uca.is_active = 1
          AND (uca.expires_at IS NULL OR uca.expires_at > NOW())
      `;
      params = [userId, userId, userId];

      if (solved === 'true') {
        sql += ' AND lr.is_correct = 1';
      } else if (solved === 'false') {
        sql += ' AND lr.is_correct IS NULL';
      }

      sql += ' ORDER BY uca.access_granted_at DESC';
    }
    const cards = await queryWithPagination(sql, params, limit, (page - 1) * limit);
    
    // Получаем общее количество карточек
    let countSql, countParams;

    if (favorites) {
      if (solved === 'true') {
        countSql = `
          SELECT COUNT(*) as total
          FROM user_favorites uf
          JOIN user_responses ur ON uf.card_id = ur.card_id AND ur.user_id = uf.user_id
          WHERE uf.user_id = ? AND ur.is_correct = 1
        `;
      } else if (solved === 'false') {
        countSql = `
          SELECT COUNT(*) as total
          FROM user_favorites uf
          LEFT JOIN user_responses ur ON uf.card_id = ur.card_id AND ur.user_id = uf.user_id
          WHERE uf.user_id = ? AND ur.is_correct IS NULL
        `;
      } else {
        countSql = 'SELECT COUNT(*) as total FROM user_favorites WHERE user_id = ?';
      }
      countParams = [userId];
    } else {
      if (solved === 'true') {
        countSql = `
          SELECT COUNT(*) as total
          FROM user_card_access uca
          JOIN (
            SELECT card_id, is_correct
            FROM user_responses
            WHERE user_id = ? AND is_correct = 1
              AND response_time = (
                SELECT MAX(response_time)
                FROM user_responses
                WHERE card_id = user_responses.card_id AND user_id = user_responses.user_id
              )
          ) lr ON uca.card_id = lr.card_id
          WHERE uca.user_id = ? AND uca.is_active = 1
          AND (uca.expires_at IS NULL OR uca.expires_at > NOW())
        `;
        countParams = [userId, userId];
      } else if (solved === 'false') {
        countSql = `
          SELECT COUNT(*) as total
          FROM user_card_access uca
          LEFT JOIN (
            SELECT card_id, is_correct
            FROM user_responses
            WHERE user_id = ? AND is_correct IS NOT NULL
              AND response_time = (
                SELECT MAX(response_time)
                FROM user_responses
                WHERE card_id = user_responses.card_id AND user_id = user_responses.user_id
              )
          ) lr ON uca.card_id = lr.card_id
          WHERE uca.user_id = ? AND uca.is_active = 1
          AND (uca.expires_at IS NULL OR uca.expires_at > NOW())
          AND lr.card_id IS NULL
        `;
        countParams = [userId, userId];
      } else {
        countSql = `
          SELECT COUNT(*) as total
          FROM user_card_access uca
          WHERE uca.user_id = ? AND uca.is_active = 1
          AND (uca.expires_at IS NULL OR uca.expires_at > NOW())
        `;
        countParams = [userId];
      }
    }
    
    const countResult = await query(countSql, countParams);
    const total = countResult[0].total;
    
    return NextResponse.json({
      cards,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error('Get miniapp cards error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - сохранение ответа пользователя на карточку
export async function POST(request) {
  try {
    const { telegramId, cardId, isCorrect } = await request.json();
    
    if (!telegramId || !cardId || isCorrect === undefined) {
      return NextResponse.json({ error: 'Telegram ID, card ID and isCorrect are required' }, { status: 400 });
    }
    
    // Получаем ID пользователя
    const userQuery = 'SELECT id FROM users WHERE telegram_id = ?';
    const userResult = await query(userQuery, [telegramId]);
    
    if (userResult.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const userId = userResult[0].id;
    
    // Сохраняем ответ пользователя
    const sql = `
      INSERT INTO user_responses (user_id, card_id, is_correct) 
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        is_correct = VALUES(is_correct),
        response_time = CURRENT_TIMESTAMP
    `;
    
    await query(sql, [userId, cardId, isCorrect]);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Response saved successfully' 
    });
    
  } catch (error) {
    console.error('Save response error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
