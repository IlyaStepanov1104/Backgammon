import { NextResponse } from 'next/server';
import { query, getConnection } from '@/services/database';

// POST - активация промокода
export async function POST(request) {
  try {
    const { telegramId, code } = await request.json();

    if (!telegramId || !code) {
      return NextResponse.json({
        success: false,
        error: 'Telegram ID и промокод обязательны'
      }, { status: 400 });
    }

    const promoCode = code.toUpperCase().trim();

    // Проверяем формат промокода
    if (!/^[A-Z0-9]{6,20}$/.test(promoCode)) {
      return NextResponse.json({
        success: false,
        error: 'Неверный формат промокода'
      });
    }

    // Получаем информацию о промокоде
    const promoQuery = `
      SELECT p.*, COUNT(pc.card_id) AS card_count
      FROM promo_codes p
      LEFT JOIN promo_code_cards pc ON p.id = pc.promo_code_id
      WHERE p.code = ?
        AND p.is_active = 1
      GROUP BY p.id
    `;
    const promocodes = await query(promoQuery, [promoCode]);

    if (promocodes.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Промокод не найден'
      });
    }

    const promocode = promocodes[0];

    // Проверяем срок действия
    if (promocode.expires_at && new Date(promocode.expires_at) < new Date()) {
      return NextResponse.json({
        success: false,
        error: 'Промокод истёк'
      });
    }

    // Проверяем лимит использований
    if (promocode.current_uses >= promocode.max_uses) {
      return NextResponse.json({
        success: false,
        error: 'Промокод больше не действителен'
      });
    }

    // Получаем пользователя
    const userQuery = 'SELECT id FROM users WHERE telegram_id = ?';
    const users = await query(userQuery, [telegramId]);
    if (users.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Пользователь не найден'
      });
    }
    const userId = users[0].id;

    // Получаем все карточки промокода
    const cardsQuery = `
      SELECT c.id
      FROM cards c
      INNER JOIN promo_code_cards pc ON c.id = pc.card_id
      WHERE pc.promo_code_id = ?
    `;
    const cards = await query(cardsQuery, [promocode.id]);

    if (cards.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Нет доступных карточек'
      });
    }

    // Подключение к БД для транзакции
    const connection = await getConnection();
    await connection.beginTransaction();

    try {
      // Увеличиваем счетчик использования промокода
      await connection.execute(
        'UPDATE promo_codes SET current_uses = current_uses + 1 WHERE id = ?',
        [promocode.id]
      );

      // Предоставляем доступ к карточкам
      for (const card of cards) {
        await connection.execute(
          `INSERT INTO user_card_access (user_id, card_id, expires_at, is_active, access_granted_at)
           VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)
           ON DUPLICATE KEY UPDATE is_active = 1,
                                   expires_at = VALUES(expires_at),
                                   access_granted_at = CURRENT_TIMESTAMP`,
          [userId, card.id, promocode.expires_at || null]
        );
      }

      await connection.commit();

      return NextResponse.json({
        success: true,
        cardCount: cards.length,
        message: `Доступ предоставлен к ${cards.length} карточкам`
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Promocode activation error:', error);
    return NextResponse.json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    }, { status: 500 });
  }
}
