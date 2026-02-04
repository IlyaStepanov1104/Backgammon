const TelegramBot = require('node-telegram-bot-api');
const { query, getConnection } = require("../services/database");
require('dotenv').config();

// Создаем бота с пуллингом
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

console.log('🤖 Бот запущен с пуллингом...');

// Обработка команды /packages
bot.onText(/\/packages/, async (msg) => {
    const chatId = msg.chat.id;
    const user = msg.from;

    try {
        await saveUser(user);
        await showPackages(chatId, user.id);
    } catch (error) {
        console.error('Ошибка обработки команды /packages:', error);
        bot.sendMessage(chatId, 'Произошла ошибка. Попробуйте позже.');
    }
});

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
            const message = `Привет, ${user.first_name}! 👋

У Вас есть доступ к карточкам для совершенствования в коротких нардах.

Нажмите кнопку, чтобы открыть приложение.

💡 Есть промокод? Просто отправьте его в этот чат.`;

            const keyboard = {
                inline_keyboard: [
                    [{
                        text: '🎯 Открыть карточки',
                        web_app: {
                            url: `${process.env.NEXT_PUBLIC_APP_URL}/miniapp?user=${user.id}`
                        }
                    }],
                    [{
                        text: '📦 Купить пакет',
                        callback_data: 'show_packages'
                    }]
                ]
            };

            bot.sendMessage(chatId, message, { reply_markup: keyboard });
        } else {
            const message = `Привет, ${user.first_name}! 👋

К сожалению, у тебя пока нет доступа к карточкам.

Для получения доступа:
1. Купи пакет карточек
2. Используй промокод

💡 Есть промокод? Просто отправь его в этот чат!`;

            const keyboard = {
                inline_keyboard: [[
                    {
                        text: '📦 Купить пакет',
                        callback_data: 'show_packages'
                    }
                ]]
            };

            bot.sendMessage(chatId, message, { reply_markup: keyboard });
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
        } else if (data === 'show_packages') {
            // Показываем список пакетов
            await showPackages(chatId, user.id);
            bot.answerCallbackQuery(callbackQuery.id);
        } else if (data.startsWith('buy_package_')) {
            // Покупка пакета
            const packageId = data.replace('buy_package_', '');
            await buyPackage(chatId, user.id, packageId);
            bot.answerCallbackQuery(callbackQuery.id);
        }
    } catch (error) {
        console.error('Ошибка обработки callback:', error);
        bot.answerCallbackQuery(callbackQuery.id, {
            text: 'Произошла ошибка',
            show_alert: true
        });
    }

    // Отвечаем на callback
    if (!data.startsWith('buy_package_') && data !== 'show_packages') {
        bot.answerCallbackQuery(callbackQuery.id);
    }
});

// Обработка pre_checkout_query (подтверждение перед оплатой)
// ВАЖНО: Telegram требует ответ в течение 10 секунд!
bot.on('pre_checkout_query', async (preCheckoutQuery) => {
    const startTime = Date.now();

    try {
        const payload = JSON.parse(preCheckoutQuery.invoice_payload);
        const packageId = payload.package_id;
        const telegramId = payload.user_telegram_id;

        // Проверяем пакет с таймаутом 5 секунд
        const checkPromise = query(
            `SELECT p.id, p.price
             FROM packages p
             WHERE p.id = ?
               AND p.is_active = 1
               AND (p.expires_at IS NULL OR p.expires_at > NOW())`,
            [packageId]
        );

        const timeoutPromise = new Promise((resolve) =>
            setTimeout(() => resolve('timeout'), 5000)
        );

        const result = await Promise.race([checkPromise, timeoutPromise]);

        // Если таймаут — подтверждаем (проверка была при создании Invoice)
        if (result === 'timeout') {
            await bot.answerPreCheckoutQuery(preCheckoutQuery.id, true);
            return;
        }

        const packages = result;

        if (packages.length === 0) {
            await bot.answerPreCheckoutQuery(preCheckoutQuery.id, false, {
                error_message: 'Пакет больше недоступен для покупки'
            });
            return;
        }

        const pkg = packages[0];
        const expectedAmount = Math.round(pkg.price * 100);
        if (preCheckoutQuery.total_amount !== expectedAmount) {
            await bot.answerPreCheckoutQuery(preCheckoutQuery.id, false, {
                error_message: 'Цена пакета изменилась. Попробуйте снова.'
            });
            return;
        }

        await bot.answerPreCheckoutQuery(preCheckoutQuery.id, true);
    } catch (error) {
        console.error('Ошибка обработки pre_checkout_query:', error);
        // При ошибке всё равно пробуем подтвердить, чтобы не терять платёж
        // (проверка была при создании Invoice)
        try {
            await bot.answerPreCheckoutQuery(preCheckoutQuery.id, true);
        } catch (e) {
            console.error('Не удалось ответить на pre_checkout_query:', e.message);
        }
    }
});

