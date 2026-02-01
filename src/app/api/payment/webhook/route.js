import { NextResponse } from 'next/server';
import { query, getConnection } from '@/services/database';

export async function POST(request) {
  try {
    const body = await request.json();

    // Получаем данные о событии от YooKassa
    const { event, object } = body;

    console.log('YooKassa webhook received:', { event, paymentId: object?.id });

    // Обрабатываем только успешные платежи
    if (event === 'payment.succeeded' && object) {
      const paymentId = object.id;
      const metadata = object.metadata || {};

      // Получаем информацию о покупке
      const purchases = await query(
        `SELECT pp.*, p.name as package_name
         FROM package_purchases pp
         JOIN packages p ON pp.package_id = p.id
         WHERE pp.payment_id = ?`,
        [paymentId]
      );

      if (purchases.length === 0) {
        console.error('Purchase not found for payment:', paymentId);
        return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
      }

      const purchase = purchases[0];

      // Если платеж уже был обработан, просто возвращаем успех
      if (purchase.payment_status === 'succeeded') {
        return NextResponse.json({ success: true, message: 'Already processed' });
      }

      const connection = await getConnection();
      await connection.beginTransaction();

      try {
        // Обновляем статус покупки
        await connection.execute(
          'UPDATE package_purchases SET payment_status = ? WHERE payment_id = ?',
          ['succeeded', paymentId]
        );

        // Получаем карточки пакета
        const cards = await connection.execute(
          'SELECT card_id FROM package_cards WHERE package_id = ?',
          [purchase.package_id]
        );

        // Предоставляем доступ к карточкам
        for (const card of cards[0]) {
          await connection.execute(
            `INSERT INTO user_card_access (user_id, card_id, is_active, access_granted_at)
             VALUES (?, ?, 1, CURRENT_TIMESTAMP)
             ON DUPLICATE KEY UPDATE
               is_active = 1,
               access_granted_at = CURRENT_TIMESTAMP`,
            [purchase.user_id, card.card_id]
          );
        }

        await connection.commit();

        console.log('Payment processed successfully:', {
          paymentId,
          userId: purchase.user_id,
          packageId: purchase.package_id,
          cardsGranted: cards[0].length
        });

        return NextResponse.json({
          success: true,
          message: 'Payment processed'
        });

      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    }

    // Для других событий просто возвращаем успех
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}
