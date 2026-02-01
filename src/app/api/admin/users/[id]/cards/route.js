import { NextResponse } from 'next/server';
import { query } from '@/services/database';

function checkAuth(request) {
    // Здесь можно сделать полноценную проверку авторизации
    return true;
}

export async function GET(request, { params }) {
    try {
        if (!checkAuth(request)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const {id: userId} = await params;
        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        // Выбираем только активные карточки (учитываем срок действия)
        const sql = `
      SELECT card_id 
      FROM user_card_access
      WHERE user_id = ? 
        AND is_active = 1
        AND (expires_at IS NULL OR expires_at > NOW())
    `;

        const rows = await query(sql, [userId]);
        const activeCardIds = rows.map(row => row.card_id);

        return NextResponse.json({ activeCardIds });
    } catch (error) {
        console.error('Error fetching user cards:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
