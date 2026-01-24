import {NextResponse} from 'next/server';
import {query, queryWithPagination} from '../../../../services/database';
import path from 'path';
import fs from 'fs';
import { v4 as uuid } from 'uuid';

// Папка для загрузок
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'cards');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

async function saveFile(file) {
    const arrayBuffer = await file.arrayBuffer();
    const ext = file instanceof File ? path.extname(file.name) : '.bin';
    const filename = `${uuid()}${ext}`;
    const filepath = path.join(UPLOAD_DIR, filename);

    fs.writeFileSync(filepath, Buffer.from(arrayBuffer));

    return `/uploads/cards/${filename}`;
}

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
            return NextResponse.json({error: 'Unauthorized'}, {status: 401});
        }

        const {searchParams} = new URL(request.url);
        const page = parseInt(searchParams.get('page')) || 1;
        const limit = parseInt(searchParams.get('limit')) || 20;
        const search = searchParams.get('search') || '';
        const difficulty = searchParams.get('difficulty') || '';
        const tags = searchParams.get('tags') || '';

        let sql = `
            SELECT c.*,
                   GROUP_CONCAT(DISTINCT t.name ORDER BY t.name SEPARATOR ', ') as tags
            FROM cards c
                     LEFT JOIN card_tags ct ON c.id = ct.card_id
                     LEFT JOIN tags t ON ct.tag_id = t.id
            WHERE 1 = 1
        `;
        let params = [];

        if (search) {
            sql += ' AND (c.title LIKE ? OR c.description LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        if (difficulty) {
            sql += ' AND c.difficulty_level = ?';
            params.push(difficulty);
        }

        if (tags) {
            const tagArray = tags
                .split(',')
                .map(tag => tag.trim())
                .filter(Boolean);

            if (tagArray.length > 0) {
                const placeholders = tagArray.map(() => '?').join(',');

                sql += `
          AND EXISTS (
            SELECT 1
            FROM card_tags ct
            WHERE ct.card_id = c.id
              AND ct.tag_id IN (${placeholders})
          )
        `;

                params.push(...tagArray);
            }
        }

        sql += ' GROUP BY c.id ORDER BY c.created_at DESC';

        // Используем безопасную функцию пагинации
        const cards = await queryWithPagination(sql, params, limit, (page - 1) * limit);

        // Получаем общее количество карточек
        let countSql = `
            SELECT COUNT(DISTINCT c.id) as total
            FROM cards c
                     LEFT JOIN card_tags ct ON c.id = ct.card_id
                     LEFT JOIN tags t ON ct.tag_id = t.id
            WHERE 1 = 1
        `;
        let countParams = [];

        if (search) {
            countSql += ' AND (c.title LIKE ? OR c.description LIKE ?)';
            countParams.push(`%${search}%`, `%${search}%`);
        }

        if (difficulty) {
            countSql += ' AND c.difficulty_level = ?';
            countParams.push(difficulty);
        }

        if (tags) {
            const tagArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
            if (tagArray.length > 0) {
                countSql += ' AND c.id IN (SELECT ct.card_id FROM card_tags ct JOIN tags t ON ct.tag_id = t.id WHERE t.name IN (?))';
                countParams.push(tagArray);
            }
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
        return NextResponse.json({error: 'Internal server error'}, {status: 500});
    }
}

