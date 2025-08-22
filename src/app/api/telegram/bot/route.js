import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../database/config';
import bcrypt from 'bcryptjs';

export async function POST(req) {
  try {
    const update = await req.json();
    
    // Получаем chat_id из разных типов обновлений
    const chat_id = update.message ? update.message.chat.id : update.callback_query?.message?.chat.id;
    
    if (!chat_id) {
      return NextResponse.json({ error: 'Invalid update format' }, { status: 400 });
    }

    // Обрабатываем команду /start
    if (update.message?.text === '/start') {
      const user = update.message.from;
      return await handleStartCommand(chat_id, user);
    }

    // Обрабатываем callback запросы
    if (update.callback_query) {
      const data = update.callback_query.data;
      return await handleCallbackQuery(chat_id, data, update.callback_query.from);
    }

    // Обрабатываем текстовые сообщения (промокоды)
    if (update.message?.text && !update.message.text.startsWith('/')) {
      const text = update.message.text.trim();
      const user = update.message.from;
      
      // Проверяем, является ли текст промокодом
      if (text.length >= 6 && text.length <= 20) {
        return await handlePromoCode(chat_id, text, user);
      }
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Bot API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Обработка команды /start
async function handleStartCommand(chatId, user) {
  try {
    // Сохраняем пользователя в базу данных
    await saveUser(user);
    
    // Проверяем есть ли у пользователя доступ к миниаппу
    const hasAccess = await checkUserAccess(user.id);
    
    if (hasAccess) {
      const welcomeMessage = `Привет, ${user.first_name}! 👋\n\nУ вас есть доступ к карточкам для изучения игры в короткие нарды.\n\nНажмите кнопку ниже, чтобы открыть миниапп:`;
      
      const keyboard = {
        inline_keyboard: [[
          {
            text: '🎯 Открыть карточки',
            web_app: { url: `${process.env.NEXT_PUBLIC_APP_URL}/miniapp?user=${user.id}` }
          }
        ]]
      };
      
      // Отправляем сообщение через Telegram Bot API
      await sendTelegramMessage(chatId, welcomeMessage, keyboard);
    } else {
      const welcomeMessage = `Привет, ${user.first_name}! 👋\n\nДобро пожаловать в бот для изучения игры в короткие нарды!\n\nДля получения доступа к карточкам обратитесь к администратору или используйте промокод.`;
      
      const keyboard = {
        inline_keyboard: [[
          { text: '🔑 Ввести промокод', callback_data: 'enter_promo' }
        ]]
      };
      
      await sendTelegramMessage(chatId, welcomeMessage, keyboard);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error in /start command:', error);
    await sendTelegramMessage(chatId, 'Произошла ошибка. Попробуйте позже.');
    return NextResponse.json({ success: true });
  }
}

// Обработка callback запросов
async function handleCallbackQuery(chatId, data, user) {
  try {
    if (data === 'enter_promo') {
      await sendTelegramMessage(chatId, 'Введите промокод:');
    }
    
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error in callback query:', error);
    return NextResponse.json({ success: true });
  }
}

// Обработка промокода
async function handlePromoCode(chatId, code, user) {
  try {
    const promoResult = await checkPromoCode(code, user.id);
    
    if (promoResult.success) {
      await sendTelegramMessage(chatId, `Промокод активирован! Вам предоставлен доступ к ${promoResult.cardCount} карточкам.`);
      
      // Показываем кнопку для открытия миниаппа
      const keyboard = {
        inline_keyboard: [[
          {
            text: '🎯 Открыть карточки',
            web_app: { url: `${process.env.NEXT_PUBLIC_APP_URL}/miniapp?user=${user.id}` }
          }
        ]]
      };
      
      await sendTelegramMessage(chatId, 'Теперь вы можете открыть миниапп:', keyboard);
    } else {
      await sendTelegramMessage(chatId, 'Неверный промокод или он уже недействителен.');
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error checking promo code:', error);
    await sendTelegramMessage(chatId, 'Произошла ошибка при проверке промокода.');
    return NextResponse.json({ success: true });
  }
}

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
    
    await query(sql, [user.id, user.username, user.first_name, user.last_name]);
    console.log(`User saved/updated: ${user.id}`);
  } catch (error) {
    console.error('Error saving user:', error);
    throw error;
  }
}

// Функция проверки доступа пользователя
async function checkUserAccess(telegramId) {
  try {
    const sql = `
      SELECT COUNT(*) as access_count 
      FROM user_card_access uca 
      JOIN users u ON uca.user_id = u.id 
      WHERE u.telegram_id = ? AND uca.is_active = 1 
      AND (uca.expires_at IS NULL OR uca.expires_at > NOW())
    `;
    
    const result = await query(sql, [telegramId]);
    return result[0].access_count > 0;
  } catch (error) {
    console.error('Error checking user access:', error);
    return false;
  }
}

// Функция проверки промокода
async function checkPromoCode(code, telegramId) {
  try {
    // Получаем информацию о промокоде
    const promoQuery = `
      SELECT * FROM promo_codes 
      WHERE code = ? AND is_active = 1 
      AND (expires_at IS NULL OR expires_at > NOW())
      AND current_uses < max_uses
    `;
    
    const promoResult = await query(promoQuery, [code]);
    
    if (promoResult.length === 0) {
      return { success: false, message: 'Промокод не найден или недействителен' };
    }
    
    const promo = promoResult[0];
    
    // Получаем ID пользователя
    const userQuery = 'SELECT id FROM users WHERE telegram_id = ?';
    const userResult = await query(userQuery, [telegramId]);
    
    if (userResult.length === 0) {
      return { success: false, message: 'Пользователь не найден' };
    }
    
    const userId = userResult[0].id;
    
    // Начинаем транзакцию
    const connection = await require('../../../../database/config').getConnection();
    await connection.beginTransaction();
    
    try {
      // Увеличиваем счетчик использования промокода
      await connection.execute(
        'UPDATE promo_codes SET current_uses = current_uses + 1 WHERE id = ?',
        [promo.id]
      );
      
      // Получаем случайные карточки для пользователя
      const cardsQuery = `
        SELECT id FROM cards 
        WHERE id NOT IN (
          SELECT card_id FROM user_card_access WHERE user_id = ?
        )
        ORDER BY RAND() 
        LIMIT ?
      `;
      
      const cards = await connection.execute(cardsQuery, [userId, promo.card_package_size]);
      
      if (cards[0].length === 0) {
        await connection.rollback();
        return { success: false, message: 'Нет доступных карточек' };
      }
      
      // Предоставляем доступ к карточкам
      for (const card of cards[0]) {
        await connection.execute(
          'INSERT INTO user_card_access (user_id, card_id) VALUES (?, ?)',
          [userId, card.id]
        );
      }
      
      await connection.commit();
      
      return { 
        success: true, 
        cardCount: cards[0].length,
        message: 'Промокод успешно активирован'
      };
      
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    
  } catch (error) {
    console.error('Error checking promo code:', error);
    return { success: false, message: 'Ошибка при проверке промокода' };
  }
}

// Функция отправки сообщения через Telegram Bot API
async function sendTelegramMessage(chatId, text, replyMarkup = null) {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      console.error('TELEGRAM_BOT_TOKEN не установлен');
      return;
    }

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const body = {
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML'
    };

    if (replyMarkup) {
      body.reply_markup = replyMarkup;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      console.error('Telegram API error:', await response.text());
    }

  } catch (error) {
    console.error('Error sending Telegram message:', error);
  }
}
