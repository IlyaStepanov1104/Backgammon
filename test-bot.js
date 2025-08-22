#!/usr/bin/env node

const { bot } = require('./src/bot/bot');

console.log('🧪 Тестовый режим бота');
console.log('Бот запущен и готов к работе');
console.log('Отправьте /start в Telegram для тестирования');
console.log('Для остановки нажмите Ctrl+C');

// Обработка завершения
process.on('SIGINT', () => {
  console.log('\n🛑 Остановка тестового режима...');
  bot.stopPolling();
  process.exit(0);
});
