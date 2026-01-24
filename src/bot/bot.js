const TelegramBot = require('node-telegram-bot-api');
const { query } = require('@/services/database');
require('dotenv').config();

// Создаем бота с пуллингом
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

console.log('🤖 Бот запущен с пуллингом...');

// Обработка команды /start
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const user = msg.from;
  
  try {
    console.log(`Пользователь ${user.first_name} (${user.username}) запустил бота`);
    
    // Сохраняем пользователя в БД
    await saveUser(user);
    
    // Проверяем доступ пользователя
    const hasAccess = await checkUserAccess(user.id);
    
    if (hasAccess) {
      const message = `
Привет, ${user.first_name}! 👋\n
У Вас есть доступ к карточкам для совершенствования в коротких нардах.\n
Нажмите кнопку, чтобы открыть приложение.`;
      
      const keyboard = {
        inline_keyboard: [[
          {
            text: '🎯 Открыть карточки',
            web_app: {
              url: `${process.env.NEXT_PUBLIC_APP_URL}/miniapp?user=${user.id}`
            }
          }
        ]]
      };
      
      bot.sendMessage(chatId, message, { reply_markup: keyboard });
    } else {
      const message = `Привет, ${user.first_name}! 👋\n\nК сожалению, у тебя пока нет доступа к карточкам.\n\nДля получения доступа:\n1. Обратись к администратору\n2. Или используй промокод\n\nОтправь промокод в чат, если он у тебя есть.`;
      
      bot.sendMessage(chatId, message);
    }
  } catch (error) {
    console.error('Ошибка обработки команды /start:', error);
    bot.sendMessage(chatId, 'Произошла ошибка. Попробуйте позже.');
  }
});

// Обработка промокодов
bot.onText(/^[A-Z0-9]{6,20}$/, async (msg) => {
  const chatId = msg.chat.id;
  const user = msg.from;
  const promoCode = msg.text.toUpperCase();
  
  try {
    console.log(`Пользователь ${user.first_name} пытается использовать промокод: ${promoCode}`);
    
    // Проверяем промокод
    const promoResult = await checkPromoCode(promoCode, user.id);
    console.log("%c 1 --> Line: 61||bot.js\n promoResult: ","color:#f0f;", promoResult);
    
    if (promoResult.success) {
      const message = `✅ Промокод активирован!\n\nТеперь у тебя есть доступ к ${promoResult.cardCount} карточкам.\n\nНажми кнопку ниже, чтобы начать изучение:`;
      
      const keyboard = {
        inline_keyboard: [[
          {
            text: '🎯 Открыть карточки',
            web_app: {
              url: `${process.env.NEXT_PUBLIC_APP_URL}/miniapp?user=${user.id}`
            }
          }
        ]]
      };
      
      bot.sendMessage(chatId, message, { reply_markup: keyboard });
    } else {
      bot.sendMessage(chatId, `❌ Промокод недействителен или уже использован.\n\nОшибка: ${promoResult.error}`);
    }
  } catch (error) {
    console.error('Ошибка обработки промокода:', error);
    bot.sendMessage(chatId, 'Произошла ошибка при проверке промокода. Попробуйте позже.');
  }
});

// Обработка callback запросов (кнопки)
bot.on('callback_query', async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;
  const user = callbackQuery.from;
  
  try {
    if (data === 'open_miniapp') {
      const hasAccess = await checkUserAccess(user.id);
      
      if (hasAccess) {
        const keyboard = {
          inline_keyboard: [[
            {
              text: '🎯 Открыть карточки',
              web_app: {
                url: `${process.env.NEXT_PUBLIC_APP_URL}/miniapp?user=${user.id}`
              }
            }
          ]]
        };
        
        bot.editMessageText(
          'Отлично! Нажми кнопку ниже, чтобы открыть мини-приложение:',
          {
            chat_id: chatId,
            message_id: callbackQuery.message.message_id,
            reply_markup: keyboard
          }
        );
      } else {
        bot.answerCallbackQuery(callbackQuery.id, {
          text: 'У вас нет доступа к карточкам',
          show_alert: true
        });
      }
    }
  } catch (error) {
    console.error('Ошибка обработки callback:', error);
    bot.answerCallbackQuery(callbackQuery.id, {
      text: 'Произошла ошибка',
      show_alert: true
    });
  }
  
  // Отвечаем на callback
  bot.answerCallbackQuery(callbackQuery.id);
});

