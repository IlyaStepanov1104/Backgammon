import { NextResponse } from 'next/server';
import { query } from '../../../../../../database/config';

// Простая проверка авторизации
function checkAuth(request) {
  // В реальном проекте здесь можно добавить проверку сессии
  // Пока что просто разрешаем доступ
  return true;
}

// GET - получение меток карточки
export async function GET(request, { params }) {
  try {
    if (!checkAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Card ID is required' }, { status: 400 });
    }

    const sql = `
      SELECT t.id, t.name
      FROM tags t
      JOIN card_tags ct ON t.id = ct.tag_id
      WHERE ct.card_id = ?
      ORDER BY t.name ASC
    `;

    const tags = await query(sql, [id]);

    return NextResponse.json({ tags });

  } catch (error) {
    console.error('Get card tags error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - добавление метки к карточке
export async function POST(request, { params }) {
  try {
    if (!checkAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tag_id } = await request.json();
    const { id } = await params;

    if (!id || !tag_id) {
      return NextResponse.json({ error: 'Card ID and tag ID are required' }, { status: 400 });
    }

    // Проверяем существует ли карточка
    const cardExists = await query('SELECT id FROM cards WHERE id = ?', [id]);
    if (cardExists.length === 0) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    // Проверяем существует ли метка
    const tagExists = await query('SELECT id FROM tags WHERE id = ?', [tag_id]);
    if (tagExists.length === 0) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    const sql = 'INSERT INTO card_tags (card_id, tag_id) VALUES (?, ?)';
    await query(sql, [id, tag_id]);

    return NextResponse.json({
      success: true,
      message: 'Tag added to card successfully'
    });

  } catch (error) {
    console.error('Add card tag error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'This tag is already assigned to the card' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - удаление метки у карточки
export async function DELETE(request, { params }) {
  try {
    if (!checkAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const tag_id = searchParams.get('tag_id');

    if (!id || !tag_id) {
      return NextResponse.json({ error: 'Card ID and tag ID are required' }, { status: 400 });
    }

    const sql = 'DELETE FROM card_tags WHERE card_id = ? AND tag_id = ?';
    const result = await query(sql, [id, tag_id]);

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Tag not found on this card' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Tag removed from card successfully'
    });

  } catch (error) {
    console.error('Remove card tag error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}