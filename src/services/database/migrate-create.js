/**
 * Migration creator - creates a new migration file
 * Usage: npm run migrate:create -- <migration_name>
 * Example: npm run migrate:create -- add_users_table
 */

const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

function generateTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    return `${year}${month}${day}_${hours}${minutes}${seconds}`;
}

function createMigration(name) {
    if (!name) {
        console.error('Error: Migration name is required');
        console.log('Usage: npm run migrate:create -- <migration_name>');
        console.log('Example: npm run migrate:create -- add_users_table');
        process.exit(1);
    }

    // Sanitize the name
    const sanitizedName = name
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');

    if (!sanitizedName) {
        console.error('Error: Invalid migration name');
        process.exit(1);
    }

    // Ensure migrations directory exists
    if (!fs.existsSync(MIGRATIONS_DIR)) {
        fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
    }

    const timestamp = generateTimestamp();
    const filename = `${timestamp}_${sanitizedName}.js`;
    const filepath = path.join(MIGRATIONS_DIR, filename);

    const template = `/**
 * Migration: ${sanitizedName}
 * Created at: ${new Date().toISOString()}
 */

/**
 * Run the migration
 * @param {import('mysql2/promise').Connection} connection
 */
async function up(connection) {
    // Write your migration code here
    // Example:
    // await connection.execute(\`
    //     CREATE TABLE example (
    //         id INT AUTO_INCREMENT PRIMARY KEY,
    //         name VARCHAR(255) NOT NULL,
    //         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    //     ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    // \`);
}

/**
 * Reverse the migration
 * @param {import('mysql2/promise').Connection} connection
 */
async function down(connection) {
    // Write your rollback code here
    // Example:
    // await connection.execute('DROP TABLE IF EXISTS example');
}

module.exports = { up, down };
`;

    fs.writeFileSync(filepath, template);
    console.log(`Migration created: ${filename}`);
    console.log(`Path: ${filepath}`);
}

// Get migration name from command line arguments
const args = process.argv.slice(2);
const migrationName = args.join('_');

createMigration(migrationName);
