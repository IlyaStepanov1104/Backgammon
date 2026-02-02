import { NextResponse } from 'next/server';
import { query } from '@/services/database';

function checkAuth(request) {
  return true; // Аутентификация проверяется на клиенте через localStorage
}

// GET - получение всех сохраненных фильтров
export async function GET(request) {
  try {
    if (!checkAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sql = `
      SELECT *
      FROM saved_filters
      ORDER BY created_at DESC
    `;

    const filters = await query(sql);

    // Парсим JSON в каждом фильтре
    const parsedFilters = filters.map(filter => ({
      ...filter,
      filters: typeof filter.filters === 'string' 
        ? JSON.parse(filter.filters) 
        : filter.filters
    }));

    return NextResponse.json({ filters: parsedFilters });

  } catch (error) {
    console.error('Get saved filters error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - создание нового сохраненного фильтра
export async function POST(request) {
  try {
    if (!checkAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, filters } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (!filters) {
      return NextResponse.json({ error: 'Filters are required' }, { status: 400 });
    }

    const sql = `
      INSERT INTO saved_filters (name, filters)
      VALUES (?, ?)
    `;

    const result = await query(sql, [
      name.trim(),
      JSON.stringify(filters)
    ]);

    return NextResponse.json({
      success: true,
      id: result.insertId,
      message: 'Filter saved successfully'
    });

  } catch (error) {
    console.error('Create saved filter error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - обновление сохраненного фильтра
export async function PUT(request) {
  try {
    if (!checkAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, name, filters } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Filter ID is required' }, { status: 400 });
    }

    // Проверяем существование фильтра
    const existingFilter = await query('SELECT id FROM saved_filters WHERE id = ?', [id]);
    if (existingFilter.length === 0) {
      return NextResponse.json({ error: 'Filter not found' }, { status: 404 });
    }

    // Строим запрос на обновление
    const updates = [];
    const params = [];

    if (name !== undefined) {
      if (!name.trim()) {
        return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
      }
      updates.push('name = ?');
      params.push(name.trim());
    }

    if (filters !== undefined) {
      updates.push('filters = ?');
      params.push(JSON.stringify(filters));
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    params.push(id);

    const sql = `
      UPDATE saved_filters
      SET ${updates.join(', ')}
      WHERE id = ?
    `;

    await query(sql, params);

    return NextResponse.json({
      success: true,
      message: 'Filter updated successfully'
    });

  } catch (error) {
    console.error('Update saved filter error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - удаление сохраненного фильтра
export async function DELETE(request) {
  try {
    if (!checkAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Filter ID is required' }, { status: 400 });
    }

    // Проверяем существование фильтра
    const existingFilter = await query('SELECT id FROM saved_filters WHERE id = ?', [id]);
    if (existingFilter.length === 0) {
      return NextResponse.json({ error: 'Filter not found' }, { status: 404 });
    }

    await query('DELETE FROM saved_filters WHERE id = ?', [id]);

    return NextResponse.json({
      success: true,
      message: 'Filter deleted successfully'
    });

  } catch (error) {
    console.error('Delete saved filter error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}