// Обработка successful_payment (успешная оплата)
bot.on('message', async (msg) => {
    if (!msg.successful_payment) return;

    const chatId = msg.chat.id;
    const payment = msg.successful_payment;
    const telegramId = msg.from.id;

    try {
        const payload = JSON.parse(payment.invoice_payload);
        const packageId = payload.package_id;

        console.log(`Успешная оплата от пользователя ${telegramId} для пакета ${packageId}`);

        // Получаем пользователя из БД
        const users = await query('SELECT id FROM users WHERE telegram_id = ?', [telegramId]);
        if (users.length === 0) {
            console.error(`Пользователь ${telegramId} не найден в БД`);
            bot.sendMessage(chatId, '❌ Ошибка: пользователь не найден. Обратитесь в поддержку.');
            return;
        }
        const userId = users[0].id;

        // Получаем информацию о пакете
        const packages = await query(
            `SELECT p.id, p.name, p.price
             FROM packages p
             WHERE p.id = ?`,
            [packageId]
        );

        if (packages.length === 0) {
            console.error(`Пакет ${packageId} не найден`);
            bot.sendMessage(chatId, '❌ Ошибка: пакет не найден. Обратитесь в поддержку.');
            return;
        }

        const pkg = packages[0];

        // Создаём запись о покупке и выдаём доступ к карточкам
        const connection = await getConnection();

        try {
            await connection.execute('SET innodb_lock_wait_timeout = 10');
            await connection.execute('SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED');
            await connection.beginTransaction();

            // Записываем покупку
            await connection.execute(
                `INSERT INTO package_purchases
                 (user_id, package_id, amount, payment_id, telegram_payment_charge_id, status)
                 VALUES (?, ?, ?, ?, ?, 'completed')`,
                [
                    userId,
                    packageId,
                    pkg.price,
                    payment.provider_payment_charge_id,
                    payment.telegram_payment_charge_id
                ]
            );

            // Получаем карточки пакета
            const [cards] = await connection.execute(
                'SELECT card_id FROM package_cards WHERE package_id = ?',
                [packageId]
            );

            // Выдаём доступ к карточкам
            if (cards.length > 0) {
                const values = cards.map(card => `(${userId}, ${card.card_id}, 1, CURRENT_TIMESTAMP)`).join(',');
                await connection.execute(
                    `INSERT INTO user_card_access (user_id, card_id, is_active, access_granted_at)
                     VALUES ${values}
                     ON DUPLICATE KEY UPDATE is_active = 1, access_granted_at = CURRENT_TIMESTAMP`
                );
            }

            await connection.commit();

            console.log(`Доступ выдан пользователю ${telegramId} к ${cards.length} карточкам`);

            // Отправляем подтверждение пользователю
            const message = `✅ Оплата прошла успешно!\n\n` +
                `📦 Пакет: ${pkg.name}\n` +
                `💰 Сумма: ${pkg.price} ₽\n` +
                `📚 Карточек: ${cards.length}\n\n` +
                `Теперь вам доступны все карточки из пакета. Нажмите кнопку ниже, чтобы начать обучение:`;

            const keyboard = {
                inline_keyboard: [[
                    {
                        text: '🎯 Открыть карточки',
                        web_app: {
                            url: `${process.env.NEXT_PUBLIC_APP_URL}/miniapp?user=${telegramId}`
                        }
                    }
                ]]
            };

            bot.sendMessage(chatId, message, { reply_markup: keyboard });

        } catch (error) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error('Ошибка rollback:', rollbackError);
            }
            throw error;
        } finally {
            try {
                connection.release();
            } catch (releaseError) {
                console.error('Ошибка release:', releaseError);
            }
        }

    } catch (error) {
        console.error('Ошибка обработки successful_payment:', error);
        bot.sendMessage(chatId,
            '❌ Оплата прошла, но произошла ошибка при выдаче доступа.\n\n' +
            'Пожалуйста, обратитесь в поддержку с этим сообщением:\n' +
            `Payment ID: ${payment.telegram_payment_charge_id}`
        );
    }
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
            ON DUPLICATE KEY UPDATE username   = VALUES(username),
                                    first_name = VALUES(first_name),
                                    last_name  = VALUES(last_name),
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
            WHERE p.code = ?
              AND p.is_active = 1
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
                     ON DUPLICATE KEY UPDATE is_active         = 1,
                                             expires_at        = VALUES(expires_at),
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

