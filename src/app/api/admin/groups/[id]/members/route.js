import { NextResponse } from 'next/server';
import { query, getConnection } from '@/services/database';

// Простая проверка авторизации
function checkAuth() {
  // В реальном проекте здесь можно добавить проверку сессии
  // Пока что просто разрешаем доступ
  return true;
}

// GET - получение списка членов группы
export async function GET(request, { params }) {
  try {
    if (!checkAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;

    // Проверяем существование группы
    const groupCheck = await query('SELECT id FROM user_groups WHERE id = ?', [id]);
    if (groupCheck.length === 0) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const members = await query(`
      SELECT u.id, u.telegram_id, u.username, u.first_name, u.last_name, gm.joined_at
      FROM user_group_members gm
      JOIN users u ON gm.user_id = u.id
      WHERE gm.group_id = ?
      ORDER BY gm.joined_at DESC
    `, [id]);

    return NextResponse.json({ members });

  } catch (error) {
    console.error('Get group members error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - добавление пользователей в группу
export async function POST(request, { params }) {
  try {
    if (!checkAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    const { userIds } = await request.json();

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'User IDs array is required' }, { status: 400 });
    }

    // Проверяем существование группы
    const groupCheck = await query('SELECT id FROM user_groups WHERE id = ?', [id]);
    if (groupCheck.length === 0) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const connection = await getConnection();
    await connection.beginTransaction();

    try {
      // Проверяем существование пользователей
      if (userIds.length > 0) {
        const placeholders = userIds.map(() => '?').join(',');
        const [existingUsers] = await connection.execute(
          `SELECT id FROM users WHERE id IN (${placeholders})`,
          userIds
        );
        const existingUserIds = existingUsers.map(row => row.id);
        const invalidUserIds = userIds.filter(id => !existingUserIds.includes(id));

        if (invalidUserIds.length > 0) {
          await connection.rollback();
          connection.release();
          return NextResponse.json({
            error: `Некоторые пользователи не найдены: ${invalidUserIds.join(', ')}`,
            invalidUserIds
          }, { status: 400 });
        }
      }

      // Проверяем, кто уже в группе
      const [existingMembers] = await connection.execute(
        `SELECT user_id FROM user_group_members WHERE group_id = ? AND user_id IN (${userIds.map(() => '?').join(',')})`,
        [id, ...userIds]
      );
      const existingUserIds = existingMembers.map(row => row.user_id);
      const newUserIds = userIds.filter(id => !existingUserIds.includes(id));

      // Добавляем новых членов
      let addedCount = 0;
      for (const userId of newUserIds) {
        await connection.execute(
          'INSERT INTO user_group_members (group_id, user_id) VALUES (?, ?)',
          [id, userId]
        );
        addedCount++;
      }

      await connection.commit();

      return NextResponse.json({
        success: true,
        message: `Добавлено ${addedCount} пользователей в группу, ${existingUserIds.length} уже были в группе`,
        added: addedCount,
        alreadyMembers: existingUserIds.length
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Add group members error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - удаление пользователей из группы
export async function DELETE(request, { params }) {
  try {
    if (!checkAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // Проверяем существование группы
    const groupCheck = await query('SELECT id FROM user_groups WHERE id = ?', [id]);
    if (groupCheck.length === 0) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    if (userId) {
      // Удаляем конкретного пользователя
      const result = await query('DELETE FROM user_group_members WHERE group_id = ? AND user_id = ?', [id, userId]);
      return NextResponse.json({
        success: true,
        message: result.affectedRows > 0 ? 'Пользователь удален из группы' : 'Пользователь не был в группе'
      });
    } else {
      // Удаляем всех членов группы
      await query('DELETE FROM user_group_members WHERE group_id = ?', [id]);
      return NextResponse.json({
        success: true,
        message: 'Все пользователи удалены из группы'
      });
    }

  } catch (error) {
    console.error('Remove group members error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}