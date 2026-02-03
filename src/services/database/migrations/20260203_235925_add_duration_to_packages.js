/**
 * Migration: add_expires_at_to_packages
 * Created at: 2026-02-03
 *
 * Adds expires_at field to packages table.
 * After this date, package cannot be purchased and is hidden from users.
 * NULL means no expiration (always available).
 */

/**
 * Run the migration
 * @param {import('mysql2/promise').Connection} connection
 */
async function up(connection) {
    await connection.execute(`
        ALTER TABLE packages
        ADD COLUMN expires_at TIMESTAMP NULL DEFAULT NULL
        COMMENT 'Date when package becomes unavailable for purchase. NULL = no expiration'
        AFTER price
    `);
}

/**
 * Reverse the migration
 * @param {import('mysql2/promise').Connection} connection
 */
async function down(connection) {
    await connection.execute(`
        ALTER TABLE packages
        DROP COLUMN expires_at
    `);
}

module.exports = { up, down };
