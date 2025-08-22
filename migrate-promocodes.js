#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function migratePromocodes() {
  console.log('🔄 Начинаем миграцию структуры промокодов...\n');

  let connection;
  
  try {
    // Подключаемся к базе данных
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'backgammon_cards',
      multipleStatements: true
    });

    console.log('✅ Подключение к базе данных установлено');

    // Читаем файл миграции
    const migrationPath = path.join(__dirname, 'src/database/migrate-promocodes.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📖 Выполняем миграцию...');

    // Выполняем миграцию
    await connection.execute(migrationSQL);

    console.log('✅ Миграция успешно выполнена!');

    // Проверяем результат
    console.log('\n🔍 Проверяем результат миграции...');

    // Проверяем структуру таблицы promo_codes
    const [promoColumns] = await connection.execute('DESCRIBE promo_codes');
    console.log('\n📋 Структура таблицы promo_codes:');
    promoColumns.forEach(col => {
      console.log(`  - ${col.Field} (${col.Type})`);
    });

    // Проверяем таблицу promo_code_cards
    const [promoCardColumns] = await connection.execute('DESCRIBE promo_code_cards');
    console.log('\n📋 Структура таблицы promo_code_cards:');
    promoCardColumns.forEach(col => {
      console.log(`  - ${col.Field} (${col.Type})`);
    });

    // Проверяем количество карточек
    const [cardCount] = await connection.execute('SELECT COUNT(*) as count FROM cards');
    console.log(`\n🎯 Количество карточек: ${cardCount[0].count}`);

    // Проверяем количество промокодов
    const [promoCount] = await connection.execute('SELECT COUNT(*) as count FROM promo_codes');
    console.log(`🎫 Количество промокодов: ${promoCount[0].count}`);

    // Проверяем связи промокодов с карточками
    const [promoCardCount] = await connection.execute('SELECT COUNT(*) as count FROM promo_code_cards');
    console.log(`🔗 Связей промокод-карточка: ${promoCardCount[0].count}`);

    console.log('\n🎉 Миграция завершена успешно!');
    console.log('\n📝 Что изменилось:');
    console.log('  - Удалено поле card_package_size из promo_codes');
    console.log('  - Создана таблица promo_code_cards для связи промокодов с карточками');
    console.log('  - Добавлены тестовые карточки и промокод');
    console.log('  - Теперь промокоды дают доступ к конкретным карточкам, а не к случайным');

  } catch (error) {
    console.error('❌ Ошибка миграции:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Соединение с базой данных закрыто');
    }
  }
}

// Запускаем миграцию
migratePromocodes().catch(console.error);
