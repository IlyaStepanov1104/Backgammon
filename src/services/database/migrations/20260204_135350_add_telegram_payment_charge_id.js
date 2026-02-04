/**
 * Migration: add_telegram_payment_charge_id
 * Created at: 2026-02-04T10:53:50.665Z
 */

/**
 * Run the migration
 * @param {import('mysql2/promise').Connection} connection
 */
async function up(connection) {
    // Add telegram_payment_charge_id column for Telegram Payments
    await connection.execute(`
        ALTER TABLE package_purchases
        ADD COLUMN telegram_payment_charge_id VARCHAR(255) DEFAULT NULL AFTER payment_id,
        ADD INDEX idx_telegram_payment_charge_id (telegram_payment_charge_id)
    `);
}

/**
 * Reverse the migration
 * @param {import('mysql2/promise').Connection} connection
 */
async function down(connection) {
    await connection.execute(`
        ALTER TABLE package_purchases
        DROP INDEX idx_telegram_payment_charge_id,
        DROP COLUMN telegram_payment_charge_id
    `);
}

module.exports = { up, down };
