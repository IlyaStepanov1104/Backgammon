import { NextResponse } from 'next/server';
import { query, queryWithPagination } from '../../../../database/config';
// Простая проверка авторизации
function checkAuth(request) {
  // В реальном проекте здесь можно добавить проверку сессии
  // Пока что просто разрешаем доступ
  return true;
}

// GET - получение списка пользователей
export async function GET(request) {
  try {
    if (!checkAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const search = searchParams.get('search') || '';
    const hasAccess = searchParams.get('hasAccess') || '';
    
    let sql = `
      SELECT u.*, 
             COUNT(DISTINCT uca.card_id) as accessible_cards,
             COUNT(DISTINCT uf.card_id) as favorite_cards,
             MAX(uca.access_granted_at) as last_access_granted
      FROM users u
      LEFT JOIN user_card_access uca ON u.id = uca.user_id AND uca.is_active = 1
      LEFT JOIN user_favorites uf ON u.id = uf.user_id
      WHERE 1=1
    `;
    let params = [];
    
    if (search) {
      sql += ' AND (u.username LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    if (hasAccess === 'true') {
      sql += ' AND uca.card_id IS NOT NULL';
    } else if (hasAccess === 'false') {
      sql += ' AND uca.card_id IS NULL';
    }
    
    sql += ' GROUP BY u.id ORDER BY u.created_at DESC';
    
    // Используем безопасную функцию пагинации
    const users = await queryWithPagination(sql, params, limit, (page - 1) * limit);
    
    // Получаем общее количество пользователей
    let countSql = 'SELECT COUNT(*) as total FROM users u WHERE 1=1';
    let countParams = [];
    
    if (search) {
      countSql += ' AND (u.username LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)';
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    if (hasAccess === 'true') {
      countSql += ' AND EXISTS (SELECT 1 FROM user_card_access uca WHERE uca.user_id = u.id AND uca.is_active = 1)';
    } else if (hasAccess === 'false') {
      countSql += ' AND NOT EXISTS (SELECT 1 FROM user_card_access uca WHERE uca.user_id = u.id AND uca.is_active = 1)';
    }
    
    const countResult = await query(countSql, countParams);
    const total = countResult[0].total;
    
    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - предоставление доступа пользователю к карточкам
export async function POST(request) {
  try {
    if (!checkAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { userId, cardIds, expiresAt } = await request.json();
    
    if (!userId || !cardIds || !Array.isArray(cardIds)) {
      return NextResponse.json({ error: 'User ID and card IDs array are required' }, { status: 400 });
    }
    
    const connection = await require('../../../../database/config').getConnection();
    await connection.beginTransaction();
    
    try {
      // Проверяем существование пользователя
      const userCheck = await connection.execute('SELECT id FROM users WHERE id = ?', [userId]);
      if (userCheck[0].length === 0) {
        await connection.rollback();
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      
      // Предоставляем доступ к карточкам
      for (const cardId of cardIds) {
        await connection.execute(
          `INSERT INTO user_card_access (user_id, card_id, expires_at) 
           VALUES (?, ?, ?) 
           ON DUPLICATE KEY UPDATE 
             expires_at = VALUES(expires_at), 
             is_active = 1, 
             access_granted_at = CURRENT_TIMESTAMP`,
          [userId, cardId, expiresAt || null]
        );
      }
      
      await connection.commit();
      
      return NextResponse.json({ 
        success: true, 
        message: `Access granted to ${cardIds.length} cards` 
      });
      
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    
  } catch (error) {
    console.error('Grant access error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - обновление доступа пользователя
export async function PUT(request) {
  try {
    if (!checkAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, cardIds, expiresAt } = await request.json();

    if (!userId || !Array.isArray(cardIds)) {
      return NextResponse.json({ error: 'User ID and cardIds array are required' }, { status: 400 });
    }

    const connection = await await require('../../../../database/config').getConnection();
    await connection.beginTransaction();

    try {
      const [userCheck] = await connection.execute('SELECT id FROM users WHERE id = ?', [userId]);
      if (userCheck.length === 0) {
        await connection.rollback();
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const [existingCards] = await connection.execute(
          `SELECT card_id FROM user_card_access WHERE user_id = ?`,
          [userId]
      );
      const existingCardIds = existingCards.map(row => row.card_id);

      // 1. Обновляем или вставляем карточки
      for (const cardId of cardIds) {
        await connection.execute(
            `INSERT INTO user_card_access (user_id, card_id, expires_at, is_active, access_granted_at)
           VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)
           ON DUPLICATE KEY UPDATE 
             is_active = 1,
             expires_at = VALUES(expires_at),
             access_granted_at = CURRENT_TIMESTAMP`,
            [userId, cardId, expiresAt || null]
        );
      }

      // 2. Деактивируем карточки, которых нет в новом списке
      const cardsToRemove = existingCardIds.filter(id => !cardIds.includes(id));
      if (cardsToRemove.length > 0) {
        await connection.execute(
            `UPDATE user_card_access 
           SET is_active = 0 
           WHERE user_id = ? AND card_id IN (${cardsToRemove.map(() => '?').join(',')})`,
            [userId, ...cardsToRemove]
        );
      }

      await connection.commit();

      return NextResponse.json({
        success: true,
        message: `Access updated: ${cardIds.length} active, ${cardsToRemove.length} deactivated`
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Update user cards error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - отзыв доступа пользователя
export async function DELETE(request) {
  try {
    if (!checkAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const cardId = searchParams.get('cardId');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    let sql, params;
    
    if (cardId) {
      // Отзываем доступ к конкретной карточке
      sql = 'DELETE FROM user_card_access WHERE user_id = ? AND card_id = ?';
      params = [userId, cardId];
    } else {
      // Отзываем весь доступ пользователя
      sql = 'DELETE FROM user_card_access WHERE user_id = ?';
      params = [userId];
    }
    
    await query(sql, params);
    
    return NextResponse.json({ 
      success: true, 
      message: 'User access revoked successfully' 
    });
    
  } catch (error) {
    console.error('Revoke access error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