// Обработка ошибок
bot.on('polling_error', (error) => {
  console.error('Ошибка пуллинга:', error);
});

bot.on('error', (error) => {
  console.error('Ошибка бота:', error);
});

// Функция сохранения пользователя
async function saveUser(user) {
  try {
    const sql = `
      INSERT INTO users (telegram_id, username, first_name, last_name) 
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        username = VALUES(username),
        first_name = VALUES(first_name),
        last_name = VALUES(last_name),
        updated_at = CURRENT_TIMESTAMP
    `;
    
    await query(sql, [
      user.id,
      user.username || null,
      user.first_name || '',
      user.last_name || ''
    ]);
    
    console.log(`Пользователь ${user.first_name} сохранен/обновлен в БД`);
  } catch (error) {
    console.error('Ошибка сохранения пользователя:', error);
    throw error;
  }
}

// Функция проверки доступа пользователя
async function checkUserAccess(telegramId) {
  try {
    const sql = `
      SELECT COUNT(*) as count 
      FROM user_card_access uca
      JOIN users u ON uca.user_id = u.id
      WHERE u.telegram_id = ? 
        AND uca.is_active = 1
        AND (uca.expires_at IS NULL OR uca.expires_at > NOW())
    `;
    
    const result = await query(sql, [telegramId]);
    return result[0].count > 0;
  } catch (error) {
    console.error('Ошибка проверки доступа:', error);
    return false;
  }
}

// Функция проверки промокода
async function checkPromoCode(code, telegramId) {
  try {
    // Получаем информацию о промокоде
    const promoQuery = `
      SELECT p.*, COUNT(pc.card_id) AS card_count
      FROM promo_codes p
      LEFT JOIN promo_code_cards pc ON p.id = pc.promo_code_id
      WHERE p.code = ? AND p.is_active = 1
      GROUP BY p.id
    `;
    const promocodes = await query(promoQuery, [code]);

    if (promocodes.length === 0) {
      return { success: false, error: 'Промокод не найден' };
    }

    const promocode = promocodes[0];

    // Проверяем срок действия
    if (promocode.expires_at && new Date(promocode.expires_at) < new Date()) {
      return { success: false, error: 'Промокод истек' };
    }

    // Проверяем лимит использований
    if (promocode.current_uses >= promocode.max_uses) {
      return { success: false, error: 'Промокод больше не действителен' };
    }

    // Получаем пользователя
    const userQuery = 'SELECT id FROM users WHERE telegram_id = ?';
    const users = await query(userQuery, [telegramId]);
    if (users.length === 0) {
      return { success: false, error: 'Пользователь не найден' };
    }
    const userId = users[0].id;

    // Получаем все карточки промокода с текущим доступом пользователя
    const cardsQuery = `
      SELECT c.id, uca.is_active
      FROM cards c
      INNER JOIN promo_code_cards pc ON c.id = pc.card_id
      LEFT JOIN user_card_access uca 
             ON c.id = uca.card_id AND uca.user_id = ?
      WHERE pc.promo_code_id = ?
    `;
    const cards = await query(cardsQuery, [userId, promocode.id]);

    if (cards.length === 0) {
      return { success: false, error: 'Нет доступных карточек' };
    }

    // Подключение к БД для транзакции
    const connection = await require('@/services/database').getConnection();
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
           ON DUPLICATE KEY UPDATE
             is_active = 1,
             expires_at = VALUES(expires_at),
             access_granted_at = CURRENT_TIMESTAMP`,
            [userId, card.id, promocode.expires_at || null]
        );
      }

      await connection.commit();

      return {
        success: true,
        cardCount: cards.length,
        message: `Доступ предоставлен к ${cards.length} карточкам`
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Ошибка проверки промокода:', error);
    return { success: false, error: 'Внутренняя ошибка сервера' };
  }
}

// Обработка завершения работы
process.on('SIGINT', () => {
  console.log('\n🛑 Получен сигнал завершения...');
  bot.stopPolling();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Получен сигнал завершения...');
  bot.stopPolling();
  process.exit(0);
});

module.exports = { bot };
