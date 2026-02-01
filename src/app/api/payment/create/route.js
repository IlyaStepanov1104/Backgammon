import { NextResponse } from 'next/server';
import { query, getConnection } from '@/services/database';
import { createPayment } from '@/services/yookassa';

export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, packageId } = body;

    if (!userId || !packageId) {
      return NextResponse.json({
        error: 'User ID and Package ID are required'
      }, { status: 400 });
    }

    // Получаем информацию о пакете
    const packages = await query(
      'SELECT id, name, price, is_active FROM packages WHERE id = ?',
      [packageId]
    );

    if (packages.length === 0) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 });
    }

    const pkg = packages[0];

    if (!pkg.is_active) {
      return NextResponse.json({ error: 'Package is not active' }, { status: 400 });
    }

    // Получаем пользователя
    const users = await query(
      'SELECT id FROM users WHERE telegram_id = ?',
      [userId]
    );

    if (users.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = users[0];

    // Проверяем, не купил ли пользователь уже этот пакет
    const purchases = await query(
      `SELECT id FROM package_purchases
       WHERE user_id = ? AND package_id = ? AND payment_status = 'succeeded'`,
      [user.id, packageId]
    );

    if (purchases.length > 0) {
      return NextResponse.json({
        error: 'Package already purchased'
      }, { status: 400 });
    }

    const connection = await getConnection();
    await connection.beginTransaction();

    try {
      // Создаем запись о покупке
      const [purchaseResult] = await connection.execute(
        `INSERT INTO package_purchases (user_id, package_id, amount, payment_status)
         VALUES (?, ?, ?, 'pending')`,
        [user.id, packageId, pkg.price]
      );

      const purchaseId = purchaseResult.insertId;

      // Создаем платеж в YooKassa
      const paymentResult = await createPayment({
        amount: parseFloat(pkg.price),
        description: `Покупка пакета: ${pkg.name}`,
        metadata: {
          purchaseId: purchaseId,
          userId: user.id,
          packageId: packageId
        },
        returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/miniapp?paymentSuccess=true`
      });

      if (!paymentResult.success) {
        await connection.rollback();
        return NextResponse.json({
          error: paymentResult.error || 'Failed to create payment'
        }, { status: 500 });
      }

      // Обновляем запись о покупке с payment_id
      await connection.execute(
        'UPDATE package_purchases SET payment_id = ? WHERE id = ?',
        [paymentResult.paymentId, purchaseId]
      );

      await connection.commit();

      return NextResponse.json({
        success: true,
        paymentUrl: paymentResult.confirmationUrl,
        paymentId: paymentResult.paymentId
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Create payment error:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}
