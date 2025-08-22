import { NextResponse } from 'next/server';
import { query, queryWithPagination } from '../../../../database/config';

// Простая проверка авторизации
function checkAuth(request) {
  // В реальном проекте здесь можно добавить проверку сессии
  // Пока что просто разрешаем доступ
  return true;
}

// GET - получение списка карточек
export async function GET(request) {
  try {
    if (!checkAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const search = searchParams.get('search') || '';
    const difficulty = searchParams.get('difficulty') || '';
    
    let sql = 'SELECT * FROM cards WHERE 1=1';
    let params = [];
    
    if (search) {
      sql += ' AND (title LIKE ? OR description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    
    if (difficulty) {
      sql += ' AND difficulty_level = ?';
      params.push(difficulty);
    }
    
    sql += ' ORDER BY created_at DESC';
    
    // Используем безопасную функцию пагинации
    const cards = await queryWithPagination(sql, params, limit, (page - 1) * limit);
    
    // Получаем общее количество карточек
    let countSql = 'SELECT COUNT(*) as total FROM cards WHERE 1=1';
    let countParams = [];
    
    if (search) {
      countSql += ' AND (title LIKE ? OR description LIKE ?)';
      countParams.push(`%${search}%`, `%${search}%`);
    }
    
    if (difficulty) {
      countSql += ' AND difficulty_level = ?';
      countParams.push(difficulty);
    }
    
    const countResult = await query(countSql, countParams);
    const total = countResult[0].total;
    
    return NextResponse.json({
      cards,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error('Get cards error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - создание новой карточки
export async function POST(request) {
  try {
    if (!checkAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let title, description, image_url, correct_moves, position_description, difficulty_level;

    // Проверяем, является ли запрос multipart/form-data
    const contentType = request.headers.get('content-type');
    if (contentType && contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      title = formData.get('title');
      description = formData.get('description');
      image_url = formData.get('image_url');
      correct_moves = formData.get('correct_moves');
      position_description = formData.get('position_description');
      difficulty_level = formData.get('difficulty_level');
      
      // Обрабатываем загруженный файл
      const imageFile = formData.get('image');
      if (imageFile) {
        const fileName = `${Date.now()}_${imageFile.name}`;
        const filePath = `/uploads/${fileName}`;
        
        // Сохраняем файл в папку public/uploads
        const fs = require('fs');
        const path = require('path');
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
        
        // Создаем папку uploads если её нет
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        
        const fileBuffer = Buffer.from(await imageFile.arrayBuffer());
        fs.writeFileSync(path.join(uploadsDir, fileName), fileBuffer);
        
        image_url = filePath;
      }
    } else {
      // Обычный JSON запрос
      const data = await request.json();
      title = data.title;
      description = data.description;
      image_url = data.image_url;
      correct_moves = data.correct_moves;
      position_description = data.position_description;
      difficulty_level = data.difficulty_level;
    }
    
    if (!title || !image_url) {
      return NextResponse.json({ error: 'Title and image are required' }, { status: 400 });
    }
    
    const sql = `
      INSERT INTO cards (title, description, image_url, correct_moves, position_description, difficulty_level) 
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    const result = await query(sql, [
      title, 
      description || '', 
      image_url, 
      correct_moves || '', 
      position_description || '', 
      difficulty_level || 'medium'
    ]);
    
    return NextResponse.json({ 
      success: true, 
      cardId: result.insertId,
      message: 'Card created successfully' 
    });
    
  } catch (error) {
    console.error('Create card error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - обновление карточки
export async function PUT(request) {
  try {
    if (!checkAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let id, title, description, image_url, correct_moves, position_description, difficulty_level;

    // Проверяем, является ли запрос multipart/form-data
    const contentType = request.headers.get('content-type');
    if (contentType && contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      id = formData.get('id');
      title = formData.get('title');
      description = formData.get('description');
      image_url = formData.get('image_url');
      correct_moves = formData.get('correct_moves');
      position_description = formData.get('position_description');
      difficulty_level = formData.get('difficulty_level');
      
      // Обрабатываем загруженный файл
      const imageFile = formData.get('image');
      if (imageFile) {
        const fileName = `${Date.now()}_${imageFile.name}`;
        const filePath = `/uploads/${fileName}`;
        
        // Сохраняем файл в папку public/uploads
        const fs = require('fs');
        const path = require('path');
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
        
        // Создаем папку uploads если её нет
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        
        const fileBuffer = Buffer.from(await imageFile.arrayBuffer());
        fs.writeFileSync(path.join(uploadsDir, fileName), fileBuffer);
        
        image_url = filePath;
      }
    } else {
      // Обычный JSON запрос
      const data = await request.json();
      id = data.id;
      title = data.title;
      description = data.description;
      image_url = data.image_url;
      correct_moves = data.correct_moves;
      position_description = data.position_description;
      difficulty_level = data.difficulty_level;
    }
    
    if (!id || !title) {
      return NextResponse.json({ error: 'ID and title are required' }, { status: 400 });
    }
    
    // Если изображение не изменилось, получаем текущее из БД
    if (!image_url) {
      const currentCard = await query('SELECT image_url FROM cards WHERE id = ?', [id]);
      if (currentCard.length > 0) {
        image_url = currentCard[0].image_url;
      }
    }
    
    const sql = `
      UPDATE cards 
      SET title = ?, description = ?, image_url = ?, correct_moves = ?, position_description = ?, difficulty_level = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    await query(sql, [
      title, 
      description || '', 
      image_url, 
      correct_moves || '', 
      position_description || '', 
      difficulty_level || 'medium',
      id
    ]);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Card updated successfully' 
    });
    
  } catch (error) {
    console.error('Update card error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - удаление карточки
export async function DELETE(request) {
  try {
    if (!checkAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Card ID is required' }, { status: 400 });
    }
    
    const sql = 'DELETE FROM cards WHERE id = ?';
    await query(sql, [id]);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Card deleted successfully' 
    });
    
  } catch (error) {
    console.error('Delete card error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