// POST - создание новой карточки
export async function POST(request) {
    try {
        if (!checkAuth(request)) {
            return NextResponse.json({error: 'Unauthorized'}, {status: 401});
        }

        let title, description, image_url, image_url_2, image_url_3, correct_moves, position_description,
            difficulty_level;

        // Проверяем, является ли запрос multipart/form-data
        const contentType = request.headers.get('content-type');
        if (contentType && contentType.includes('multipart/form-data')) {
            const formData = await request.formData();
            title = formData.get('title');
            description = formData.get('description');
            image_url = formData.get('image_url');
            image_url_2 = formData.get('image_url_2');
            image_url_3 = formData.get('image_url_3');
            correct_moves = formData.get('correct_moves');
            position_description = formData.get('position_description');
            difficulty_level = formData.get('difficulty_level');

            // Первое изображение
            const file = formData.get('image');
            if (file) {
                image_url = await saveFile(file);
            }

            const file2 = formData.get('image_2');
            if (file2) {
                image_url_2 = await saveFile(file2);
            }

            const file3 = formData.get('image_3');
            if (file3) {
                image_url_3 = await saveFile(file3);
            }
        } else {
            // Обычный JSON запрос
            const data = await request.json();
            title = data.title;
            description = data.description;
            image_url = data.image_url;
            image_url_2 = data.image_url_2;
            image_url_3 = data.image_url_3;
            correct_moves = data.correct_moves;
            position_description = data.position_description;
            difficulty_level = data.difficulty_level;
        }

        if (!title || !image_url) {
            return NextResponse.json({error: 'Title and image are required'}, {status: 400});
        }

        const sql = `
            INSERT INTO cards (title, description, image_url, image_url_2, image_url_3, correct_moves,
                               position_description, difficulty_level)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const result = await query(sql, [
            title,
            description || '',
            image_url,
            image_url_2 || null,
            image_url_3 || null,
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
        return NextResponse.json({error: 'Internal server error'}, {status: 500});
    }
}

// PUT - обновление карточки
export async function PUT(request) {
    try {
        if (!checkAuth(request)) {
            return NextResponse.json({error: 'Unauthorized'}, {status: 401});
        }

        let id, title, description, image_url, image_url_2, image_url_3, correct_moves, position_description,
            difficulty_level;

        // Проверяем, является ли запрос multipart/form-data
        const contentType = request.headers.get('content-type');
        if (contentType && contentType.includes('multipart/form-data')) {
            const formData = await request.formData();
            id = formData.get('id');
            title = formData.get('title');
            description = formData.get('description');
            image_url = formData.get('image_url');
            image_url_2 = formData.get('image_url_2');
            image_url_3 = formData.get('image_url_3');
            correct_moves = formData.get('correct_moves');
            position_description = formData.get('position_description');
            difficulty_level = formData.get('difficulty_level');

            // Обрабатываем загруженные файлы
            const file = formData.get('image');
            if (file) {
                image_url = await saveFile(file);
            }

            const file2 = formData.get('image_2');
            if (file2) {
                image_url_2 = await saveFile(file2);
            }

            const file3 = formData.get('image_3');
            if (file3) {
                image_url_3 = await saveFile(file3);
            }
        } else {
            // Обычный JSON запрос
            const data = await request.json();
            id = data.id;
            title = data.title;
            description = data.description;
            image_url = data.image_url;
            image_url_2 = data.image_url_2;
            image_url_3 = data.image_url_3;
            correct_moves = data.correct_moves;
            position_description = data.position_description;
            difficulty_level = data.difficulty_level;
        }

        if (!id || !title) {
            return NextResponse.json({error: 'ID and title are required'}, {status: 400});
        }

        // Если изображения не изменились, получаем текущие из БД
        const currentCard = await query('SELECT image_url, image_url_2, image_url_3 FROM cards WHERE id = ?', [id]);
        if (currentCard.length > 0) {
            if (!image_url) {
                image_url = currentCard[0].image_url;
            }
            if (!image_url_2) {
                image_url_2 = currentCard[0].image_url_2;
            }
            if (!image_url_3) {
                image_url_3 = currentCard[0].image_url_3;
            }
        }

        const sql = `
            UPDATE cards
            SET title                = ?,
                description          = ?,
                image_url            = ?,
                image_url_2          = ?,
                image_url_3          = ?,
                correct_moves        = ?,
                position_description = ?,
                difficulty_level     = ?,
                updated_at           = CURRENT_TIMESTAMP
            WHERE id = ?
        `;

        await query(sql, [
            title,
            description || '',
            image_url,
            image_url_2,
            image_url_3,
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
        return NextResponse.json({error: 'Internal server error'}, {status: 500});
    }
}

// DELETE - удаление карточки
export async function DELETE(request) {
    try {
        if (!checkAuth(request)) {
            return NextResponse.json({error: 'Unauthorized'}, {status: 401});
        }

        const {searchParams} = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({error: 'Card ID is required'}, {status: 400});
        }

        const sql = 'DELETE FROM cards WHERE id = ?';
        await query(sql, [id]);

        return NextResponse.json({
            success: true,
            message: 'Card deleted successfully'
        });

    } catch (error) {
        console.error('Delete card error:', error);
        return NextResponse.json({error: 'Internal server error'}, {status: 500});
    }
}
