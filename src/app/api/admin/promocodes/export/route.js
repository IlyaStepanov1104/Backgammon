import { NextResponse } from 'next/server';
import { query } from '@/services/database';

// Простая проверка авторизации (заглушка)
function checkAuth(request) {
  // TODO: Реализовать реальную проверку сессии
  return true;
}

// GET - экспорт промокодов
export async function GET(request) {
  try {
    if (!checkAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';
    const status = searchParams.get('status') || '';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';

    // Формируем SQL запрос
    let sql = `
      SELECT 
        p.id,
        p.code,
        p.description,
        p.max_uses,
        p.current_uses,
        p.card_package_size,
        p.expires_at,
        p.is_active,
        p.created_at,
        (p.current_uses * p.card_package_size) as total_cards_given,
        CASE 
          WHEN p.expires_at IS NULL THEN 'active'
          WHEN p.expires_at > NOW() THEN 'active'
          ELSE 'expired'
        END as status
      FROM promo_codes p
    `;

    let params = [];
    let whereConditions = [];

    // Добавляем фильтры
    if (status) {
      if (status === 'active') {
        whereConditions.push('(p.expires_at IS NULL OR p.expires_at > NOW()) AND p.is_active = 1');
      } else if (status === 'expired') {
        whereConditions.push('p.expires_at IS NOT NULL AND p.expires_at <= NOW()');
      } else if (status === 'used') {
        whereConditions.push('p.current_uses >= p.max_uses');
      } else if (status === 'unused') {
        whereConditions.push('p.current_uses = 0');
      }
    }

    if (dateFrom) {
      whereConditions.push('p.created_at >= ?');
      params.push(dateFrom);
    }

    if (dateTo) {
      whereConditions.push('p.created_at <= ?');
      params.push(dateTo + ' 23:59:59');
    }

    if (whereConditions.length > 0) {
      sql += ' WHERE ' + whereConditions.join(' AND ');
    }

    sql += ' ORDER BY p.created_at DESC';

    // Получаем данные
    const promocodes = await query(sql, params);

    // Форматируем данные для экспорта
    const formattedData = promocodes.map(p => ({
      ID: p.id,
      Код: p.code,
      Описание: p.description || '',
      Максимум_использований: p.max_uses,
      Текущее_использование: p.current_uses,
      Размер_пакета_карточек: p.card_package_size,
      Всего_выдано_карточек: p.total_cards_given,
      Дата_истечения: p.expires_at ? new Date(p.expires_at).toLocaleDateString('ru-RU') : 'Бессрочно',
      Статус: p.status,
      Активен: p.is_active ? 'Да' : 'Нет',
      Дата_создания: new Date(p.created_at).toLocaleDateString('ru-RU')
    }));

    // Возвращаем в нужном формате
    if (format === 'csv') {
      return generateCSV(formattedData);
    } else {
      // JSON по умолчанию
      return NextResponse.json({
        success: true,
        promocodes: formattedData,
        exportInfo: {
          format: 'json',
          total: formattedData.length,
          exportedAt: new Date().toISOString()
        }
      });
    }

  } catch (error) {
    console.error('Export promocodes error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Функция генерации CSV
function generateCSV(data) {
  if (data.length === 0) {
    return new NextResponse('', {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="promocodes.csv"'
      }
    });
  }

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header] || '';
        // Экранируем запятые и кавычки
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');

  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="promocodes.csv"'
    }
  });
}
