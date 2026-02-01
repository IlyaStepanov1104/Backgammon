const axios = require('axios');

const YOOKASSA_API_URL = 'https://api.yookassa.ru/v3';

// Создание платежа
async function createPayment({ amount, description, metadata, returnUrl }) {
  try {
    const shopId = process.env.YOOKASSA_SHOP_ID;
    const secretKey = process.env.YOOKASSA_SECRET_KEY;

    if (!shopId || !secretKey || shopId === 'your_shop_id') {
      throw new Error('YooKassa credentials are not configured');
    }

    const auth = Buffer.from(`${shopId}:${secretKey}`).toString('base64');

    const response = await axios.post(
      `${YOOKASSA_API_URL}/payments`,
      {
        amount: {
          value: amount.toFixed(2),
          currency: 'RUB'
        },
        confirmation: {
          type: 'redirect',
          return_url: returnUrl
        },
        capture: true,
        description,
        metadata
      },
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
          'Idempotence-Key': `${Date.now()}-${Math.random()}`
        }
      }
    );

    return {
      success: true,
      paymentId: response.data.id,
      confirmationUrl: response.data.confirmation.confirmation_url,
      status: response.data.status
    };

  } catch (error) {
    console.error('YooKassa create payment error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.description || error.message
    };
  }
}

// Получение информации о платеже
async function getPayment(paymentId) {
  try {
    const shopId = process.env.YOOKASSA_SHOP_ID;
    const secretKey = process.env.YOOKASSA_SECRET_KEY;

    if (!shopId || !secretKey || shopId === 'your_shop_id') {
      throw new Error('YooKassa credentials are not configured');
    }

    const auth = Buffer.from(`${shopId}:${secretKey}`).toString('base64');

    const response = await axios.get(
      `${YOOKASSA_API_URL}/payments/${paymentId}`,
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      success: true,
      payment: response.data
    };

  } catch (error) {
    console.error('YooKassa get payment error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.description || error.message
    };
  }
}

module.exports = {
  createPayment,
  getPayment
};
