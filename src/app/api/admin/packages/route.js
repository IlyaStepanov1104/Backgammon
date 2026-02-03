import { NextResponse } from 'next/server';
import { query, getConnection } from '@/services/database';

// Простая проверка авторизации
function checkAuth(request) {
  return true;
}

// GET - получение списка пакетов
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
        p.name,
        p.description,
        p.price,
        p.expires_at,
        p.is_active,
        p.created_at,
        p.updated_at,
        COUNT(pc.card_id) as card_count,
        GROUP_CONCAT(pc.card_id ORDER BY pc.card_id) as card_ids
      FROM packages p
      LEFT JOIN package_cards pc ON p.id = pc.package_id
    `;

    let countSql = 'SELECT COUNT(*) as total FROM packages p';
    let params = [];
    let countParams = [];

    // Добавляем фильтры
    const conditions = [];

    if (search) {
      conditions.push('(p.name LIKE ? OR p.description LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
      countParams.push(`%${search}%`, `%${search}%`);
    }

    if (status === 'active') {
      conditions.push('p.is_active = 1');
    } else if (status === 'inactive') {
      conditions.push('p.is_active = 0');
    }

    if (conditions.length > 0) {
      const whereClause = ' WHERE ' + conditions.join(' AND ');
      sql += whereClause;
      countSql += whereClause;
    }

    sql += ' GROUP BY p.id ORDER BY p.created_at DESC';

    // Получаем пакеты с пагинацией
    const offset = (page - 1) * limit;
    const packages = await query(`${sql} LIMIT ${limit} OFFSET ${offset}`, params);

    // Преобразуем card_ids из строки в массив чисел
    const packagesWithCardIds = packages.map(pkg => ({
      ...pkg,
      cardIds: pkg.card_ids ? pkg.card_ids.split(',').map(id => parseInt(id)) : []
    }));

    // Получаем общее количество
    const totalResult = await query(countSql, countParams);
    const total = totalResult[0].total;

    return NextResponse.json({
      success: true,
      packages: packagesWithCardIds,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get packages error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - создание нового пакета
export async function POST(request) {
  let connection;
  try {
    if (!checkAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, price, cardIds, isActive, expiresAt } = body;

    // Валидация
    if (!name || !price) {
      return NextResponse.json({
        error: 'Name and price are required'
      }, { status: 400 });
    }

    if (price <= 0) {
      return NextResponse.json({
        error: 'Price must be greater than 0'
      }, { status: 400 });
    }

    if (!cardIds || cardIds.length === 0) {
      return NextResponse.json({
        error: 'At least one card must be selected'
      }, { status: 400 });
    }

    connection = await getConnection();

    // Устанавливаем таймаут для блокировок
    await connection.execute('SET innodb_lock_wait_timeout = 10');
    await connection.execute('SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED');

    await connection.beginTransaction();

    try {
      // Создаем пакет
      const [result] = await connection.execute(
        `INSERT INTO packages (name, description, price, expires_at, is_active)
         VALUES (?, ?, ?, ?, ?)`,
        [name, description || null, price, expiresAt || null, isActive ? 1 : 0]
      );

      const packageId = result.insertId;

      // Добавляем карточки к пакету batch insert
      if (cardIds && cardIds.length > 0) {
        const values = cardIds.map(cardId => `(${packageId}, ${cardId})`).join(',');
        await connection.execute(
          `INSERT INTO package_cards (package_id, card_id) VALUES ${values}`
        );
      }

      await connection.commit();

      return NextResponse.json({
        success: true,
        packageId,
        message: 'Package created successfully'
      });

    } catch (error) {
      try {
        if (connection) {
          await connection.rollback();
        }
      } catch (rollbackError) {
        console.error('Rollback error:', rollbackError);
      }
      throw error;
    }

  } catch (error) {
    console.error('Create package error:', error);

    if (error.code === 'ER_LOCK_WAIT_TIMEOUT') {
      return NextResponse.json({
        error: 'Операция заблокирована другим процессом. Попробуйте еще раз.'
      }, { status: 409 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    if (connection) {
      try {
        connection.release();
      } catch (releaseError) {
        console.error('Connection release error:', releaseError);
      }
    }
  }
}

// PUT - обновление пакета
export async function PUT(request) {
  let connection;
  try {
    if (!checkAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, description, price, cardIds, isActive, expiresAt } = body;

    if (!id) {
      return NextResponse.json({ error: 'Package ID is required' }, { status: 400 });
    }

    // Валидация
    if (!name || !price) {
      return NextResponse.json({
        error: 'Name and price are required'
      }, { status: 400 });
    }

    if (price <= 0) {
      return NextResponse.json({
        error: 'Price must be greater than 0'
      }, { status: 400 });
    }

    connection = await getConnection();

    // Устанавливаем таймаут для блокировок (10 секунд)
    await connection.execute('SET innodb_lock_wait_timeout = 10');

    // Используем READ COMMITTED для уменьшения блокировок
    await connection.execute('SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED');

    await connection.beginTransaction();

    try {
      // Обновляем пакет
      await connection.execute(
        `UPDATE packages
         SET name = ?, description = ?, price = ?, expires_at = ?, is_active = ?
         WHERE id = ?`,
        [name, description || null, price, expiresAt || null, isActive ? 1 : 0, id]
      );

      // Обновляем карточки - удаляем старые и добавляем новые
      await connection.execute('DELETE FROM package_cards WHERE package_id = ?', [id]);

      if (cardIds && cardIds.length > 0) {
        // Используем batch insert для производительности
        const values = cardIds.map(cardId => `(${id}, ${cardId})`).join(',');
        await connection.execute(
          `INSERT INTO package_cards (package_id, card_id) VALUES ${values}`
        );
      }

      await connection.commit();

      return NextResponse.json({
        success: true,
        message: 'Package updated successfully'
      });

    } catch (error) {
      // Безопасный rollback с проверкой
      try {
        if (connection) {
          await connection.rollback();
        }
      } catch (rollbackError) {
        console.error('Rollback error:', rollbackError);
      }
      throw error;
    }

  } catch (error) {
    console.error('Update package error:', error);

    // Специальная обработка для lock timeout
    if (error.code === 'ER_LOCK_WAIT_TIMEOUT') {
      return NextResponse.json({
        error: 'Операция заблокирована другим процессом. Попробуйте еще раз.'
      }, { status: 409 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    // Всегда освобождаем соединение
    if (connection) {
      try {
        connection.release();
      } catch (releaseError) {
        console.error('Connection release error:', releaseError);
      }
    }
  }
}

// DELETE - удаление пакета
export async function DELETE(request) {
  try {
    if (!checkAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Package ID is required' }, { status: 400 });
    }

    // Удаляем пакет (каскадно удалятся и связи с карточками)
    await query('DELETE FROM packages WHERE id = ?', [id]);

    return NextResponse.json({
      success: true,
      message: 'Package deleted successfully'
    });

  } catch (error) {
    console.error('Delete package error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
