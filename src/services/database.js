const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'backgammon_cards',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4',
    // Keep-alive для поддержания соединений активными
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    // Увеличенный таймаут для удаленных подключений (30 секунд)
    connectTimeout: 30000,
    // Максимальное время простоя соединения перед закрытием (28 секунд - меньше, чем обычный wait_timeout MySQL)
    idleTimeout: 28000,
    // Максимальное количество простаивающих соединений
    maxIdle: 10,
};

// Создание пула соединений
const pool = mysql.createPool(dbConfig);

// Функция для выполнения запросов с автоматическим переподключением
// Для удалённых подключений используем больше попыток
async function query(sql, params, retries = 5, initialRetries = 5) {
    try {
        const [rows] = await pool.execute(sql, params);
        return rows;
    } catch (error) {
        // Если это ошибка соединения и есть попытки, пробуем снова
        if ((error.code === 'ECONNRESET' || error.code === 'PROTOCOL_CONNECTION_LOST' || error.code === 'ETIMEDOUT') && retries > 0) {
            // Экспоненциальная задержка: чем больше попыток использовано, тем дольше ждём
            const delay = (initialRetries - retries + 1) * 500;
            console.warn(`Database connection lost, retrying in ${delay}ms... (${retries} attempts left)`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return query(sql, params, retries - 1, initialRetries);
        }
        console.error('Database query error:', error);
        throw error;
    }
}

// Безопасная функция для запросов с LIMIT и OFFSET
async function queryWithPagination(sql, params, limit, offset, retries = 5, initialRetries = 5) {
    try {
        // Проверяем, что limit и offset - это числа
        const safeLimit = parseInt(limit) || 20;
        const safeOffset = parseInt(offset) || 0;

        // Добавляем LIMIT и OFFSET к SQL запросу
        const paginatedSql = `${sql} LIMIT ${safeLimit} OFFSET ${safeOffset}`;

        const [rows] = await pool.execute(paginatedSql, params);
        return rows;
    } catch (error) {
        // Если это ошибка соединения и есть попытки, пробуем снова
        if ((error.code === 'ECONNRESET' || error.code === 'PROTOCOL_CONNECTION_LOST' || error.code === 'ETIMEDOUT') && retries > 0) {
            const delay = (initialRetries - retries + 1) * 500;
            console.warn(`Database connection lost, retrying pagination query in ${delay}ms... (${retries} attempts left)`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return queryWithPagination(sql, params, limit, offset, retries - 1, initialRetries);
        }
        console.error('Database pagination query error:', error);
        throw error;
    }
}

// Функция для получения одного соединения
async function getConnection() {
    try {
        return await pool.getConnection();
    } catch (error) {
        console.error('Database connection error:', error);
        throw error;
    }
}

// Функция для проверки соединения
async function testConnection() {
    try {
        const connection = await getConnection();
        await connection.ping();
        connection.release();
        console.log('Database connection successful');
        return true;
    } catch (error) {
        console.error('Database connection failed:', error);
        return false;
    }
}

// Graceful shutdown - корректное закрытие пула при завершении процесса
process.on('SIGINT', async () => {
    console.log('Closing database pool...');
    await pool.end();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('Closing database pool...');
    await pool.end();
    process.exit(0);
});

module.exports = {
    pool,
    query,
    queryWithPagination,
    getConnection,
    testConnection,
    dbConfig
};