// Функция показа списка пакетов
async function showPackages(chatId, telegramId) {
    try {
        // Получаем список активных пакетов (не истекших)
        const packages = await query(
            `SELECT p.id,
                    p.name,
                    p.description,
                    p.price,
                    COUNT(pc.card_id) as card_count
             FROM packages p
                      LEFT JOIN package_cards pc ON p.id = pc.package_id
             WHERE p.is_active = 1
               AND (p.expires_at IS NULL OR p.expires_at > NOW())
             GROUP BY p.id
             ORDER BY p.price ASC`
        );

        if (packages.length === 0) {
            bot.sendMessage(chatId, 'К сожалению, пакеты пока недоступны.');
            return;
        }

        // Формируем клавиатуру с пакетами
        const keyboard = {
            inline_keyboard: packages.map(pkg => [{
                text: `${pkg.name} - ${pkg.price} ₽ (${pkg.card_count} карточек)`,
                callback_data: `buy_package_${pkg.id}`
            }])
        };

        let message = '📦 Доступные пакеты карточек:\n\n';
        packages.forEach(pkg => {
            message += `🎯 ${pkg.name}\n`;
            if (pkg.description) {
                message += `${pkg.description}\n`;
            }
            message += `💰 Цена: ${pkg.price} ₽\n`;
            message += `📚 Карточек: ${pkg.card_count}\n\n`;
        });

        message += '💡 Есть промокод? Просто отправьте его в чат!\n\n';
        message += 'Выберите пакет для покупки:';

        bot.sendMessage(chatId, message, { reply_markup: keyboard });
    } catch (error) {
        console.error('Ошибка показа пакетов:', error);
        bot.sendMessage(chatId, 'Произошла ошибка при загрузке пакетов.');
    }
}

// Функция покупки пакета через Telegram Payments
async function buyPackage(chatId, telegramId, packageId) {
    try {
        // Получаем информацию о пакете (не истекшем)
        const packages = await query(
            `SELECT p.id,
                    p.name,
                    p.description,
                    p.price,
                    COUNT(pc.card_id) as card_count
             FROM packages p
                      LEFT JOIN package_cards pc ON p.id = pc.package_id
             WHERE p.id = ?
               AND p.is_active = 1
               AND (p.expires_at IS NULL OR p.expires_at > NOW())
             GROUP BY p.id`,
            [packageId]
        );

        if (packages.length === 0) {
            bot.sendMessage(chatId, '❌ Пакет не найден или неактивен.');
            return;
        }

        const pkg = packages[0];

        // Проверяем наличие токена платежей
        if (!process.env.TELEGRAM_PAYMENT_TOKEN) {
            bot.sendMessage(chatId, '❌ Оплата временно недоступна. Попробуйте позже.');
            console.error('TELEGRAM_PAYMENT_TOKEN не настроен');
            return;
        }

        // Формируем данные для Invoice
        const title = pkg.name;
        const description = pkg.description || `Пакет из ${pkg.card_count} карточек для изучения коротких нард`;
        const payload = JSON.stringify({
            package_id: pkg.id,
            user_telegram_id: telegramId
        });
        const currency = 'RUB';
        const prices = [{
            label: pkg.name,
            amount: Math.round(pkg.price * 100) // Цена в копейках
        }];

        // Отправляем Invoice через Telegram Payments
        await bot.sendInvoice(
            chatId,
            title,
            description,
            payload,
            process.env.TELEGRAM_PAYMENT_TOKEN,
            currency,
            prices,
            {
                start_parameter: `package_${pkg.id}`,
                need_name: false,
                need_phone_number: false,
                need_email: true,
                send_email_to_provider: true,
                need_shipping_address: false,
                is_flexible: false
            }
        );

        // Если тестовый режим - показываем данные тестовой карты
        if (process.env.TELEGRAM_PAYMENT_TOKEN.includes(':TEST:')) {
            const testCardMessage = `ℹ️ Для оплаты используйте данные тестовой карты:\n\n` +
                `💳 Номер карты: 1111 1111 1111 1026\n` +
                `📅 Срок: 12/30\n` +
                `🔒 CVC: 000\n` +
                `✅ Код подтверждения: 0000`;

            await bot.sendMessage(chatId, testCardMessage);
        }

    } catch (error) {
        console.error('Ошибка создания Invoice:', error);
        bot.sendMessage(chatId, '❌ Произошла ошибка при создании платежа.');
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
