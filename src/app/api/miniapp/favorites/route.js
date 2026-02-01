import { NextResponse } from 'next/server';
import { query } from '@/services/database';

// POST - добавление карточки в избранное
export async function POST(request) {
  try {
    const { telegramId, cardId } = await request.json();
    
    if (!telegramId || !cardId) {
      return NextResponse.json({ error: 'Telegram ID and card ID are required' }, { status: 400 });
    }
    
    // Получаем ID пользователя
    const userQuery = 'SELECT id FROM users WHERE telegram_id = ?';
    const userResult = await query(userQuery, [telegramId]);
    
    if (userResult.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const userId = userResult[0].id;
    
    // Проверяем, есть ли у пользователя доступ к этой карточке
    const accessQuery = `
      SELECT 1 FROM user_card_access 
      WHERE user_id = ? AND card_id = ? AND is_active = 1
      AND (expires_at IS NULL OR expires_at > NOW())
    `;
    
    const accessResult = await query(accessQuery, [userId, cardId]);
    
    if (accessResult.length === 0) {
      return NextResponse.json({ error: 'No access to this card' }, { status: 403 });
    }
    
    // Добавляем в избранное
    const sql = `
      INSERT INTO user_favorites (user_id, card_id) 
      VALUES (?, ?) 
      ON DUPLICATE KEY UPDATE added_at = CURRENT_TIMESTAMP
    `;
    
    await query(sql, [userId, cardId]);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Card added to favorites' 
    });
    
  } catch (error) {
    console.error('Add to favorites error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - удаление карточки из избранного
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const telegramId = searchParams.get('user');
    const cardId = searchParams.get('card');
    
    if (!telegramId || !cardId) {
      return NextResponse.json({ error: 'User ID and card ID are required' }, { status: 400 });
    }
    
    // Получаем ID пользователя
    const userQuery = 'SELECT id FROM users WHERE telegram_id = ?';
    const userResult = await query(userQuery, [telegramId]);
    
    if (userResult.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const userId = userResult[0].id;
    
    // Удаляем из избранного
    const sql = 'DELETE FROM user_favorites WHERE user_id = ? AND card_id = ?';
    await query(sql, [userId, cardId]);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Card removed from favorites' 
    });
    
  } catch (error) {
    console.error('Remove from favorites error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
