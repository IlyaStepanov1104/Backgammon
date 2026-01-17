const fs = require('fs');
const path = require('path');
const { query, testConnection } = require('./config');

async function runMigrations() {
  try {
    console.log('Starting database migration...');

    // Проверяем соединение
    const isConnected = await testConnection();
    if (!isConnected) {
      console.error('Cannot connect to database. Please check your configuration.');
      process.exit(1);
    }

    // Читаем схему базы данных
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Разбиваем схему на отдельные запросы
    const queries = schema
      .split(';')
      .map(query => query.trim())
      .filter(query => query.length > 0);

    console.log(`Found ${queries.length} queries to execute`);

    // Выполняем каждый запрос
    for (let i = 0; i < queries.length; i++) {
      const queryText = queries[i];
      if (queryText.trim()) {
        try {
          console.log(`Executing query ${i + 1}/${queries.length}...`);
          await query(queryText);
          console.log(`Query ${i + 1} executed successfully`);
        } catch (error) {
          console.error(`Error executing query ${i + 1}:`, error.message);
          // Продолжаем выполнение других запросов
        }
      }
    }

    // Выполняем дополнительные миграции
    const migrationFiles = fs.readdirSync(__dirname)
      .filter(file => file.startsWith('migrate-') && file.endsWith('.sql') && file !== 'migrate.js');

    for (const migrationFile of migrationFiles) {
      console.log(`Executing migration: ${migrationFile}`);
      const migrationPath = path.join(__dirname, migrationFile);
      const migrationSql = fs.readFileSync(migrationPath, 'utf8');

      const migrationQueries = migrationSql
        .split(';')
        .map(query => query.trim())
        .filter(query => query.length > 0);

      for (let i = 0; i < migrationQueries.length; i++) {
        const queryText = migrationQueries[i];
        if (queryText.trim()) {
          try {
            console.log(`Executing migration query ${i + 1}/${migrationQueries.length} in ${migrationFile}...`);
            await query(queryText);
            console.log(`Migration query ${i + 1} executed successfully`);
          } catch (error) {
            console.error(`Error executing migration query ${i + 1} in ${migrationFile}:`, error.message);
            // Продолжаем выполнение других запросов
          }
        }
      }
    }

    console.log('Database migration completed successfully!');

    // Проверяем созданные таблицы
    const tables = await query('SHOW TABLES');
    console.log('Created tables:', tables.map(t => Object.values(t)[0]));

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Запускаем миграцию если файл вызван напрямую
if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };
