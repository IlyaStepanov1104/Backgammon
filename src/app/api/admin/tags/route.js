import { NextResponse } from 'next/server';
import { query, queryWithPagination } from '../../../../database/config';

// Простая проверка авторизации
function checkAuth(request) {
  // В реальном проекте здесь можно добавить проверку сессии
  // Пока что просто разрешаем доступ
  return true;
}

// GET - получение списка меток
export async function GET(request) {
  try {
    if (!checkAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sql = 'SELECT * FROM tags ORDER BY name ASC';
    const tags = await query(sql);

    return NextResponse.json({ tags });

  } catch (error) {
    console.error('Get tags error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - создание новой метки
export async function POST(request) {
  try {
    if (!checkAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Tag name is required' }, { status: 400 });
    }

    const sql = 'INSERT INTO tags (name) VALUES (?)';
    const result = await query(sql, [name.trim()]);

    return NextResponse.json({
      success: true,
      tagId: result.insertId,
      message: 'Tag created successfully'
    });

  } catch (error) {
    console.error('Create tag error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'Tag with this name already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - удаление метки
export async function DELETE(request) {
  try {
    if (!checkAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Tag ID is required' }, { status: 400 });
    }

    // Удаляем связи с карточками
    await query('DELETE FROM card_tags WHERE tag_id = ?', [id]);

    // Удаляем метку
    const sql = 'DELETE FROM tags WHERE id = ?';
    await query(sql, [id]);

    return NextResponse.json({
      success: true,
      message: 'Tag deleted successfully'
    });

  } catch (error) {
    console.error('Delete tag error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}