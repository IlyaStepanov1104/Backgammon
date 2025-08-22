#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Настройка проекта Backgammon Cards...\n');

// Проверяем наличие Node.js
try {
  const nodeVersion = process.version;
  console.log(`✅ Node.js версия: ${nodeVersion}`);
} catch (error) {
  console.error('❌ Node.js не установлен. Установите Node.js 18+ и попробуйте снова.');
  process.exit(1);
}

// Проверяем наличие npm
try {
  const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
  console.log(`✅ npm версия: ${npmVersion}`);
} catch (error) {
  console.error('❌ npm не установлен. Установите npm и попробуйте снова.');
  process.exit(1);
}

// Устанавливаем зависимости
console.log('\n📦 Установка зависимостей...');
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ Зависимости установлены');
} catch (error) {
  console.error('❌ Ошибка установки зависимостей:', error.message);
  process.exit(1);
}

// Проверяем наличие .env файла
const envPath = path.join(process.cwd(), '.env');
const envExamplePath = path.join(process.cwd(), 'env.example');

if (!fs.existsSync(envPath)) {
  if (fs.existsSync(envExamplePath)) {
    console.log('\n📝 Создание .env файла...');
    try {
      fs.copyFileSync(envExamplePath, envPath);
      console.log('✅ .env файл создан из env.example');
      console.log('⚠️  Не забудьте настроить переменные окружения в .env файле!');
    } catch (error) {
      console.error('❌ Ошибка создания .env файла:', error.message);
    }
  } else {
    console.log('\n⚠️  Файл env.example не найден. Создайте .env файл вручную.');
  }
} else {
  console.log('\n✅ .env файл уже существует');
}

// Проверяем наличие MySQL
console.log('\n🔍 Проверка MySQL...');
try {
  execSync('mysql --version', { stdio: 'pipe' });
  console.log('✅ MySQL установлен');
} catch (error) {
  console.log('⚠️  MySQL не найден. Установите MySQL для работы с базой данных.');
  console.log('   Ubuntu/Debian: sudo apt install mysql-server');
  console.log('   macOS: brew install mysql');
  console.log('   Windows: https://dev.mysql.com/downloads/installer/');
}

// Создаем папки если их нет
const folders = [
  'src/app/admin',
  'src/app/miniapp',
  'src/app/api/admin',
  'src/app/api/miniapp',
  'src/app/api/telegram',
  'src/bot',
  'src/database',

];

console.log('\n📁 Создание структуры папок...');
folders.forEach(folder => {
  const folderPath = path.join(process.cwd(), folder);
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
    console.log(`✅ Создана папка: ${folder}`);
  }
});

console.log('\n🎉 Настройка проекта завершена!');
console.log('\n📋 Следующие шаги:');
console.log('1. Настройте .env файл с вашими данными');
console.log('2. Создайте MySQL базу данных');
console.log('3. Запустите миграции: npm run db:migrate');
console.log('4. Создайте Telegram бота и получите токен');
console.log('5. Запустите проект: npm run dev');
console.log('6. Запустите бота в отдельном терминале: npm run bot');

console.log('\n🔗 Полезные ссылки:');
console.log('- Админ-панель: http://localhost:3000/admin');
console.log('- Миниапп: http://localhost:3000/miniapp');
console.log('- API документация: см. README.md');

console.log('\n💡 Для получения помощи обратитесь к README.md файлу.');
