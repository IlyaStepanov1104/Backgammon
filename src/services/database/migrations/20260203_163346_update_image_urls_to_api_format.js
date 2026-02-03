/**
 * Migration: update_image_urls_to_api_format
 * Created at: 2026-02-03T13:33:46.140Z
 */

/**
 * Run the migration
 * @param {import('mysql2/promise').Connection} connection
 */
async function up(connection) {
    // Update image_url: /uploads/cards/... -> /api/uploads/cards/...
    await connection.execute(`
        UPDATE cards
        SET image_url = REPLACE(image_url, '/uploads/cards/', '/api/uploads/cards/')
        WHERE image_url LIKE '/uploads/cards/%'
    `);

    // Update image_url_2
    await connection.execute(`
        UPDATE cards
        SET image_url_2 = REPLACE(image_url_2, '/uploads/cards/', '/api/uploads/cards/')
        WHERE image_url_2 LIKE '/uploads/cards/%'
    `);

    // Update image_url_3
    await connection.execute(`
        UPDATE cards
        SET image_url_3 = REPLACE(image_url_3, '/uploads/cards/', '/api/uploads/cards/')
        WHERE image_url_3 LIKE '/uploads/cards/%'
    `);
}

/**
 * Reverse the migration
 * @param {import('mysql2/promise').Connection} connection
 */
async function down(connection) {
    // Rollback: /api/uploads/cards/... -> /uploads/cards/...
    await connection.execute(`
        UPDATE cards
        SET image_url = REPLACE(image_url, '/api/uploads/cards/', '/uploads/cards/')
        WHERE image_url LIKE '/api/uploads/cards/%'
    `);

    await connection.execute(`
        UPDATE cards
        SET image_url_2 = REPLACE(image_url_2, '/api/uploads/cards/', '/uploads/cards/')
        WHERE image_url_2 LIKE '/api/uploads/cards/%'
    `);

    await connection.execute(`
        UPDATE cards
        SET image_url_3 = REPLACE(image_url_3, '/api/uploads/cards/', '/uploads/cards/')
        WHERE image_url_3 LIKE '/api/uploads/cards/%'
    `);
}

module.exports = { up, down };
