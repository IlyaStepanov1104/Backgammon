import { NextResponse } from 'next/server';
import { query, queryWithPagination } from '@/services/database';

// Простая проверка авторизации
function checkAuth() {
  // В реальном проекте здесь можно добавить проверку сессии
  // Пока что просто разрешаем доступ
  return true;
}

// GET - получение списка групп пользователей
export async function GET(request) {
  try {
    if (!checkAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const search = searchParams.get('search') || '';

    let sql = `
      SELECT g.*,
             COUNT(DISTINCT gm.user_id) as member_count
      FROM user_groups g
      LEFT JOIN user_group_members gm ON g.id = gm.group_id
      WHERE 1=1
    `;
    let params = [];

    if (search) {
      sql += ' AND (g.name LIKE ? OR g.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ' GROUP BY g.id ORDER BY g.created_at DESC';

    // Используем безопасную функцию пагинации
    const groups = await queryWithPagination(sql, params, limit, (page - 1) * limit);

    // Получаем общее количество групп
    let countSql = 'SELECT COUNT(*) as total FROM user_groups g WHERE 1=1';
    let countParams = [];

    if (search) {
      countSql += ' AND (g.name LIKE ? OR g.description LIKE ?)';
      countParams.push(`%${search}%`, `%${search}%`);
    }

    const countResult = await query(countSql, countParams);
    const total = countResult[0].total;

    return NextResponse.json({
      groups,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get groups error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - создание новой группы
export async function POST(request) {
  try {
    if (!checkAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { name, description } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'Group name is required' }, { status: 400 });
    }

    // Проверяем, существует ли группа с таким именем
    const existingGroup = await query('SELECT id FROM user_groups WHERE name = ?', [name]);
    if (existingGroup.length > 0) {
      return NextResponse.json({ error: 'Group with this name already exists' }, { status: 400 });
    }

    const result = await query(
      'INSERT INTO user_groups (name, description) VALUES (?, ?)',
      [name, description || null]
    );

    return NextResponse.json({
      success: true,
      message: 'Group created successfully',
      groupId: result.insertId
    });

  } catch (error) {
    console.error('Create group error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - обновление группы
export async function PUT(request) {
  try {
    if (!checkAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, name, description } = await request.json();

    if (!id || !name) {
      return NextResponse.json({ error: 'Group ID and name are required' }, { status: 400 });
    }

    // Проверяем существование группы
    const groupCheck = await query('SELECT id FROM user_groups WHERE id = ?', [id]);
    if (groupCheck.length === 0) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Проверяем, не существует ли другая группа с таким именем
    const existingGroup = await query('SELECT id FROM user_groups WHERE name = ? AND id != ?', [name, id]);
    if (existingGroup.length > 0) {
      return NextResponse.json({ error: 'Group with this name already exists' }, { status: 400 });
    }

    await query(
      'UPDATE user_groups SET name = ?, description = ? WHERE id = ?',
      [name, description || null, id]
    );

    return NextResponse.json({
      success: true,
      message: 'Group updated successfully'
    });

  } catch (error) {
    console.error('Update group error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - удаление группы
export async function DELETE(request) {
  try {
    if (!checkAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');

    if (!groupId) {
      return NextResponse.json({ error: 'Group ID is required' }, { status: 400 });
    }

    // Проверяем существование группы
    const groupCheck = await query('SELECT id FROM user_groups WHERE id = ?', [groupId]);
    if (groupCheck.length === 0) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    await query('DELETE FROM user_groups WHERE id = ?', [groupId]);

    return NextResponse.json({
      success: true,
      message: 'Group deleted successfully'
    });

  } catch (error) {
    console.error('Delete group error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}