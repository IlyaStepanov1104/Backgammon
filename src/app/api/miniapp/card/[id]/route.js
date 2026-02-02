import { NextResponse } from 'next/server';
import { query } from '@/services/database';

// GET - получение одной карточки по ID (для скриншотов)
export async function GET(request, { params }) {
    try {
        const {id: cardId} = await params;

        if (!cardId) {
            return NextResponse.json({ error: 'Card ID is required' }, { status: 400 });
        }

        const sql = 'SELECT * FROM cards WHERE id = ?';
        const result = await query(sql, [cardId]);

        if (result.length === 0) {
            return NextResponse.json({ error: 'Card not found' }, { status: 404 });
        }

        return NextResponse.json(result[0]);

    } catch (error) {
        console.error('Get card error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}