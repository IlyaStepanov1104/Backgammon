#!/usr/bin/env node

const { testConnection, query } = require('@/services/database');

async function testDatabase() {
  console.log('🧪 Тестирование подключения к базе данных...');
  
  try {
    // Тестируем подключение
    const isConnected = await testConnection();
    if (!isConnected) {
      console.log('❌ Не удалось подключиться к базе данных');
      return;
    }
    
    console.log('✅ Подключение к базе данных успешно');
    
    // Проверяем таблицу users
    console.log('\n📋 Проверяем структуру таблицы users...');
    try {
      const users = await query('DESCRIBE users');
      console.log('Структура таблицы users:');
      users.forEach(col => {
        console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(NULL)' : '(NOT NULL)'}`);
      });
    } catch (error) {
      console.log('❌ Ошибка при проверке таблицы users:', error.message);
    }
    
    // Проверяем таблицу promo_codes
    console.log('\n📋 Проверяем структуру таблицы promo_codes...');
    try {
      const promoCodes = await query('DESCRIBE promo_codes');
      console.log('Структура таблицы promo_codes:');
      promoCodes.forEach(col => {
        console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(NULL)' : '(NOT NULL)'}`);
      });
    } catch (error) {
      console.log('❌ Ошибка при проверке таблицы promo_codes:', error.message);
    }
    
    // Проверяем количество пользователей
    console.log('\n👥 Проверяем количество пользователей...');
    try {
      const userCount = await query('SELECT COUNT(*) as count FROM users');
      console.log(`Количество пользователей: ${userCount[0].count}`);
    } catch (error) {
      console.log('❌ Ошибка при подсчете пользователей:', error.message);
    }
    
    // Проверяем количество промокодов
    console.log('\n🎫 Проверяем количество промокодов...');
    try {
      const promoCount = await query('SELECT COUNT(*) as count FROM promo_codes');
      console.log(`Количество промокодов: ${promoCount[0].count}`);
    } catch (error) {
      console.log('❌ Ошибка при подсчете промокодов:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Ошибка тестирования:', error);
  }
}

testDatabase().then(() => {
  console.log('\n🏁 Тестирование завершено');
  process.exit(0);
}).catch(error => {
  console.error('❌ Критическая ошибка:', error);
  process.exit(1);
});
