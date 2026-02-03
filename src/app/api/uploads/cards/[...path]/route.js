import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

// Маппинг расширений на MIME-типы
const MIME_TYPES = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
};

// Папка с загрузками
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'cards');

export async function GET(request, { params }) {
    try {
        const {path: pathSegments} = await params;

        if (!pathSegments || pathSegments.length === 0) {
            return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }

        // Получаем имя файла (защита от path traversal)
        const filename = pathSegments[pathSegments.length - 1];

        // Проверяем, что имя файла не содержит опасных символов
        if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
            return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
        }

        const filepath = path.join(UPLOAD_DIR, filename);

        // Проверяем, что файл находится внутри UPLOAD_DIR (защита от path traversal)
        const resolvedPath = path.resolve(filepath);
        const resolvedUploadDir = path.resolve(UPLOAD_DIR);

        if (!resolvedPath.startsWith(resolvedUploadDir)) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // Проверяем существование файла
        if (!fs.existsSync(filepath)) {
            return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }

        // Читаем файл
        const fileBuffer = fs.readFileSync(filepath);

        // Определяем MIME-тип
        const ext = path.extname(filename).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        // Возвращаем файл с правильными заголовками
        return new NextResponse(fileBuffer, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Content-Length': fileBuffer.length.toString(),
                'Cache-Control': 'public, max-age=31536000, immutable', // Кешируем на год (файлы с UUID не меняются)
            },
        });

    } catch (error) {
        console.error('File serve error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
