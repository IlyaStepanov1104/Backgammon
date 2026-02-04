/**
 * Migration runner - runs all pending migrations
 * Usage: npm run migrate
 */

const fs = require('fs');
const path = require('path');
const { pool, query, getConnection } = require('.');
require('dotenv').config();

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function ensureMigrationsTable() {
    const sql = `
        CREATE TABLE IF NOT EXISTS migrations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL UNIQUE,
            executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            batch INT NOT NULL DEFAULT 1
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    await query(sql);
    console.log('Migrations table ready');
}

async function getExecutedMigrations() {
    const migrations = await query('SELECT name FROM migrations ORDER BY id ASC');
    return migrations.map(m => m.name);
}

async function getCurrentBatch() {
    const result = await query('SELECT MAX(batch) as batch FROM migrations');
    return (result[0].batch || 0) + 1;
}

async function getMigrationFiles() {
    if (!fs.existsSync(MIGRATIONS_DIR)) {
        fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
        return [];
    }

    const files = fs.readdirSync(MIGRATIONS_DIR)
        .filter(f => f.endsWith('.js'))
        .sort();

    return files;
}

async function runMigrations() {
    console.log('Starting migrations...\n');

    try {
        await ensureMigrationsTable();

        const executed = await getExecutedMigrations();
        const files = await getMigrationFiles();
        const batch = await getCurrentBatch();

        const pending = files.filter(f => !executed.includes(f));

        if (pending.length === 0) {
            console.log('No pending migrations.');
            return;
        }

        console.log(`Found ${pending.length} pending migration(s):\n`);

        for (const file of pending) {
            console.log(`Running: ${file}`);

            const migration = require(path.join(MIGRATIONS_DIR, file));

            if (typeof migration.up !== 'function') {
                throw new Error(`Migration ${file} does not export an 'up' function`);
            }

            const connection = await getConnection();

            try {
                await connection.beginTransaction();

                // Run the migration
                await migration.up(connection);

                // Record the migration
                await connection.execute(
                    'INSERT INTO migrations (name, batch) VALUES (?, ?)',
                    [file, batch]
                );

                await connection.commit();
                console.log(`  ✓ Completed: ${file}\n`);
            } catch (error) {
                await connection.rollback();
                console.error(`  ✗ Failed: ${file}`);
                throw error;
            } finally {
                connection.release();
            }
        }

        console.log(`\nAll migrations completed successfully (batch ${batch}).`);

    } catch (error) {
        console.error('\nMigration failed:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runMigrations();
