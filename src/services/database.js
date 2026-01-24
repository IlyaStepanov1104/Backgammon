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
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
};

// Создание пула соединений
const pool = mysql.createPool(dbConfig);

// Функция для выполнения запросов
async function query(sql, params) {
    try {
        const [rows] = await pool.execute(sql, params);
        return rows;
    } catch (error) {
        console.error('Database query error:', error);
        throw error;
    }
}

// Безопасная функция для запросов с LIMIT и OFFSET
async function queryWithPagination(sql, params, limit, offset) {
    try {
        // Проверяем, что limit и offset - это числа
        const safeLimit = parseInt(limit) || 20;
        const safeOffset = parseInt(offset) || 0;

        // Добавляем LIMIT и OFFSET к SQL запросу
        const paginatedSql = `${sql} LIMIT ${safeLimit} OFFSET ${safeOffset}`;

        const [rows] = await pool.execute(paginatedSql, params);
        return rows;
    } catch (error) {
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

module.exports = {
    pool,
    query,
    queryWithPagination,
    getConnection,
    testConnection,
    dbConfig
};