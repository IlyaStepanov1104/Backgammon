/**
 * Migration: add_unique_user_card_to_responses
 * Created at: 2026-02-03T20:40:16.503Z
 *
 * Adds unique constraint on (user_id, card_id) to user_responses table
 * so that ON DUPLICATE KEY UPDATE works correctly.
 * Before this migration, each response created a new row instead of updating.
 */

/**
 * Run the migration
 * @param {import('mysql2/promise').Connection} connection
 */
async function up(connection) {
    // First, remove duplicate entries keeping only the latest one for each user_id, card_id pair
    await connection.execute(`
        DELETE ur1 FROM user_responses ur1
        INNER JOIN user_responses ur2
        WHERE ur1.user_id = ur2.user_id
          AND ur1.card_id = ur2.card_id
          AND ur1.response_time < ur2.response_time
    `);

    // Add unique constraint on user_id, card_id
    await connection.execute(`
        ALTER TABLE user_responses
        ADD UNIQUE INDEX idx_user_card_unique (user_id, card_id)
    `);
}

/**
 * Reverse the migration
 * @param {import('mysql2/promise').Connection} connection
 */
async function down(connection) {
    // Drop the unique index
    await connection.execute(`
        ALTER TABLE user_responses DROP INDEX idx_user_card_unique
    `);
}

module.exports = { up, down };
