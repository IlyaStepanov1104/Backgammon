import { NextResponse } from 'next/server';
import { query } from '@/services/database';

// Простая проверка авторизации (заглушка)
function checkAuth(request) {
  // TODO: Реализовать реальную проверку сессии
  return true;
}

// POST - валидация промокода
export async function POST(request) {
  try {
    if (!checkAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code } = await request.json();

    if (!code) {
      return NextResponse.json({ 
        error: 'Promocode is required' 
      }, { status: 400 });
    }

    // Проверяем формат промокода
    const codeRegex = /^[A-Z0-9]{6,20}$/;
    if (!codeRegex.test(code.toUpperCase())) {
      return NextResponse.json({
        success: false,
        valid: false,
        error: 'Invalid promocode format. Must be 6-20 characters, letters and numbers only.'
      });
    }

    // Проверяем существование промокода
    const promocode = await query(
      'SELECT * FROM promo_codes WHERE code = ?',
      [code.toUpperCase()]
    );

    if (promocode.length === 0) {
      return NextResponse.json({
        success: false,
        valid: false,
        error: 'Promocode not found'
      });
    }

    const promo = promocode[0];

    // Проверяем активность
    if (!promo.is_active) {
      return NextResponse.json({
        success: false,
        valid: false,
        error: 'Promocode is inactive'
      });
    }

    // Проверяем срок действия
    if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
      return NextResponse.json({
        success: false,
        valid: false,
        error: 'Promocode has expired'
      });
    }

    // Проверяем лимит использований
    if (promo.current_uses >= promo.max_uses) {
      return NextResponse.json({
        success: false,
        valid: false,
        error: 'Promocode usage limit reached'
      });
    }

    // Проверяем доступность карточек
    const availableCards = await query(`
      SELECT COUNT(*) as count 
      FROM cards c 
      WHERE c.id NOT IN (
        SELECT DISTINCT card_id FROM user_card_access
      )
    `);

    if (availableCards[0].count < promo.card_package_size) {
      return NextResponse.json({
        success: false,
        valid: false,
        error: `Not enough cards available. Required: ${promo.card_package_size}, Available: ${availableCards[0].count}`
      });
    }

    // Промокод валиден
    return NextResponse.json({
      success: true,
      valid: true,
      promocode: {
        id: promo.id,
        code: promo.code,
        description: promo.description,
        maxUses: promo.max_uses,
        currentUses: promo.current_uses,
        cardPackageSize: promo.card_package_size,
        expiresAt: promo.expires_at,
        isActive: promo.is_active,
        remainingUses: promo.max_uses - promo.current_uses,
        availableCards: availableCards[0].count
      }
    });

  } catch (error) {
    console.error('Validate promocode error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET - проверка доступности кода
export async function GET(request) {
  try {
    if (!checkAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json({ 
        error: 'Promocode is required' 
      }, { status: 400 });
    }

    // Проверяем существование
    const existing = await query(
      'SELECT id FROM promo_codes WHERE code = ?',
      [code.toUpperCase()]
    );

    return NextResponse.json({
      success: true,
      available: existing.length === 0,
      code: code.toUpperCase()
    });

  } catch (error) {
    console.error('Check promocode availability error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
