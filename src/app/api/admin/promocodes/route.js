import { NextResponse } from 'next/server';
import { query, getConnection } from '../../../../database/config';

// Простая проверка авторизации (заглушка)
function checkAuth(request) {
  // TODO: Реализовать реальную проверку сессии
  return true;
}

// GET - получение списка промокодов
export async function GET(request) {
  try {
    if (!checkAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';

    let sql = `
      SELECT 
        p.id, 
        p.code, 
        p.description,
        p.max_uses, 
        p.current_uses,
        p.expires_at, 
        p.is_active,
        p.created_at,
        COUNT(pc.card_id) as card_count
      FROM promo_codes p
      LEFT JOIN promo_code_cards pc ON p.id = pc.promo_code_id
    `;

    let countSql = 'SELECT COUNT(*) as total FROM promo_codes p';
    let params = [];
    let countParams = [];

    // Добавляем фильтры
    if (search) {
      const searchCondition = 'WHERE p.code LIKE ? OR p.description LIKE ?';
      sql += ` ${searchCondition}`;
      countSql += ` ${searchCondition}`;
      params.push(`%${search}%`, `%${search}%`);
      countParams.push(`%${search}%`, `%${search}%`);
    }

    if (status) {
      const statusCondition = search ? 'AND' : 'WHERE';
      if (status === 'active') {
        sql += ` ${statusCondition} p.is_active = 1 AND (p.expires_at IS NULL OR p.expires_at > NOW())`;
        countSql += ` ${statusCondition} p.is_active = 1 AND (p.expires_at IS NULL OR p.expires_at > NOW())`;
      } else if (status === 'expired') {
        sql += ` ${statusCondition} p.expires_at IS NOT NULL AND p.expires_at <= NOW()`;
        countSql += ` ${statusCondition} p.expires_at IS NOT NULL AND p.expires_at <= NOW()`;
      } else if (status === 'used') {
        sql += ` ${statusCondition} p.current_uses >= p.max_uses`;
        countSql += ` ${statusCondition} p.current_uses >= p.max_uses`;
      } else if (status === 'unused') {
        sql += ` ${statusCondition} p.current_uses = 0`;
        countSql += ` ${statusCondition} p.current_uses = 0`;
      }
    }

    sql += ' GROUP BY p.id ORDER BY p.created_at DESC';

    // Получаем промокоды с пагинацией
    const offset = (page - 1) * limit;
    const promocodes = await query(`${sql} LIMIT ${limit} OFFSET ${offset}`, params);

    // Получаем общее количество
    const totalResult = await query(countSql, countParams);
    const total = totalResult[0].total;

    return NextResponse.json({
      success: true,
      promocodes,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get promocodes error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - создание нового промокода
export async function POST(request) {
  try {
    if (!checkAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code, description, maxUses, cardIds, expiresAt, isActive } = await request.json();

    if (!code || !cardIds || !Array.isArray(cardIds) || cardIds.length === 0) {
      return NextResponse.json({ 
        error: 'Code and card IDs array are required' 
      }, { status: 400 });
    }

    // Проверяем формат кода
    const codeRegex = /^[A-Z0-9]{6,20}$/;
    if (!codeRegex.test(code.toUpperCase())) {
      return NextResponse.json({ 
        error: 'Invalid code format. Must be 6-20 characters, letters and numbers only.' 
      }, { status: 400 });
    }

    // Проверяем, что промокод не существует
    const existingPromocode = await query(
      'SELECT id FROM promo_codes WHERE code = ?', 
      [code.toUpperCase()]
    );
    
    if (existingPromocode.length > 0) {
      return NextResponse.json({ 
        error: 'Promocode with this code already exists' 
      }, { status: 400 });
    }

    // Создаем промокод
    const result = await query(
      `INSERT INTO promo_codes (
        code, description, max_uses, expires_at, is_active
      ) VALUES (?, ?, ?, ?, ?)`,
      [
        code.toUpperCase(),
        description || null,
        maxUses || 1,
        expiresAt || null,
        isActive !== undefined ? isActive : true
      ]
    );

    const promocodeId = result.insertId;

    // Добавляем карточки к промокоду
    for (const cardId of cardIds) {
      await query(
        'INSERT INTO promo_code_cards (promo_code_id, card_id) VALUES (?, ?)',
        [promocodeId, cardId]
      );
    }

    return NextResponse.json({ 
      success: true, 
      promocodeId,
      message: 'Promocode created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Create promocode error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - обновление промокода
export async function PUT(request) {
  try {
    if (!checkAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, code, description, maxUses, cardIds, expiresAt, isActive } = await request.json();

    if (!id || !code) {
      return NextResponse.json({ 
        error: 'ID and code are required' 
      }, { status: 400 });
    }

    // Проверяем формат кода
    const codeRegex = /^[A-Z0-9]{6,20}$/;
    if (!codeRegex.test(code.toUpperCase())) {
      return NextResponse.json({ 
        error: 'Invalid code format. Must be 6-20 characters, letters and numbers only.' 
      }, { status: 400 });
    }

    // Проверяем, что промокод существует
    const existingPromocode = await query(
      'SELECT id FROM promo_codes WHERE id = ?', 
      [id]
    );
    
    if (existingPromocode.length === 0) {
      return NextResponse.json({ 
        error: 'Promocode not found' 
      }, { status: 404 });
    }

    // Проверяем, что новый код не конфликтует с существующими
    const duplicateCode = await query(
      'SELECT id FROM promo_codes WHERE code = ? AND id != ?', 
      [code.toUpperCase(), id]
    );
    
    if (duplicateCode.length > 0) {
      return NextResponse.json({ 
        error: 'Promocode with this code already exists' 
      }, { status: 400 });
    }

    // Обновляем промокод
    await query(
      `UPDATE promo_codes SET 
        code = ?, 
        description = ?, 
        max_uses = ?, 
        expires_at = ?, 
        is_active = ?
      WHERE id = ?`,
      [
        code.toUpperCase(),
        description || null,
        maxUses || 1,
        expiresAt || null,
        isActive !== undefined ? isActive : true,
        id
      ]
    );

    // Обновляем карточки промокода
    if (cardIds && Array.isArray(cardIds)) {
      // Удаляем старые связи
      await query('DELETE FROM promo_code_cards WHERE promo_code_id = ?', [id]);
      
      // Добавляем новые связи
      for (const cardId of cardIds) {
        await query(
          'INSERT INTO promo_code_cards (promo_code_id, card_id) VALUES (?, ?)',
          [id, cardId]
        );
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Promocode updated successfully'
    });

  } catch (error) {
    console.error('Update promocode error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - удаление промокода
export async function DELETE(request) {
  try {
    if (!checkAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ 
        error: 'Promocode ID is required' 
      }, { status: 400 });
    }

    // Проверяем, что промокод существует
    const existingPromocode = await query(
      'SELECT id, current_uses FROM promo_codes WHERE id = ?', 
      [id]
    );
    
    if (existingPromocode.length === 0) {
      return NextResponse.json({ 
        error: 'Promocode not found' 
      }, { status: 404 });
    }

    // Проверяем, не использовался ли промокод
    if (existingPromocode[0].current_uses > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete promocode that has been used' 
      }, { status: 400 });
    }

    // Удаляем промокод
    await query('DELETE FROM promo_codes WHERE id = ?', [id]);

    return NextResponse.json({ 
      success: true, 
      message: 'Promocode deleted successfully'
    });

  } catch (error) {
    console.error('Delete promocode error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - частичное обновление (активация/деактивация)
export async function PATCH(request) {
  try {
    if (!checkAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, action } = await request.json();

    if (!id || !action) {
      return NextResponse.json({ 
        error: 'ID and action are required' 
      }, { status: 400 });
    }

    // Проверяем, что промокод существует
    const existingPromocode = await query(
      'SELECT id FROM promo_codes WHERE id = ?', 
      [id]
    );
    
    if (existingPromocode.length === 0) {
      return NextResponse.json({ 
        error: 'Promocode not found' 
      }, { status: 404 });
    }

    let updateSql = '';
    let updateValues = [];

    if (action === 'activate') {
      updateSql = 'UPDATE promo_codes SET is_active = 1 WHERE id = ?';
      updateValues = [id];
    } else if (action === 'deactivate') {
      updateSql = 'UPDATE promo_codes SET is_active = 0 WHERE id = ?';
      updateValues = [id];
    } else if (action === 'reset_usage') {
      updateSql = 'UPDATE promo_codes SET current_uses = 0 WHERE id = ?';
      updateValues = [id];
    } else {
      return NextResponse.json({ 
        error: 'Invalid action. Use: activate, deactivate, or reset_usage' 
      }, { status: 400 });
    }

    await query(updateSql, updateValues);

    return NextResponse.json({ 
      success: true, 
      message: `Promocode ${action} successfully`
    });

  } catch (error) {
    console.error('Patch promocode error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
